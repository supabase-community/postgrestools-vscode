"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReleases = getAllReleases;
const vscode_1 = require("vscode");
async function getAllReleases(opts) {
    let page = 1;
    let perPage = 100;
    let exhausted = false;
    const releases = [];
    while (!exhausted) {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("per_page", perPage.toString());
        const response = await fetch("https://api.github.com/repos/supabase-community/postgres_lsp/releases", {
            method: "GET",
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!response.ok) {
            const body = await response.json();
            vscode_1.window.showErrorMessage(`Could not fetch releases from GitHub! Received Status Code: ${response.status}, Body: ${body}`);
            return [];
        }
        const results = (await response.json());
        if (results.length === 0) {
            vscode_1.window.showErrorMessage('No releases found on GitHub. Suggestion: Set "pglt.allowDownloadPrereleases" to `true` in your vscode settings.');
            return [];
        }
        releases.push(...results);
        if (page > 30) {
            // sanity
            exhausted = true;
        }
        else if (results.length < perPage) {
            exhausted = true;
        }
        else {
            page++;
        }
    }
    return releases
        .filter((r) => !r.draft && // shouldn't be fetched without auth token, anyways
        (opts.withPrereleases || !r.prerelease))
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}
//# sourceMappingURL=releases.js.map