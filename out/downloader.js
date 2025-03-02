"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPglt = downloadPglt;
exports.getDownloadedVersion = getDownloadedVersion;
const vscode_1 = require("vscode");
const logger_1 = require("./logger");
const state_1 = require("./state");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const config_1 = require("./config");
const fs_1 = require("fs");
const releases_1 = require("./releases");
async function downloadPglt() {
    logger_1.logger.debug(`Downloading PGLT`);
    const versionToDownload = await promptVersionToDownload();
    if (!versionToDownload) {
        logger_1.logger.debug(`No version to download selected, aborting`);
        return null;
    }
    await vscode_1.window.withProgress({
        title: `Downloading PGLT ${versionToDownload.label}`,
        location: vscode_1.ProgressLocation.Notification,
    }, () => downloadPgltVersion(versionToDownload.label));
    const downloaded = await getDownloadedVersion();
    return downloaded?.binPath ?? null;
}
async function downloadPgltVersion(version) {
    const url = `https://github.com/supabase-community/postgres_lsp/releases/download/${version}/${constants_1.CONSTANTS.platformSpecificReleasedAssetName}`;
    logger_1.logger.debug(`Attempting to download binary asset from Github`, { url });
    let binary;
    try {
        binary = await fetch(url, {
            headers: {
                Accept: "application/octet-stream",
            },
        })
            .then((r) => r.blob())
            .then((b) => b.arrayBuffer());
    }
    catch (error) {
        logger_1.logger.error(`Failed to download binary`, { error });
        vscode_1.window.showErrorMessage(`Failed to download binary version ${version} from ${url}.\n\n${error}`);
        return;
    }
    const binPath = getInstalledBinaryPath();
    try {
        await vscode_1.workspace.fs.writeFile(binPath, new Uint8Array(binary));
        (0, fs_1.chmodSync)(binPath.fsPath, 0o755);
        const successMsg = `Downloaded PGLT ${version} to ${binPath.fsPath}`;
        logger_1.logger.info(successMsg);
        vscode_1.window.showInformationMessage(successMsg);
        state_1.state.context.globalState.update("downloadedVersion", version);
    }
    catch (error) {
        logger_1.logger.error(`Failed to save downloaded binary`, { error });
        vscode_1.window.showErrorMessage(`Failed to save binary.\n\n${error}`);
        return;
    }
}
async function getDownloadedVersion() {
    logger_1.logger.debug(`Getting downloaded version`);
    const version = state_1.state.context.globalState.get("downloadedVersion");
    if (!version) {
        logger_1.logger.debug(`No downloaded version stored in global state context.`);
        return null;
    }
    const binPath = getInstalledBinaryPath();
    if (await (0, utils_1.fileExists)(binPath)) {
        logger_1.logger.debug(`Found downloaded version and binary`, {
            path: binPath.fsPath,
            version,
        });
        return {
            binPath,
            version,
        };
    }
    logger_1.logger.info(`Downloaded version found in global state context, but binary does not exist.`, {
        binPath,
        version,
    });
    return null;
}
async function promptVersionToDownload() {
    logger_1.logger.debug(`Prompting user to select PGLT version to download`);
    const itemsPromise = new Promise(async (resolve) => {
        const downloadedVersion = await getDownloadedVersion()
            .then((it) => it?.version)
            .catch(() => undefined);
        logger_1.logger.debug(`Retrieved downloaded version`, { downloadedVersion });
        const withPrereleases = (0, config_1.getConfig)("allowDownloadPrereleases") ?? false;
        const availableVersions = await (0, releases_1.getAllReleases)({
            withPrereleases,
        }).catch(() => []);
        logger_1.logger.debug(`Found ${availableVersions.length} downloadable versions`, {
            withPrereleases,
        });
        const items = availableVersions.map((release, index) => {
            const descriptions = [];
            if (index === 0) {
                descriptions.push("latest");
            }
            if (release.prerelease) {
                descriptions.push("prerelease");
            }
            return {
                label: release.tag_name,
                description: descriptions.join(", "),
                detail: downloadedVersion === release.tag_name
                    ? "(currently installed)"
                    : "",
                alwaysShow: index < 3,
            };
        });
        resolve(items);
    });
    return vscode_1.window.showQuickPick(itemsPromise, {
        title: "Select PGLT version to download",
        placeHolder: "Select PGLT version to download",
    });
}
function getInstalledBinaryPath() {
    return vscode_1.Uri.joinPath(state_1.state.context.globalStorageUri, constants_1.CONSTANTS.globalStorageFolderForBinary, constants_1.CONSTANTS.platformSpecificBinaryName);
}
//# sourceMappingURL=downloader.js.map