# Multi Root

A multi-root workspace that does not specify any setting overwrites.

## Expectations

The extension should prompt the user to download a `postgrestools` binary, but only once. It should recognize the separate project's `postgrestools.jsonc` files, connecting with a different database per project. The extension should not be activated in the `project-no-jsonc` and `project-disabled` folders, since the first has no config file, and the latter is disabled via its `.vscode/settings.json`.

## Test protocol

0. Follow the instructions in `GLOBAL_SETUP.md`.
1. Run another postgres database on :54322 (`supabase start` in any project will launch a db that listens on that port).
2. The extension should work as expected in all `test.sql` files.
