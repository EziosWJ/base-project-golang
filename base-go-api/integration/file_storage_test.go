//go:build integration

package integration

import (
	"context"
	"errors"
	"io"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/filemgmt"
	platformdatabase "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/database"
)

func TestSQLiteFileStorageRouting(t *testing.T) {
	path := filepath.Join(t.TempDir(), "files.db")
	runSQLiteMigrations(t, path)
	database := openSQLiteDatabase(t, path)
	defer func() { _ = database.Close() }()
	verifyFileStorageRouting(t, database)
}

func TestPostgresFileStorageRouting(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("Docker is required for PostgreSQL integration tests")
	}
	temporary := startPostgres(t)
	runMigrations(t, projectRoot(t), temporary.dsn)
	database := openTemporaryDatabase(t, temporary.dsn)
	defer func() { _ = database.Close() }()
	verifyFileStorageRouting(t, database)
}

func verifyFileStorageRouting(t *testing.T, database *platformdatabase.Database) {
	t.Helper()
	ctx := context.Background()
	local, err := filemgmt.NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	// Separate roots stand in for the two backends; the SDK has its own wire tests.
	remote, err := filemgmt.NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	backends := map[string]filemgmt.Storage{"local": local, "s3": remote}
	repository := filemgmt.NewRepository(database.GORM)
	service, err := filemgmt.NewServiceWithStorages(repository, "s3", map[string]string{"avatar": "local"}, backends)
	if err != nil {
		t.Fatal(err)
	}
	metadata := filemgmt.AuditMetadata{ActorID: 1}
	var uploaded []filemgmt.File
	for _, business := range []string{"documents", "avatar"} {
		file, err := service.UploadContent(ctx, metadata, filemgmt.UploadInput{
			Filename: "report.txt", ContentType: "text/plain", Size: 7, Reader: strings.NewReader("content"),
		}, business, "")
		if err != nil {
			t.Fatal(err)
		}
		persisted, err := repository.Find(ctx, file.ID)
		if err != nil {
			t.Fatal(err)
		}
		want := "s3"
		if business == "avatar" {
			want = "local"
		}
		if persisted.StorageType != want || persisted.AccessURL == "" {
			t.Fatalf("file=%+v want storage=%q", persisted, want)
		}
		uploaded = append(uploaded, file)
	}
	if err := service.Update(ctx, metadata, uploaded[0].ID, filemgmt.UpdateInput{BusinessModule: "avatar"}); err != nil {
		t.Fatal(err)
	}
	changed, err := filemgmt.NewServiceWithStorages(repository, "local", nil, backends)
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range uploaded {
		resource, err := changed.Open(ctx, file.ID, true)
		if err != nil {
			t.Fatal(err)
		}
		content, readErr := io.ReadAll(resource.Reader)
		_ = resource.Reader.Close()
		if readErr != nil || string(content) != "content" {
			t.Fatalf("content=%q error=%v", content, readErr)
		}
	}
	if err := changed.Delete(ctx, metadata, uploaded[0].ID); err != nil {
		t.Fatal(err)
	}
	if _, err := changed.Open(ctx, uploaded[0].ID, false); !errors.Is(err, filemgmt.ErrNotFound) {
		t.Fatalf("deleted file must not be accessible: %v", err)
	}
	physical, err := remote.Open(ctx, uploaded[0].StoragePath)
	if err != nil {
		t.Fatalf("soft deletion must keep the physical object: %v", err)
	}
	_ = physical.Close()
}
