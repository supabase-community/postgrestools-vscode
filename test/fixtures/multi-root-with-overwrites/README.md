# Multi Root with Overwrites

A multi-root workspace that specifies the binary and overwrites the config file globally.

## Expectations

The extension should not ask for any binaries and work out of the box (the binary is aarch64 darwin). It should ignore the separate project's `postgrestools.jsonc` files and only use the database specified in the `config/postgrestools.jsonc`.

## Test protocol

0. Follow the instructions in `GLOBAL_SETUP.md`.
1. Adjust the paths in `test.code-workspace` such that they match your system.
2. Run another postgres database on :54322 (`supabase start` in any project will launch a db that listens on that port).
3. The extension should work as expected in all `test.sql` files.
