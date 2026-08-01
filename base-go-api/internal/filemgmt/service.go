package filemgmt

import (
	"context"
	"log/slog"
	"mime/multipart"
	"strings"
)

type Service struct {
	store   Store
	storage Storage
}

func NewService(store Store, storage Storage) (*Service, error) {
	if store == nil || storage == nil {
		return nil, ErrInvalid
	}
	return &Service{store: store, storage: storage}, nil
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
	f, err = s.store.Create(ctx, f, AuditEvent{Action: "file.upload", Resource: "file", ResourceID: 0, Summary: "上传文件", Metadata: m})
	if err != nil {
		s.compensate(ctx, stored.Path)
		return File{}, err
	}
	return f, nil
}

// compensate deletes the physical file written before a failed database
// transaction. Compensation failure is logged, leaving a best-effort orphan.
func (s *Service) compensate(ctx context.Context, storagePath string) {
	if err := s.storage.Remove(ctx, storagePath); err != nil {
		slog.Error("补偿删除物理文件失败", "storagePath", storagePath, "error", err)
	}
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
	return s.store.Update(ctx, id, in, AuditEvent{Action: "file.update", Resource: "file", ResourceID: id, Summary: "更新文件", Metadata: m})
}

func (s *Service) Delete(ctx context.Context, m AuditMetadata, id int64) error {
	if _, err := s.store.Find(ctx, id); err != nil {
		return err
	}
	return s.store.Delete(ctx, id, AuditEvent{Action: "file.delete", Resource: "file", ResourceID: id, Summary: "删除文件", Metadata: m})
}

func (s *Service) DeleteBatch(ctx context.Context, m AuditMetadata, ids []int64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	return s.store.DeleteBatch(ctx, ids, AuditEvent{Action: "file.delete", Resource: "file", ResourceID: 0, Summary: "删除文件", Metadata: m})
}

func (s *Service) SetStatus(ctx context.Context, m AuditMetadata, id int64, status int) error {
	if status != StatusDisabled && status != StatusEnabled {
		return ErrInvalid
	}
	if _, err := s.store.Find(ctx, id); err != nil {
		return err
	}
	return s.store.SetStatus(ctx, id, status, AuditEvent{Action: "file.status", Resource: "file", ResourceID: id, Summary: "更新文件状态", Metadata: m})
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
