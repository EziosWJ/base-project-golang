package logs

import "time"

const (
	defaultPage     int64 = 1
	defaultPageSize int64 = 10
	maxPageSize     int64 = 500
)

type PageResult[T any] struct {
	Records  []T   `json:"records"`
	Total    int64 `json:"total"`
	Page     int64 `json:"page"`
	PageSize int64 `json:"pageSize"`
}

type LoginLogPageQuery struct {
	Page        int64
	PageSize    int64
	Username    string
	LoginStatus string
	LoginIP     string
}

type OperLogPageQuery struct {
	Page            int64
	PageSize        int64
	ModuleName      string
	OperationType   string
	OperatorName    string
	OperationStatus string
}

type IDsRequest struct {
	IDs []int64 `json:"ids"`
}

type LoginLogRecord struct {
	ID            int64   `json:"id"`
	Username      string  `json:"username"`
	LoginStatus   string  `json:"loginStatus"`
	LoginIP       *string `json:"loginIp"`
	LoginLocation *string `json:"loginLocation"`
	Browser       *string `json:"browser"`
	OS            *string `json:"os"`
	UserAgent     *string `json:"userAgent"`
	Message       *string `json:"message"`
	LoginTime     *string `json:"loginTime"`
	CreateTime    *string `json:"createTime"`
}

type OperLogRecord struct {
	ID               int64   `json:"id"`
	ModuleName       string  `json:"moduleName"`
	OperationType    string  `json:"operationType"`
	RequestMethod    *string `json:"requestMethod"`
	RequestURL       *string `json:"requestUrl"`
	OperatorID       *int64  `json:"operatorId"`
	OperatorName     *string `json:"operatorName"`
	OperatorIP       *string `json:"operatorIp"`
	OperatorLocation *string `json:"operatorLocation"`
	RequestParams    *string `json:"requestParams"`
	ResponseResult   *string `json:"responseResult"`
	CostTime         *int64  `json:"costTime"`
	OperationStatus  string  `json:"operationStatus"`
	ErrorMessage     *string `json:"errorMessage"`
	OperationTime    *string `json:"operationTime"`
	CreateTime       *string `json:"createTime"`
}

func formatNullableTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format("2006-01-02T15:04:05")
	return &formatted
}
