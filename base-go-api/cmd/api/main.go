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
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	platformhttp "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/http"
)

// @title Base Go API
// @version 0.1.0
// @description Go backend migration platform API.
// @BasePath /
func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("load configuration", "error", err)
		os.Exit(1)
	}

	application, err := app.New(*cfg, unavailableReadiness{})
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

// unavailableReadiness keeps /ready honest until Issue #11 wires the database
// pool into the composition root.
type unavailableReadiness struct{}

var _ platformhttp.ReadinessChecker = unavailableReadiness{}

func (unavailableReadiness) Ready(context.Context) error {
	return errors.New("database readiness probe is not configured")
}
