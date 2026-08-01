package filemgmt

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
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

type memoryStore struct {
	file File
	// records holds listable files in ID order for Page.
	records []File
}

func (s *memoryStore) recordFor(id int64) *File {
	for i := range s.records {
		if s.records[i].ID == id {
			return &s.records[i]
		}
	}
	return nil
}

func (s *memoryStore) Page(_ context.Context, q FilePageQuery) (Page[File], error) {
	records := make([]File, 0, len(s.records))
	for _, file := range s.records {
		if file.Deleted != 0 {
			continue
		}
		if q.OriginalName != "" && !strings.Contains(file.OriginalName, q.OriginalName) {
			continue
		}
		if q.BusinessModule != "" && file.BusinessModule != q.BusinessModule {
			continue
		}
		if q.MimeType != "" && !strings.Contains(file.MimeType, q.MimeType) {
			continue
		}
		if q.Status != nil && file.Status != *q.Status {
			continue
		}
		records = append(records, file)
	}
	return Page[File]{Records: records, Total: int64(len(records)), Page: q.Page, PageSize: q.PageSize}, nil
}

func (s *memoryStore) Find(_ context.Context, id int64) (*File, error) {
	record := s.recordFor(id)
	if record == nil || record.Deleted != 0 {
		return nil, ErrNotFound
	}
	copy := *record
	return &copy, nil
}

func (s *memoryStore) Create(_ context.Context, file File) (File, error) {
	file.ID = int64(len(s.records) + 1)
	if s.file.ID == 0 {
		s.file = file
	}
	s.records = append(s.records, file)
	return file, nil
}

func (s *memoryStore) SetAccessURL(_ context.Context, id int64, value string) error {
	if s.file.ID == id {
		s.file.AccessURL = value
	}
	record := s.recordFor(id)
	if record == nil {
		return ErrNotFound
	}
	record.AccessURL = value
	return nil
}

func (s *memoryStore) Update(_ context.Context, id int64, in UpdateInput) error {
	record := s.recordFor(id)
	if record == nil {
		return ErrNotFound
	}
	record.BusinessModule = in.BusinessModule
	record.Remark = in.Remark
	if s.file.ID == id {
		s.file = *record
	}
	return nil
}

func (s *memoryStore) Delete(_ context.Context, id int64) error {
	record := s.recordFor(id)
	if record == nil {
		return ErrNotFound
	}
	record.Deleted = 1
	if s.file.ID == id {
		s.file = *record
	}
	return nil
}

func (s *memoryStore) DeleteBatch(_ context.Context, ids []int64) error {
	for _, id := range ids {
		record := s.recordFor(id)
		if record == nil || record.Deleted != 0 {
			return ErrNotFound
		}
	}
	for _, id := range ids {
		record := s.recordFor(id)
		record.Deleted = 1
		if s.file.ID == id {
			s.file = *record
		}
	}
	return nil
}

func (s *memoryStore) SetStatus(_ context.Context, id int64, status int) error {
	record := s.recordFor(id)
	if record == nil {
		return ErrNotFound
	}
	record.Status = status
	if s.file.ID == id {
		s.file = *record
	}
	return nil
}

type memoryAudit struct{ events []rbac.AuditEvent }

func (a *memoryAudit) Record(_ context.Context, event rbac.AuditEvent) error {
	a.events = append(a.events, event)
	return nil
}
