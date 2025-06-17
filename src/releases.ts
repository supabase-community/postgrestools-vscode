import { window } from "vscode";
import { logger } from "./logger";
import { getConfig } from "./config";
import { state } from "./state";
import { daysToMs } from "./utils";

export type Release = {
  tag_name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
};

const CACHE_KEY = "releases";

type Cached = {
  cachedAt: string;
  releases: Release[];
};

async function setCache(releases: Release[] | null) {
  await state.context.globalState.update(
    CACHE_KEY,
    releases
      ? ({
          releases,
          cachedAt: new Date().toISOString(),
        } satisfies Cached)
      : undefined
  );
}

async function fromCache(): Promise<Release[] | null> {
  logger.debug(`Searching for releases in cache.`);
  const cached = state.context.globalState.get<Cached>(CACHE_KEY);

  if (!cached) {
    logger.debug(`No cached releases found.`);
    await setCache(null);
    return null;
  }

  if (Date.now() - new Date(cached.cachedAt).getTime() >= daysToMs(3)) {
    logger.debug(`Stale cached releases found. Invalidating.`);
    await setCache(null);
    return null;
  }

  return cached.releases;
}

export class Releases {
  private constructor(private releases: Release[]) {}

  static async load() {
    const releases =
      (await fromCache()) || (await fromGithub().catch(() => []));

    logger.debug(`Found ${releases.length} downloadable versions`, {
      prereleases: releases.filter((r) => r.prerelease).length,
    });

    return new Releases(releases);
  }

  static async refresh() {
    await setCache(null);
  }

  all(): Readonly<Release>[] {
    if (this.prereleaseEnabled()) {
      return this.releases;
    } else {
      return this.releases.filter((r) => !r.prerelease);
    }
  }

  versionOutdated(tag_name: string) {
    if (!(getConfig<boolean>("allowVersionChecks") ?? true)) {
      return false;
    }

    const prereleaseEnabled = this.prereleaseEnabled();

    const idx = this.releases
      .filter((r) => prereleaseEnabled || !r.prerelease)
      .findIndex((r) => r.tag_name === tag_name);

    if (idx === -1) {
      return true;
    }

    if (idx >= 3) {
      return true;
    }
  }

  latestVersion(): string | null {
    if (this.releases.length > 0) {
      return this.releases[0].tag_name;
    } else {
      return null;
    }
  }

  private prereleaseEnabled() {
    const withPrereleases =
      getConfig<boolean>("allowDownloadPrereleases") ?? false;

    return withPrereleases;
  }
}

async function fromGithub(): Promise<Release[]> {
  logger.debug("Fetching releases from GitHub API.");

  let page = 1;
  let perPage = 100;
  let exhausted = false;

  const releases = [];

  while (!exhausted) {
    const queryParams = new URLSearchParams();

    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());

    const response = await fetch(
      `https://api.github.com/repos/supabase-community/postgres_lsp/releases?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      const body = await response.json();
      window.showErrorMessage(
        `Could not fetch releases from GitHub! Received Status Code: ${response.status}, Body: ${body}`
      );
      return [];
    }

    const results = (await response.json()) as Release[];

    if (results.length === 0) {
      window.showErrorMessage("No releases found on GitHub.");
      return [];
    }

    releases.push(...results);

    if (page > 30) {
      // sanity
      exhausted = true;
    } else if (results.length < perPage) {
      exhausted = true;
    } else {
      page++;
    }
  }

  const filteredAndSorted = releases
    .filter((r) => !r.draft)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

  await setCache(filteredAndSorted);

  return filteredAndSorted;
}
