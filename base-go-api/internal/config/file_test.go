package config

import (
	"strings"
	"testing"
	"time"
)

func TestFileStorageConfiguration(t *testing.T) {
	base := "database:\n  url: postgres://localhost/base\n  username: test\n  password: test\njwt:\n  secret: test\n"
	validS3 := "  s3:\n    endpoint: https://account.r2.cloudflarestorage.com\n    bucket: files\n    access_key_id: example-key\n    secret_access_key: example-secret\n"
	for _, test := range []struct{ name, yaml, wantErr string }{
		{"default local", "", ""},
		{"R2 with avatar local", "file:\n  default_storage: s3\n  business_storage:\n    avatar: local\n" + validS3, ""},
		{"business override", "file:\n  default_storage: local\n  business_storage:\n    documents: s3\n" + validS3, ""},
		{"bad default", "file:\n  default_storage: r2\n", "file.default_storage"},
		{"bad route", "file:\n  business_storage:\n    documents: disk\n", "file.business_storage"},
		{"missing credentials", "file:\n  default_storage: s3\n", "file.s3.bucket"},
		{"bad endpoint", "file:\n" + strings.ReplaceAll(validS3, "https://account.r2.cloudflarestorage.com", "http://account.r2.cloudflarestorage.com"), "file.s3.endpoint"},
		{"bad TTL", "file:\n" + validS3 + "    presign_ttl: 169h\n", "file.s3.presign_ttl"},
	} {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			writeConfig(t, dir, "config.yaml", base+test.yaml)
			t.Setenv("APP_ENV", "test")
			cfg, err := LoadFromDir(dir)
			if test.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), test.wantErr) {
					t.Fatalf("error=%v want=%s", err, test.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if cfg.File.S3.PresignTTL != 5*time.Minute {
				t.Fatalf("TTL=%s", cfg.File.S3.PresignTTL)
			}
			if test.name == "default local" && cfg.File.DefaultStorage != "local" {
				t.Fatal("default must remain local")
			}
			if test.name == "business override" && (!cfg.File.S3Enabled() || cfg.File.BusinessStorage["documents"] != "s3") {
				t.Fatal("business override not loaded")
			}
		})
	}
}
