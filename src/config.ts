import {
  type ConfigurationScope,
  WorkspaceConfiguration,
  type WorkspaceFolder,
  workspace,
} from "vscode";

/**
 * This function retrieves a setting from the workspace configuration.
 * Settings are looked up under the "postgrestools" prefix.
 *
 * @param key The key of the setting to retrieve
 */
export const getFullConfig = (
  options: {
    scope?: ConfigurationScope;
  } = {}
): WorkspaceConfiguration | undefined => {
  return workspace.getConfiguration("postgrestools", options.scope);
};

/**
 * This function retrieves a setting from the workspace configuration.
 * Settings are looked up under the "postgrestools" prefix.
 *
 * @param key The key of the setting to retrieve
 */
export const getConfig = <T>(
  key: string,
  options: {
    scope?: ConfigurationScope;
  } = {}
): T | undefined => {
  return workspace.getConfiguration("postgrestools", options.scope).get<T>(key);
};

export const isEnabledForFolder = (folder: WorkspaceFolder): boolean => {
  return !!getConfig<boolean>("enabled", { scope: folder.uri });
};
