"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = debounce;
exports.fileExists = fileExists;
exports.dirExists = dirExists;
exports.clearTemporaryBinaries = clearTemporaryBinaries;
exports.clearGlobalBinaries = clearGlobalBinaries;
exports.subtractURI = subtractURI;
exports.fileIsExecutable = fileIsExecutable;
const vscode_1 = require("vscode");
const logger_1 = require("./logger");
const state_1 = require("./state");
const constants_1 = require("./constants");
const node_fs_1 = require("node:fs");
function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        setTimeout(() => fn(...args), delay);
    };
}
async function fileExists(uri) {
    try {
        const result = await vscode_1.workspace.fs.stat(uri);
        /** the file can also be a symlink, hence the bitwise operation */
        return (result.type & vscode_1.FileType.File) > 0;
    }
    catch (err) {
        if (err instanceof Error && err.message.includes("ENOENT")) {
            return false;
        }
        else {
            logger_1.logger.debug(`Error verifying if file exists, uri: ${uri}, err: ${err}`);
            return false;
        }
    }
}
async function dirExists(uri) {
    try {
        const result = await vscode_1.workspace.fs.stat(uri);
        /** the file can also be a symlink, hence the bitwise operation */
        return (result.type & vscode_1.FileType.Directory) > 0;
    }
    catch (err) {
        logger_1.logger.debug(`Error verifying if dir exists, uri: ${uri}, err: ${err}`);
        return false;
    }
}
/**
 * This function clears any temporary binaries that may have been created by
 * the extension. It deletes the `CONSTANTS.globalStorageFolderTmp` directory within the global storage
 * directory.
 */
async function clearTemporaryBinaries() {
    logger_1.logger.debug("Clearing temporary binaries");
    const binDirPath = vscode_1.Uri.joinPath(state_1.state.context.globalStorageUri, constants_1.CONSTANTS.globalStorageFolderTmp);
    if (await dirExists(binDirPath)) {
        vscode_1.workspace.fs.delete(binDirPath, {
            recursive: true,
        });
        logger_1.logger.debug("Cleared temporary binaries.", {
            path: binDirPath.fsPath,
        });
    }
}
async function clearGlobalBinaries() {
    logger_1.logger.debug("Clearing global binaries");
    const binDirPath = vscode_1.Uri.joinPath(state_1.state.context.globalStorageUri, constants_1.CONSTANTS.globalStorageFolderForBinary);
    if (await dirExists(binDirPath)) {
        vscode_1.workspace.fs.delete(binDirPath, {
            recursive: true,
        });
        logger_1.logger.debug("Cleared global binaries.", {
            path: binDirPath.fsPath,
        });
    }
}
/**
 * Substracts the second string from the first string
 */
function subtractURI(original, subtract) {
    const _original = original.fsPath;
    const _subtract = subtract.fsPath;
    let result = _original.replace(_subtract, "");
    result = result === "" ? "/" : result;
    return vscode_1.Uri.parse(result);
}
/**
 * Checks if a file is executable
 *
 * This function checks if a file is executable using Node's `accessSync` function.
 * It returns true if the file is executable, otherwise it returns false.
 *
 * This is used to ensure that downloaded PGLT binaries are executable.
 */
function fileIsExecutable(uri) {
    try {
        (0, node_fs_1.accessSync)(uri.fsPath, node_fs_1.constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=utils.js.map