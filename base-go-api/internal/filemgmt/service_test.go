package filemgmt

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

func TestServiceUploadPersistsMetadataAndContent(t *testing.T) {
	t.Parallel()
	storage, err := NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	store := &memoryStore{}
	audit := &memoryAudit{}
	service, err := NewService(store, storage, audit)
	if err != nil {
		t.Fatal(err)
	}
	header := multipartHeader(t, "greeting.txt", "hello", "text/plain")
	file, err := service.Upload(context.Background(), AuditMetadata{ActorID: 1}, header, "system", "example")
	if err != nil {
		t.Fatal(err)
	}
	if file.ID != 1 || file.AccessURL != "/api/system/file/1/view" || file.BusinessModule != "system" {
		t.Fatalf("file = %#v", file)
	}
	resource, err := service.Open(context.Background(), file.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resource.Reader.Close() }()
	content, err := io.ReadAll(resource.Reader)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "hello" || resource.File.FileMD5 == "" || len(audit.events) != 1 {
		t.Fatalf("content=%q resource=%#v audits=%d", content, resource.File, len(audit.events))
	}
}

func multipartHeader(t *testing.T, name, content, contentType string) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", `form-data; name="file"; filename="`+name+`"`)
	header.Set("Content-Type", contentType)
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	request, err := http.NewRequest(http.MethodPost, "/", &body)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if err = request.ParseMultipartForm(int64(body.Len())); err != nil {
		t.Fatal(err)
	}
	return request.MultipartForm.File["file"][0]
}

type memoryStore struct{ file File }

func (s *memoryStore) Page(context.Context, FilePageQuery) (Page[File], error) {
	return Page[File]{}, nil
}
func (s *memoryStore) Find(_ context.Context, id int64) (*File, error) {
	if s.file.ID != id {
		return nil, ErrNotFound
	}
	copy := s.file
	return &copy, nil
}
func (s *memoryStore) Create(_ context.Context, file File) (File, error) {
	file.ID = 1
	s.file = file
	return file, nil
}
func (s *memoryStore) SetAccessURL(_ context.Context, id int64, value string) error {
	if s.file.ID != id {
		return ErrNotFound
	}
	s.file.AccessURL = value
	return nil
}
func (s *memoryStore) Update(context.Context, int64, UpdateInput) error { return nil }
func (s *memoryStore) Delete(context.Context, int64) error              { return nil }
func (s *memoryStore) SetStatus(context.Context, int64, int) error      { return nil }

type memoryAudit struct{ events []rbac.AuditEvent }

func (a *memoryAudit) Record(_ context.Context, event rbac.AuditEvent) error {
	a.events = append(a.events, event)
	return nil
}
