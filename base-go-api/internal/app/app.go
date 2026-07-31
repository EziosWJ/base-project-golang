// Package app wires infrastructure dependencies into the HTTP application.
package app

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	platformhttp "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/http"
)

// Application is the assembled HTTP application and its process logger.
type Application struct {
	Router *gin.Engine
	Logger *slog.Logger
}

// New assembles the HTTP router. Database readiness is supplied by the caller
// so that the application layer does not depend on a concrete database driver.
func New(cfg config.Config, readiness platformhttp.ReadinessChecker) (*Application, error) {
	logger, err := newLogger(cfg)
	if err != nil {
		return nil, err
	}

	router := gin.New()
	router.Use(
		platformhttp.RequestMetadata(),
		platformhttp.RequestLogger(logger),
		platformhttp.Recovery(logger),
		platformhttp.CORS(platformhttp.CORSConfig{
			AllowedOrigins: cfg.CORS.AllowedOrigins,
			AllowedMethods: cfg.CORS.AllowedMethods,
			AllowedHeaders: cfg.CORS.AllowedHeaders,
			ExposedHeaders: cfg.CORS.ExposedHeaders,
			MaxAge:         cfg.CORS.MaxAge,
		}),
	)
	router.NoRoute(platformhttp.NotFoundHandler)

	platformhttp.RegisterSystemRoutes(router, platformhttp.SystemRoutes{
		Readiness: readiness,
	})

	if cfg.Environment == config.EnvironmentDev && cfg.Swagger.Enabled {
		registerSwaggerUI(router)
	}

	return &Application{Router: router, Logger: logger}, nil
}

// Build constructs a router for callers that do not need the process logger.
func Build(cfg config.Config, readiness platformhttp.ReadinessChecker) (*gin.Engine, error) {
	application, err := New(cfg, readiness)
	if err != nil {
		return nil, err
	}
	return application.Router, nil
}

func newLogger(cfg config.Config) (*slog.Logger, error) {
	level := new(slog.LevelVar)
	if err := level.UnmarshalText([]byte(cfg.Log.Level)); err != nil {
		return nil, fmt.Errorf("parse log level: %w", err)
	}

	options := &slog.HandlerOptions{
		AddSource: cfg.Log.AddSource,
		Level:     level,
	}
	if cfg.Log.Format == "text" {
		return slog.New(slog.NewTextHandler(os.Stdout, options)), nil
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, options)), nil
}
