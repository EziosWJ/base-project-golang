# base-go-api

Go-zero REST service replacing the Java API. The frontend contract remains `/api/**` with the response envelope `{code,message,data}`.

## Local setup

1. Install Go 1.23 or newer.
2. Copy `etc/basegoapi-api.yaml` to a local, untracked configuration file and set `DatabaseURL` to a PostgreSQL 17 database, for example:

   ```yaml
   DatabaseURL: postgres://<user>:<password>@<host>:5432/base_project_golang?sslmode=disable
   ```

3. Create the empty `base_project_golang` database, then run migrations:

   ```bash
   go run ./cmd/migrate -f etc/basegoapi-api.yaml
   ```

4. Start the API:

   ```bash
   go run . -f etc/basegoapi-api.yaml
   ```

The initial administrator is `admin` and its password is the local `DefaultPassword` configuration (default: `admin123`). Do not commit database credentials.
