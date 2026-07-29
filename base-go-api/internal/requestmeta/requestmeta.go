package requestmeta

import (
	"context"
	"net"
	"net/http"
	"strings"
)

type metadata struct {
	IP        string
	UserAgent string
}

type contextKey struct{}

func WithRequest(ctx context.Context, request *http.Request) context.Context {
	ip := request.Header.Get("X-Forwarded-For")
	if index := strings.Index(ip, ","); index >= 0 {
		ip = strings.TrimSpace(ip[:index])
	}
	if ip == "" {
		ip = request.Header.Get("X-Real-IP")
	}
	if ip == "" {
		host, _, err := net.SplitHostPort(request.RemoteAddr)
		if err == nil {
			ip = host
		}
	}
	return context.WithValue(ctx, contextKey{}, metadata{IP: ip, UserAgent: request.UserAgent()})
}

func IP(ctx context.Context) string {
	value, _ := ctx.Value(contextKey{}).(metadata)
	return value.IP
}

func UserAgent(ctx context.Context) string {
	value, _ := ctx.Value(contextKey{}).(metadata)
	return value.UserAgent
}
