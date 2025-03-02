"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryFinder = void 0;
const vscode_1 = require("vscode");
const binary_finder_strategies_1 = require("./binary-finder-strategies");
const logger_1 = require("./logger");
const LOCAL_STRATEGIES = [
    {
        strategy: binary_finder_strategies_1.vsCodeSettingsStrategy,
        onSuccess: (uri) => logger_1.logger.debug(`Found Binary in VSCode Settings (pglt.lsp.bin)`, {
            path: uri.fsPath,
        }),
    },
    {
        strategy: binary_finder_strategies_1.nodeModulesStrategy,
        onSuccess: (uri) => logger_1.logger.debug(`Found Binary in Node Modules`, {
            path: uri.fsPath,
        }),
    },
    {
        strategy: binary_finder_strategies_1.yarnPnpStrategy,
        onSuccess: (uri) => logger_1.logger.debug(`Found Binary in Yarn PnP`, {
            path: uri.fsPath,
        }),
    },
    {
        strategy: binary_finder_strategies_1.pathEnvironmentVariableStrategy,
        onSuccess: (uri) => logger_1.logger.debug(`Found Binary in PATH Environment Variable`, {
            path: uri.fsPath,
        }),
    },
    {
        strategy: binary_finder_strategies_1.downloadPgltStrategy,
        onSuccess: (uri) => logger_1.logger.debug(`Found downloaded binary`, {
            path: uri.fsPath,
        }),
        /**
         * We don't want to encourage users downloading the binary if they
         * could also install it via `npm` (or other Node package managers).
         */
        condition: async (path) => !path || // `path` should never be falsy in a local strategy
            vscode_1.workspace
                .findFiles(new vscode_1.RelativePattern(path, "**/package.json"))
                .then((rs) => rs.length === 0),
    },
];
class BinaryFinder {
    static async find(path) {
        const binary = await this.attemptFind(LOCAL_STRATEGIES, path);
        if (!binary) {
            logger_1.logger.debug("Unable to find binary locally.");
        }
        return binary;
    }
    static async attemptFind(strategies, path) {
        for (const { strategy, onSuccess, condition } of strategies) {
            if (condition && !(await condition(path))) {
                continue;
            }
            try {
                const binary = await strategy.find(path);
                if (binary) {
                    onSuccess(binary);
                    return { bin: binary };
                }
                else {
                    logger_1.logger.info(`Binary not found with strategy`, {
                        strategy: strategy.name,
                    });
                }
            }
            catch (err) {
                logger_1.logger.error(`${strategy.name} returned an error`, { err });
                continue;
            }
        }
    }
}
exports.BinaryFinder = BinaryFinder;
//# sourceMappingURL=binary-finder.js.map