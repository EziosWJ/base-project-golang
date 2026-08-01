// Package filemgmt owns local file metadata and storage operations.
package filemgmt

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

const (
	StatusDisabled = 0
	StatusEnabled  = 1
	MaxFileSize    = 50 * 1024 * 1024
)

var (
	ErrNotFound     = errors.New("数据不存在")
	ErrInvalid      = errors.New("参数错误")
	ErrFileEmpty    = errors.New("文件不能为空")
	ErrFileTooLarge = errors.New("单文件不能超过 50MB")
)

type File struct {
	ID             int64     `gorm:"column:id;primaryKey" json:"id"`
	OriginalName   string    `gorm:"column:original_name" json:"originalName"`
	StorageName    string    `gorm:"column:storage_name" json:"storageName"`
	Extension      string    `gorm:"column:extension" json:"extension"`
	MimeType       string    `gorm:"column:mime_type" json:"mimeType"`
	FileSize       int64     `gorm:"column:file_size" json:"fileSize"`
	FileMD5        string    `gorm:"column:file_md5" json:"fileMd5"`
	StoragePath    string    `gorm:"column:storage_path" json:"storagePath"`
	AccessURL      string    `gorm:"column:access_url" json:"accessUrl"`
	BusinessModule string    `gorm:"column:business_module" json:"businessModule"`
	Status         int       `gorm:"column:status" json:"status"`
	Remark         *string   `gorm:"column:remark" json:"remark"`
	CreateTime     time.Time `gorm:"column:create_time" json:"createTime"`
	UpdateTime     time.Time `gorm:"column:update_time" json:"updateTime"`
	Deleted        int       `gorm:"column:deleted" json:"-"`
}

func (File) TableName() string { return "sys_file" }

type Page[T any] struct {
	Records  []T   `json:"records"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}

type FilePageQuery struct {
	Page, PageSize                         int
	OriginalName, BusinessModule, MimeType string
	Status                                 *int
}

type UpdateInput struct {
	BusinessModule string
	Remark         *string
}

type StoredFile struct {
	Name, Path, Extension, MD5 string
	Size                       int64
}

// FileResource deliberately exposes a stream instead of a byte slice.
type FileResource struct {
	Reader io.ReadSeekCloser
	File   File
}

type BatchUploadResult struct {
	Succeeded []File               `json:"succeeded"`
	Failed    []BatchUploadFailure `json:"failed"`
}

type BatchUploadFailure struct {
	FileName string `json:"fileName"`
	Message  string `json:"message"`
}

type AuditMetadata = rbac.AuditMetadata
type AuditRecorder = rbac.AuditRecorder

type Store interface {
	Page(context.Context, FilePageQuery) (Page[File], error)
	Find(context.Context, int64) (*File, error)
	Create(context.Context, File) (File, error)
	SetAccessURL(context.Context, int64, string) error
	Update(context.Context, int64, UpdateInput) error
	Delete(context.Context, int64) error
	SetStatus(context.Context, int64, int) error
}

type Storage interface {
	Save(context.Context, string, io.Reader) (StoredFile, error)
	Open(context.Context, string) (io.ReadSeekCloser, error)
	Remove(context.Context, string) error
}
