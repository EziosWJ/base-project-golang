// Command api starts the Go REST API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/EziosWJ/base-project-golang/base-go-api/docs"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/app"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	platformdatabase "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/database"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

// @title Base Go API
// @version 0.1.0
// @description Go backend migration platform API.
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("load configuration", "error", err)
		os.Exit(1)
	}

	database, err := platformdatabase.Open(context.Background(), cfg.Database)
	if err != nil {
		slog.Error("open database", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := database.Close(); err != nil {
			applicationLogger := slog.Default()
			applicationLogger.Error("close database", "error", err)
		}
	}()

	authService, err := newAuthService(database, cfg.JWT)
	if err != nil {
		slog.Error("build authentication service", "error", err)
		os.Exit(1)
	}

	rbacService, err := rbac.NewService(rbac.NewRepository(database.GORM), rbac.NewGORMAuditRecorder(database.GORM))
	if err != nil {
		slog.Error("build RBAC service", "error", err)
		os.Exit(1)
	}

	application, err := app.New(*cfg, database, authService, rbacService)
	if err != nil {
		slog.Error("build application", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:         cfg.HTTP.Address,
		Handler:      application.Router,
		ReadTimeout:  cfg.HTTP.ReadTimeout,
		WriteTimeout: cfg.HTTP.WriteTimeout,
		IdleTimeout:  cfg.HTTP.IdleTimeout,
	}

	go func() {
		application.Logger.Info("HTTP server started", "address", cfg.HTTP.Address)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			application.Logger.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownContext, cancel := context.WithTimeout(context.Background(), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		application.Logger.Error("HTTP server shutdown failed", "error", err)
		os.Exit(1)
	}
	application.Logger.Info("HTTP server stopped")
}

func newAuthService(database *platformdatabase.Database, jwtConfig config.JWTConfig) (*auth.Service, error) {
	tokens, err := auth.NewTokenManager(auth.TokenConfig{
		SigningKey: jwtConfig.Secret,
		Issuer:     jwtConfig.Issuer,
		Audience:   jwtConfig.Audience,
		TTL:        jwtConfig.TTL,
	})
	if err != nil {
		return nil, err
	}
	return auth.NewService(auth.NewRepository(database.GORM), tokens)
}
