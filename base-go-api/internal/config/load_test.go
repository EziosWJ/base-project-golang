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
database:
  url: postgres://localhost:5432/base_file?sslmode=disable
  username: yaml-user
  password: yaml-password
jwt:
  secret: yaml-secret
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
	t.Setenv("APP_DATABASE__USERNAME", "environment-user")
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
	if cfg.Database.URL != "postgres://localhost:5432/base_file?sslmode=disable" {
		t.Errorf("Database.URL = %q, want YAML value", cfg.Database.URL)
	}
	if cfg.Database.Username != "environment-user" {
		t.Errorf("Database.Username = %q, want environment-user", cfg.Database.Username)
	}
	if cfg.Database.Password != "yaml-password" {
		t.Errorf("Database.Password = %q, want YAML value", cfg.Database.Password)
	}
	if cfg.JWT.Secret != "test-only-secret" {
		t.Error("JWT secret from environment was not loaded")
	}
	if cfg.JWT.TTL != 2*time.Hour {
		t.Errorf("JWT.TTL = %s, want 2h", cfg.JWT.TTL)
	}
}

func TestLoadFromDirRequiresDatabaseAndJWTConfiguration(t *testing.T) {
	dir := t.TempDir()
	writeConfig(t, dir, "config.yaml", "{}\n")
	t.Setenv("APP_ENV", "test")

	_, err := LoadFromDir(dir)
	if err == nil {
		t.Fatal("LoadFromDir() error = nil, want required database and JWT configuration error")
	}
	for _, want := range []string{"database.url is required", "database.username is required", "database.password is required", "jwt.secret is required"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("LoadFromDir() error = %v, want containing %q", err, want)
		}
	}
}

// TestLoadFromDirDevSucceedsWithoutEnvironmentYAML documents that the actual
// environment YAML is optional: with only config.yaml present, APP_ENV=dev
// and APP_ overrides must still produce the intended development settings.
// This is exactly what Docker Compose relies on, since it never sees a
// config.dev.yaml inside the image.
func TestLoadFromDirDevSucceedsWithoutEnvironmentYAML(t *testing.T) {
	dir := t.TempDir()
	writeConfig(t, dir, "config.yaml", `
swagger:
  enabled: false
database:
  url: postgres://postgres:5432/base_go_api?sslmode=disable
log:
  level: info
  format: json
`)
	t.Setenv("APP_ENV", "dev")
	t.Setenv("APP_DATABASE__USERNAME", "compose-user")
	t.Setenv("APP_DATABASE__PASSWORD", "compose-password")
	t.Setenv("APP_JWT__SECRET", "compose-secret")
	t.Setenv("APP_SWAGGER__ENABLED", "true")
	t.Setenv("APP_LOG__LEVEL", "debug")
	t.Setenv("APP_LOG__FORMAT", "text")

	cfg, err := LoadFromDir(dir)
	if err != nil {
		t.Fatalf("LoadFromDir() without environment YAML error = %v", err)
	}

	if cfg.Environment != EnvironmentDev {
		t.Errorf("Environment = %q, want dev", cfg.Environment)
	}
	if cfg.Swagger.Enabled != true {
		t.Errorf("Swagger.Enabled = %v, want true from APP_ override", cfg.Swagger.Enabled)
	}
	if cfg.Log.Level != "debug" || cfg.Log.Format != "text" {
		t.Errorf("Log = (%s, %s), want (debug, text) from APP_ overrides", cfg.Log.Level, cfg.Log.Format)
	}
	if cfg.Database.Username != "compose-user" || cfg.Database.Password != "compose-password" {
		t.Errorf("Database.Username/Password = (%s, %s), want compose env values", cfg.Database.Username, cfg.Database.Password)
	}
	if cfg.JWT.Secret != "compose-secret" {
		t.Errorf("JWT.Secret = %q, want compose env value", cfg.JWT.Secret)
	}
}

func writeConfig(t *testing.T, dir, name, contents string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(contents), 0o600); err != nil {
		t.Fatalf("WriteFile(%q) error = %v", name, err)
	}
}
