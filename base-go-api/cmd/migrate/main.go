package main

import (
	"context"
	"flag"
	"log"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/config"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/migration"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zeromicro/go-zero/core/conf"
)

var configFile = flag.String("f", "etc/basegoapi-api.yaml", "the config file")

func main() {
	flag.Parse()
	var c config.Config
	conf.MustLoad(*configFile, &c)
	db, err := pgxpool.New(context.Background(), c.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err := migration.Apply(context.Background(), db); err != nil {
		log.Fatal(err)
	}
}
