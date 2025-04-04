# PostgresTools Extension for VS Code

The **PostgresTools extension for Visual Studio Code** brings PostgreSQL inline suggestions, linting, and type checks to VSCode and VSCode-based editors.

It does so by implementing an [Language Server Protocol (LSP)](#whats-an-lsp) client and launching an LSP Server in the background.

## What's an LSP?

The [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) is a protocol defined by Microsoft. Its goal is to standardize language features across many editors. If you use a modern IDE and you've ever used autocompletion or linting, you've used an LSP. The server is aware of the files you have opened and analyzes them in the background. The client sends requests for e.g. autocompletions or code actions to the server.

## Setting Up the LSP Server

**First**, you need the LSP server binary. The [Postgres language server](https://github.com/supabase-community/postgres-language-server) is written in Rust and is therefore compiled to various binaries for various machines. You can set up the binary via one of five strategies. The extensions will check them in the following order:

- The `postgrestools.bin` VSCode setting can point to a binary with relative or absolute paths. You can use this if you want to download a specific binary from one of the [Postgres language server](https://github.com/supabase-community/postgres-language-server) releases and place it in your project.
- **Recommended**: If you use node, you can simply run `npm i -D @postgrestools/postgrestools`. Once you restart the extension, it should look for the server binary in your `node_modules`.
- If you use node but you install your packages via Yarn Plug'n'Play, you can still install `@postgrestools/postgrestools`, and the extension will check your `.pnp.cjs` file for a binary.
- You can install the LSP server globally (e.g. via `brew` or by downloading a binary from the GitHub releases). Make sure that its binary is exposed in your $PATH – the extension will search it for a `postgrestools` on Darwin/Linux or a `postgrestools.exe` on Windows.
- If no LSP server binary can be found via the above strategies, **and you have no `package.json` at the root of your repository**, you will be prompted to download a binary from `postgrestools`'s Github Releases. You can also do this later via the [Download Server Command](#useful-commands). Note that the above strategies will still take precedence.

The found binary is copied to a temporary location in your VS Code extensions folder and run from there. When you restart the extension, the copied binary will be used, and the above places won't be searched.

## Setting Up Your Project

**Second**, you need a `postgrestools.jsonc` file at the root of your repository (or, use a custom file location and point to it via the `postgrestools.configFile` setting.). You can find sane defaults in the [docs](https://pgtools.dev/#configuration).

When you specify the `db` section, the LSP server will connect to your database and gather intel from there. This makes it possible to provide autocompletions and type checks.

If you omit the section, on the other hand, those features won't be enabled, and you'll only get linting.

## Verify It Works

To verify that the server is installed and running correctly, you can use the "Get Current Version" command listed in [Useful Commands](#useful-commands).

To verify that the client works as intended, open a `.sql` file and write some gibberish – you should get red squiggly lines from `pg(syntax)`.

## Working With Supabase

The Postgres language server is not custom-tailored to work with Supabase – it works with any Postgres database.

If you do use Supabase, you can get the most of the LSP by using it against your local Supabase database (Here's how to [install the Supabase CLI](https://supabase.com/docs/guides/local-development)).

Once you have [everything running locally](https://supabase.com/docs/guides/local-development/cli/getting-started), run `supabase status` to see your local `DB URL`.

It'll have the following format: `postgresql://<username>:<password>@<host>:<port>/<database>`.

If you extract the values, add them to your `postgrestools.jsonc` file, and restart the extension, you should be ready to go.

You can also run the LSP server against your remote database, but this might lead to small latencies and a small performance overhead (the LSP server runs `prepare` statements against your database for the type checking).

You should find your remote database settings at `https://supabase.com/dashboard/project/<yourProjectId>/settings/database?showConnect=true`.

## Useful Commands

The extension adds six commands to your VS Code Command Palette. They are all prefixed by `PostgresTools`.

- `PostgresTools: Hard Reset (Delete All Temp and Global Binaries)` is your troubleshooting weapon. It will basically remove all binaries that were copied and downloaded _by the extension_ (not those you have installed or copied yourself). The extension will then again search for a server binary via the strategies mentioned in [the setup](#setting-up-the-lsp-server).
- `PostgresTools: Download Server` lets you select and download the server binary. It'll be the matching version for your machine. If you set `postgrestools.allowDownloadPrereleases` to true in yor VS Code settings, you'll be able to select prereleases.
- `PostgresTools: Get Current Version` will print the current version if the LSP server is running.
- `PostgresTools: Start` and `PostgresTools: Stop` will stop or start the LSP server and the client.
- `PostgresTools: Restart` runs stop and start in succession.

## Troubleshooting

1. First, try restarting the extension via the `PostgresTools: Hard Reset (...)` command mentioned above.
2. Open your VS Code Terminal, select the tab `Output`, and select one of the `postgrestools` extensions on the right. You might see what went wrong in the logs.

## Issues

If you experience any issues, please report them at the [postgres language server](https://github.com/supabase-community/postgres-language-server) repository – we'll most frequently read issues there.
