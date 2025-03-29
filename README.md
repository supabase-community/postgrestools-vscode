# PostgresTools Extension for VS Code

The **PostgresTools extension for Visual Studio Code** brings PostgreSQL inline suggestions, linting, and type checks to VSCode and VSCode-based editors.

## Dependencies

1. You need a `postgrestools.jsonc` file at the root of your repository (or, use a custom file location and point to it via the `postgrestools.configFile` setting.)
2. You need an LSP binary.

## The LSP Binary

The VSCode extension looks for the [`postgrestools`](https://github.com/supabase-community/postgres_lsp) binary and uses it to start an LSP background process. It then creates a VSCode LSP Client and connects it to the server.

It'll try five strategies to find the binary, in the following order:

1. The `postgrestools.bin` VSCode setting can point to a binary with relative or absolute paths.
2. If you have installed `@postgrestools/postgrestools` via node_modules, the extension will look for the matching binary in your `node_modules`.
3. If you have installed `@postgrestools/postgrestools` via Yarn Plug'n'Play, the extension will check your `.pnp.cjs` file for a binary.
4. The extension will scan your $PATH for a `postgrestools` on Darwin/Linux or `postgrestools.exe` on Windows.
5. If no binary will be found **and you have no `package.json` at the root of your repository**, you will be prompted to download a binary from `postgrestools`'s Github Releases. You can always download a CLI version via VSCode's Command Palette. (If you want to download prereleases, set `postgrestools.allowDownloadPrereleaes` in your VSCode settings.)

To connect to your database, `postgrestools` needs to read a `postgrestools.jsonc` config file. By default, the extension will look for that file in your repository. You can specify an alternative path via the `postgrestools.configFile` VSCode setting.

## Issues

If you experience any issues, please report them at the [postgres language server](https://github.com/supabase-community/postgres-language-server) repository – we'll most frequently read issues there.
