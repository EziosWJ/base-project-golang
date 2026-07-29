package file

import (
	"net/http"
	"strings"
	"testing"
)

func TestParsePageQuery(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, "/api/system/file/page?page=2&pageSize=20&originalName=report&status=1", nil)
	if err != nil {
		t.Fatal(err)
	}
	query, err := parsePageQuery(request)
	if err != nil {
		t.Fatal(err)
	}
	if query.Page != 2 || query.PageSize != 20 || query.OriginalName != "report" || query.Status == nil || *query.Status != 1 {
		t.Fatalf("unexpected query: %+v", query)
	}
}

func TestParsePageQueryRejectsInvalidValues(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, "/api/system/file/page?page=0&pageSize=501&status=2", nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := parsePageQuery(request); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestStorageNameKeepsExtensionWithoutUserPath(t *testing.T) {
	name, err := newStorageName("../photo.PNG")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(name, ".PNG") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		t.Fatalf("unexpected storage name: %q", name)
	}
	if len(name) != 32+4 {
		t.Fatalf("unexpected storage name length: %d", len(name))
	}
}

func TestContentDispositionEscapesUTF8Filename(t *testing.T) {
	disposition := contentDisposition("测试 文件.txt", true)
	if disposition != "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95%20%E6%96%87%E4%BB%B6.txt" {
		t.Fatalf("unexpected disposition: %s", disposition)
	}
}

func TestValidateUploadOptions(t *testing.T) {
	if err := validateUploadOptions(FileUploadOptions{BusinessModule: strings.Repeat("a", 51)}); err == nil {
		t.Fatal("expected business module validation error")
	}
	if err := validateUploadOptions(FileUploadOptions{Remark: strings.Repeat("a", 501)}); err == nil {
		t.Fatal("expected remark validation error")
	}
}
