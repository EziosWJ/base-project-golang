package filemgmt

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type r2Transport func(*http.Request) (*http.Response, error)

func (f r2Transport) RoundTrip(request *http.Request) (*http.Response, error) { return f(request) }

func testS3Storage(t *testing.T) *S3Storage {
	t.Helper()
	storage, err := NewS3Storage(S3Config{
		Endpoint: "https://test-account.r2.cloudflarestorage.com", Bucket: "private-files",
		AccessKeyID: "test-access-key", SecretAccessKey: "test-secret-key", PresignTTL: 5 * time.Minute,
	})
	if err != nil {
		t.Fatal(err)
	}
	return storage
}

func TestS3UploadAndCompensationUseSignedRequests(t *testing.T) {
	storage := testS3Storage(t)
	var methods, keys []string
	storage.client = s3.New(storage.client.Options(), func(options *s3.Options) {
		options.HTTPClient = &http.Client{Transport: r2Transport(func(request *http.Request) (*http.Response, error) {
			methods = append(methods, request.Method)
			keys = append(keys, request.URL.Path)
			if request.URL.Host != "test-account.r2.cloudflarestorage.com" || !strings.HasPrefix(request.URL.Path, "/private-files/") || !strings.Contains(request.Header.Get("Authorization"), "/auto/s3/aws4_request") {
				t.Fatal("unexpected R2 target or missing SigV4 authorization")
			}
			if request.Method == http.MethodPut {
				body, err := io.ReadAll(request.Body)
				if err != nil || string(body) != "hello R2" {
					t.Fatalf("upload body=%q error=%v", body, err)
				}
			}
			return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Body: io.NopCloser(strings.NewReader("")), Request: request}, nil
		})}
	})
	stored, err := storage.Save(context.Background(), "report.txt", strings.NewReader("hello R2"))
	if err != nil {
		t.Fatal(err)
	}
	if stored.Size != 8 || stored.MD5 != "f72d07b94a21055895f22e25c0dd3ee8" || !strings.HasSuffix(stored.Path, ".txt") {
		t.Fatalf("stored=%+v", stored)
	}
	if err := storage.Remove(context.Background(), stored.Path); err != nil {
		t.Fatal(err)
	}
	if len(methods) != 2 || methods[0] != http.MethodPut || methods[1] != http.MethodDelete || keys[0] != keys[1] {
		t.Fatalf("methods=%v keys=%v", methods, keys)
	}
}

func TestS3RejectsEmptyAndOversizeBeforeNetwork(t *testing.T) {
	storage := testS3Storage(t)
	for _, test := range []struct {
		name   string
		reader io.Reader
		want   error
	}{
		{"empty", strings.NewReader(""), ErrFileEmpty},
		{"large", &zeroReader{remaining: MaxFileSize + 1}, ErrFileTooLarge},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, err := storage.Save(context.Background(), "file.bin", test.reader); !errors.Is(err, test.want) {
				t.Fatalf("error=%v want=%v", err, test.want)
			}
		})
	}
}

func TestS3PresignedRedirectDoesNotPersistURL(t *testing.T) {
	storage := testS3Storage(t)
	store := &memoryStore{}
	store.seed(File{OriginalName: "中文 report.txt", StorageType: "s3", StoragePath: "2026/01/01/file.txt", MimeType: "text/plain", AccessURL: "/api/v1/system/file/1/view"})
	service, err := NewServiceWithStorages(store, "s3", nil, map[string]Storage{"s3": storage})
	if err != nil {
		t.Fatal(err)
	}
	router := newHandlerRouter(t, service)
	for _, action := range []string{"view", "download"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/v1/system/file/1/"+action, nil)))
		if response.Code != http.StatusFound || response.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("status=%d headers=%v", response.Code, response.Header())
		}
		location, err := url.Parse(response.Header().Get("Location"))
		if err != nil {
			t.Fatal(err)
		}
		query := location.Query()
		disposition := "attachment"
		if action == "view" {
			disposition = "inline"
		}
		if location.Host != "test-account.r2.cloudflarestorage.com" || location.Path != "/private-files/2026/01/01/file.txt" || query.Get("X-Amz-Expires") != "300" || query.Get("X-Amz-Signature") == "" || query.Get("response-content-type") != "text/plain" || !strings.HasPrefix(query.Get("response-content-disposition"), disposition+";") || !strings.Contains(query.Get("response-content-disposition"), "%E4%B8%AD%E6%96%87%20report.txt") {
			t.Fatal("presigned URL does not have expected target, expiry or response headers")
		}
	}
	if store.file.AccessURL != "/api/v1/system/file/1/view" {
		t.Fatal("must not persist signed URLs")
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/v1/system/file/1/access-url?disposition=attachment", nil)))
	var envelope struct {
		Data AccessLink `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if response.Code != http.StatusOK || !envelope.Data.Direct || !strings.Contains(envelope.Data.URL, "X-Amz-Signature=") || response.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("access-url must return an uncached signed direct link")
	}
	if err := service.Delete(context.Background(), AuditMetadata{}, 1); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Open(context.Background(), 1, true); !errors.Is(err, ErrNotFound) {
		t.Fatalf("deleted file must not issue new URLs: %v", err)
	}
	if _, err := service.AccessURL(context.Background(), 1, true); !errors.Is(err, ErrNotFound) {
		t.Fatalf("deleted file must not resolve access links: %v", err)
	}
}

type routingStorage struct {
	memoryStorage
	accessed []string
}

func (s *routingStorage) Access(_ context.Context, file File, _ bool) (FileResource, error) {
	s.accessed = append(s.accessed, file.StoragePath)
	return FileResource{File: file, URL: "https://example.test/file"}, nil
}

func TestStorageRoutingPersistsUploadBackend(t *testing.T) {
	local, remote := &routingStorage{}, &routingStorage{}
	store := &memoryStore{}
	backends := map[string]Storage{"local": local, "s3": remote}
	service, err := NewServiceWithStorages(store, "s3", map[string]string{"account-avatar": "local"}, backends)
	if err != nil {
		t.Fatal(err)
	}
	for _, business := range []string{"account-avatar", "documents", ""} {
		file, err := service.Upload(context.Background(), AuditMetadata{}, multipartHeader(t, "file.txt", "hello", "text/plain"), business, "")
		if err != nil {
			t.Fatal(err)
		}
		want := "s3"
		if business == "account-avatar" {
			want = "local"
		}
		if file.StorageType != want {
			t.Fatalf("business=%q storage=%q want=%q", business, file.StorageType, want)
		}
	}
	if len(local.saved) != 1 || len(remote.saved) != 2 {
		t.Fatalf("local=%v remote=%v", local.saved, remote.saved)
	}
	if err := service.Update(context.Background(), AuditMetadata{}, 2, UpdateInput{BusinessModule: "account-avatar"}); err != nil {
		t.Fatal(err)
	}
	// Change both routing configuration and metadata; reads must use the upload backend.
	changed, err := NewServiceWithStorages(store, "local", nil, backends)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := changed.Open(context.Background(), 2, true); err != nil {
		t.Fatal(err)
	}
	if len(remote.accessed) != 1 || len(local.accessed) != 0 {
		t.Fatalf("wrong read backend: local=%v remote=%v", local.accessed, remote.accessed)
	}
	store.auditError = errors.New("audit failure")
	if _, err := service.Upload(context.Background(), AuditMetadata{}, multipartHeader(t, "failed.txt", "hello", "text/plain"), "documents", ""); err == nil {
		t.Fatal("expected audit failure")
	}
	if len(remote.removed) != 1 || len(local.removed) != 0 {
		t.Fatalf("wrong compensation backend: local=%v remote=%v", local.removed, remote.removed)
	}
}
