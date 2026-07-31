package migrations_test

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

var (
	gooseUpMarker   = regexp.MustCompile(`(?m)^-- \+goose Up\s*$`)
	gooseDownMarker = regexp.MustCompile(`(?m)^-- \+goose Down\s*$`)
	schemaDML       = regexp.MustCompile(`(?im)^\s*(INSERT|UPDATE|DELETE|MERGE)\b`)
	seedDDL         = regexp.MustCompile(`(?im)^\s*(CREATE|ALTER|DROP|TRUNCATE)\b`)
)

func TestMigrationStreamsHaveValidGooseFiles(t *testing.T) {
	schemaFiles := migrationFiles(t, "schema")
	if len(schemaFiles) == 0 {
		t.Fatal("schema migration stream must contain a baseline")
	}
	assertGooseFiles(t, schemaFiles)

	// An empty seed stream is valid until a feature owns both its schema and
	// built-in data. When seed SQL appears, it must still be valid Goose SQL.
	assertGooseFiles(t, migrationFiles(t, "seed"))
}

func TestSchemaAndSeedResponsibilitiesStaySeparate(t *testing.T) {
	for _, name := range migrationFiles(t, "schema") {
		contents := readFile(t, name)
		if schemaDML.Match(contents) {
			t.Errorf("schema migration %s contains seed-data DML", name)
		}
	}

	for _, name := range migrationFiles(t, "seed") {
		contents := readFile(t, name)
		if seedDDL.Match(contents) {
			t.Errorf("seed migration %s contains schema DDL", name)
		}
	}
}

func assertGooseFiles(t *testing.T, files []string) {
	t.Helper()
	for _, name := range files {
		contents := readFile(t, name)
		up := gooseUpMarker.FindIndex(contents)
		down := gooseDownMarker.FindIndex(contents)
		if up == nil || down == nil {
			t.Errorf("migration %s must contain exact Goose Up and Down markers", name)
			continue
		}
		if up[0] >= down[0] {
			t.Errorf("migration %s places Goose Down before Goose Up", name)
		}
	}
}

func migrationFiles(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read migration directory %s: %v", dir, err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(files)
	return files
}

func readFile(t *testing.T, name string) []byte {
	t.Helper()
	contents, err := os.ReadFile(name)
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}
	return contents
}
