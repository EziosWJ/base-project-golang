package config

import (
	"errors"
	"fmt"
	"net"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	// DefaultDir is the configuration directory used by Load.
	DefaultDir = "configs"

	EnvironmentDev  = "dev"
	EnvironmentTest = "test"
	EnvironmentProd = "prod"
)

// Config contains all process-level configuration. Secrets are intentionally
// represented here, but the loader only accepts them from APP_ environment
// variables and never from YAML files.
type Config struct {
	Environment string         `koanf:"env"`
	Service     ServiceConfig  `koanf:"service"`
	HTTP        HTTPConfig     `koanf:"http"`
	Swagger     SwaggerConfig  `koanf:"swagger"`
	CORS        CORSConfig     `koanf:"cors"`
	Database    DatabaseConfig `koanf:"database"`
	File        FileConfig     `koanf:"file"`
	JWT         JWTConfig      `koanf:"jwt"`
	Log         LogConfig      `koanf:"log"`
}

type ServiceConfig struct {
	Name string `koanf:"name"`
}

type HTTPConfig struct {
	Address         string        `koanf:"address"`
	ReadTimeout     time.Duration `koanf:"read_timeout"`
	WriteTimeout    time.Duration `koanf:"write_timeout"`
	IdleTimeout     time.Duration `koanf:"idle_timeout"`
	ShutdownTimeout time.Duration `koanf:"shutdown_timeout"`
}

type SwaggerConfig struct {
	Enabled bool `koanf:"enabled"`
}

type CORSConfig struct {
	AllowedOrigins   []string      `koanf:"allowed_origins"`
	AllowedMethods   []string      `koanf:"allowed_methods"`
	AllowedHeaders   []string      `koanf:"allowed_headers"`
	ExposedHeaders   []string      `koanf:"exposed_headers"`
	MaxAge           time.Duration `koanf:"max_age"`
	AllowCredentials bool          `koanf:"allow_credentials"`
}

type DatabaseConfig struct {
	Driver          string        `koanf:"driver"`
	DSN             string        `koanf:"dsn"`
	MaxOpenConns    int           `koanf:"max_open_conns"`
	MaxIdleConns    int           `koanf:"max_idle_conns"`
	ConnMaxLifetime time.Duration `koanf:"conn_max_lifetime"`
	ConnMaxIdleTime time.Duration `koanf:"conn_max_idle_time"`
}
type FileConfig struct {
	StorageRoot string `koanf:"storage_root"`
}

type JWTConfig struct {
	Secret   string        `koanf:"secret"`
	Issuer   string        `koanf:"issuer"`
	Audience string        `koanf:"audience"`
	TTL      time.Duration `koanf:"ttl"`
}

type LogConfig struct {
	Level     string `koanf:"level"`
	Format    string `koanf:"format"`
	AddSource bool   `koanf:"add_source"`
}

// Validate rejects invalid startup configuration before infrastructure is
// created. This keeps configuration errors deterministic and close to startup.
func (c Config) Validate() error {
	var errs []error

	if !oneOf(c.Environment, EnvironmentDev, EnvironmentTest, EnvironmentProd) {
		errs = append(errs, fmt.Errorf("env must be one of dev, test, prod"))
	}
	if strings.TrimSpace(c.Service.Name) == "" {
		errs = append(errs, errors.New("service.name is required"))
	}

	if err := validateAddress(c.HTTP.Address); err != nil {
		errs = append(errs, err)
	}
	if c.HTTP.ReadTimeout <= 0 {
		errs = append(errs, errors.New("http.read_timeout must be greater than zero"))
	}
	if c.HTTP.WriteTimeout <= 0 {
		errs = append(errs, errors.New("http.write_timeout must be greater than zero"))
	}
	if c.HTTP.IdleTimeout <= 0 {
		errs = append(errs, errors.New("http.idle_timeout must be greater than zero"))
	}
	if c.HTTP.ShutdownTimeout <= 0 {
		errs = append(errs, errors.New("http.shutdown_timeout must be greater than zero"))
	}
	if c.Swagger.Enabled && c.Environment != EnvironmentDev {
		errs = append(errs, errors.New("swagger.enabled may only be true in dev"))
	}

	if len(c.CORS.AllowedOrigins) == 0 {
		errs = append(errs, errors.New("cors.allowed_origins must not be empty"))
	}
	if contains(c.CORS.AllowedOrigins, "*") && len(c.CORS.AllowedOrigins) != 1 {
		errs = append(errs, errors.New("cors.allowed_origins wildcard must be the only origin"))
	}
	if len(c.CORS.AllowedMethods) == 0 {
		errs = append(errs, errors.New("cors.allowed_methods must not be empty"))
	}
	if len(c.CORS.AllowedHeaders) == 0 {
		errs = append(errs, errors.New("cors.allowed_headers must not be empty"))
	}
	if c.CORS.MaxAge < 0 {
		errs = append(errs, errors.New("cors.max_age must not be negative"))
	}
	if c.CORS.AllowCredentials {
		errs = append(errs, errors.New("cors.allow_credentials must be false for Bearer Token authentication"))
	}

	if !oneOf(c.Database.Driver, "postgres", "mysql", "sqlite") {
		errs = append(errs, errors.New("database.driver must be one of postgres, mysql, sqlite"))
	}
	if strings.TrimSpace(c.Database.DSN) == "" {
		errs = append(errs, errors.New("database.dsn is required via APP_DATABASE__DSN"))
	}
	if c.Database.MaxOpenConns <= 0 {
		errs = append(errs, errors.New("database.max_open_conns must be greater than zero"))
	}
	if c.Database.MaxIdleConns < 0 {
		errs = append(errs, errors.New("database.max_idle_conns must not be negative"))
	}
	if c.Database.MaxOpenConns > 0 && c.Database.MaxIdleConns > c.Database.MaxOpenConns {
		errs = append(errs, errors.New("database.max_idle_conns must not exceed max_open_conns"))
	}
	if c.Database.ConnMaxLifetime < 0 {
		errs = append(errs, errors.New("database.conn_max_lifetime must not be negative"))
	}
	if c.Database.ConnMaxIdleTime < 0 {
		errs = append(errs, errors.New("database.conn_max_idle_time must not be negative"))
	}
	if !filepath.IsAbs(c.File.StorageRoot) {
		errs = append(errs, errors.New("file.storage_root must be an absolute path"))
	}

	if strings.TrimSpace(c.JWT.Secret) == "" {
		errs = append(errs, errors.New("jwt.secret is required via APP_JWT__SECRET"))
	}
	if strings.TrimSpace(c.JWT.Issuer) == "" {
		errs = append(errs, errors.New("jwt.issuer is required"))
	}
	if strings.TrimSpace(c.JWT.Audience) == "" {
		errs = append(errs, errors.New("jwt.audience is required"))
	}
	if c.JWT.TTL <= 0 {
		errs = append(errs, errors.New("jwt.ttl must be greater than zero"))
	}

	if !oneOf(c.Log.Level, "debug", "info", "warn", "error") {
		errs = append(errs, errors.New("log.level must be one of debug, info, warn, error"))
	}
	if !oneOf(c.Log.Format, "json", "text") {
		errs = append(errs, errors.New("log.format must be one of json, text"))
	}

	return errors.Join(errs...)
}

func validateAddress(address string) error {
	_, port, err := net.SplitHostPort(address)
	if err != nil {
		return fmt.Errorf("http.address must be in host:port form: %w", err)
	}

	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		return errors.New("http.address port must be between 1 and 65535")
	}

	return nil
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}

	return false
}

func oneOf(value string, allowed ...string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}

	return false
}
