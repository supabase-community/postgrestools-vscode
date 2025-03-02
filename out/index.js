"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const logger_1 = require("./logger");
const state_1 = require("./state");
const extension_1 = require("./extension");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function activate(context) {
    logger_1.logger.clear();
    logger_1.logger.info(`PGLT extension ${context.extension.packageJSON.version} activated`);
    state_1.state.context = context;
    await (0, extension_1.createExtension)();
}
// This method is called when your extension is deactivated
async function deactivate() {
    await (0, extension_1.destroyExtension)();
}
//# sourceMappingURL=index.js.map