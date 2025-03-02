"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusBar = exports.updateHidden = exports.updateStatusBar = void 0;
const vscode_1 = require("vscode");
const state_1 = require("./state");
const config_1 = require("./config");
const createStatusBar = () => {
    const item = vscode_1.window.createStatusBarItem("pglt_vscode", vscode_1.StatusBarAlignment.Right, 1);
    return { item };
};
const updateStatusBar = () => {
    if (!state_1.state) {
        return;
    }
    const enabled = state_1.state.activeProject?.folder &&
        (0, config_1.isEnabledForFolder)(state_1.state.activeProject.folder);
    if (!enabled || state_1.state.hidden) {
        exports.statusBar.item.hide();
        return;
    }
    const icon = getStateIcon(state_1.state);
    const text = getStateText();
    const version = getLspVersion();
    const tooltip = getStateTooltip();
    exports.statusBar.item.text = `${icon} ${text} ${version}`.trim();
    exports.statusBar.item.tooltip = tooltip;
    exports.statusBar.item.show();
};
exports.updateStatusBar = updateStatusBar;
const updateHidden = (editor) => {
    state_1.state.hidden =
        editor?.document === undefined || editor.document.languageId !== "sql";
};
exports.updateHidden = updateHidden;
const getLspVersion = () => {
    return (state_1.state.activeSession?.client.initializeResult?.serverInfo?.version ?? "");
};
const getStateText = () => {
    return "PGLT";
};
const getStateTooltip = () => {
    switch (state_1.state.state) {
        case "initializing":
            return "Initializing";
        case "starting":
            return "Starting";
        case "restarting":
            return "Restarting";
        case "started":
            return "Up and running";
        case "stopping":
            return "Stopping";
        case "stopped":
            return "Stopped";
        case "error":
            return "Error";
    }
};
const getStateIcon = (state) => {
    switch (state.state) {
        case "initializing":
            return "$(sync~spin)";
        case "starting":
            return "$(sync~spin)";
        case "restarting":
            return "$(sync~spin)";
        case "started":
            return "$(check)";
        case "stopping":
            return "$(sync~spin)";
        case "stopped":
            return "$(x)";
        case "error":
            return "$(error)";
        default:
            return "$(question)";
    }
};
exports.statusBar = createStatusBar();
//# sourceMappingURL=status-bar.js.map