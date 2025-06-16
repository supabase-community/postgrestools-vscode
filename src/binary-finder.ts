import { Uri } from "vscode";
import {
  BinaryFindStrategy,
  downloadPgltStrategy,
  nodeModulesStrategy,
  pathEnvironmentVariableStrategy,
  vsCodeSettingsStrategy,
  yarnPnpStrategy,
} from "./binary-finder-strategies";
import { logger } from "./logger";

type Strategy = {
  label: string;
  strategy: BinaryFindStrategy;
  onSuccess: (u: Uri) => void;
  condition?: (path?: Uri) => Promise<boolean>;
};

const LOCAL_STRATEGIES: Strategy[] = [
  {
    label: "VSCode Settings",
    strategy: vsCodeSettingsStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in VSCode Settings (postgrestools.bin)`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "NPM node_modules",
    strategy: nodeModulesStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in Node Modules`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "Yarn Plug'n'Play node_modules",
    strategy: yarnPnpStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in Yarn PnP`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "PATH Environment Variable",
    strategy: pathEnvironmentVariableStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in PATH Environment Variable`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "Downloaded Binary",
    strategy: downloadPgltStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found downloaded binary`, {
        path: uri.fsPath,
      }),
  },
];
const GLOBAL_STRATEGIES: Strategy[] = [
  {
    label: "VSCode Settings",
    strategy: vsCodeSettingsStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in VSCode Settings (postgrestools.bin)`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "PATH Environment Variable",
    strategy: pathEnvironmentVariableStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found Binary in PATH Environment Variable`, {
        path: uri.fsPath,
      }),
  },
  {
    label: "Downloaded Binary",
    strategy: downloadPgltStrategy,
    onSuccess: (uri) =>
      logger.debug(`Found downloaded binary`, {
        path: uri.fsPath,
      }),
  },
];

export class BinaryFinder {
  static async findGlobally() {
    logger.info("Using Global Strategies to find binary");
    const binary = await this.attemptFind(GLOBAL_STRATEGIES);

    if (!binary) {
      logger.debug("Unable to find binary globally.");
    }

    return binary;
  }

  static async findLocally(path: Uri) {
    logger.info("Using Local Strategies to find binary");
    const binary = await this.attemptFind(LOCAL_STRATEGIES, path);

    if (!binary) {
      logger.debug("Unable to find binary locally.");
    }

    return binary;
  }

  private static async attemptFind(strategies: Strategy[], path?: Uri) {
    for (const { strategy, onSuccess, condition, label } of strategies) {
      if (condition && !(await condition(path))) {
        continue;
      }

      try {
        const binary = await strategy.find(path);
        if (binary) {
          onSuccess(binary);
          return { bin: binary, label };
        } else {
          logger.info(`Binary not found with strategy`, {
            strategy: strategy.name,
          });
        }
      } catch (err: unknown) {
        logger.error(`${strategy.name} returned an error`, { err });
        continue;
      }
    }
  }
}
