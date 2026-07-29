package file

import (
	"context"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type queryer interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Service struct {
	db         *pgxpool.Pool
	uploadRoot string
}

func NewService(ctx *svc.ServiceContext) *Service {
	root := strings.TrimSpace(ctx.Config.UploadRoot)
	if root == "" {
		root = "uploads"
	}
	return &Service{db: ctx.DB, uploadRoot: root}
}

func (s *Service) Upload(ctx context.Context, header *multipart.FileHeader, options FileUploadOptions) (*FileRecord, error) {
	if header == nil {
		return nil, response.Business(400, "文件不能为空")
	}
	if err := validateUploadOptions(options); err != nil {
		return nil, err
	}
	originalName := cleanOriginalName(header.Filename)
	if originalName == "" {
		originalName = "file"
	}
	storageName, err := newStorageName(originalName)
	if err != nil {
		return nil, response.Internal()
	}
	datePath := time.Now().Format("2006/01/02")
	relativePath := filepath.Join(datePath, storageName)
	targetPath, err := s.resolve(relativePath)
	if err != nil {
		return nil, response.Business(400, "非法文件路径")
	}

	file, err := header.Open()
	if err != nil {
		return nil, response.Business(400, "文件读取失败")
	}
	fileSize, fileMD5, err := saveFile(file, targetPath)
	_ = file.Close()
	if err != nil {
		if errors.Is(err, errFileTooLarge) {
			return nil, response.Business(400, "单文件不能超过 50MB")
		}
		return nil, response.Business(500, "文件保存失败")
	}

	var id int64
	err = s.db.QueryRow(ctx, `INSERT INTO sys_file
(original_name, storage_name, extension, mime_type, file_size, file_md5, storage_path,
 business_module, status, remark, create_time, update_time, deleted)
VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''), 1, NULLIF($9, ''), NOW(), NOW(), 0)
RETURNING id`, originalName, storageName, fileExtension(originalName), header.Header.Get("Content-Type"), fileSize, fileMD5, relativePath, options.BusinessModule, options.Remark).Scan(&id)
	if err != nil {
		_ = os.Remove(targetPath)
		return nil, response.Internal()
	}
	accessURL := fmt.Sprintf("/api/system/file/%d/view", id)
	if _, err = s.db.Exec(ctx, "UPDATE sys_file SET access_url = $1 WHERE id = $2", accessURL, id); err != nil {
		_ = os.Remove(targetPath)
		return nil, response.Internal()
	}
	record, err := s.find(ctx, s.db, id)
	if err != nil {
		_ = os.Remove(targetPath)
		return nil, err
	}
	result := record.record()
	return &result, nil
}

func (s *Service) UploadBatch(ctx context.Context, headers []*multipart.FileHeader, options FileUploadOptions) *FileUploadBatchResult {
	result := &FileUploadBatchResult{Succeeded: make([]FileRecord, 0), Failed: make([]FileUploadFailed, 0)}
	if len(headers) == 0 {
		result.Failed = append(result.Failed, FileUploadFailed{FileName: "unknown", Message: "文件不能为空"})
		return result
	}
	for _, header := range headers {
		record, err := s.Upload(ctx, header, options)
		if err == nil {
			result.Succeeded = append(result.Succeeded, *record)
			continue
		}
		name := "unknown"
		if header != nil && header.Filename != "" {
			name = header.Filename
		}
		result.Failed = append(result.Failed, FileUploadFailed{FileName: name, Message: errorMessage(err)})
	}
	return result
}

func (s *Service) Page(ctx context.Context, query FilePageQuery) (*PageResult[FileRecord], error) {
	conditions := []string{"deleted = 0"}
	args := make([]any, 0, 5)
	if query.OriginalName != "" {
		args = append(args, "%"+query.OriginalName+"%")
		conditions = append(conditions, fmt.Sprintf("original_name ILIKE $%d", len(args)))
	}
	if query.BusinessModule != "" {
		args = append(args, query.BusinessModule)
		conditions = append(conditions, fmt.Sprintf("business_module = $%d", len(args)))
	}
	if query.MimeType != "" {
		args = append(args, "%"+query.MimeType+"%")
		conditions = append(conditions, fmt.Sprintf("mime_type ILIKE $%d", len(args)))
	}
	if query.Status != nil {
		args = append(args, *query.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")
	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_file WHERE "+where, args...).Scan(&total); err != nil {
		return nil, response.Internal()
	}

	limitPosition := len(args) + 1
	offsetPosition := len(args) + 2
	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT id, original_name, storage_name, extension, mime_type,
file_size, file_md5, storage_path, access_url, business_module, status, remark,
create_time, update_time FROM sys_file WHERE `+where+
		fmt.Sprintf(" ORDER BY create_time DESC, id DESC LIMIT $%d OFFSET $%d", limitPosition, offsetPosition), args...)
	if err != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	records := make([]FileRecord, 0)
	for rows.Next() {
		row, scanErr := scanFile(rows)
		if scanErr != nil {
			return nil, response.Internal()
		}
		records = append(records, row.record())
	}
	if err := rows.Err(); err != nil {
		return nil, response.Internal()
	}
	return &PageResult[FileRecord]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) Detail(ctx context.Context, id int64) (*FileRecord, error) {
	row, err := s.find(ctx, s.db, id)
	if err != nil {
		return nil, err
	}
	record := row.record()
	return &record, nil
}

func (s *Service) Update(ctx context.Context, id int64, request *FileUpdateRequest) error {
	if err := validateUpdate(request); err != nil {
		return err
	}
	if _, err := s.find(ctx, s.db, id); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, `UPDATE sys_file SET business_module = $1, remark = $2,
update_time = NOW() WHERE id = $3 AND deleted = 0`, nullableText(request.BusinessModule), nullableText(request.Remark), id)
	if err != nil {
		return response.Internal()
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return deleteFile(ctx, s.db, id)
}

func (s *Service) BatchDelete(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return response.Internal()
	}
	defer tx.Rollback(ctx)
	for _, id := range ids {
		if err := deleteFile(ctx, tx, id); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return response.Internal()
	}
	return nil
}

func (s *Service) UpdateStatus(ctx context.Context, id int64, status *int64) error {
	if status == nil || (*status != 0 && *status != 1) {
		return response.Validation(map[string]string{"status": "状态只能为 0 或 1"})
	}
	if _, err := s.find(ctx, s.db, id); err != nil {
		return err
	}
	if _, err := s.db.Exec(ctx, "UPDATE sys_file SET status = $1, update_time = NOW() WHERE id = $2 AND deleted = 0", *status, id); err != nil {
		return response.Internal()
	}
	return nil
}

func (s *Service) Resource(ctx context.Context, id int64) (*fileResource, error) {
	row, err := s.find(ctx, s.db, id)
	if err != nil {
		return nil, err
	}
	path, err := s.resolve(row.storagePath)
	if err != nil {
		return nil, response.Business(404, "数据不存在")
	}
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return nil, response.Business(404, "数据不存在")
	}
	mimeType := ""
	if row.mimeType != nil {
		mimeType = *row.mimeType
	}
	return &fileResource{Path: path, OriginalName: row.originalName, MimeType: mimeType}, nil
}

func (s *Service) find(ctx context.Context, q queryer, id int64) (*fileRow, error) {
	if id <= 0 {
		return nil, response.Validation(map[string]string{"id": "ID 必须是正整数"})
	}
	row, err := scanFile(q.QueryRow(ctx, `SELECT id, original_name, storage_name, extension, mime_type,
file_size, file_md5, storage_path, access_url, business_module, status, remark,
create_time, update_time FROM sys_file WHERE id = $1 AND deleted = 0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, response.Internal()
	}
	return row, nil
}

func deleteFile(ctx context.Context, q queryer, id int64) error {
	if _, err := findID(ctx, q, id); err != nil {
		return err
	}
	if _, err := q.Exec(ctx, "UPDATE sys_file SET deleted = 1, update_time = NOW() WHERE id = $1 AND deleted = 0", id); err != nil {
		return response.Internal()
	}
	return nil
}

func findID(ctx context.Context, q queryer, id int64) (int64, error) {
	if id <= 0 {
		return 0, response.Validation(map[string]string{"id": "ID 必须是正整数"})
	}
	var found int64
	err := q.QueryRow(ctx, "SELECT id FROM sys_file WHERE id = $1 AND deleted = 0", id).Scan(&found)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, response.Business(404, "数据不存在")
	}
	if err != nil {
		return 0, response.Internal()
	}
	return found, nil
}

func scanFile(row interface{ Scan(...any) error }) (*fileRow, error) {
	file := new(fileRow)
	err := row.Scan(&file.id, &file.originalName, &file.storageName, &file.extension, &file.mimeType,
		&file.fileSize, &file.fileMD5, &file.storagePath, &file.accessURL, &file.businessModule,
		&file.status, &file.remark, &file.createTime, &file.updateTime)
	return file, err
}

func (s *Service) resolve(relative string) (string, error) {
	root, err := filepath.Abs(s.uploadRoot)
	if err != nil {
		return "", err
	}
	root = filepath.Clean(root)
	target := filepath.Clean(filepath.Join(root, relative))
	rel, err := filepath.Rel(root, target)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", errors.New("path escapes upload root")
	}
	return target, nil
}

var errFileTooLarge = errors.New("file too large")

func saveFile(source multipart.File, target string) (int64, string, error) {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return 0, "", err
	}
	destination, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o640)
	if err != nil {
		return 0, "", err
	}
	hasher := md5.New()
	written, copyErr := io.Copy(io.MultiWriter(destination, hasher), io.LimitReader(source, maxFileSize+1))
	closeErr := destination.Close()
	if copyErr != nil {
		_ = os.Remove(target)
		return 0, "", copyErr
	}
	if closeErr != nil {
		_ = os.Remove(target)
		return 0, "", closeErr
	}
	if written > maxFileSize {
		_ = os.Remove(target)
		return 0, "", errFileTooLarge
	}
	return written, hex.EncodeToString(hasher.Sum(nil)), nil
}

func newStorageName(originalName string) (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	name := hex.EncodeToString(bytes)
	if extension := fileExtension(originalName); extension != "" {
		name += "." + extension
	}
	return name, nil
}

func cleanOriginalName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	return filepath.Base(name)
}

func fileExtension(name string) string {
	extension := filepath.Ext(name)
	if extension == "." || extension == "" {
		return ""
	}
	return strings.TrimPrefix(extension, ".")
}

func validateUploadOptions(options FileUploadOptions) error {
	fields := make(map[string]string)
	if len([]rune(options.BusinessModule)) > 50 {
		fields["businessModule"] = "业务模块长度不能超过 50"
	}
	if len([]rune(options.Remark)) > 500 {
		fields["remark"] = "备注长度不能超过 500"
	}
	if len(fields) > 0 {
		return response.Validation(fields)
	}
	return nil
}

func validateUpdate(request *FileUpdateRequest) error {
	if request == nil {
		return response.Validation(map[string]string{"body": "请求参数不能为空"})
	}
	options := FileUploadOptions{BusinessModule: nullableText(request.BusinessModule), Remark: nullableText(request.Remark)}
	return validateUploadOptions(options)
}

func validateIDs(ids []int64) error {
	if len(ids) == 0 {
		return response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, id := range ids {
		if id <= 0 {
			return response.Validation(map[string]string{"ids": "ID 必须是正整数"})
		}
	}
	return nil
}

func nullableText(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func errorMessage(err error) string {
	var apiErr *response.APIError
	if errors.As(err, &apiErr) && apiErr.Message != "" {
		return apiErr.Message
	}
	return "文件上传失败"
}
