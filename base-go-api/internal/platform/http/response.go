// Package http contains transport concerns shared by HTTP modules.
package http

import (
	stdhttp "net/http"

	"github.com/gin-gonic/gin"
)

const (
	CodeSuccess       = 200
	CodeBadRequest    = 400
	CodeUnauthorized  = 401
	CodeForbidden     = 403
	CodeNotFound      = 404
	CodeInternalError = 500
)

// ApiResponse is the response envelope kept compatible with the existing API.
// Data is intentionally present as null when a response has no payload.
type ApiResponse[T any] struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

func Success[T any](data T) ApiResponse[T] {
	return ApiResponse[T]{Code: CodeSuccess, Message: "success", Data: data}
}

func Failure[T any](code int, message string, data T) ApiResponse[T] {
	return ApiResponse[T]{Code: code, Message: message, Data: data}
}

// OK writes a successful API response with HTTP 200.
func OK(c *gin.Context, data any) {
	c.JSON(stdhttp.StatusOK, Success(data))
}

// WriteError writes an API error response. The caller selects the HTTP status
// because legacy business failures deliberately use HTTP 200.
func WriteError(c *gin.Context, status, code int, message string, data any) {
	c.JSON(status, Failure(code, message, data))
}

// AbortError writes an API error response and stops the remaining handlers.
func AbortError(c *gin.Context, status, code int, message string, data any) {
	c.Abort()
	WriteError(c, status, code, message, data)
}

// NotFoundHandler retains the API envelope for unmatched API routes.
func NotFoundHandler(c *gin.Context) {
	WriteError(c, stdhttp.StatusNotFound, CodeNotFound, "数据不存在", nil)
}
