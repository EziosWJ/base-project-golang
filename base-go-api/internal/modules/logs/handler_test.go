package logs

import (
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
)

func TestParseLoginLogPageQuery(t *testing.T) {
	request := httptest.NewRequest("GET", "/api/system/login-log/page?page=2&pageSize=25&username=admin&loginStatus=SUCCESS&loginIp=127.0.0.1", nil)
	query, err := parseLoginLogPageQuery(request)
	if err != nil {
		t.Fatalf("parseLoginLogPageQuery() error = %v", err)
	}
	if query.Page != 2 || query.PageSize != 25 || query.Username != "admin" || query.LoginStatus != "SUCCESS" || query.LoginIP != "127.0.0.1" {
		t.Fatalf("unexpected query: %+v", query)
	}
}

func TestParseOperLogPageQueryRejectsInvalidPageSize(t *testing.T) {
	request := httptest.NewRequest("GET", "/api/system/oper-log/page?page=1&pageSize=501", nil)
	_, err := parseOperLogPageQuery(request)
	if err == nil {
		t.Fatal("parseOperLogPageQuery() error = nil")
	}
	var apiError *response.APIError
	if !errors.As(err, &apiError) || apiError.Code != 400 {
		t.Fatalf("unexpected error: %#v", err)
	}
	fields, ok := apiError.Data.(map[string]string)
	if !ok || fields["pageSize"] == "" {
		t.Fatalf("unexpected validation data: %#v", apiError.Data)
	}
}

func TestValidateIDs(t *testing.T) {
	if err := validateIDs(nil); err == nil {
		t.Fatal("validateIDs(nil) error = nil")
	}
	if err := validateIDs([]int64{1, 0}); err == nil {
		t.Fatal("validateIDs() error = nil for zero id")
	}
	if err := validateIDs([]int64{1, 2}); err != nil {
		t.Fatalf("validateIDs() error = %v", err)
	}
}
