package dictconfig

import (
	"net/http"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
)

func TestParsePageDefaultsAndFilters(t *testing.T) {
	r, err := http.NewRequest(http.MethodGet, "/api/system/dict-type/page?dictName=%E7%94%A8%E6%88%B7&status=0", nil)
	if err != nil {
		t.Fatal(err)
	}

	query, err := parseDictTypePageQuery(r)
	if err != nil {
		t.Fatal(err)
	}
	if query.Page != 1 || query.PageSize != 10 || query.DictName != "用户" || query.Status == nil || *query.Status != 0 {
		t.Fatalf("unexpected query: %+v", query)
	}
}

func TestParsePageRejectsInvalidRange(t *testing.T) {
	r, err := http.NewRequest(http.MethodGet, "/api/system/config/page?page=0&pageSize=501", nil)
	if err != nil {
		t.Fatal(err)
	}

	_, err = parseConfigPageQuery(r)
	if err == nil {
		t.Fatal("expected validation error")
	}
	apiErr, ok := err.(*response.APIError)
	if !ok || apiErr.Code != 400 || apiErr.HTTPStatus != 400 {
		t.Fatalf("unexpected validation error: %#v", err)
	}
}

func TestValidationMatchesFrontendFields(t *testing.T) {
	err := validateConfig(&ConfigSaveRequest{})
	if err == nil {
		t.Fatal("expected validation error")
	}

	request := &DictDataSaveRequest{DictTypeID: 1, DictLabel: "标签", DictValue: "value"}
	if err := validateDictData(request); err != nil {
		t.Fatalf("valid dictionary data rejected: %v", err)
	}
}

func TestRequiredStatusRejectsMissingValue(t *testing.T) {
	if err := validateRequiredStatus(nil); err == nil {
		t.Fatal("expected missing status validation error")
	}
}
