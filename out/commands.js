"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFacingCommands = void 0;
const vscode_1 = require("vscode");
const downloader_1 = require("./downloader");
const lifecycle_1 = require("./lifecycle");
const logger_1 = require("./logger");
const state_1 = require("./state");
const utils_1 = require("./utils");
/**
 * These commands are exposed to the user via the Command Palette.
 */
class UserFacingCommands {
    static async start() {
        await (0, lifecycle_1.start)();
    }
    static async stop() {
        await (0, lifecycle_1.stop)();
    }
    static async restart() {
        await (0, lifecycle_1.restart)();
    }
    /**
     * When calling this command, the user will be prompted to select a version of
     * the PGLT CLI to install. The selected version will be downloaded and stored
     * in VS Code's global storage directory.
     */
    static async download() {
        await (0, downloader_1.downloadPglt)();
    }
    /**
     * Stops and restarts the PGLT extension, resetting state and cleaning up temporary binaries.
     */
    static async reset() {
        await (0, lifecycle_1.stop)();
        await (0, utils_1.clearTemporaryBinaries)();
        await (0, utils_1.clearGlobalBinaries)();
        await state_1.state.context.globalState.update("downloadedVersion", undefined);
        state_1.state.activeSession = undefined;
        state_1.state.activeProject = undefined;
        logger_1.logger.info("PGLT extension was reset");
        await (0, lifecycle_1.start)();
    }
    static async currentVersion() {
        const result = await (0, downloader_1.getDownloadedVersion)();
        if (!result) {
            vscode_1.window.showInformationMessage("No PGLT version installed.");
        }
        else {
            vscode_1.window.showInformationMessage(`Currently installed PGLT version is ${result.version}.`);
        }
    }
}
exports.UserFacingCommands = UserFacingCommands;
//# sourceMappingURL=commands.js.map