"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restart = exports.stop = exports.start = void 0;
const logger_1 = require("./logger");
const session_1 = require("./session");
const state_1 = require("./state");
/**
 * Starts the PGLT extension
 */
const start = async () => {
    state_1.state.state = "starting";
    await doStart();
    state_1.state.state = "started";
    logger_1.logger.info("PGLT extension started");
};
exports.start = start;
/**
 * Stops the PGLT extension
 */
const stop = async () => {
    state_1.state.state = "stopping";
    await doStop();
    state_1.state.state = "stopped";
    logger_1.logger.info("PGLT extension stopped");
};
exports.stop = stop;
const restart = async () => {
    if (state_1.state.state === "restarting") {
        // If we are already restarting, we can skip the restart
        return;
    }
    state_1.state.state = "restarting";
    await doStop();
    await doStart();
    state_1.state.state = "started";
    logger_1.logger.info("PGLT extension restarted");
};
exports.restart = restart;
const doStart = async () => {
    try {
        await (0, session_1.createActiveSession)();
    }
    catch (e) {
        if (e instanceof Error) {
            logger_1.logger.error(e.message);
        }
        logger_1.logger.error("Failed to start PGLT extension", { error: e });
        state_1.state.state = "error";
    }
};
const doStop = async () => {
    // If we end up here following a configuration change, we need to wait
    // for the notification to be processed before we can stop the LSP session,
    // otherwise we will get an error. This is a workaround for a race condition
    // that occurs when the configuration change notification is sent while the
    // LSP session is already stopped.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (state_1.state.activeSession) {
        (0, session_1.destroySession)(state_1.state.activeSession);
    }
};
//# sourceMappingURL=lifecycle.js.map