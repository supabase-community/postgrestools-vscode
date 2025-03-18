import { window } from "vscode";
import { downloadPglt, getDownloadedVersion } from "./downloader";
import { restart, start, stop } from "./lifecycle";
import { logger } from "./logger";
import { state } from "./state";
import { clearGlobalBinaries, clearTemporaryBinaries } from "./utils";

/**
 * These commands are exposed to the user via the Command Palette.
 */
export class UserFacingCommands {
  static async start() {
    await start();
  }

  static async stop() {
    await stop();
  }

  static async restart() {
    await restart();
  }

  /**
   * When calling this command, the user will be prompted to select a version of
   * the PostgresTools CLI to install. The selected version will be downloaded and stored
   * in VS Code's global storage directory.
   */
  static async download() {
    await downloadPglt();
  }

  /**
   * Stops and restarts the PostgresTools extension, resetting state and cleaning up temporary binaries.
   */
  static async reset() {
    await stop();
    await clearTemporaryBinaries();
    await clearGlobalBinaries();
    await state.context.globalState.update("downloadedVersion", undefined);
    state.activeSession = undefined;
    state.activeProject = undefined;
    logger.info("PostgresTools extension was reset");
    await start();
  }

  static async currentVersion() {
    const result = await getDownloadedVersion();
    if (!result) {
      window.showInformationMessage("No PostgresTools version installed.");
    } else {
      window.showInformationMessage(
        `Currently installed PostgresTools version is ${result.version}.`
      );
    }
  }
}
