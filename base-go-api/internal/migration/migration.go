package migration

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// 将 migration SQL 编译进二进制，部署时不依赖外部 sql 目录。
//go:embed sql/*.sql
var files embed.FS

// Apply 按文件名顺序执行尚未应用的数据库迁移，并记录迁移版本。
func Apply(ctx context.Context, db *pgxpool.Pool) error {
	// schema_migrations 记录已成功提交的版本，保证同一迁移不会重复执行。
	if _, err := db.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		return err
	}

	entries, err := fs.ReadDir(files, "sql")
	if err != nil {
		return err
	}
	// migration 依赖文件名前缀控制执行顺序，例如 000001、000002。
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		// 下划线前的编号作为迁移版本，文件名可在编号后附带可读描述。
		version := strings.SplitN(entry.Name(), "_", 2)[0]
		var applied bool
		if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&applied); err != nil {
			return err
		}
		if applied {
			continue
		}

		content, err := files.ReadFile("sql/" + entry.Name())
		if err != nil {
			return err
		}

		// 每个 migration 文件独占一个事务：任意语句失败时整份文件回滚。
		tx, err := db.Begin(ctx)
		if err != nil {
			return err
		}
		// 当前迁移文件以分号拆分普通 SQL 语句后逐条执行。
		for _, statement := range strings.Split(string(content), ";") {
			statement = strings.TrimSpace(statement)
			if statement == "" {
				continue
			}
			if _, err := tx.Exec(ctx, statement); err != nil {
				_ = tx.Rollback(ctx)
				return fmt.Errorf("执行 migration %s 失败: %w", entry.Name(), err)
			}
		}

		// 只有业务 SQL 全部成功后才登记版本，确保迁移状态与数据库结构一致。
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)`, version, time.Now()); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}
