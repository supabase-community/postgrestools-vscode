"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("./constants");
/**
 * Messages logged to this logger will be displayed in the `PGLT` output
 * channel in the Output panel. This logger respects the user's settings for
 * logging verbosity, so only messages with the appropriate log level will be
 * displayed.
 */
class Logger {
    output = vscode_1.window.createOutputChannel(`${constants_1.CONSTANTS.displayName} (${constants_1.CONSTANTS.activationTimestamp})`, {
        log: true,
    });
    log(message, level = vscode_1.LogLevel.Info, args) {
        if (args) {
            message += `\n\t${Object.entries(args)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join("\n\t")}`;
        }
        switch (level) {
            case vscode_1.LogLevel.Error:
                return this.output.error(message);
            case vscode_1.LogLevel.Warning:
                return this.output.warn(message);
            case vscode_1.LogLevel.Info:
                return this.output.info(message);
            case vscode_1.LogLevel.Debug:
                return this.output.debug(message);
            default:
                return this.output.debug(message);
        }
    }
    error(message, args) {
        this.log(message, vscode_1.LogLevel.Error, args);
    }
    warn(message, args) {
        this.log(message, vscode_1.LogLevel.Warning, args);
    }
    info(message, args) {
        this.log(message, vscode_1.LogLevel.Info, args);
    }
    debug(message, args) {
        this.log(message, vscode_1.LogLevel.Debug, args);
    }
    /**
     * Clears the logger
     *
     * This function does not actually clear the logger, but rather appends a
     * few newlines to the logger to ensure that the logger so that logs from a
     * previous run are visually separated from the current run. We need to do
     * this because of a bug in VS Code where the output channel is not cleared
     * properly when calling `clear()` on it.
     *
     * @see https://github.com/microsoft/vscode/issues/224516
     */
    clear() {
        this.output.append("\n\n\n\n\n");
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map