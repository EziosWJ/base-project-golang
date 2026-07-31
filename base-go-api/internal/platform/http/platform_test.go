package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

type readinessFunc func(context.Context) error

func (f readinessFunc) Ready(ctx context.Context) error { return f(ctx) }

func TestAPIResponseEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/success", func(c *gin.Context) { OK(c, gin.H{"id": 1}) })
	router.GET("/business-error", func(c *gin.Context) {
		WriteError(c, stdhttp.StatusOK, CodeBadRequest, "参数错误", nil)
	})
	router.NoRoute(NotFoundHandler)

	response := serve(router, stdhttp.MethodGet, "/success")
	if response.Code != stdhttp.StatusOK {
		t.Fatalf("success status = %d", response.Code)
	}
	assertEnvelope(t, response, CodeSuccess, "success")

	response = serve(router, stdhttp.MethodGet, "/business-error")
	if response.Code != stdhttp.StatusOK {
		t.Fatalf("business error status = %d, want 200", response.Code)
	}
	assertEnvelope(t, response, CodeBadRequest, "参数错误")

	response = serve(router, stdhttp.MethodGet, "/missing")
	if response.Code != stdhttp.StatusNotFound {
		t.Fatalf("not found status = %d", response.Code)
	}
	assertEnvelope(t, response, CodeNotFound, "数据不存在")
}

func TestRequestMetadataForwardsAndGeneratesRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestMetadata())
	router.GET("/", func(c *gin.Context) {
		meta, ok := RequestMetaFromContext(c.Request.Context())
		if !ok {
			t.Fatal("request metadata missing from standard context")
		}
		OK(c, meta)
	})

	request := httptest.NewRequest(stdhttp.MethodGet, "/", nil)
	request.Header.Set(RequestIDHeader, "upstream-id")
	request.Header.Set("User-Agent", "platform-test")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if got := response.Header().Get(RequestIDHeader); got != "upstream-id" {
		t.Fatalf("response request id = %q", got)
	}
	if !strings.Contains(response.Body.String(), "upstream-id") {
		t.Fatalf("response misses forwarded metadata: %s", response.Body.String())
	}

	generated := serve(router, stdhttp.MethodGet, "/")
	if got := generated.Header().Get(RequestIDHeader); len(got) != 32 {
		t.Fatalf("generated request id = %q, want 32 hexadecimal characters", got)
	}
}

func TestCORSDefaultAndConfiguredOrigins(t *testing.T) {
	gin.SetMode(gin.TestMode)
	defaultRouter := gin.New()
	defaultRouter.Use(CORS(CORSConfig{}))
	defaultRouter.GET("/resource", func(c *gin.Context) { OK(c, nil) })

	request := httptest.NewRequest(stdhttp.MethodOptions, "/resource", nil)
	request.Header.Set("Origin", "https://frontend.example")
	response := httptest.NewRecorder()
	defaultRouter.ServeHTTP(response, request)
	if response.Code != stdhttp.StatusNoContent {
		t.Fatalf("preflight status = %d", response.Code)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("allow origin = %q", got)
	}
	if got := response.Header().Get("Access-Control-Allow-Credentials"); got != "" {
		t.Fatalf("credentials header must be absent, got %q", got)
	}
	if !strings.Contains(response.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Fatal("Bearer Authorization is not permitted by CORS")
	}

	strictRouter := gin.New()
	strictRouter.Use(CORS(CORSConfig{AllowedOrigins: []string{"https://admin.example"}}))
	strictRouter.GET("/resource", func(c *gin.Context) { OK(c, nil) })

	request = httptest.NewRequest(stdhttp.MethodGet, "/resource", nil)
	request.Header.Set("Origin", "https://other.example")
	response = httptest.NewRecorder()
	strictRouter.ServeHTTP(response, request)
	if response.Code != stdhttp.StatusForbidden {
		t.Fatalf("disallowed origin status = %d", response.Code)
	}
	assertEnvelope(t, response, CodeForbidden, "无权限")

	request = httptest.NewRequest(stdhttp.MethodGet, "/resource", nil)
	request.Header.Set("Origin", "https://admin.example")
	response = httptest.NewRecorder()
	strictRouter.ServeHTTP(response, request)
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "https://admin.example" {
		t.Fatalf("configured allow origin = %q", got)
	}
}

func TestSystemRoutesReadinessAndMetrics(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS(CORSConfig{}))
	RegisterSystemRoutes(router, SystemRoutes{
		Readiness: readinessFunc(func(context.Context) error { return nil }),
	})

	health := serve(router, stdhttp.MethodGet, "/health")
	if health.Code != stdhttp.StatusOK {
		t.Fatalf("health status = %d", health.Code)
	}
	assertEnvelope(t, health, CodeSuccess, "success")

	metricsRequest := httptest.NewRequest(stdhttp.MethodGet, "/metrics", nil)
	metricsRequest.Header.Set("Origin", "https://frontend.example")
	metrics := httptest.NewRecorder()
	router.ServeHTTP(metrics, metricsRequest)
	if metrics.Code != stdhttp.StatusOK || metrics.Body.Len() == 0 || !strings.Contains(metrics.Header().Get("Content-Type"), "text/plain") {
		t.Fatalf("metrics response = status %d body %q", metrics.Code, metrics.Body.String())
	}
	if got := metrics.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("metrics must not receive CORS headers, got %q", got)
	}

	unreadyRouter := gin.New()
	RegisterSystemRoutes(unreadyRouter, SystemRoutes{
		Readiness: readinessFunc(func(context.Context) error { return errors.New("database unavailable") }),
	})
	unready := serve(unreadyRouter, stdhttp.MethodGet, "/ready")
	if unready.Code != stdhttp.StatusServiceUnavailable {
		t.Fatalf("unready status = %d", unready.Code)
	}
	assertEnvelope(t, unready, stdhttp.StatusServiceUnavailable, "service unavailable")
}

func TestRequestLoggerIncludesRequestMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	router := gin.New()
	router.Use(RequestMetadata(), RequestLogger(logger))
	router.GET("/", func(c *gin.Context) {
		c.Request = c.Request.WithContext(ContextWithUserID(c.Request.Context(), 42))
		OK(c, nil)
	})

	request := httptest.NewRequest(stdhttp.MethodGet, "/", nil)
	request.Header.Set(RequestIDHeader, "request-42")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	for _, expected := range []string{"request-42", "\"method\":\"GET\"", "\"status\":200", "\"user_id\":42"} {
		if !strings.Contains(logs.String(), expected) {
			t.Fatalf("log %q misses %q", logs.String(), expected)
		}
	}
}

func serve(router stdhttp.Handler, method, target string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, target, nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func assertEnvelope(t *testing.T, response *httptest.ResponseRecorder, code int, message string) {
	t.Helper()
	var body ApiResponse[json.RawMessage]
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid API response JSON: %v; body=%s", err, response.Body.String())
	}
	if body.Code != code || body.Message != message {
		t.Fatalf("envelope = %+v, want code=%d message=%q", body, code, message)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatalf("invalid response fields: %v", err)
	}
	if _, ok := fields["data"]; !ok {
		t.Fatalf("response does not contain data field: %s", response.Body.String())
	}
}
