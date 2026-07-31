# Seed migrations

This directory is intentionally empty until a feature issue owns the required
business tables and built-in data.

Seed migrations must:

- use normal versioned Goose SQL files;
- contain built-in data only, never table or index definitions;
- run after all schema migrations, using the separate
  `goose_seed_version` version table;
- remain one-time migrations and never be replayed by API startup logic.

Do not add placeholder users, roles, menus, dictionaries, or system settings.
Their owning migration issues must define the tables and seed data together.
