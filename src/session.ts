import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync } from "node:fs";
import { type LogOutputChannel, Uri, window, workspace } from "vscode";
import {
  CloseAction,
  type CloseHandlerResult,
  type DocumentFilter,
  ErrorAction,
  type ErrorHandlerResult,
  type InitializeParams,
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { BinaryFinder } from "./binary-finder";
import { logger } from "./logger";
import { getActiveProject, type Project } from "./project";
import { state } from "./state";
import {
  daysToMs,
  fileExists,
  fileIsExecutable,
  getVersion,
  subtractURI,
} from "./utils";
import { CONSTANTS, OperatingMode } from "./constants";
import { getConfig, isEnabledForFolder } from "./config";

export type Session = {
  bin: Uri;
  binaryStrategyLabel: string;
  tempBin?: Uri;
  project?: Project;
  client: LanguageClient;
};

/**
 * Creates a new Pglt LSP session
 */
export const createSession = async (
  project: Project
): Promise<Session | undefined> => {
  const findResult = await BinaryFinder.find(project.path);

  if (!findResult) {
    window.showErrorMessage(
      `Unable to find a PostgresTools binary. Read the docs for more various strategies to install a binary.`
    );
    logger.error("Could not find the PostgresTools binary");
    return;
  }

  if (!fileIsExecutable(findResult.bin)) {
    window.showErrorMessage(`
      The binary you've pointed to is not executable.
      (${findResult.bin.fsPath})
    `);
    logger.error("Found binary is not executable.");
    return;
  }

  logger.info("Copying binary to temp location", {
    currentLocation: findResult.bin.fsPath,
  });

  const version = await getVersion(findResult.bin);
  if (!version) {
    throw new Error(
      "Just verified we have an executable file. Version should exist."
    );
  }

  const lastNotifiedOfUpdate =
    state.context.globalState.get<string>("lastNotifiedOfUpdate") ||
    new Date(0).toISOString();

  if (
    state.releases.versionOutdated(version) &&
    state.releases.latestVersion() &&
    Date.now() - new Date(lastNotifiedOfUpdate).getTime() > daysToMs(3)
  ) {
    window.showInformationMessage(
      `PostgresTools ${version} is outdated, consider updating to ${state.releases.latestVersion()}.`
    );
    await state.context.globalState.update(
      "lastNotifiedOfUpdate",
      new Date().toISOString()
    );
  }

  // Copy the binary to a temporary location, and run it from there
  // so that the original binary can be updated without locking issues.
  // We'll keep track of that temporary location in the session and
  // delete it when the session is stopped.
  const tempBin = await copyBinaryToTemporaryLocation(findResult.bin);

  if (!tempBin) {
    logger.warn("Failed to copy binary to temporary location. Using original.");
  }

  return {
    bin: findResult.bin,
    tempBin: tempBin,
    project,
    binaryStrategyLabel: findResult.label,
    client: createLanguageClient(tempBin ?? findResult.bin, project),
  };
};

export const destroySession = async (session: Session) => {
  // Stop the LSP client if it is still running
  if (session.client.needsStop()) {
    await session.client.stop();
  }
};

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
const copyBinaryToTemporaryLocation = async (
  bin: Uri
): Promise<Uri | undefined> => {
  const version = await getVersion(bin);
  if (!version) {
    window.showErrorMessage(
      "Tried to copy binary to temporary location, but it does not exist. Invalid state."
    );
  }

  logger.debug(`Retrieved version from binary`, { version });

  const location = Uri.joinPath(
    state.context.globalStorageUri,
    "tmp-bin",
    CONSTANTS.platformSpecificBinaryName.replace(
      "postgrestools",
      `postgrestools-${version}`
    )
  );

  try {
    await workspace.fs.createDirectory(
      Uri.joinPath(state.context.globalStorageUri, "tmp-bin")
    );

    if (!(await fileExists(location))) {
      logger.info("Copying binary to temporary location.", {
        original: bin.fsPath,
        destination: location.fsPath,
      });
      copyFileSync(bin.fsPath, location.fsPath);
      logger.debug(
        "Copied postgrestools binary binary to temporary location.",
        {
          original: bin.fsPath,
          temporary: location.fsPath,
        }
      );
    } else {
      logger.debug(
        `A postgrestools binary for the same version ${version} already exists in the temporary location.`,
        {
          original: bin.fsPath,
          temporary: location.fsPath,
        }
      );
    }

    const isExecutableBefore = fileIsExecutable(bin);
    chmodSync(location.fsPath, 0o755);
    const isExecutableAfter = fileIsExecutable(bin);

    logger.debug("Ensure binary is executable", {
      binary: bin.fsPath,
      before: `is executable: ${isExecutableBefore}`,
      after: `is executable: ${isExecutableAfter}`,
    });

    return location;
  } catch (error) {
    logger.warn(`Error copying binary: ${error}`);
  }
};

/**
 * Creates a new global session
 */
export const createActiveSession = async () => {
  if (state.activeSession) {
    return;
  }

  const activeProject = await getActiveProject();

  if (!activeProject) {
    logger.info("No active project found. Aborting.");
    return;
  }

  if (activeProject.folder && !isEnabledForFolder(activeProject.folder)) {
    logger.info("Extension disabled for project.");
    return;
  }

  if (!activeProject.folder && !getConfig<boolean>("enabled")) {
    logger.info("Extension disabled.");
    return;
  }

  state.activeProject = activeProject;
  state.activeSession = await createSession(activeProject);

  try {
    await state.activeSession?.client.start();
    logger.info("Created a global LSP session");
  } catch (e) {
    logger.error("Failed to create global LSP session", {
      error: `${e}`,
    });
    state.activeSession?.client.dispose();
    state.activeSession = undefined;
  }
};

/**
 * Creates a new PostgresTools LSP client
 */
const createLanguageClient = (bin: Uri, project: Project) => {
  const args = ["lsp-proxy", `--config-path=${project.configPath.fsPath}`];

  const serverOptions: ServerOptions = {
    command: bin.fsPath,
    transport: TransportKind.stdio,
    options: {
      ...(project?.path && { cwd: project.path.fsPath }),
    },
    args,
  };

  logger.info(`Server Options: `, {
    serverOptions,
  });

  const clientOptions: LanguageClientOptions = {
    outputChannel: createLspLogger(project),
    traceOutputChannel: createLspTraceLogger(project),
    documentSelector: createDocumentSelector(project),
    progressOnInitialization: true,

    initializationFailedHandler: (e): boolean => {
      logger.error("Failed to initialize the PostgresTools language server", {
        error: e.toString(),
      });

      return false;
    },
    errorHandler: {
      error: (
        error,
        message,
        count
      ): ErrorHandlerResult | Promise<ErrorHandlerResult> => {
        logger.error("PostgresTools language server error", {
          error: error.toString(),
          stack: error.stack,
          errorMessage: error.message,
          message: message?.jsonrpc,
          count: count,
        });

        return {
          action: ErrorAction.Shutdown,
          message: "PostgresTools language server error",
        };
      },
      closed: (): CloseHandlerResult | Promise<CloseHandlerResult> => {
        logger.error("PostgresTools language server closed");
        return {
          action: CloseAction.DoNotRestart,
          message: "PostgresTools language server closed",
        };
      },
    },
    initializationOptions: {
      rootUri: project?.path,
      rootPath: project?.path?.fsPath,
    },
    workspaceFolder: undefined,
  };

  return new PostgresToolsLanguageClient(
    "postgrestools.lsp",
    "postgrestools",
    serverOptions,
    clientOptions
  );
};

/**
 * Creates a new PostgresTools LSP logger
 */
const createLspLogger = (project?: Project): LogOutputChannel => {
  // If the project is missing, we're creating a logger for the global LSP
  // session. In this case, we don't have a workspace folder to display in the
  // logger name, so we just use the display name of the extension.
  if (!project?.folder) {
    return window.createOutputChannel(
      `${CONSTANTS.displayName} LSP (global session) (${CONSTANTS.activationTimestamp})`,
      {
        log: true,
      }
    );
  }

  // If the project is present, we're creating a logger for a specific project.
  // In this case, we display the name of the project and the relative path to
  // the project root in the logger name. Additionally, when in a multi-root
  // workspace, we prefix the path with the name of the workspace folder.
  const prefix =
    CONSTANTS.operatingMode === OperatingMode.MultiRoot
      ? `${project.folder.name}::`
      : "";
  const path = subtractURI(project.path, project.folder.uri)?.fsPath;

  return window.createOutputChannel(
    `${CONSTANTS.displayName} LSP (${prefix}${path}) (${CONSTANTS.activationTimestamp})`,
    {
      log: true,
    }
  );
};

/**
 * Creates a new PostgresTools LSP logger
 */
const createLspTraceLogger = (project?: Project): LogOutputChannel => {
  // If the project is missing, we're creating a logger for the global LSP
  // session. In this case, we don't have a workspace folder to display in the
  // logger name, so we just use the display name of the extension.
  if (!project?.folder) {
    return window.createOutputChannel(
      `${CONSTANTS.displayName} LSP trace (global session) (${CONSTANTS.activationTimestamp})`,
      {
        log: true,
      }
    );
  }

  // If the project is present, we're creating a logger for a specific project.
  // In this case, we display the name of the project and the relative path to
  // the project root in the logger name. Additionally, when in a multi-root
  // workspace, we prefix the path with the name of the workspace folder.
  const prefix =
    CONSTANTS.operatingMode === OperatingMode.MultiRoot
      ? `${project.folder.name}::`
      : "";
  const path = subtractURI(project.path, project.folder.uri)?.fsPath;

  return window.createOutputChannel(
    `${CONSTANTS.displayName} LSP trace (${prefix}${path}) (${CONSTANTS.activationTimestamp})`,
    {
      log: true,
    }
  );
};

/**
 * Creates a new document selector
 *
 * This function will create a document selector scoped to the given project,
 * which will only match files within the project's root directory. If no
 * project is specified, the document selector will match files that have
 * not yet been saved to disk (untitled).
 */
const createDocumentSelector = (project?: Project): DocumentFilter[] => {
  return ["sql", "postgres"].flatMap((language) => {
    if (project) {
      return {
        language,
        scheme: "file",
        pattern: Uri.joinPath(project.path, "**", "*").fsPath.replaceAll(
          "\\",
          "/"
        ),
      };
    }

    return ["untitled", "vscode-userdata"].map((scheme) => ({
      language,
      scheme,
    }));
  });
};

class PostgresToolsLanguageClient extends LanguageClient {
  protected fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);

    if (params.initializationOptions?.rootUri) {
      params.rootUri = params.initializationOptions?.rootUri.toString();
    }

    if (params.initializationOptions?.rootPath) {
      params.rootPath = params.initializationOptions?.rootPath;
    }
  }
}
