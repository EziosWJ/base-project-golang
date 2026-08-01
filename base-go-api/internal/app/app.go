// Package app wires infrastructure dependencies into the HTTP application.
package app

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/dept"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/dictionary"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/filemgmt"
	platformhttp "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/http"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/sysconfig"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/usermgmt"
)

// Application is the assembled HTTP application and its process logger.
type Application struct {
	Router *gin.Engine
	Logger *slog.Logger
}

// New assembles the HTTP router. Database readiness is supplied by the caller
// so that the application layer does not depend on a concrete database driver.
func New(cfg config.Config, readiness platformhttp.ReadinessChecker, authService *auth.Service, rbacService *rbac.Service, deptService *dept.Service, userService *usermgmt.Service, dictionaryService *dictionary.Service, configService *sysconfig.Service, fileService *filemgmt.Service) (*Application, error) {
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
	if authService != nil {
		handler, err := auth.NewHandler(authService, authService)
		if err != nil {
			return nil, fmt.Errorf("create authentication handler: %w", err)
		}
		auth.RegisterRoutes(router, handler)
	}
	if rbacService != nil || deptService != nil || userService != nil || dictionaryService != nil || configService != nil || fileService != nil {
		if authService == nil {
			return nil, fmt.Errorf("system management services require authentication service")
		}
		system := router.Group("/api/system")
		system.Use(auth.BearerMiddleware(authService))
		if rbacService != nil {
			handler, err := rbac.NewHandler(rbacService)
			if err != nil {
				return nil, fmt.Errorf("create RBAC handler: %w", err)
			}
			rbac.RegisterRoutes(system, handler)
		}
		if deptService != nil {
			handler, err := dept.NewHandler(deptService)
			if err != nil {
				return nil, fmt.Errorf("create department handler: %w", err)
			}
			dept.RegisterRoutes(system, handler)
		}
		if userService != nil {
			handler, err := usermgmt.NewHandler(userService)
			if err != nil {
				return nil, fmt.Errorf("create user handler: %w", err)
			}
			usermgmt.RegisterRoutes(system, handler)
		}
		if dictionaryService != nil {
			handler, err := dictionary.NewHandler(dictionaryService)
			if err != nil {
				return nil, fmt.Errorf("create dictionary handler: %w", err)
			}
			dictionary.RegisterRoutes(system, handler)
		}
		if configService != nil {
			handler := sysconfig.NewHandler(configService)
			handler.Register(system)
		}
		if fileService != nil {
			handler, err := filemgmt.NewHandler(fileService)
			if err != nil {
				return nil, fmt.Errorf("create file handler: %w", err)
			}
			filemgmt.RegisterRoutes(system, handler)
		}
	}

	if cfg.Environment == config.EnvironmentDev && cfg.Swagger.Enabled {
		registerSwaggerUI(router)
	}

	return &Application{Router: router, Logger: logger}, nil
}

// Build constructs a router for callers that do not need the process logger.
func Build(cfg config.Config, readiness platformhttp.ReadinessChecker, authService *auth.Service, rbacService *rbac.Service, deptService *dept.Service, userService *usermgmt.Service, dictionaryService *dictionary.Service, configService *sysconfig.Service, fileService *filemgmt.Service) (*gin.Engine, error) {
	application, err := New(cfg, readiness, authService, rbacService, deptService, userService, dictionaryService, configService, fileService)
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
