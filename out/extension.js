"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destroyExtension = exports.createExtension = void 0;
const vscode_1 = require("vscode");
const commands_1 = require("./commands");
const lifecycle_1 = require("./lifecycle");
const logger_1 = require("./logger");
const state_1 = require("./state");
const utils_1 = require("./utils");
const status_bar_1 = require("./status-bar");
/**
 * This function is responsible for booting the PGLT extension. It is called
 * when the extension is activated.
 */
const createExtension = async () => {
    registerUserFacingCommands();
    await (0, lifecycle_1.start)();
    listenForConfigurationChanges();
    listenForActiveTextEditorChange();
};
exports.createExtension = createExtension;
/**
 * This function is responsible for shutting down the PGLT extension. It is
 * called when the extension is deactivated and will trigger a cleanup of the
 * extension's state and resources.
 */
const destroyExtension = async () => {
    await (0, lifecycle_1.stop)();
};
exports.destroyExtension = destroyExtension;
const registerUserFacingCommands = () => {
    state_1.state.context.subscriptions.push(vscode_1.commands.registerCommand("pglt.start", commands_1.UserFacingCommands.start), vscode_1.commands.registerCommand("pglt.stop", commands_1.UserFacingCommands.stop), vscode_1.commands.registerCommand("pglt.restart", commands_1.UserFacingCommands.restart), vscode_1.commands.registerCommand("pglt.download", commands_1.UserFacingCommands.download), vscode_1.commands.registerCommand("pglt.reset", commands_1.UserFacingCommands.reset), vscode_1.commands.registerCommand("pglt.currentVersion", commands_1.UserFacingCommands.currentVersion));
    logger_1.logger.info("User-facing commands registered");
};
/**
 * This function sets up a listener for configuration changes in the `pglt`
 * namespace. When a configuration change is detected, the extension is
 * restarted to reflect the new configuration.
 */
const listenForConfigurationChanges = () => {
    const debouncedConfigurationChangeHandler = (0, utils_1.debounce)((event) => {
        if (event.affectsConfiguration("pglt")) {
            logger_1.logger.info("Configuration change detected.");
            if (!["restarting", "stopping"].includes(state_1.state.state)) {
                (0, lifecycle_1.restart)();
            }
        }
    });
    state_1.state.context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(debouncedConfigurationChangeHandler));
    logger_1.logger.info("Started listening for configuration changes");
};
/**
 * This function listens for changes to the active text editor and updates the
 * active project accordingly. This change is then reflected throughout the
 * extension automatically. Notably, this triggers the status bar to update
 * with the active project.
 */
const listenForActiveTextEditorChange = () => {
    state_1.state.context.subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor((editor) => {
        (0, status_bar_1.updateHidden)(editor);
    }));
    logger_1.logger.info("Started listening for active text editor changes");
    (0, status_bar_1.updateHidden)(vscode_1.window.activeTextEditor);
};
//# sourceMappingURL=extension.js.map