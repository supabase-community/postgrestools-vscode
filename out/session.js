"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActiveSession = exports.destroySession = exports.createSession = void 0;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const binary_finder_1 = require("./binary-finder");
const logger_1 = require("./logger");
const project_1 = require("./project");
const state_1 = require("./state");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
/**
 * Creates a new Pglt LSP session
 */
const createSession = async (project) => {
    const findResult = await binary_finder_1.BinaryFinder.find(project.path);
    if (!findResult) {
        vscode_1.window.showErrorMessage(`Unable to find a PGLT binary. Read the docs for more various strategies to install a binary.`);
        logger_1.logger.error("Could not find the PGLT binary");
        return;
    }
    logger_1.logger.info("Copying binary to temp location", {
        currentLocation: findResult.bin.fsPath,
    });
    // Copy the binary to a temporary location, and run it from there
    // so that the original binary can be updated without locking issues.
    // We'll keep track of that temporary location in the session and
    // delete it when the session is stopped.
    const tempBin = await copyBinaryToTemporaryLocation(findResult.bin);
    if (!tempBin) {
        logger_1.logger.warn("Failed to copy binary to temporary location. Using original.");
    }
    return {
        bin: findResult.bin,
        tempBin: tempBin,
        project,
        client: createLanguageClient(tempBin ?? findResult.bin, project),
    };
};
exports.createSession = createSession;
const destroySession = async (session) => {
    // Stop the LSP client if it is still running
    if (session.client.needsStop()) {
        await session.client.stop();
    }
};
exports.destroySession = destroySession;
/**
 * Copies the binary to a temporary location if necessary
 *
 * This function will copy the binary to a temporary location if it is not already
 * present in the global storage directory. It will then return the location of
 * the copied binary.
 *
 * This approach allows the user to update the original binary that would otherwise
 * be locked if we ran the binary directly from the original location.
 *
 * Binaries copied in the temp location are uniquely identified by their name and version
 * identifier.
 */
const copyBinaryToTemporaryLocation = async (bin) => {
    // Retrieve the version of the binary
    // We call pglt with --version which outputs the version in the format
    // of "Version: 1.0.0"
    const version = (0, node_child_process_1.spawnSync)(bin.fsPath, ["--version"])
        .stdout.toString()
        .split(":")[1]
        .trim();
    const location = vscode_1.Uri.joinPath(state_1.state.context.globalStorageUri, "tmp-bin", constants_1.CONSTANTS.platformSpecificBinaryName.replace("pglt", `pglt-${version}`));
    try {
        await vscode_1.workspace.fs.createDirectory(vscode_1.Uri.joinPath(state_1.state.context.globalStorageUri, "tmp-bin"));
        if (!(await (0, utils_1.fileExists)(location))) {
            logger_1.logger.info("Copying binary to temporary location.", {
                original: bin.fsPath,
                destination: location.fsPath,
            });
            (0, node_fs_1.copyFileSync)(bin.fsPath, location.fsPath);
            logger_1.logger.debug("Copied pglt binary binary to temporary location.", {
                original: bin.fsPath,
                temporary: location.fsPath,
            });
        }
        else {
            logger_1.logger.debug(`A pglt binary for the same version ${version} already exists in the temporary location.`, {
                original: bin.fsPath,
                temporary: location.fsPath,
            });
        }
        const isExecutableBefore = (0, utils_1.fileIsExecutable)(bin);
        (0, node_fs_1.chmodSync)(location.fsPath, 0o755);
        const isExecutableAfter = (0, utils_1.fileIsExecutable)(bin);
        logger_1.logger.debug("Ensure binary is executable", {
            binary: bin.fsPath,
            before: `is executable: ${isExecutableBefore}`,
            after: `is executable: ${isExecutableAfter}`,
        });
        return location;
    }
    catch (error) {
        logger_1.logger.warn(`Error copying binary: ${error}`);
    }
};
/**
 * Creates a new global session
 */
const createActiveSession = async () => {
    if (state_1.state.activeSession) {
        return;
    }
    const activeProject = await (0, project_1.getActiveProject)();
    if (!activeProject) {
        logger_1.logger.info("No active project found. Aborting.");
        return;
    }
    state_1.state.activeSession = await (0, exports.createSession)(activeProject);
    try {
        await state_1.state.activeSession?.client.start();
        logger_1.logger.info("Created a global LSP session");
    }
    catch (e) {
        logger_1.logger.error("Failed to create global LSP session", {
            error: `${e}`,
        });
        state_1.state.activeSession?.client.dispose();
        state_1.state.activeSession = undefined;
    }
};
exports.createActiveSession = createActiveSession;
/**
 * Creates a new PGLT LSP client
 */
const createLanguageClient = (bin, project) => {
    const args = ["lsp-proxy", "--config-path", project.configPath.toString()];
    const serverOptions = {
        command: bin.fsPath,
        transport: node_1.TransportKind.stdio,
        options: {
            ...(project?.path && { cwd: project.path.fsPath }),
        },
        args,
    };
    const clientOptions = {
        outputChannel: createLspLogger(project),
        traceOutputChannel: createLspTraceLogger(project),
        documentSelector: createDocumentSelector(project),
        progressOnInitialization: true,
        initializationFailedHandler: (e) => {
            logger_1.logger.error("Failed to initialize the PGLT language server", {
                error: e.toString(),
            });
            return false;
        },
        errorHandler: {
            error: (error, message, count) => {
                logger_1.logger.error("PGLT language server error", {
                    error: error.toString(),
                    stack: error.stack,
                    errorMessage: error.message,
                    message: message?.jsonrpc,
                    count: count,
                });
                return {
                    action: node_1.ErrorAction.Shutdown,
                    message: "PGLT language server error",
                };
            },
            closed: () => {
                logger_1.logger.error("PGLT language server closed");
                return {
                    action: node_1.CloseAction.DoNotRestart,
                    message: "PGLT language server closed",
                };
            },
        },
        initializationOptions: {
            rootUri: project?.path,
            rootPath: project?.path?.fsPath,
        },
        workspaceFolder: undefined,
    };
    return new PGLTLanguageClient("pglt.lsp", "pglt", serverOptions, clientOptions);
};
/**
 * Creates a new PGLT LSP logger
 */
const createLspLogger = (project) => {
    // If the project is missing, we're creating a logger for the global LSP
    // session. In this case, we don't have a workspace folder to display in the
    // logger name, so we just use the display name of the extension.
    if (!project?.folder) {
        return vscode_1.window.createOutputChannel(`${constants_1.CONSTANTS.displayName} LSP (global session) (${constants_1.CONSTANTS.activationTimestamp})`, {
            log: true,
        });
    }
    // If the project is present, we're creating a logger for a specific project.
    // In this case, we display the name of the project and the relative path to
    // the project root in the logger name. Additionally, when in a multi-root
    // workspace, we prefix the path with the name of the workspace folder.
    const prefix = constants_1.CONSTANTS.operatingMode === constants_1.OperatingMode.MultiRoot
        ? `${project.folder.name}::`
        : "";
    const path = (0, utils_1.subtractURI)(project.path, project.folder.uri)?.fsPath;
    return vscode_1.window.createOutputChannel(`${constants_1.CONSTANTS.displayName} LSP (${prefix}${path}) (${constants_1.CONSTANTS.activationTimestamp})`, {
        log: true,
    });
};
/**
 * Creates a new PGLT LSP logger
 */
const createLspTraceLogger = (project) => {
    // If the project is missing, we're creating a logger for the global LSP
    // session. In this case, we don't have a workspace folder to display in the
    // logger name, so we just use the display name of the extension.
    if (!project?.folder) {
        return vscode_1.window.createOutputChannel(`${constants_1.CONSTANTS.displayName} LSP trace (global session) (${constants_1.CONSTANTS.activationTimestamp})`, {
            log: true,
        });
    }
    // If the project is present, we're creating a logger for a specific project.
    // In this case, we display the name of the project and the relative path to
    // the project root in the logger name. Additionally, when in a multi-root
    // workspace, we prefix the path with the name of the workspace folder.
    const prefix = constants_1.CONSTANTS.operatingMode === constants_1.OperatingMode.MultiRoot
        ? `${project.folder.name}::`
        : "";
    const path = (0, utils_1.subtractURI)(project.path, project.folder.uri)?.fsPath;
    return vscode_1.window.createOutputChannel(`${constants_1.CONSTANTS.displayName} LSP trace (${prefix}${path}) (${constants_1.CONSTANTS.activationTimestamp})`, {
        log: true,
    });
};
/**
 * Creates a new document selector
 *
 * This function will create a document selector scoped to the given project,
 * which will only match files within the project's root directory. If no
 * project is specified, the document selector will match files that have
 * not yet been saved to disk (untitled).
 */
const createDocumentSelector = (project) => {
    if (project) {
        return [
            {
                language: "sql",
                scheme: "file",
                pattern: vscode_1.Uri.joinPath(project.path, "**", "*").fsPath.replaceAll("\\", "/"),
            },
        ];
    }
    return ["untitled", "vscode-userdata"].map((scheme) => ({
        language: "sql",
        scheme,
    }));
};
class PGLTLanguageClient extends node_1.LanguageClient {
    fillInitializeParams(params) {
        super.fillInitializeParams(params);
        if (params.initializationOptions?.rootUri) {
            params.rootUri = params.initializationOptions?.rootUri.toString();
        }
        if (params.initializationOptions?.rootPath) {
            params.rootPath = params.initializationOptions?.rootPath;
        }
    }
}
//# sourceMappingURL=session.js.map