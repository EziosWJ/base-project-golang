package response

import (
	"context"
	"errors"
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type APIResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

type APIError struct {
	Code       int
	Message    string
	Data       any
	HTTPStatus int
}

func (e *APIError) Error() string {
	return e.Message
}

func Business(code int, message string) error {
	return &APIError{Code: code, Message: message, HTTPStatus: http.StatusOK}
}

func Validation(fields map[string]string) error {
	return &APIError{Code: http.StatusBadRequest, Message: "参数错误", Data: fields, HTTPStatus: http.StatusBadRequest}
}

func Unauthorized() error {
	return &APIError{Code: http.StatusUnauthorized, Message: "未登录或 token 已失效", HTTPStatus: http.StatusUnauthorized}
}

func Internal() error {
	return &APIError{Code: http.StatusInternalServerError, Message: "系统错误", HTTPStatus: http.StatusInternalServerError}
}

func Configure() {
	httpx.SetOkHandler(func(_ context.Context, value any) any {
		return APIResponse{Code: http.StatusOK, Message: "success", Data: value}
	})
	httpx.SetErrorHandler(func(err error) (int, any) {
		var apiError *APIError
		if errors.As(err, &apiError) {
			return apiError.HTTPStatus, APIResponse{Code: apiError.Code, Message: apiError.Message, Data: apiError.Data}
		}
		return http.StatusInternalServerError, APIResponse{Code: http.StatusInternalServerError, Message: "系统错误", Data: nil}
	})
}
