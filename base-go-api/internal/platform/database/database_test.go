package database

import (
	"context"
	"strings"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
)

func TestNewDialectorUsesPostgresWithoutConnecting(t *testing.T) {
	dialector, err := newDialector(config.DatabaseConfig{
		Driver: DriverPostgres,
		DSN:    "postgres://unused:unused@127.0.0.1:1/unused",
	})
	if err != nil {
		t.Fatalf("newDialector() error = %v", err)
	}
	if got := dialector.Name(); got != DriverPostgres {
		t.Fatalf("dialector name = %q, want %q", got, DriverPostgres)
	}
}

func TestNewDialectorRejectsUnsupportedDriverAndEmptyDSN(t *testing.T) {
	_, err := newDialector(config.DatabaseConfig{Driver: "mysql", DSN: "unused"})
	if err == nil || !strings.Contains(err.Error(), "not supported") {
		t.Fatalf("unsupported driver error = %v", err)
	}

	_, err = newDialector(config.DatabaseConfig{Driver: DriverPostgres})
	if err == nil || !strings.Contains(err.Error(), "database.dsn") {
		t.Fatalf("empty DSN error = %v", err)
	}
}

func TestReadyRejectsUninitializedPoolWithoutConnecting(t *testing.T) {
	var database Database
	err := database.Ready(context.Background())
	if err == nil || !strings.Contains(err.Error(), "not initialized") {
		t.Fatalf("Ready() error = %v", err)
	}
	if err := database.Close(); err != nil {
		t.Fatalf("Close() error = %v", err)
	}
}
