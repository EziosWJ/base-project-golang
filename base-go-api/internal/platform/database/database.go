// Package database owns long-lived database infrastructure.
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
)

const DriverPostgres = "postgres"

// Database contains the single process-wide GORM handle and the database/sql
// connection pool underneath it. Neither API startup nor this package executes
// schema migrations or GORM AutoMigrate.
type Database struct {
	GORM *gorm.DB
	SQL  *sql.DB
}

// Open creates the PostgreSQL GORM handle, configures its underlying pool, and
// verifies the connection before returning it.
func Open(ctx context.Context, cfg config.DatabaseConfig) (*Database, error) {
	dialector, err := newDialector(cfg)
	if err != nil {
		return nil, err
	}
	if ctx == nil {
		ctx = context.Background()
	}

	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open GORM database: %w", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("get database/sql pool: %w", err)
	}
	configurePool(sqlDB, cfg)
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Database{GORM: gormDB, SQL: sqlDB}, nil
}

// Ready satisfies the HTTP readiness-check contract without exposing a driver
// concern to Handlers or Services.
func (d *Database) Ready(ctx context.Context) error {
	if d == nil || d.SQL == nil {
		return errors.New("database pool is not initialized")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := d.SQL.PingContext(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}
	return nil
}

func (d *Database) Close() error {
	if d == nil || d.SQL == nil {
		return nil
	}
	return d.SQL.Close()
}

func newDialector(cfg config.DatabaseConfig) (gorm.Dialector, error) {
	if cfg.Driver != DriverPostgres {
		return nil, fmt.Errorf("database driver %q is not supported in the PostgreSQL-first release", cfg.Driver)
	}
	if strings.TrimSpace(cfg.DSN) == "" {
		return nil, errors.New("database.dsn is required")
	}
	return postgres.Open(cfg.DSN), nil
}

func configurePool(sqlDB *sql.DB, cfg config.DatabaseConfig) {
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
}
