// Command migrate applies one explicit Goose migration kind.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/pressly/goose/v3"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/database"
)

const (
	migrationKindSchema = "schema"
	migrationKindSeed   = "seed"
	migrationKindAll    = "all"
)

// Goose's legacy package API keeps dialect and version-table configuration as
// process-global state. CLI invocations are separate processes; this mutex also
// makes the command deterministic when run() is exercised in-process by tests.
var gooseMu sync.Mutex

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	kind, err := parseArguments(args)
	if err != nil {
		return err
	}

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}
	db, err := database.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := db.Close(); closeErr != nil {
			slog.Error("close database pool", "error", closeErr)
		}
	}()

	for _, migrationKind := range migrationKinds(kind) {
		if err := applyMigrations(ctx, db.SQL, migrationKind); err != nil {
			return err
		}
	}

	slog.Info("migrations applied", "kind", kind)
	return nil
}

func applyMigrations(ctx context.Context, sqlDB *sql.DB, kind string) error {
	gooseMu.Lock()
	defer gooseMu.Unlock()

	directory := migrationDirectory(kind)
	hasMigrations, err := hasSQLMigrations(directory)
	if err != nil {
		return err
	}
	if !hasMigrations {
		slog.Info("no migrations to apply", "kind", kind, "directory", directory)
		return nil
	}

	if err := goose.SetDialect(database.DriverPostgres); err != nil {
		return fmt.Errorf("set Goose dialect: %w", err)
	}
	goose.SetTableName(migrationTableName(kind))
	if err := goose.UpContext(ctx, sqlDB, directory); err != nil {
		return fmt.Errorf("apply %s migrations: %w", kind, err)
	}
	return nil
}

func hasSQLMigrations(directory string) (bool, error) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return false, fmt.Errorf("read migration directory %s: %w", directory, err)
	}
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			return true, nil
		}
	}
	return false, nil
}

func parseArguments(args []string) (string, error) {
	if len(args) == 0 || args[0] != "up" {
		return "", errors.New("usage: migrate up [--kind schema|seed|all]")
	}

	flags := flag.NewFlagSet("migrate up", flag.ContinueOnError)
	flags.SetOutput(os.Stderr)
	kind := flags.String("kind", migrationKindSchema, "migration kind: schema, seed, or all")
	if err := flags.Parse(args[1:]); err != nil {
		return "", fmt.Errorf("parse migration flags: %w", err)
	}
	if flags.NArg() != 0 {
		return "", errors.New("usage: migrate up [--kind schema|seed|all]")
	}
	if *kind != migrationKindSchema && *kind != migrationKindSeed && *kind != migrationKindAll {
		return "", fmt.Errorf("migration kind must be %q, %q, or %q", migrationKindSchema, migrationKindSeed, migrationKindAll)
	}
	return *kind, nil
}

func migrationDirectory(kind string) string {
	return filepath.Join("migrations", kind)
}

func migrationTableName(kind string) string {
	return "goose_" + kind + "_db_version"
}

func migrationKinds(kind string) []string {
	if kind == migrationKindAll {
		return []string{migrationKindSchema, migrationKindSeed}
	}
	return []string{kind}
}
