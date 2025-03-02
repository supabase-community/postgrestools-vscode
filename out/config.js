"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnabledForFolder = exports.getConfig = void 0;
const vscode_1 = require("vscode");
/**
 * This function retrieves a setting from the workspace configuration.
 * Settings are looked up under the "pglt" prefix.
 *
 * @param key The key of the setting to retrieve
 */
const getConfig = (key, options = {}) => {
    return vscode_1.workspace.getConfiguration("pglt", options.scope).get(key);
};
exports.getConfig = getConfig;
/**
 * TODO: Can the "state.activeProject" also refer to a workspace, or just to a workspace-folder?
 */
const isEnabledForFolder = (folder) => {
    return !!(0, exports.getConfig)("enabled", { scope: folder.uri });
};
exports.isEnabledForFolder = isEnabledForFolder;
//# sourceMappingURL=config.js.map