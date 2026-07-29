// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.1

package config

import "github.com/zeromicro/go-zero/rest"

type Config struct {
	rest.RestConf
	DatabaseURL     string
	TokenTTLSeconds int64  `json:",default=7200"`
	UploadRoot      string `json:",default=uploads"`
	LogClearEnabled bool
	AllowedOrigins  string `json:",default=http://localhost:5173"`
	DefaultPassword string `json:",default=admin123"`
}
