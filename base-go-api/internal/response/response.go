package response

import (
	"context"
	"errors"
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// APIResponse 是所有 JSON 接口的统一响应信封。
// Code 表示业务结果码，Message 提供可读提示，Data 承载实际返回数据。
type APIResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// APIError 同时描述业务错误和最终 HTTP 状态码。
// Data 可用于返回字段级校验错误等结构化错误信息。
type APIError struct {
	Code       int
	Message    string
	Data       any
	HTTPStatus int
}

// Error 实现 error 接口，使 APIError 可以沿普通 Go error 链路向上传递。
func (e *APIError) Error() string {
	return e.Message
}

// Business 创建普通业务错误。
// 当前协议保持 HTTP 200，由响应体 Code 表达具体业务错误码。
func Business(code int, message string) error {
	return &APIError{Code: code, Message: message, HTTPStatus: http.StatusOK}
}

// Validation 创建参数校验错误，并将字段错误映射放入 Data。
func Validation(fields map[string]string) error {
	return &APIError{Code: http.StatusBadRequest, Message: "参数错误", Data: fields, HTTPStatus: http.StatusBadRequest}
}

// Unauthorized 创建未登录或登录态失效错误。
func Unauthorized() error {
	return &APIError{Code: http.StatusUnauthorized, Message: "未登录或 token 已失效", HTTPStatus: http.StatusUnauthorized}
}

// Internal 创建对外隐藏内部细节的服务器错误响应。
func Internal() error {
	return &APIError{Code: http.StatusInternalServerError, Message: "系统错误", HTTPStatus: http.StatusInternalServerError}
}

// Configure 注册 go-zero 全局成功和错误响应处理器，确保所有接口输出统一结构。
func Configure() {
	// 正常返回统一包装为 {code,message,data}，业务 Handler 只需要返回实际数据。
	httpx.SetOkHandler(func(_ context.Context, value any) any {
		return APIResponse{Code: http.StatusOK, Message: "success", Data: value}
	})

	// 已知 APIError 保留其业务码和 HTTP 状态；未知错误统一降级为 500，避免泄露内部信息。
	httpx.SetErrorHandler(func(err error) (int, any) {
		var apiError *APIError
		if errors.As(err, &apiError) {
			return apiError.HTTPStatus, APIResponse{Code: apiError.Code, Message: apiError.Message, Data: apiError.Data}
		}
		return http.StatusInternalServerError, APIResponse{Code: http.StatusInternalServerError, Message: "系统错误", Data: nil}
	})
}
