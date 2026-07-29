// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.1

package svc

import (
	"context"
	"log"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ServiceContext struct {
	Config   config.Config
	DB       *pgxpool.Pool
	Sessions *auth.SessionStore
}

func NewServiceContext(c config.Config) *ServiceContext {
	db, err := pgxpool.New(context.Background(), c.DatabaseURL)
	if err != nil {
		log.Fatalf("连接 PostgreSQL 失败: %v", err)
	}
	ttl := c.TokenTTLSeconds
	if ttl <= 0 {
		ttl = 7200
	}
	return &ServiceContext{
		Config:   c,
		DB:       db,
		Sessions: auth.NewSessionStore(ttl),
	}
}

func (s *ServiceContext) Close() {
	s.DB.Close()
}
