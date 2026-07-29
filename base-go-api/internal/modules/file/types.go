package file

import "time"

const (
	maxFileSize     int64 = 50 * 1024 * 1024
	defaultPage           = int64(1)
	defaultPageSize       = int64(10)
	maxPageSize           = int64(500)
)

type PageResult[T any] struct {
	Records  []T   `json:"records"`
	Total    int64 `json:"total"`
	Page     int64 `json:"page"`
	PageSize int64 `json:"pageSize"`
}

type FileRecord struct {
	ID             int64     `json:"id"`
	OriginalName   string    `json:"originalName"`
	StorageName    string    `json:"storageName"`
	Extension      *string   `json:"extension"`
	MimeType       *string   `json:"mimeType"`
	FileSize       int64     `json:"fileSize"`
	FileMD5        *string   `json:"fileMd5"`
	StoragePath    string    `json:"storagePath"`
	AccessURL      *string   `json:"accessUrl"`
	BusinessModule *string   `json:"businessModule"`
	Status         int64     `json:"status"`
	Remark         *string   `json:"remark"`
	CreateTime     time.Time `json:"-"`
	UpdateTime     time.Time `json:"-"`
	CreateTimeText *string   `json:"createTime"`
	UpdateTimeText *string   `json:"updateTime"`
}

type fileRow struct {
	id             int64
	originalName   string
	storageName    string
	extension      *string
	mimeType       *string
	fileSize       int64
	fileMD5        *string
	storagePath    string
	accessURL      *string
	businessModule *string
	status         int64
	remark         *string
	createTime     time.Time
	updateTime     time.Time
}

type FilePageQuery struct {
	Page           int64
	PageSize       int64
	OriginalName   string
	BusinessModule string
	MimeType       string
	Status         *int64
}

type FileUpdateRequest struct {
	BusinessModule *string `json:"businessModule"`
	Remark         *string `json:"remark"`
}

type FileStatusRequest struct {
	Status *int64 `json:"status"`
}

type IDsRequest struct {
	IDs []int64 `json:"ids"`
}

type FileUploadOptions struct {
	BusinessModule string
	Remark         string
}

type FileUploadBatchResult struct {
	Succeeded []FileRecord       `json:"succeeded"`
	Failed    []FileUploadFailed `json:"failed"`
}

type FileUploadFailed struct {
	FileName string `json:"fileName"`
	Message  string `json:"message"`
}

type fileResource struct {
	Path         string
	OriginalName string
	MimeType     string
}

func (f fileRow) record() FileRecord {
	createTime := formatTime(f.createTime)
	updateTime := formatTime(f.updateTime)
	return FileRecord{
		ID: f.id, OriginalName: f.originalName, StorageName: f.storageName,
		Extension: f.extension, MimeType: f.mimeType, FileSize: f.fileSize,
		FileMD5: f.fileMD5, StoragePath: f.storagePath, AccessURL: f.accessURL,
		BusinessModule: f.businessModule, Status: f.status, Remark: f.remark,
		CreateTime: f.createTime, UpdateTime: f.updateTime,
		CreateTimeText: createTime, UpdateTimeText: updateTime,
	}
}

func formatTime(value time.Time) *string {
	formatted := value.Format("2006-01-02T15:04:05")
	return &formatted
}
