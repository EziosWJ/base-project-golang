//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/app"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	platformdatabase "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/database"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

const postgresImage = "postgres:17-alpine"

func TestPostgresMigrationsUseEphemeralDatabase(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("Docker is required for PostgreSQL integration tests")
	}

	root := projectRoot(t)
	if _, err := os.Stat(filepath.Join(root, "cmd", "migrate")); errors.Is(err, os.ErrNotExist) {
		t.Skip("cmd/migrate is not available yet")
	} else if err != nil {
		t.Fatalf("inspect cmd/migrate: %v", err)
	}

	database := startPostgres(t)
	runMigrations(t, root, database.dsn)
	database.assertGooseSchemaVersionTable(t)
	verifyDatabaseReadiness(t, database.dsn)
}

func TestAuthContractUsesPostgresSessions(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("Docker is required for PostgreSQL integration tests")
	}

	temporary := startPostgres(t)
	runMigrations(t, projectRoot(t), temporary.dsn)
	database := openTemporaryDatabase(t, temporary.dsn)
	defer func() { _ = database.Close() }()

	service, err := auth.NewService(auth.NewRepository(database.GORM), mustTokenManager(t))
	if err != nil {
		t.Fatalf("create authentication service: %v", err)
	}
	router, err := app.Build(config.Config{
		Environment: config.EnvironmentTest,
		CORS:        config.CORSConfig{AllowedOrigins: []string{"*"}},
		Log:         config.LogConfig{Level: "error", Format: "text"},
	}, database, service, nil)
	if err != nil {
		t.Fatalf("build authentication API: %v", err)
	}

	failedLogin := serveJSON(router, http.MethodPost, "/api/auth/login", `{"username":"admin","password":"wrong"}`, "")
	assertEnvelopeCode(t, failedLogin, http.StatusOK, 400, "用户名或密码错误")

	login := serveJSON(router, http.MethodPost, "/api/auth/login", `{"username":"admin","password":"admin123"}`, "")
	if login.Code != http.StatusOK {
		t.Fatalf("login status = %d, body=%s", login.Code, login.Body.String())
	}
	var loginResponse struct {
		Code int `json:"code"`
		Data struct {
			TokenValue string `json:"tokenValue"`
			ExpiresIn  int64  `json:"expiresIn"`
		} `json:"data"`
	}
	if err := json.Unmarshal(login.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if loginResponse.Code != 200 || !strings.HasPrefix(loginResponse.Data.TokenValue, "Bearer ") || loginResponse.Data.ExpiresIn != 7200 {
		t.Fatalf("login response = %+v", loginResponse)
	}

	me := serveJSON(router, http.MethodGet, "/api/auth/me", "", loginResponse.Data.TokenValue)
	if me.Code != http.StatusOK || !strings.Contains(me.Body.String(), `"username":"admin"`) || !strings.Contains(me.Body.String(), `"roleCode":"ADMIN"`) {
		t.Fatalf("current user response = status %d body=%s", me.Code, me.Body.String())
	}
	menus := serveJSON(router, http.MethodGet, "/api/auth/menus", "", loginResponse.Data.TokenValue)
	if menus.Code != http.StatusOK || !strings.Contains(menus.Body.String(), `"menuName":"系统管理"`) || !strings.Contains(menus.Body.String(), `"children"`) {
		t.Fatalf("current menu response = status %d body=%s", menus.Code, menus.Body.String())
	}

	logout := serveJSON(router, http.MethodPost, "/api/auth/logout", "", loginResponse.Data.TokenValue)
	assertEnvelopeCode(t, logout, http.StatusOK, 200, "success")
	revoked := serveJSON(router, http.MethodGet, "/api/auth/me", "", loginResponse.Data.TokenValue)
	assertEnvelopeCode(t, revoked, http.StatusUnauthorized, 401, auth.ErrUnauthenticated.Error())

	var loginLogCount int64
	if err := database.GORM.Table("sys_login_log").Count(&loginLogCount).Error; err != nil {
		t.Fatalf("count login logs: %v", err)
	}
	if loginLogCount != 2 {
		t.Fatalf("login log count = %d, want 2 (one failed and one successful login)", loginLogCount)
	}
}

func TestRBACContractWritesAuditLog(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("Docker is required for PostgreSQL integration tests")
	}

	temporary := startPostgres(t)
	runMigrations(t, projectRoot(t), temporary.dsn)
	database := openTemporaryDatabase(t, temporary.dsn)
	defer func() { _ = database.Close() }()

	authService, err := auth.NewService(auth.NewRepository(database.GORM), mustTokenManager(t))
	if err != nil {
		t.Fatalf("create authentication service: %v", err)
	}
	rbacService, err := rbac.NewService(rbac.NewRepository(database.GORM), rbac.NewGORMAuditRecorder(database.GORM))
	if err != nil {
		t.Fatalf("create RBAC service: %v", err)
	}
	router, err := app.Build(testAPIConfig(), database, authService, rbacService)
	if err != nil {
		t.Fatalf("build RBAC API: %v", err)
	}
	token := loginAdmin(t, router)

	createdRole := serveJSON(router, http.MethodPost, "/api/system/role", `{"roleName":"运营","roleCode":"OPS","status":1,"sortOrder":2}`, token)
	assertEnvelopeCode(t, createdRole, http.StatusOK, 200, "success")
	rolePage := serveJSON(router, http.MethodGet, "/api/system/role/page?page=1&pageSize=500", "", token)
	if rolePage.Code != http.StatusOK || !strings.Contains(rolePage.Body.String(), `"roleCode":"OPS"`) {
		t.Fatalf("role page = status %d body=%s", rolePage.Code, rolePage.Body.String())
	}

	assigned := serveJSON(router, http.MethodPut, "/api/system/role/2/menus", `{"menuIds":[1,2]}`, token)
	assertEnvelopeCode(t, assigned, http.StatusOK, 200, "success")
	roleDetail := serveJSON(router, http.MethodGet, "/api/system/role/2", "", token)
	if roleDetail.Code != http.StatusOK || !strings.Contains(roleDetail.Body.String(), `"menuIds":[1,2]`) {
		t.Fatalf("role detail = status %d body=%s", roleDetail.Code, roleDetail.Body.String())
	}

	createdMenu := serveJSON(router, http.MethodPost, "/api/system/menu", `{"parentId":0,"menuName":"custom-menu","menuType":"MENU","path":"/custom","visible":1,"status":1}`, token)
	assertEnvelopeCode(t, createdMenu, http.StatusOK, 200, "success")
	menuTree := serveJSON(router, http.MethodGet, "/api/system/menu/tree", "", token)
	if menuTree.Code != http.StatusOK || !strings.Contains(menuTree.Body.String(), `"menuName":"custom-menu"`) {
		t.Fatalf("menu tree = status %d body=%s", menuTree.Code, menuTree.Body.String())
	}

	invalidPage := serveJSON(router, http.MethodGet, "/api/system/menu/page?pageSize=501", "", token)
	assertEnvelopeCode(t, invalidPage, http.StatusBadRequest, 400, "参数错误")
	missingMenu := serveJSON(router, http.MethodPut, "/api/system/role/2/menus", `{"menuIds":[999]}`, token)
	assertEnvelopeCode(t, missingMenu, http.StatusOK, 404, "数据不存在")

	var auditCount int64
	if err := database.GORM.Table("sys_oper_log").Where("request_id <> '' AND operator_id = ?", 1).Count(&auditCount).Error; err != nil {
		t.Fatalf("count operation audit logs: %v", err)
	}
	if auditCount != 3 {
		t.Fatalf("operation audit count = %d, want 3 successful mutations", auditCount)
	}
}

type temporaryPostgres struct {
	container string
	dsn       string
}

func startPostgres(t *testing.T) temporaryPostgres {
	t.Helper()
	container := fmt.Sprintf("base-go-api-integration-%d", time.Now().UnixNano())
	password := "integration-password"
	command := exec.Command(
		"docker", "run", "--detach", "--rm", "--name", container,
		"--env", "POSTGRES_DB=integration",
		"--env", "POSTGRES_USER=integration",
		"--env", "POSTGRES_PASSWORD="+password,
		"--publish", "127.0.0.1::5432",
		postgresImage,
	)
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("start temporary PostgreSQL: %v\n%s", err, output)
	}
	t.Cleanup(func() {
		_ = exec.Command("docker", "rm", "--force", container).Run()
	})

	portOutput, err := exec.Command("docker", "port", container, "5432/tcp").Output()
	if err != nil {
		t.Fatalf("resolve temporary PostgreSQL port: %v", err)
	}
	_, port, err := net.SplitHostPort(strings.TrimSpace(string(portOutput)))
	if err != nil {
		t.Fatalf("parse temporary PostgreSQL port: %v", err)
	}

	database := temporaryPostgres{
		container: container,
		dsn:       "postgres://integration:" + password + "@127.0.0.1:" + port + "/integration?sslmode=disable",
	}
	database.waitUntilReady(t)
	return database
}

func (database temporaryPostgres) waitUntilReady(t *testing.T) {
	t.Helper()
	deadline := time.Now().Add(45 * time.Second)
	for time.Now().Before(deadline) {
		if err := exec.Command("docker", "exec", database.container, "pg_isready", "-U", "integration", "-d", "integration").Run(); err == nil {
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatal("temporary PostgreSQL did not become ready within 45 seconds")
}

func runMigrations(t *testing.T, root, dsn string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	command := exec.CommandContext(ctx, "go", "run", "./cmd/migrate", "up", "--kind", "all")
	command.Dir = root
	command.Env = integrationEnvironment(dsn)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("run migrations against temporary PostgreSQL: %v\n%s", err, output)
	}
}

func integrationEnvironment(dsn string) []string {
	environment := make([]string, 0, len(os.Environ())+3)
	for _, entry := range os.Environ() {
		if strings.HasPrefix(entry, "APP_DATABASE__DSN=") || strings.HasPrefix(entry, "APP_JWT__SECRET=") || strings.HasPrefix(entry, "APP_ENV=") {
			continue
		}
		environment = append(environment, entry)
	}
	return append(environment,
		"APP_ENV=test",
		"APP_DATABASE__DSN="+dsn,
		"APP_JWT__SECRET=integration-test-secret-that-is-never-deployed",
	)
}

func (database temporaryPostgres) assertGooseSchemaVersionTable(t *testing.T) {
	t.Helper()
	command := exec.Command("docker", "exec", database.container, "psql", "-U", "integration", "-d", "integration", "-tAc", "SELECT 1 FROM goose_schema_db_version LIMIT 1")
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("verify Goose schema migration table: %v\n%s", err, output)
	}
	if strings.TrimSpace(string(output)) != "1" {
		t.Fatalf("schema baseline version = %q, want 1", output)
	}
}

func verifyDatabaseReadiness(t *testing.T, dsn string) {
	t.Helper()
	database := openTemporaryDatabase(t, dsn)
	if err := database.Ready(context.Background()); err != nil {
		t.Fatalf("ready database returned error: %v", err)
	}
	if err := database.Close(); err != nil {
		t.Fatalf("close database after readiness check: %v", err)
	}
	if err := database.Ready(context.Background()); err == nil {
		t.Fatal("closed database was unexpectedly ready")
	}
}

func openTemporaryDatabase(t *testing.T, dsn string) *platformdatabase.Database {
	t.Helper()
	database, err := platformdatabase.Open(context.Background(), config.DatabaseConfig{
		Driver:       platformdatabase.DriverPostgres,
		DSN:          dsn,
		MaxOpenConns: 2,
		MaxIdleConns: 1,
	})
	if err != nil {
		t.Fatalf("open database for readiness check: %v", err)
	}
	return database
}

func mustTokenManager(t *testing.T) *auth.TokenManager {
	t.Helper()
	manager, err := auth.NewTokenManager(auth.TokenConfig{
		SigningKey: "integration-test-signing-key",
		Issuer:     "base-go-api",
		Audience:   "react-admin",
		TTL:        2 * time.Hour,
	})
	if err != nil {
		t.Fatalf("create token manager: %v", err)
	}
	return manager
}

func testAPIConfig() config.Config {
	return config.Config{
		Environment: config.EnvironmentTest,
		CORS:        config.CORSConfig{AllowedOrigins: []string{"*"}},
		Log:         config.LogConfig{Level: "error", Format: "text"},
	}
}

func loginAdmin(t *testing.T, router http.Handler) string {
	t.Helper()
	response := serveJSON(router, http.MethodPost, "/api/auth/login", `{"username":"admin","password":"admin123"}`, "")
	if response.Code != http.StatusOK {
		t.Fatalf("admin login status = %d, body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Data struct {
			TokenValue string `json:"tokenValue"`
		} `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode admin login: %v", err)
	}
	if !strings.HasPrefix(payload.Data.TokenValue, "Bearer ") {
		t.Fatalf("admin token = %q", payload.Data.TokenValue)
	}
	return payload.Data.TokenValue
}

func serveJSON(router http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", token)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func assertEnvelopeCode(t *testing.T, response *httptest.ResponseRecorder, status, code int, message string) {
	t.Helper()
	var payload struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response envelope: %v", err)
	}
	if response.Code != status || payload.Code != code || payload.Message != message {
		t.Fatalf("response = status %d payload=%+v body=%s, want status=%d code=%d message=%q", response.Code, payload, response.Body.String(), status, code, message)
	}
}

func projectRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs("..")
	if err != nil {
		t.Fatalf("resolve project root: %v", err)
	}
	return root
}
