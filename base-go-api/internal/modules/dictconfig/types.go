package dictconfig

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

type DictType struct {
	ID         int64   `json:"id"`
	DictName   string  `json:"dictName"`
	DictCode   string  `json:"dictCode"`
	Status     int64   `json:"status"`
	SortOrder  int64   `json:"sortOrder"`
	IsBuiltin  int64   `json:"isBuiltin"`
	Remark     *string `json:"remark"`
	CreateTime *string `json:"createTime"`
	UpdateTime *string `json:"updateTime"`
}

type DictTypePageQuery struct {
	Page     int64
	PageSize int64
	DictName string
	DictCode string
	Status   *int64
}

type DictTypeSaveRequest struct {
	DictName  string  `json:"dictName"`
	DictCode  string  `json:"dictCode"`
	Status    *int64  `json:"status"`
	SortOrder *int64  `json:"sortOrder"`
	Remark    *string `json:"remark"`
}

type DictData struct {
	ID         int64   `json:"id"`
	DictTypeID int64   `json:"dictTypeId"`
	DictCode   string  `json:"dictCode"`
	DictLabel  string  `json:"dictLabel"`
	DictValue  string  `json:"dictValue"`
	SortOrder  int64   `json:"sortOrder"`
	Remark     *string `json:"remark"`
	CreateTime *string `json:"createTime"`
	UpdateTime *string `json:"updateTime"`
}

type DictDataPageQuery struct {
	Page       int64
	PageSize   int64
	DictTypeID *int64
	DictCode   string
	DictLabel  string
	DictValue  string
}

type DictDataSaveRequest struct {
	DictTypeID int64   `json:"dictTypeId"`
	DictLabel  string  `json:"dictLabel"`
	DictValue  string  `json:"dictValue"`
	SortOrder  *int64  `json:"sortOrder"`
	Remark     *string `json:"remark"`
}

type DictItem struct {
	Label     string `json:"label"`
	Value     string `json:"value"`
	SortOrder int64  `json:"sortOrder"`
}

type Config struct {
	ID          int64   `json:"id"`
	ConfigName  string  `json:"configName"`
	ConfigKey   string  `json:"configKey"`
	ConfigValue *string `json:"configValue"`
	ConfigType  string  `json:"configType"`
	ValueType   string  `json:"valueType"`
	Status      int64   `json:"status"`
	IsBuiltin   int64   `json:"isBuiltin"`
	Remark      *string `json:"remark"`
	CreateTime  *string `json:"createTime"`
	UpdateTime  *string `json:"updateTime"`
}

type ConfigValue struct {
	ConfigKey   string  `json:"configKey"`
	ConfigValue *string `json:"configValue"`
	ValueType   string  `json:"valueType"`
	ConfigName  string  `json:"configName"`
}

type ConfigPageQuery struct {
	Page       int64
	PageSize   int64
	ConfigName string
	ConfigKey  string
	ConfigType string
	Status     *int64
}

type ConfigSaveRequest struct {
	ConfigName  string  `json:"configName"`
	ConfigKey   string  `json:"configKey"`
	ConfigValue *string `json:"configValue"`
	ConfigType  string  `json:"configType"`
	ValueType   string  `json:"valueType"`
	Status      *int64  `json:"status"`
	Remark      *string `json:"remark"`
}

type IDsRequest struct {
	IDs []int64 `json:"ids"`
}

type StatusRequest struct {
	Status *int64 `json:"status"`
}

func formatTime(value time.Time) *string {
	formatted := value.Format("2006-01-02T15:04:05")
	return &formatted
}

func formatNullableTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	return formatTime(*value)
}
