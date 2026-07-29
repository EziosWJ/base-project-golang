package logs

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type scanner interface {
	Scan(...any) error
}

type Service struct {
	db           *pgxpool.Pool
	clearEnabled bool
}

func NewService(db *pgxpool.Pool, clearEnabled bool) *Service {
	return &Service{db: db, clearEnabled: clearEnabled}
}

func (s *Service) LoginLogPage(ctx context.Context, query LoginLogPageQuery) (*PageResult[LoginLogRecord], error) {
	conditions := []string{"1 = 1"}
	args := make([]any, 0, 3)
	if query.Username != "" {
		args = append(args, "%"+query.Username+"%")
		conditions = append(conditions, fmt.Sprintf("username ILIKE $%d", len(args)))
	}
	if query.LoginStatus != "" {
		args = append(args, query.LoginStatus)
		conditions = append(conditions, fmt.Sprintf("login_status = $%d", len(args)))
	}
	if query.LoginIP != "" {
		args = append(args, "%"+query.LoginIP+"%")
		conditions = append(conditions, fmt.Sprintf("login_ip ILIKE $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_login_log WHERE "+where, args...).Scan(&total); err != nil {
		return nil, databaseError(err)
	}
	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT id, username, login_status, login_ip, login_location,
browser, os, user_agent, message, login_time, create_time FROM sys_login_log WHERE `+where+
		fmt.Sprintf(" ORDER BY login_time DESC, id DESC LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	records := make([]LoginLogRecord, 0)
	for rows.Next() {
		record, scanErr := scanLoginLog(rows)
		if scanErr != nil {
			return nil, databaseError(scanErr)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return &PageResult[LoginLogRecord]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) LoginLogDetail(ctx context.Context, id int64) (*LoginLogRecord, error) {
	record, err := scanLoginLog(s.db.QueryRow(ctx, `SELECT id, username, login_status, login_ip, login_location,
browser, os, user_agent, message, login_time, create_time FROM sys_login_log WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) ClearLoginLogs(ctx context.Context) error {
	if !s.clearEnabled {
		return response.Business(403, "无权限")
	}
	_, err := s.db.Exec(ctx, "DELETE FROM sys_login_log")
	return databaseError(err)
}

func (s *Service) BatchDeleteLoginLogs(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, "DELETE FROM sys_login_log WHERE id = ANY($1)", ids)
	return databaseError(err)
}

func (s *Service) OperLogPage(ctx context.Context, query OperLogPageQuery) (*PageResult[OperLogRecord], error) {
	conditions := []string{"1 = 1"}
	args := make([]any, 0, 4)
	if query.ModuleName != "" {
		args = append(args, "%"+query.ModuleName+"%")
		conditions = append(conditions, fmt.Sprintf("module_name ILIKE $%d", len(args)))
	}
	if query.OperationType != "" {
		args = append(args, query.OperationType)
		conditions = append(conditions, fmt.Sprintf("operation_type = $%d", len(args)))
	}
	if query.OperatorName != "" {
		args = append(args, "%"+query.OperatorName+"%")
		conditions = append(conditions, fmt.Sprintf("operator_name ILIKE $%d", len(args)))
	}
	if query.OperationStatus != "" {
		args = append(args, query.OperationStatus)
		conditions = append(conditions, fmt.Sprintf("operation_status = $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_oper_log WHERE "+where, args...).Scan(&total); err != nil {
		return nil, databaseError(err)
	}
	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT id, module_name, operation_type, request_method, request_url,
operator_id, operator_name, operator_ip, operator_location, request_params,
response_result, cost_time, operation_status, error_message, operation_time, create_time
FROM sys_oper_log WHERE `+where+
		fmt.Sprintf(" ORDER BY operation_time DESC, id DESC LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	records := make([]OperLogRecord, 0)
	for rows.Next() {
		record, scanErr := scanOperLog(rows)
		if scanErr != nil {
			return nil, databaseError(scanErr)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return &PageResult[OperLogRecord]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) OperLogDetail(ctx context.Context, id int64) (*OperLogRecord, error) {
	record, err := scanOperLog(s.db.QueryRow(ctx, `SELECT id, module_name, operation_type, request_method, request_url,
operator_id, operator_name, operator_ip, operator_location, request_params,
response_result, cost_time, operation_status, error_message, operation_time, create_time
FROM sys_oper_log WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) ClearOperLogs(ctx context.Context) error {
	if !s.clearEnabled {
		return response.Business(403, "无权限")
	}
	_, err := s.db.Exec(ctx, "DELETE FROM sys_oper_log")
	return databaseError(err)
}

func (s *Service) BatchDeleteOperLogs(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, "DELETE FROM sys_oper_log WHERE id = ANY($1)", ids)
	return databaseError(err)
}

func scanLoginLog(row scanner) (LoginLogRecord, error) {
	var record LoginLogRecord
	var loginIP, loginLocation, browser, os, userAgent, message *string
	var loginTime, createTime *time.Time
	err := row.Scan(&record.ID, &record.Username, &record.LoginStatus, &loginIP, &loginLocation,
		&browser, &os, &userAgent, &message, &loginTime, &createTime)
	record.LoginIP = loginIP
	record.LoginLocation = loginLocation
	record.Browser = browser
	record.OS = os
	record.UserAgent = userAgent
	record.Message = message
	record.LoginTime = formatNullableTime(loginTime)
	record.CreateTime = formatNullableTime(createTime)
	return record, err
}

func scanOperLog(row scanner) (OperLogRecord, error) {
	var record OperLogRecord
	var requestMethod, requestURL, operatorName, operatorIP, operatorLocation *string
	var requestParams, responseResult, errorMessage *string
	var operatorID, costTime *int64
	var operationTime, createTime *time.Time
	err := row.Scan(&record.ID, &record.ModuleName, &record.OperationType, &requestMethod, &requestURL,
		&operatorID, &operatorName, &operatorIP, &operatorLocation, &requestParams,
		&responseResult, &costTime, &record.OperationStatus, &errorMessage, &operationTime, &createTime)
	record.RequestMethod = requestMethod
	record.RequestURL = requestURL
	record.OperatorID = operatorID
	record.OperatorName = operatorName
	record.OperatorIP = operatorIP
	record.OperatorLocation = operatorLocation
	record.RequestParams = requestParams
	record.ResponseResult = responseResult
	record.CostTime = costTime
	record.ErrorMessage = errorMessage
	record.OperationTime = formatNullableTime(operationTime)
	record.CreateTime = formatNullableTime(createTime)
	return record, err
}

func validateIDs(ids []int64) error {
	if len(ids) == 0 {
		return response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, id := range ids {
		if id <= 0 {
			return response.Validation(map[string]string{"ids": "ID 必须是正整数"})
		}
	}
	return nil
}

func databaseError(err error) error {
	if err == nil {
		return nil
	}
	var constraintErr *pgconn.PgError
	if errors.As(err, &constraintErr) {
		return response.Business(400, "数据库操作失败")
	}
	return response.Internal()
}
