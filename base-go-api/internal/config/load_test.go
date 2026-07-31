package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLoadFromDirUsesFixedPrecedence(t *testing.T) {
	dir := t.TempDir()
	writeConfig(t, dir, "config.yaml", `
service:
  name: base-file
http:
  address: ":8081"
log:
  level: info
  format: json
`)
	writeConfig(t, dir, "config.test.yaml", `
service:
  name: environment-file
http:
  address: ":8082"
log:
  level: warn
  format: text
`)

	t.Setenv("APP_ENV", "TEST")
	t.Setenv("APP_SERVICE__NAME", "environment-variable")
	t.Setenv("APP_HTTP__ADDRESS", ":9090")
	t.Setenv("APP_CORS__ALLOWED_ORIGINS", "https://admin.example, https://ops.example")
	t.Setenv("APP_DATABASE__DSN", "postgres://test:test@localhost/test?sslmode=disable")
	t.Setenv("APP_JWT__SECRET", "test-only-secret")

	cfg, err := LoadFromDir(dir)
	if err != nil {
		t.Fatalf("LoadFromDir() error = %v", err)
	}

	if cfg.Environment != EnvironmentTest {
		t.Fatalf("Environment = %q, want %q", cfg.Environment, EnvironmentTest)
	}
	if cfg.Service.Name != "environment-variable" {
		t.Errorf("Service.Name = %q, want environment-variable", cfg.Service.Name)
	}
	if cfg.HTTP.Address != ":9090" {
		t.Errorf("HTTP.Address = %q, want :9090", cfg.HTTP.Address)
	}
	if cfg.Log.Level != "warn" {
		t.Errorf("Log.Level = %q, want environment YAML value warn", cfg.Log.Level)
	}
	if cfg.Log.Format != "text" {
		t.Errorf("Log.Format = %q, want environment YAML value text", cfg.Log.Format)
	}
	wantOrigins := []string{"https://admin.example", "https://ops.example"}
	if len(cfg.CORS.AllowedOrigins) != len(wantOrigins) {
		t.Fatalf("CORS.AllowedOrigins = %#v, want %#v", cfg.CORS.AllowedOrigins, wantOrigins)
	}
	for i := range wantOrigins {
		if cfg.CORS.AllowedOrigins[i] != wantOrigins[i] {
			t.Errorf("CORS.AllowedOrigins[%d] = %q, want %q", i, cfg.CORS.AllowedOrigins[i], wantOrigins[i])
		}
	}
	if cfg.Database.DSN == "" || cfg.JWT.Secret == "" {
		t.Error("secrets from environment were not loaded")
	}
	if cfg.JWT.TTL != 2*time.Hour {
		t.Errorf("JWT.TTL = %s, want 2h", cfg.JWT.TTL)
	}
}

func TestLoadFromDirRequiresEnvironmentSecrets(t *testing.T) {
	tests := []struct {
		name       string
		dsn        string
		secret     string
		wantErrSub string
	}{
		{name: "database DSN", secret: "test-only-secret", wantErrSub: "database.dsn is required"},
		{name: "JWT secret", dsn: "postgres://test:test@localhost/test?sslmode=disable", wantErrSub: "jwt.secret is required"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			writeConfig(t, dir, "config.yaml", "{}\n")
			t.Setenv("APP_ENV", "test")
			t.Setenv("APP_DATABASE__DSN", tt.dsn)
			t.Setenv("APP_JWT__SECRET", tt.secret)

			_, err := LoadFromDir(dir)
			if err == nil || !strings.Contains(err.Error(), tt.wantErrSub) {
				t.Fatalf("LoadFromDir() error = %v, want containing %q", err, tt.wantErrSub)
			}
		})
	}
}

func TestLoadFromDirRejectsSecretsInYAML(t *testing.T) {
	tests := []struct {
		name        string
		base        string
		environment string
		wantErrSub  string
	}{
		{
			name:       "database DSN in base YAML",
			base:       "database:\n  dsn: postgres://must-not-be-here\n",
			wantErrSub: "database.dsn must not be set in YAML",
		},
		{
			name:        "JWT secret in environment YAML",
			base:        "{}\n",
			environment: "jwt:\n  secret: must-not-be-here\n",
			wantErrSub:  "jwt.secret must not be set in YAML",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			writeConfig(t, dir, "config.yaml", tt.base)
			if tt.environment != "" {
				writeConfig(t, dir, "config.test.yaml", tt.environment)
			}
			t.Setenv("APP_ENV", "test")
			t.Setenv("APP_DATABASE__DSN", "postgres://test:test@localhost/test?sslmode=disable")
			t.Setenv("APP_JWT__SECRET", "test-only-secret")

			_, err := LoadFromDir(dir)
			if err == nil || !strings.Contains(err.Error(), tt.wantErrSub) {
				t.Fatalf("LoadFromDir() error = %v, want containing %q", err, tt.wantErrSub)
			}
		})
	}
}

func TestCommittedYAMLContainsNoSecrets(t *testing.T) {
	files, err := filepath.Glob(filepath.Join("..", "..", "configs", "*.yaml"))
	if err != nil {
		t.Fatalf("Glob() error = %v", err)
	}
	if len(files) == 0 {
		t.Fatal("no committed YAML configuration found")
	}

	for _, name := range files {
		contents, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("ReadFile(%q) error = %v", name, err)
		}
		for _, forbidden := range []string{"dsn:", "secret:"} {
			if strings.Contains(strings.ToLower(string(contents)), forbidden) {
				t.Errorf("%s contains forbidden secret key %q", name, forbidden)
			}
		}
	}
}

func writeConfig(t *testing.T, dir, name, contents string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(contents), 0o600); err != nil {
		t.Fatalf("WriteFile(%q) error = %v", name, err)
	}
}
