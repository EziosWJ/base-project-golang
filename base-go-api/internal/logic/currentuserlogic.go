// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.1

package logic

import (
	"context"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/service"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type CurrentUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCurrentUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CurrentUserLogic {
	return &CurrentUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CurrentUserLogic) CurrentUser() (resp *types.AuthUser, err error) {
	return service.NewAuthService(l.svcCtx.DB, l.svcCtx.Sessions).CurrentUser(l.ctx)
}
