"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPgltStrategy = exports.pathEnvironmentVariableStrategy = exports.yarnPnpStrategy = exports.nodeModulesStrategy = exports.vsCodeSettingsStrategy = void 0;
const vscode_1 = require("vscode");
const logger_1 = require("./logger");
const node_path_1 = require("node:path");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const node_module_1 = require("node:module");
const config_1 = require("./config");
const downloader_1 = require("./downloader");
/**
 * The user can specify a PGLT binary in the VSCode settings.
 *
 * This can be done in two ways:
 *
 * 1. A static string that points to a binary. The extension will try to retrieve the binary from there.
 *
 * 2. An object with OS & arch combinations as keys and binary paths as values.
 * The extension will try to retrieve the binary from the key matching the current OS and arch.
 *
 * Config Example:
 * ```json
 * {
 *   "pglt.bin": {
 *   	"linux-x64": "/path/to/pglt",
 *    "darwin-arm64": "/path/to/pglt",
 *    "win32-x64": "/path/to/pglt.exe"
 *   }
 * }
 */
exports.vsCodeSettingsStrategy = {
    name: "VSCode Settings Strategy",
    async find(path) {
        logger_1.logger.debug("Trying to find PGLT binary via VSCode Settings");
        let binSetting = (0, config_1.getConfig)("bin", {
            scope: path,
        });
        if (!binSetting) {
            logger_1.logger.debug("Binary path not set in VSCode Settings");
            return null;
        }
        if (typeof binSetting === "object") {
            logger_1.logger.debug("Binary Setting is an object, extracting relevant platform", { binSetting });
            const relevantSetting = binSetting[constants_1.CONSTANTS.platformIdentifier];
            if (relevantSetting) {
                logger_1.logger.debug("Found matching setting for platform in VSCode Settings, assigning as string", {
                    setting: relevantSetting,
                    platformIdentifier: constants_1.CONSTANTS.platformIdentifier,
                });
                binSetting = relevantSetting;
            }
        }
        if (typeof binSetting === "string") {
            logger_1.logger.debug("Binary Setting is a string", { binSetting });
            const resolvedPath = binSetting.startsWith(".")
                ? vscode_1.Uri.joinPath(path, binSetting).toString()
                : binSetting;
            logger_1.logger.debug("Looking for binary at path", { resolvedPath });
            const pglt = vscode_1.Uri.file(resolvedPath);
            if (await (0, utils_1.fileExists)(pglt)) {
                return pglt;
            }
        }
        logger_1.logger.debug("No PGLT binary found in VSCode settings.");
        return null;
    },
};
/**
 * Task:
 * Search the binary in node modules.
 * Search for the sub-packages that the binary tries to use with npm.
 * Use node's `createRequire` – what's that?
 * Resolve the *main* package.json – the one used by @pglt/pglt.
 * In those node_modules, you should see the installed optional dependency.
 */
exports.nodeModulesStrategy = {
    name: "Node Modules Strategy",
    async find(path) {
        logger_1.logger.debug("Trying to find PGLT binary in Node Modules");
        if (!path) {
            logger_1.logger.debug("No local path, skipping.");
            return null;
        }
        const pgltPackageNameJson = `${constants_1.CONSTANTS.npmPackageName}/package.json`;
        logger_1.logger.info(`Searching for node_modules package`, { pgltPackageNameJson });
        let requirePgltPackage;
        try {
            /**
             * Create a scoped require function that can require modules from the
             * package installed via npm.
             *
             * We're essentially searching for the installed package in the current dir, and requiring from its node_modules.
             * `package.json` serves as a target to resolve the root of the package.
             */
            requirePgltPackage = (0, node_module_1.createRequire)(require.resolve(pgltPackageNameJson, {
                paths: [path.fsPath], // note: global ~/.node_modules is always searched
            }));
        }
        catch (err) {
            if (err instanceof Error &&
                err.message.toLowerCase().includes("cannot find module")) {
                logger_1.logger.debug(`User does not use node_modules`);
                return null;
            }
            else {
                throw err;
            }
        }
        logger_1.logger.debug("Created require function!");
        const packageName = constants_1.CONSTANTS.platformSpecificNodePackageName;
        if (packageName === undefined) {
            logger_1.logger.debug(`No package for current platform available in node_modules`, {
                os: process.platform,
                arch: process.arch,
            });
            return null;
        }
        logger_1.logger.debug(`Resolving bin package at nested ${packageName}/package.json`);
        const binPackage = (0, node_path_1.dirname)(requirePgltPackage.resolve(`${packageName}/package.json`));
        logger_1.logger.debug(`Resolved binpackage`, { binPackage });
        const pgltPath = (0, node_path_1.join)(binPackage, constants_1.CONSTANTS.platformSpecificBinaryName);
        const pglt = vscode_1.Uri.file(pgltPath);
        if (await (0, utils_1.fileExists)(pglt)) {
            return pglt;
        }
        logger_1.logger.debug(`Unable to find PGLT in path ${pgltPath}`);
        return null;
    },
};
exports.yarnPnpStrategy = {
    name: "Yarn PnP Strategy",
    async find(path) {
        logger_1.logger.debug("Trying to find PGLT binary in Yarn Plug'n'Play");
        if (!path) {
            logger_1.logger.debug("No local path, skipping.");
            return null;
        }
        for (const ext of ["cjs", "js"]) {
            const pnpFile = vscode_1.Uri.joinPath(path, `.pnp.${ext}`);
            if (!(await (0, utils_1.fileExists)(pnpFile))) {
                logger_1.logger.debug(`Couldn't find Plug'n'Play file with ext '${ext}'`);
                continue;
            }
            /**
             * Load the pnp file, so we can use the exported
             * `resolveRequest` method.
             *
             * `resolveRequest(request, issuer)` takes a request for a dependency and an issuer
             * that depends on said dependency.
             */
            const yarnPnpApi = require(pnpFile.fsPath);
            /**
             * Issue a request to the PGLT package.json from the current dir.
             */
            const pgltPackage = yarnPnpApi.resolveRequest(`${constants_1.CONSTANTS.npmPackageName}/package.json`, path.fsPath);
            if (!pgltPackage) {
                logger_1.logger.debug("Unable to find PGLT package via Yarn Plug'n'Play API");
                continue;
            }
            const packageName = constants_1.CONSTANTS.platformSpecificNodePackageName;
            if (packageName === undefined) {
                logger_1.logger.debug(`No package for current platform available in yarn pnp`, {
                    os: process.platform,
                    arch: process.arch,
                });
                return null;
            }
            /**
             * Return URI to the platform-specific binary that the found main package depends on.
             */
            return vscode_1.Uri.file(yarnPnpApi.resolveRequest(`${packageName}/${constants_1.CONSTANTS.platformSpecificBinaryName}`, pgltPackage));
        }
        logger_1.logger.debug("Couldn't find PGLT binary via Yarn Plug'n'Play");
        return null;
    },
};
exports.pathEnvironmentVariableStrategy = {
    name: "PATH Env Var Strategy",
    async find() {
        const pathEnv = process.env.PATH;
        logger_1.logger.debug("Trying to find PGLT binary in PATH env var");
        if (!pathEnv) {
            logger_1.logger.debug("Path env var not found");
            return null;
        }
        for (const dir of pathEnv.split(node_path_1.delimiter)) {
            logger_1.logger.debug(`Checking ${dir}`);
            const pglt = vscode_1.Uri.joinPath(vscode_1.Uri.file(dir), constants_1.CONSTANTS.platformSpecificBinaryName);
            if (await (0, utils_1.fileExists)(pglt)) {
                return pglt;
            }
        }
        logger_1.logger.debug("Couldn't determine binary in PATH env var");
        return null;
    },
};
exports.downloadPgltStrategy = {
    name: "Download PGLT Strategy",
    async find() {
        logger_1.logger.debug(`Trying to find downloaded PGLT binary`);
        const downloadedVersion = await (0, downloader_1.getDownloadedVersion)();
        if (downloadedVersion) {
            logger_1.logger.info(`Using previously downloaded version ${downloadedVersion.version} at ${downloadedVersion.binPath.fsPath}`);
            return downloadedVersion.binPath;
        }
        const proceed = (await vscode_1.window.showInformationMessage("You've opened a supported file outside of a PGLT project, and no installed PGLT binary could not be found on your system. Would you like to download and install PGLT?", "Download and install", "No")) === "Download and install";
        if (!proceed) {
            logger_1.logger.debug(`Decided not to download binary, aborting`);
            return null;
        }
        return await (0, downloader_1.downloadPglt)();
    },
};
//# sourceMappingURL=binary-finder-strategies.js.map