// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.1

package main

import (
	"flag"
	"fmt"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/handler"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/middleware"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/modules/dictconfig"
	filemodule "github.com/EziosWJ/base-project-golang/base-go-api/internal/modules/file"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/modules/logs"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/modules/rolemenu"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/modules/userdept"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"

	"github.com/zeromicro/go-zero/core/conf"
	"github.com/zeromicro/go-zero/rest"
)

var configFile = flag.String("f", "etc/basegoapi-api.yaml", "the config file")

func main() {
	flag.Parse()

	var c config.Config
	conf.MustLoad(*configFile, &c)
	response.Configure()

	origins := make([]string, 0)
	for _, origin := range strings.Split(c.AllowedOrigins, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}
	server := rest.MustNewServer(c.RestConf, rest.WithCors(origins...))
	defer server.Stop()

	ctx := svc.NewServiceContext(c)
	defer ctx.Close()
	server.Use(middleware.NewAuthMiddleware(ctx.Sessions).Handle)
	server.Use(middleware.NewOperLogMiddleware(ctx.DB).Handle)
	handler.RegisterHandlers(server, ctx)
	dictconfig.Register(server, ctx)
	filemodule.Register(server, ctx)
	logs.Register(server, ctx)
	rolemenu.Register(server, ctx)
	userdept.Register(server, ctx)

	fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
	server.Start()
}
