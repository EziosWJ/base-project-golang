package filemgmt

import (
	"context"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

type Service struct {
	store   Store
	storage Storage
	audit   AuditRecorder
}

type noopAudit struct{}

func (noopAudit) Record(context.Context, rbac.AuditEvent) error { return nil }

func NewService(store Store, storage Storage, audit AuditRecorder) (*Service, error) {
	if store == nil || storage == nil {
		return nil, ErrInvalid
	}
	if audit == nil {
		audit = noopAudit{}
	}
	return &Service{store: store, storage: storage, audit: audit}, nil
}

func (s *Service) Upload(ctx context.Context, m AuditMetadata, header *multipart.FileHeader, businessModule, remark string) (File, error) {
	if header == nil || strings.TrimSpace(header.Filename) == "" || header.Size == 0 {
		return File{}, ErrFileEmpty
	}
	if header.Size > MaxFileSize {
		return File{}, ErrFileTooLarge
	}
	src, err := header.Open()
	if err != nil {
		return File{}, err
	}
	defer func() { _ = src.Close() }()
	stored, err := s.storage.Save(ctx, header.Filename, src)
	if err != nil {
		return File{}, err
	}
	f := File{OriginalName: header.Filename, StorageName: stored.Name, Extension: stored.Extension, MimeType: header.Header.Get("Content-Type"), FileSize: stored.Size, FileMD5: stored.MD5, StoragePath: stored.Path, BusinessModule: businessModule, Status: StatusEnabled, Remark: stringPtr(remark)}
	f, err = s.store.Create(ctx, f)
	if err != nil {
		_ = s.storage.Remove(ctx, stored.Path)
		return File{}, err
	}
	f.AccessURL = "/api/system/file/" + strconv.FormatInt(f.ID, 10) + "/view"
	if err = s.store.SetAccessURL(ctx, f.ID, f.AccessURL); err != nil {
		return File{}, err
	}
	if err = s.audit.Record(ctx, rbac.AuditEvent{Action: "file.upload", Resource: "file", ResourceID: f.ID, Summary: "上传文件", Metadata: m}); err != nil {
		return File{}, err
	}
	return f, nil
}

func (s *Service) UploadBatch(ctx context.Context, m AuditMetadata, headers []*multipart.FileHeader, businessModule, remark string) (BatchUploadResult, error) {
	if len(headers) == 0 {
		return BatchUploadResult{}, ErrFileEmpty
	}
	result := BatchUploadResult{Succeeded: []File{}, Failed: []BatchUploadFailure{}}
	for _, header := range headers {
		f, err := s.Upload(ctx, m, header, businessModule, remark)
		if err != nil {
			name := "unknown"
			if header != nil && header.Filename != "" {
				name = header.Filename
			}
			result.Failed = append(result.Failed, BatchUploadFailure{FileName: name, Message: err.Error()})
			continue
		}
		result.Succeeded = append(result.Succeeded, f)
	}
	return result, nil
}

func (s *Service) Page(ctx context.Context, q FilePageQuery) (Page[File], error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 10
	}
	if q.PageSize > 500 {
		q.PageSize = 500
	}
	return s.store.Page(ctx, q)
}

func (s *Service) Detail(ctx context.Context, id int64) (*File, error) { return s.store.Find(ctx, id) }

func (s *Service) Update(ctx context.Context, m AuditMetadata, id int64, in UpdateInput) error {
	if len(in.BusinessModule) > 50 || (in.Remark != nil && len(*in.Remark) > 500) {
		return ErrInvalid
	}
	if _, err := s.store.Find(ctx, id); err != nil {
		return err
	}
	if err := s.store.Update(ctx, id, in); err != nil {
		return err
	}
	return s.audit.Record(ctx, rbac.AuditEvent{Action: "file.update", Resource: "file", ResourceID: id, Summary: "更新文件", Metadata: m})
}

func (s *Service) Delete(ctx context.Context, m AuditMetadata, id int64) error {
	f, err := s.store.Find(ctx, id)
	if err != nil {
		return err
	}
	if err = s.store.Delete(ctx, id); err != nil {
		return err
	}
	if err = s.storage.Remove(ctx, f.StoragePath); err != nil {
		return err
	}
	return s.audit.Record(ctx, rbac.AuditEvent{Action: "file.delete", Resource: "file", ResourceID: id, Summary: "删除文件", Metadata: m})
}

func (s *Service) DeleteBatch(ctx context.Context, m AuditMetadata, ids []int64) error {
	for _, id := range ids {
		if err := s.Delete(ctx, m, id); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) SetStatus(ctx context.Context, m AuditMetadata, id int64, status int) error {
	if status != StatusDisabled && status != StatusEnabled {
		return ErrInvalid
	}
	if _, err := s.store.Find(ctx, id); err != nil {
		return err
	}
	if err := s.store.SetStatus(ctx, id, status); err != nil {
		return err
	}
	return s.audit.Record(ctx, rbac.AuditEvent{Action: "file.status", Resource: "file", ResourceID: id, Summary: "更新文件状态", Metadata: m})
}

func (s *Service) Open(ctx context.Context, id int64, _ bool) (FileResource, error) {
	f, err := s.store.Find(ctx, id)
	if err != nil {
		return FileResource{}, err
	}
	r, err := s.storage.Open(ctx, f.StoragePath)
	if err != nil {
		return FileResource{}, err
	}
	return FileResource{Reader: r, File: *f}, nil
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
