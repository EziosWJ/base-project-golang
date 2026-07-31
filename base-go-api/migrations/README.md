# Database migrations

Migrations are deliberately split by responsibility:

- `schema/` contains tables, indexes, constraints, and other schema changes.
- `seed/` contains built-in data that must be inserted exactly once.

Run schema migrations before seed migrations. Each directory must use its own
Goose version table (`goose_schema_db_version` and `goose_seed_db_version`), so the
same migration number in one stream cannot mark a migration in the other stream
as applied.

The API process must not run either stream automatically. The explicit migrate
command and deployment workflow own migration execution.
