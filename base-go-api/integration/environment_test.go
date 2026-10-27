//go:build integration

package integration

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
)

type temporaryPostgres struct {
	container string
	name      string
	dsn       string
}

// Resources belong to the test process, not the first test that requests them.
// Keep tests serial: existing Goose round-trip tests mutate package global state.
var integrationSuite struct {
	postgresOnce  sync.Once
	postgres      temporaryPostgres
	postgresErr   error
	databaseID    atomic.Uint64
	migrationOnce sync.Once
	migrationDir  string
	migrationPath string
	migrationErr  error
	templateOnce  sync.Once
	templateErr   error
}

func TestMain(m *testing.M) {
	code := m.Run()
	if integrationSuite.postgres.container != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		output, err := exec.CommandContext(ctx, "docker", "rm", "--force", integrationSuite.postgres.container).CombinedOutput()
		cancel()
		if err != nil {
			fmt.Fprintf(os.Stderr, "clean up temporary PostgreSQL: %v\n%s", err, output)
			code = 1
		}
	}
	if integrationSuite.migrationDir != "" {
		if err := os.RemoveAll(integrationSuite.migrationDir); err != nil {
			fmt.Fprintf(os.Stderr, "clean up migration executable: %v\n", err)
			code = 1
		}
	}
	os.Exit(code)
}

// startPostgres creates an empty database for migration and restore contracts.
func startPostgres(t *testing.T) temporaryPostgres {
	t.Helper()
	ensureSuitePostgres(t)
	return createTestDatabase(t, "template0")
}

// startBusinessPostgres clones the suite's migrated, connection-disabled template.
// The template lives until TestMain removes the container, never a test cleanup.
func startBusinessPostgres(t *testing.T) temporaryPostgres {
	t.Helper()
	ensureSuitePostgres(t)
	template := namedPostgres(t, "integration_template")
	root := projectRoot(t)
	executable := migrationExecutable(t, root)
	environment := integrationEnvironment(t, template.dsn, config.EnvironmentTest)
	integrationSuite.templateOnce.Do(func() {
		if err := executeAdminSQL("CREATE DATABASE " + template.name + " TEMPLATE template0"); err != nil {
			integrationSuite.templateErr = fmt.Errorf("create business template: %w", err)
			return
		}
		if err := executeMigrations(root, executable, environment); err != nil {
			integrationSuite.templateErr = err
			return
		}
		// The migration subprocess has closed its pool; prevent accidental clients
		// from connecting to the template and blocking subsequent database clones.
		integrationSuite.templateErr = executeAdminSQL("ALTER DATABASE " + template.name + " ALLOW_CONNECTIONS false")
	})
	if err := integrationSuite.templateErr; err != nil {
		t.Fatalf("prepare migrated business template: %v", err)
	}
	return createTestDatabase(t, template.name)
}

func ensureSuitePostgres(t *testing.T) {
	t.Helper()
	integrationSuite.postgresOnce.Do(func() {
		integrationSuite.postgresErr = startSuitePostgres()
	})
	if err := integrationSuite.postgresErr; err != nil {
		t.Fatalf("prepare shared temporary PostgreSQL: %v", err)
	}
}

func namedPostgres(t *testing.T, name string) temporaryPostgres {
	t.Helper()
	database := integrationSuite.postgres
	database.name = name
	parsed, err := url.Parse(database.dsn)
	if err != nil {
		t.Fatal(err)
	}
	parsed.Path = "/" + name
	database.dsn = parsed.String()
	return database
}

func createTestDatabase(t *testing.T, template string) temporaryPostgres {
	t.Helper()
	database := namedPostgres(t, fmt.Sprintf("integration_%d", integrationSuite.databaseID.Add(1)))
	// Names are generated internally from constants and the monotonic counter.
	if err := executeAdminSQL("CREATE DATABASE " + database.name + " TEMPLATE " + template); err != nil {
		t.Fatalf("create isolated database from %s: %v", template, err)
	}
	t.Cleanup(func() {
		// FORCE also closes connections left behind by a failed test.
		if err := executeAdminSQL("DROP DATABASE " + database.name + " WITH (FORCE)"); err != nil {
			t.Errorf("drop isolated database %s: %v", database.name, err)
		}
	})
	return database
}

func startSuitePostgres() error {
	container := fmt.Sprintf("server-integration-%d-%d", os.Getpid(), time.Now().UnixNano())
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	command := exec.CommandContext(ctx, "docker", "run", "--detach", "--rm", "--name", container,
		"--env", "POSTGRES_DB=integration", "--env", "POSTGRES_USER=integration",
		"--env", "POSTGRES_PASSWORD=integration-password", "--publish", "127.0.0.1::5432", postgresImage)
	// Register before starting so setup failures also pass through process cleanup.
	integrationSuite.postgres.container = container
	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf("start container: %w\n%s", err, output)
	}
	output, err := exec.CommandContext(ctx, "docker", "port", container, "5432/tcp").Output()
	if err != nil {
		return fmt.Errorf("resolve port: %w", err)
	}
	_, port, err := net.SplitHostPort(strings.TrimSpace(string(output)))
	if err != nil {
		return fmt.Errorf("parse port: %w", err)
	}
	integrationSuite.postgres.dsn = "postgres://integration:integration-password@127.0.0.1:" + port + "/integration?sslmode=disable"
	connection, err := sql.Open("pgx", integrationSuite.postgres.dsn)
	if err != nil {
		return err
	}
	defer connection.Close()
	deadline := time.Now().Add(45 * time.Second)
	readyStreak := 0
	for time.Now().Before(deadline) {
		pingCtx, pingCancel := context.WithTimeout(ctx, time.Second)
		err = connection.PingContext(pingCtx)
		pingCancel()
		if err == nil {
			readyStreak++
			if readyStreak >= 2 {
				return nil
			}
		} else {
			readyStreak = 0
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("authenticated SQL connections not ready within 45 seconds: %v", err)
}

func executeAdminSQL(statement string) error {
	connection, err := sql.Open("pgx", integrationSuite.postgres.dsn)
	if err != nil {
		return err
	}
	defer connection.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_, err = connection.ExecContext(ctx, statement)
	return err
}

func migrationExecutable(t *testing.T, root string) string {
	t.Helper()
	integrationSuite.migrationOnce.Do(func() {
		dir, err := os.MkdirTemp("", "weighbridge-integration-migrate-")
		if err != nil {
			integrationSuite.migrationErr = err
			return
		}
		integrationSuite.migrationDir = dir
		name := "migrate"
		if runtime.GOOS == "windows" {
			name += ".exe"
		}
		integrationSuite.migrationPath = filepath.Join(dir, name)
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		// This disposable test binary needs no VCS stamp (including in linked worktrees).
		command := exec.CommandContext(ctx, "go", "build", "-buildvcs=false", "-o", integrationSuite.migrationPath, "./cmd/migrate")
		command.Dir = root
		if output, err := command.CombinedOutput(); err != nil {
			integrationSuite.migrationErr = fmt.Errorf("build migration executable: %w\n%s", err, output)
		}
	})
	if err := integrationSuite.migrationErr; err != nil {
		t.Fatal(err)
	}
	return integrationSuite.migrationPath
}

func executeMigrations(root, executable string, environment []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	command := exec.CommandContext(ctx, executable, "up", "--kind", "all")
	command.Dir = root
	command.Env = environment
	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf("run migrations: %w\n%s", err, output)
	}
	return nil
}

func TestPostgresBusinessTemplateIsolation(t *testing.T) {
	first := startBusinessPostgres(t)
	db, err := sql.Open("pgx", first.dsn)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("CREATE TABLE isolation_probe (id serial PRIMARY KEY); INSERT INTO isolation_probe DEFAULT VALUES"); err != nil {
		t.Fatal(err)
	}
	var expectedID int64
	if err = db.QueryRow("SELECT nextval(pg_get_serial_sequence('sys_user','id'))").Scan(&expectedID); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec("UPDATE sys_user SET nickname='isolation-probe' WHERE id=1"); err != nil {
		t.Fatal(err)
	}
	if err = db.Close(); err != nil {
		t.Fatal(err)
	}
	second := startBusinessPostgres(t)
	other, err := sql.Open("pgx", second.dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer other.Close()
	var exists sql.NullString
	if err = other.QueryRow("SELECT to_regclass('public.isolation_probe')").Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if exists.Valid {
		t.Fatal("clone inherited another test's table")
	}
	var nickname string
	if err = other.QueryRow("SELECT nickname FROM sys_user WHERE id=1").Scan(&nickname); err != nil || nickname == "isolation-probe" {
		t.Fatalf("seed data leaked: nickname=%q err=%v", nickname, err)
	}
	var actualID int64
	if err = other.QueryRow("SELECT nextval(pg_get_serial_sequence('sys_user','id'))").Scan(&actualID); err != nil || actualID != expectedID {
		t.Fatalf("sequence leaked: got=%d want=%d err=%v", actualID, expectedID, err)
	}
	var version int
	if err = other.QueryRow("SELECT count(*) FROM goose_schema_db_version WHERE is_applied").Scan(&version); err != nil || version == 0 {
		t.Fatalf("template missing migrated schema: count=%d err=%v", version, err)
	}
}
