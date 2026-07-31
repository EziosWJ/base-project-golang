//go:build integration

package integration

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	platformdatabase "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/database"
)

const postgresImage = "postgres:17-alpine"

func TestPostgresMigrationsUseEphemeralDatabase(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("Docker is required for PostgreSQL integration tests")
	}

	root := projectRoot(t)
	if _, err := os.Stat(filepath.Join(root, "cmd", "migrate")); errors.Is(err, os.ErrNotExist) {
		t.Skip("cmd/migrate is not available yet")
	} else if err != nil {
		t.Fatalf("inspect cmd/migrate: %v", err)
	}

	database := startPostgres(t)
	runMigrations(t, root, database.dsn)
	database.assertGooseSchemaVersionTable(t)
	verifyDatabaseReadiness(t, database.dsn)
}

type temporaryPostgres struct {
	container string
	dsn       string
}

func startPostgres(t *testing.T) temporaryPostgres {
	t.Helper()
	container := fmt.Sprintf("base-go-api-integration-%d", time.Now().UnixNano())
	password := "integration-password"
	command := exec.Command(
		"docker", "run", "--detach", "--rm", "--name", container,
		"--env", "POSTGRES_DB=integration",
		"--env", "POSTGRES_USER=integration",
		"--env", "POSTGRES_PASSWORD="+password,
		"--publish", "127.0.0.1::5432",
		postgresImage,
	)
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("start temporary PostgreSQL: %v\n%s", err, output)
	}
	t.Cleanup(func() {
		_ = exec.Command("docker", "rm", "--force", container).Run()
	})

	portOutput, err := exec.Command("docker", "port", container, "5432/tcp").Output()
	if err != nil {
		t.Fatalf("resolve temporary PostgreSQL port: %v", err)
	}
	_, port, err := net.SplitHostPort(strings.TrimSpace(string(portOutput)))
	if err != nil {
		t.Fatalf("parse temporary PostgreSQL port: %v", err)
	}

	database := temporaryPostgres{
		container: container,
		dsn:       "postgres://integration:" + password + "@127.0.0.1:" + port + "/integration?sslmode=disable",
	}
	database.waitUntilReady(t)
	return database
}

func (database temporaryPostgres) waitUntilReady(t *testing.T) {
	t.Helper()
	deadline := time.Now().Add(45 * time.Second)
	for time.Now().Before(deadline) {
		if err := exec.Command("docker", "exec", database.container, "pg_isready", "-U", "integration", "-d", "integration").Run(); err == nil {
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatal("temporary PostgreSQL did not become ready within 45 seconds")
}

func runMigrations(t *testing.T, root, dsn string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	command := exec.CommandContext(ctx, "go", "run", "./cmd/migrate", "up", "--kind", "all")
	command.Dir = root
	command.Env = integrationEnvironment(dsn)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("run migrations against temporary PostgreSQL: %v\n%s", err, output)
	}
}

func integrationEnvironment(dsn string) []string {
	environment := make([]string, 0, len(os.Environ())+3)
	for _, entry := range os.Environ() {
		if strings.HasPrefix(entry, "APP_DATABASE__DSN=") || strings.HasPrefix(entry, "APP_JWT__SECRET=") || strings.HasPrefix(entry, "APP_ENV=") {
			continue
		}
		environment = append(environment, entry)
	}
	return append(environment,
		"APP_ENV=test",
		"APP_DATABASE__DSN="+dsn,
		"APP_JWT__SECRET=integration-test-secret-that-is-never-deployed",
	)
}

func (database temporaryPostgres) assertGooseSchemaVersionTable(t *testing.T) {
	t.Helper()
	command := exec.Command("docker", "exec", database.container, "psql", "-U", "integration", "-d", "integration", "-tAc", "SELECT 1 FROM goose_schema_db_version LIMIT 1")
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("verify Goose schema migration table: %v\n%s", err, output)
	}
	if strings.TrimSpace(string(output)) != "1" {
		t.Fatalf("schema baseline version = %q, want 1", output)
	}
}

func verifyDatabaseReadiness(t *testing.T, dsn string) {
	t.Helper()
	database, err := platformdatabase.Open(context.Background(), config.DatabaseConfig{
		Driver:       platformdatabase.DriverPostgres,
		DSN:          dsn,
		MaxOpenConns: 2,
		MaxIdleConns: 1,
	})
	if err != nil {
		t.Fatalf("open database for readiness check: %v", err)
	}
	if err := database.Ready(context.Background()); err != nil {
		_ = database.Close()
		t.Fatalf("ready database returned error: %v", err)
	}
	if err := database.Close(); err != nil {
		t.Fatalf("close database after readiness check: %v", err)
	}
	if err := database.Ready(context.Background()); err == nil {
		t.Fatal("closed database was unexpectedly ready")
	}
}

func projectRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs("..")
	if err != nil {
		t.Fatalf("resolve project root: %v", err)
	}
	return root
}
