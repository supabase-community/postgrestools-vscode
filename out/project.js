"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveProject = getActiveProject;
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
const config_1 = require("./config");
const logger_1 = require("./logger");
async function getActiveProject() {
    const folders = vscode_1.workspace.workspaceFolders;
    if (!folders?.length) {
        logger_1.logger.warn(`No workspace folders. Single-file Mode?`);
        return null;
    }
    if (folders.length > 1) {
        vscode_1.window.showErrorMessage("PGLT does not support Multi-Root workspace mode for now.");
        return null;
    }
    return getActiveProjectForSingleFolder(folders[0]);
}
async function getActiveProjectForSingleFolder(first) {
    let configPath;
    const userConfig = (0, config_1.getConfig)("configFile", { scope: first.uri });
    if (userConfig) {
        logger_1.logger.info("User has specified path to config file.", {
            path: userConfig,
        });
        configPath = vscode_1.Uri.joinPath(first.uri, userConfig);
    }
    else {
        logger_1.logger.info("User did not specify path to config file. Using default.");
        configPath = vscode_1.Uri.joinPath(first.uri, "pglt.toml");
    }
    if (!(await (0, utils_1.fileExists)(configPath))) {
        logger_1.logger.info("Config file does not exist.", {
            path: configPath.fsPath,
        });
        return null;
    }
    else {
        logger_1.logger.info("Found config file.", {
            path: configPath.fsPath,
        });
    }
    return {
        folder: first,
        path: first.uri,
        configPath,
    };
}
//# sourceMappingURL=project.js.map