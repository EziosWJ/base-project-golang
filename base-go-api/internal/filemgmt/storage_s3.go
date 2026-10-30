package filemgmt

import (
	"context"
	"crypto/md5" // #nosec G501 -- compatibility checksum, not security.
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Config struct {
	Endpoint, Bucket, AccessKeyID, SecretAccessKey string
	PresignTTL                                     time.Duration
}

type S3Storage struct {
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
	ttl       time.Duration
}

func NewS3Storage(cfg S3Config) (*S3Storage, error) {
	endpoint, err := url.Parse(cfg.Endpoint)
	if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
		return nil, fmt.Errorf("%w: S3 endpoint must be an HTTPS origin", ErrInvalid)
	}
	if strings.TrimSpace(cfg.Bucket) == "" || strings.TrimSpace(cfg.AccessKeyID) == "" || strings.TrimSpace(cfg.SecretAccessKey) == "" || cfg.PresignTTL < time.Second || cfg.PresignTTL > 7*24*time.Hour {
		return nil, fmt.Errorf("%w: S3 bucket, credentials and TTL (1s to 168h) are required", ErrInvalid)
	}
	client := s3.NewFromConfig(aws.Config{
		Region:                     "auto",
		Credentials:                credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		HTTPClient:                 &http.Client{Timeout: 2 * time.Minute},
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	}, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(strings.TrimRight(cfg.Endpoint, "/"))
		options.UsePathStyle = true
	})
	return &S3Storage{client: client, presigner: s3.NewPresignClient(client), bucket: cfg.Bucket, ttl: cfg.PresignTTL}, nil
}

func (s *S3Storage) Save(ctx context.Context, originalName string, src io.Reader) (StoredFile, error) {
	if src == nil || strings.TrimSpace(originalName) == "" {
		return StoredFile{}, ErrFileEmpty
	}
	if err := ctx.Err(); err != nil {
		return StoredFile{}, err
	}
	// A bounded temporary file supports SDK retries without buffering uploads in memory.
	tmp, err := os.CreateTemp("", "r2-upload-*")
	if err != nil {
		return StoredFile{}, err
	}
	defer func() { _ = tmp.Close(); _ = os.Remove(tmp.Name()) }()
	hash := md5.New() // #nosec G401 -- compatibility checksum only.
	size, err := io.Copy(io.MultiWriter(tmp, hash), io.LimitReader(src, MaxFileSize+1))
	if err != nil {
		return StoredFile{}, err
	}
	if size == 0 {
		return StoredFile{}, ErrFileEmpty
	}
	if size > MaxFileSize {
		return StoredFile{}, ErrFileTooLarge
	}
	if _, err = tmp.Seek(0, io.SeekStart); err != nil {
		return StoredFile{}, err
	}
	ext := extension(originalName)
	name, err := randomName(ext)
	if err != nil {
		return StoredFile{}, err
	}
	key := time.Now().Format("2006/01/02/") + name
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket), Key: aws.String(key), Body: tmp,
		ContentLength: aws.Int64(size), ContentType: aws.String("application/octet-stream"),
	})
	if err != nil {
		return StoredFile{}, err
	}
	return StoredFile{Name: name, Path: key, Extension: ext, Size: size, MD5: hex.EncodeToString(hash.Sum(nil))}, nil
}

func (s *S3Storage) Access(ctx context.Context, file File, view bool) (FileResource, error) {
	contentType := file.MimeType
	if parsed, _, err := mime.ParseMediaType(contentType); err == nil {
		contentType = parsed
	} else {
		contentType = "application/octet-stream"
	}
	disposition := "attachment"
	if view {
		disposition = "inline"
	}
	filename := strings.ReplaceAll(url.QueryEscape(file.OriginalName), "+", "%20")
	request, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket), Key: aws.String(file.StoragePath),
		ResponseContentType:        aws.String(contentType),
		ResponseCacheControl:       aws.String("private, no-store"),
		ResponseContentDisposition: aws.String(disposition + "; filename*=UTF-8''" + filename),
	}, func(options *s3.PresignOptions) { options.Expires = s.ttl })
	if err != nil {
		return FileResource{}, err
	}
	return FileResource{File: file, URL: request.URL}, nil
}

// Remove is used only to compensate a failed metadata transaction, never for soft deletion.
func (s *S3Storage) Remove(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	return err
}
