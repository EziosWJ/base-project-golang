package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
)

type readyProbe struct {
	err error
}

func (p readyProbe) Ready(context.Context) error {
	return p.err
}

func testConfig(environment string, swaggerEnabled bool) config.Config {
	return config.Config{
		Environment: environment,
		CORS: config.CORSConfig{
			AllowedOrigins: []string{"*"},
		},
		Log: config.LogConfig{
			Level:  "info",
			Format: "text",
		},
		Swagger: config.SwaggerConfig{Enabled: swaggerEnabled},
		HTTP: config.HTTPConfig{
			ShutdownTimeout: time.Second,
		},
	}
}

func TestBuildRegistersSystemRoutes(t *testing.T) {
	router, err := Build(testConfig("test", false), readyProbe{}, nil, nil)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	for _, path := range []string{"/health", "/ready", "/metrics"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Errorf("GET %s status = %d, want %d", path, response.Code, http.StatusOK)
		}
	}
}

func TestBuildRegistersSwaggerOnlyInDev(t *testing.T) {
	for _, test := range []struct {
		name        string
		environment string
		enabled     bool
		wantStatus  int
	}{
		{name: "development enabled", environment: "dev", enabled: true, wantStatus: http.StatusOK},
		{name: "test enabled", environment: "test", enabled: true, wantStatus: http.StatusNotFound},
		{name: "development disabled", environment: "dev", enabled: false, wantStatus: http.StatusNotFound},
	} {
		t.Run(test.name, func(t *testing.T) {
			router, err := Build(testConfig(test.environment, test.enabled), readyProbe{}, nil, nil)
			if err != nil {
				t.Fatalf("Build() error = %v", err)
			}

			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil))
			if response.Code != test.wantStatus {
				t.Errorf("GET /swagger/index.html status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}
