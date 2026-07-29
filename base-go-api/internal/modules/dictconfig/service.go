package dictconfig

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

type dbQuerier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) DictTypePage(ctx context.Context, query DictTypePageQuery) (*PageResult[DictType], error) {
	conditions := []string{"deleted = 0"}
	args := make([]any, 0, 3)
	if query.DictName != "" {
		args = append(args, "%"+query.DictName+"%")
		conditions = append(conditions, fmt.Sprintf("dict_name ILIKE $%d", len(args)))
	}
	if query.DictCode != "" {
		args = append(args, "%"+query.DictCode+"%")
		conditions = append(conditions, fmt.Sprintf("dict_code ILIKE $%d", len(args)))
	}
	if query.Status != nil {
		args = append(args, *query.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")

	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_dict_type WHERE "+where, args...).Scan(&total); err != nil {
		return nil, databaseError(err)
	}

	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT id, dict_name, dict_code, status, sort_order, is_builtin,
remark, create_time, update_time FROM sys_dict_type WHERE `+where+
		fmt.Sprintf(" ORDER BY sort_order ASC, id ASC LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()

	records := make([]DictType, 0)
	for rows.Next() {
		record, scanErr := scanDictType(rows)
		if scanErr != nil {
			return nil, databaseError(scanErr)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return &PageResult[DictType]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) DictTypeDetail(ctx context.Context, id int64) (*DictType, error) {
	return s.findDictType(ctx, s.db, id)
}

func (s *Service) CreateDictType(ctx context.Context, request *DictTypeSaveRequest) (*DictType, error) {
	if err := validateDictType(request); err != nil {
		return nil, err
	}
	request.DictName = strings.TrimSpace(request.DictName)
	request.DictCode = strings.TrimSpace(request.DictCode)
	if err := ensureUnique(ctx, s.db, "sys_dict_type", "dict_code", request.DictCode, nil); err != nil {
		return nil, err
	}
	status := valueOr(request.Status, 1)
	sortOrder := valueOr(request.SortOrder, 0)
	record, err := scanDictType(s.db.QueryRow(ctx, `INSERT INTO sys_dict_type
(dict_name, dict_code, status, sort_order, is_builtin, remark)
VALUES ($1, $2, $3, $4, 0, $5)
RETURNING id, dict_name, dict_code, status, sort_order, is_builtin, remark, create_time, update_time`,
		request.DictName, request.DictCode, status, sortOrder, request.Remark))
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) UpdateDictType(ctx context.Context, id int64, request *DictTypeSaveRequest) (*DictType, error) {
	if err := validateDictType(request); err != nil {
		return nil, err
	}
	existing, err := s.findDictType(ctx, s.db, id)
	if err != nil {
		return nil, err
	}
	request.DictName = strings.TrimSpace(request.DictName)
	request.DictCode = strings.TrimSpace(request.DictCode)
	if existing.IsBuiltin == 1 && existing.DictCode != request.DictCode {
		return nil, response.Business(400, "内置字典类型禁止修改编码")
	}
	if err = ensureUnique(ctx, s.db, "sys_dict_type", "dict_code", request.DictCode, &id); err != nil {
		return nil, err
	}
	status := existing.Status
	if request.Status != nil {
		status = *request.Status
	}
	sortOrder := existing.SortOrder
	if request.SortOrder != nil {
		sortOrder = *request.SortOrder
	}
	record, err := scanDictType(s.db.QueryRow(ctx, `UPDATE sys_dict_type SET
dict_name = $1, dict_code = $2, status = $3, sort_order = $4, remark = $5,
update_time = NOW() WHERE id = $6 AND deleted = 0
RETURNING id, dict_name, dict_code, status, sort_order, is_builtin, remark, create_time, update_time`,
		request.DictName, request.DictCode, status, sortOrder, request.Remark, id))
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) DeleteDictType(ctx context.Context, id int64) error {
	return deleteDictType(ctx, s.db, id)
}

func (s *Service) BatchDeleteDictTypes(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return databaseError(err)
	}
	defer tx.Rollback(ctx)
	for _, id := range ids {
		if err := deleteDictType(ctx, tx, id); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return databaseError(err)
	}
	return nil
}

func (s *Service) UpdateDictTypeStatus(ctx context.Context, id int64, status *int64) error {
	if err := validateRequiredStatus(status); err != nil {
		return err
	}
	if _, err := s.findDictType(ctx, s.db, id); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, "UPDATE sys_dict_type SET status = $1, update_time = NOW() WHERE id = $2 AND deleted = 0", *status, id)
	return databaseError(err)
}

func (s *Service) DictDataPage(ctx context.Context, query DictDataPageQuery) (*PageResult[DictData], error) {
	var dictTypeID *int64
	if query.DictTypeID != nil {
		dictTypeID = query.DictTypeID
	} else if query.DictCode != "" {
		var id int64
		err := s.db.QueryRow(ctx, "SELECT id FROM sys_dict_type WHERE dict_code = $1 AND deleted = 0", query.DictCode).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			missing := int64(-1)
			dictTypeID = &missing
		} else if err != nil {
			return nil, databaseError(err)
		} else {
			dictTypeID = &id
		}
	}

	conditions := []string{"d.deleted = 0"}
	args := make([]any, 0, 3)
	if dictTypeID != nil {
		args = append(args, *dictTypeID)
		conditions = append(conditions, fmt.Sprintf("d.dict_type_id = $%d", len(args)))
	}
	if query.DictLabel != "" {
		args = append(args, "%"+query.DictLabel+"%")
		conditions = append(conditions, fmt.Sprintf("d.dict_label ILIKE $%d", len(args)))
	}
	if query.DictValue != "" {
		args = append(args, "%"+query.DictValue+"%")
		conditions = append(conditions, fmt.Sprintf("d.dict_value ILIKE $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")
	from := " FROM sys_dict_data d LEFT JOIN sys_dict_type t ON t.id = d.dict_type_id"
	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*)"+from+" WHERE "+where, args...).Scan(&total); err != nil {
		return nil, databaseError(err)
	}
	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT d.id, d.dict_type_id, t.dict_code, d.dict_label,
d.dict_value, d.sort_order, d.remark, d.create_time, d.update_time`+from+" WHERE "+where+
		fmt.Sprintf(" ORDER BY d.sort_order ASC, d.id ASC LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()
	records := make([]DictData, 0)
	for rows.Next() {
		record, scanErr := scanDictData(rows)
		if scanErr != nil {
			return nil, databaseError(scanErr)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return &PageResult[DictData]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) DictDataDetail(ctx context.Context, id int64) (*DictData, error) {
	return s.findDictData(ctx, s.db, id)
}

func (s *Service) CreateDictData(ctx context.Context, request *DictDataSaveRequest) (*DictData, error) {
	if err := validateDictData(request); err != nil {
		return nil, err
	}
	request.DictLabel = strings.TrimSpace(request.DictLabel)
	request.DictValue = strings.TrimSpace(request.DictValue)
	if _, err := s.findDictType(ctx, s.db, request.DictTypeID); err != nil {
		return nil, err
	}
	if err := ensureDictValueUnique(ctx, s.db, request.DictTypeID, request.DictValue, nil); err != nil {
		return nil, err
	}
	sortOrder := valueOr(request.SortOrder, 0)
	var id int64
	err := s.db.QueryRow(ctx, `INSERT INTO sys_dict_data
(dict_type_id, dict_label, dict_value, sort_order, remark)
VALUES ($1, $2, $3, $4, $5)
	RETURNING id`, request.DictTypeID, request.DictLabel, request.DictValue, sortOrder, request.Remark).Scan(&id)
	if err != nil {
		return nil, databaseError(err)
	}
	return s.findDictData(ctx, s.db, id)
}

func (s *Service) UpdateDictData(ctx context.Context, id int64, request *DictDataSaveRequest) (*DictData, error) {
	if err := validateDictData(request); err != nil {
		return nil, err
	}
	existing, err := s.findDictData(ctx, s.db, id)
	if err != nil {
		return nil, err
	}
	if _, err := s.findDictType(ctx, s.db, request.DictTypeID); err != nil {
		return nil, err
	}
	request.DictLabel = strings.TrimSpace(request.DictLabel)
	request.DictValue = strings.TrimSpace(request.DictValue)
	if err := ensureDictValueUnique(ctx, s.db, request.DictTypeID, request.DictValue, &id); err != nil {
		return nil, err
	}
	sortOrder := existing.SortOrder
	if request.SortOrder != nil {
		sortOrder = *request.SortOrder
	}
	var updatedID int64
	err = s.db.QueryRow(ctx, `UPDATE sys_dict_data SET
dict_type_id = $1, dict_label = $2, dict_value = $3, sort_order = $4,
remark = $5, update_time = NOW() WHERE id = $6 AND deleted = 0
	RETURNING id`, request.DictTypeID, request.DictLabel, request.DictValue, sortOrder, request.Remark, id).Scan(&updatedID)
	if err != nil {
		return nil, databaseError(err)
	}
	return s.findDictData(ctx, s.db, updatedID)
}

func (s *Service) DeleteDictData(ctx context.Context, id int64) error {
	return deleteDictData(ctx, s.db, id)
}

func (s *Service) BatchDeleteDictData(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return databaseError(err)
	}
	defer tx.Rollback(ctx)
	for _, id := range ids {
		if err := deleteDictData(ctx, tx, id); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return databaseError(err)
	}
	return nil
}

func (s *Service) DictItems(ctx context.Context, code string) ([]DictItem, error) {
	var typeID int64
	err := s.db.QueryRow(ctx, "SELECT id FROM sys_dict_type WHERE dict_code = $1 AND status = 1 AND deleted = 0", code).Scan(&typeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return []DictItem{}, nil
	}
	if err != nil {
		return nil, databaseError(err)
	}
	rows, err := s.db.Query(ctx, `SELECT dict_label, dict_value, sort_order
FROM sys_dict_data WHERE dict_type_id = $1 AND deleted = 0 ORDER BY sort_order ASC, id ASC`, typeID)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()
	items := make([]DictItem, 0)
	for rows.Next() {
		var item DictItem
		if err := rows.Scan(&item.Label, &item.Value, &item.SortOrder); err != nil {
			return nil, databaseError(err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return items, nil
}

func (s *Service) ConfigPage(ctx context.Context, query ConfigPageQuery) (*PageResult[Config], error) {
	conditions := []string{"deleted = 0"}
	args := make([]any, 0, 4)
	if query.ConfigName != "" {
		args = append(args, "%"+query.ConfigName+"%")
		conditions = append(conditions, fmt.Sprintf("config_name ILIKE $%d", len(args)))
	}
	if query.ConfigKey != "" {
		args = append(args, "%"+query.ConfigKey+"%")
		conditions = append(conditions, fmt.Sprintf("config_key ILIKE $%d", len(args)))
	}
	if query.ConfigType != "" {
		args = append(args, query.ConfigType)
		conditions = append(conditions, fmt.Sprintf("config_type = $%d", len(args)))
	}
	if query.Status != nil {
		args = append(args, *query.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}
	where := strings.Join(conditions, " AND ")
	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_config WHERE "+where, args...).Scan(&total); err != nil {
		return nil, databaseError(err)
	}
	args = append(args, query.PageSize, (query.Page-1)*query.PageSize)
	rows, err := s.db.Query(ctx, `SELECT id, config_name, config_key, config_value,
config_type, value_type, status, is_builtin, remark, create_time, update_time
FROM sys_config WHERE `+where+
		fmt.Sprintf(" ORDER BY id DESC LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
	if err != nil {
		return nil, databaseError(err)
	}
	defer rows.Close()
	records := make([]Config, 0)
	for rows.Next() {
		record, scanErr := scanConfig(rows)
		if scanErr != nil {
			return nil, databaseError(scanErr)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, databaseError(err)
	}
	return &PageResult[Config]{Records: records, Total: total, Page: query.Page, PageSize: query.PageSize}, nil
}

func (s *Service) ConfigDetail(ctx context.Context, id int64) (*Config, error) {
	return s.findConfig(ctx, s.db, id)
}

func (s *Service) ConfigByKey(ctx context.Context, key string) (*ConfigValue, error) {
	var result ConfigValue
	err := s.db.QueryRow(ctx, `SELECT config_key, config_value, value_type, config_name
FROM sys_config WHERE config_key = $1 AND status = 1 AND deleted = 0`, key).Scan(
		&result.ConfigKey, &result.ConfigValue, &result.ValueType, &result.ConfigName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound()
	}
	if err != nil {
		return nil, databaseError(err)
	}
	return &result, nil
}

func (s *Service) CreateConfig(ctx context.Context, request *ConfigSaveRequest) (*Config, error) {
	if err := validateConfig(request); err != nil {
		return nil, err
	}
	request.ConfigName = strings.TrimSpace(request.ConfigName)
	request.ConfigKey = strings.TrimSpace(request.ConfigKey)
	if err := ensureUnique(ctx, s.db, "sys_config", "config_key", request.ConfigKey, nil); err != nil {
		return nil, err
	}
	configType := request.ConfigType
	if configType == "" {
		configType = "SYSTEM"
	}
	valueType := request.ValueType
	if valueType == "" {
		valueType = "TEXT"
	}
	status := valueOr(request.Status, 1)
	record, err := scanConfig(s.db.QueryRow(ctx, `INSERT INTO sys_config
(config_name, config_key, config_value, config_type, value_type, status, is_builtin, remark)
VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
RETURNING id, config_name, config_key, config_value, config_type, value_type,
status, is_builtin, remark, create_time, update_time`, request.ConfigName,
		request.ConfigKey, request.ConfigValue, configType, valueType, status, request.Remark))
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) UpdateConfig(ctx context.Context, id int64, request *ConfigSaveRequest) (*Config, error) {
	if err := validateConfig(request); err != nil {
		return nil, err
	}
	existing, err := s.findConfig(ctx, s.db, id)
	if err != nil {
		return nil, err
	}
	if existing.IsBuiltin == 1 {
		return nil, response.Business(400, "内置配置项禁止修改")
	}
	request.ConfigName = strings.TrimSpace(request.ConfigName)
	request.ConfigKey = strings.TrimSpace(request.ConfigKey)
	if err = ensureUnique(ctx, s.db, "sys_config", "config_key", request.ConfigKey, &id); err != nil {
		return nil, err
	}
	configType := request.ConfigType
	if configType == "" {
		configType = existing.ConfigType
	}
	valueType := request.ValueType
	if valueType == "" {
		valueType = existing.ValueType
	}
	status := existing.Status
	if request.Status != nil {
		status = *request.Status
	}
	record, err := scanConfig(s.db.QueryRow(ctx, `UPDATE sys_config SET
config_name = $1, config_key = $2, config_value = $3, config_type = $4,
value_type = $5, status = $6, remark = $7, update_time = NOW()
WHERE id = $8 AND deleted = 0
RETURNING id, config_name, config_key, config_value, config_type, value_type,
status, is_builtin, remark, create_time, update_time`, request.ConfigName,
		request.ConfigKey, request.ConfigValue, configType, valueType, status, request.Remark, id))
	if err != nil {
		return nil, databaseError(err)
	}
	return &record, nil
}

func (s *Service) DeleteConfig(ctx context.Context, id int64) error {
	return deleteConfig(ctx, s.db, id, false)
}

func (s *Service) BatchDeleteConfigs(ctx context.Context, ids []int64) error {
	if err := validateIDs(ids); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return databaseError(err)
	}
	defer tx.Rollback(ctx)
	for _, id := range ids {
		if err := deleteConfig(ctx, tx, id, true); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return databaseError(err)
	}
	return nil
}

func (s *Service) UpdateConfigStatus(ctx context.Context, id int64, status *int64) error {
	if err := validateRequiredStatus(status); err != nil {
		return err
	}
	if _, err := s.findConfig(ctx, s.db, id); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, "UPDATE sys_config SET status = $1, update_time = NOW() WHERE id = $2 AND deleted = 0", *status, id)
	return databaseError(err)
}

func deleteDictType(ctx context.Context, db dbQuerier, id int64) error {
	typeRecord, err := findDictType(ctx, db, id)
	if err != nil {
		return err
	}
	if typeRecord.IsBuiltin == 1 {
		return response.Business(400, "内置字典类型禁止删除")
	}
	var count int64
	if err = db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_dict_data WHERE dict_type_id = $1 AND deleted = 0", id).Scan(&count); err != nil {
		return databaseError(err)
	}
	if count > 0 {
		return response.Business(400, "字典类型下存在字典数据，禁止删除")
	}
	_, err = db.Exec(ctx, "UPDATE sys_dict_type SET deleted = 1, update_time = NOW() WHERE id = $1 AND deleted = 0", id)
	return databaseError(err)
}

func deleteDictData(ctx context.Context, db dbQuerier, id int64) error {
	if _, err := findDictData(ctx, db, id); err != nil {
		return err
	}
	_, err := db.Exec(ctx, "UPDATE sys_dict_data SET deleted = 1, update_time = NOW() WHERE id = $1 AND deleted = 0", id)
	return databaseError(err)
}

func deleteConfig(ctx context.Context, db dbQuerier, id int64, skipMissing bool) error {
	config, err := findConfig(ctx, db, id)
	if err != nil {
		if skipMissing && isNotFound(err) {
			return nil
		}
		return err
	}
	if config.IsBuiltin == 1 {
		if skipMissing {
			return nil
		}
		return response.Business(400, "内置配置项禁止删除")
	}
	_, err = db.Exec(ctx, "UPDATE sys_config SET deleted = 1, update_time = NOW() WHERE id = $1 AND deleted = 0", id)
	return databaseError(err)
}

func (s *Service) findDictType(ctx context.Context, db dbQuerier, id int64) (*DictType, error) {
	return findDictType(ctx, db, id)
}

func findDictType(ctx context.Context, db dbQuerier, id int64) (*DictType, error) {
	record, err := scanDictType(db.QueryRow(ctx, `SELECT id, dict_name, dict_code, status, sort_order,
is_builtin, remark, create_time, update_time FROM sys_dict_type WHERE id = $1 AND deleted = 0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound()
	}
	return &record, databaseError(err)
}

func (s *Service) findDictData(ctx context.Context, db dbQuerier, id int64) (*DictData, error) {
	return findDictData(ctx, db, id)
}

func findDictData(ctx context.Context, db dbQuerier, id int64) (*DictData, error) {
	record, err := scanDictData(db.QueryRow(ctx, `SELECT d.id, d.dict_type_id, t.dict_code, d.dict_label,
d.dict_value, d.sort_order, d.remark, d.create_time, d.update_time
FROM sys_dict_data d LEFT JOIN sys_dict_type t ON t.id = d.dict_type_id
WHERE d.id = $1 AND d.deleted = 0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound()
	}
	return &record, databaseError(err)
}

func (s *Service) findConfig(ctx context.Context, db dbQuerier, id int64) (*Config, error) {
	return findConfig(ctx, db, id)
}

func findConfig(ctx context.Context, db dbQuerier, id int64) (*Config, error) {
	record, err := scanConfig(db.QueryRow(ctx, `SELECT id, config_name, config_key, config_value,
config_type, value_type, status, is_builtin, remark, create_time, update_time
FROM sys_config WHERE id = $1 AND deleted = 0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound()
	}
	return &record, databaseError(err)
}

type scanner interface {
	Scan(...any) error
}

func scanDictType(row scanner) (DictType, error) {
	var record DictType
	var createTime, updateTime *time.Time
	err := row.Scan(&record.ID, &record.DictName, &record.DictCode, &record.Status, &record.SortOrder,
		&record.IsBuiltin, &record.Remark, &createTime, &updateTime)
	record.CreateTime = formatNullableTime(createTime)
	record.UpdateTime = formatNullableTime(updateTime)
	return record, err
}

func scanDictData(row scanner) (DictData, error) {
	var record DictData
	var dictCode *string
	var createTime, updateTime *time.Time
	err := row.Scan(&record.ID, &record.DictTypeID, &dictCode, &record.DictLabel, &record.DictValue,
		&record.SortOrder, &record.Remark, &createTime, &updateTime)
	if dictCode != nil {
		record.DictCode = *dictCode
	}
	record.CreateTime = formatNullableTime(createTime)
	record.UpdateTime = formatNullableTime(updateTime)
	return record, err
}

func scanConfig(row scanner) (Config, error) {
	var record Config
	var createTime, updateTime *time.Time
	err := row.Scan(&record.ID, &record.ConfigName, &record.ConfigKey, &record.ConfigValue,
		&record.ConfigType, &record.ValueType, &record.Status, &record.IsBuiltin, &record.Remark,
		&createTime, &updateTime)
	record.CreateTime = formatNullableTime(createTime)
	record.UpdateTime = formatNullableTime(updateTime)
	return record, err
}

func ensureUnique(ctx context.Context, db dbQuerier, table, column, value string, excludeID *int64) error {
	query := fmt.Sprintf("SELECT id FROM %s WHERE %s = $1", table, column)
	args := []any{value}
	if excludeID != nil {
		args = append(args, *excludeID)
		query += " AND id <> $2"
	}
	var id int64
	err := db.QueryRow(ctx, query, args...).Scan(&id)
	if err == nil {
		return duplicateError(column)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return databaseError(err)
}

func ensureDictValueUnique(ctx context.Context, db dbQuerier, typeID int64, value string, excludeID *int64) error {
	query := "SELECT id FROM sys_dict_data WHERE dict_type_id = $1 AND dict_value = $2"
	args := []any{typeID, value}
	if excludeID != nil {
		args = append(args, *excludeID)
		query += " AND id <> $3"
	}
	var id int64
	err := db.QueryRow(ctx, query, args...).Scan(&id)
	if err == nil {
		return response.Business(400, "字典值已存在")
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return databaseError(err)
}

func validateDictType(request *DictTypeSaveRequest) error {
	fields := make(map[string]string)
	validateRequired(fields, "dictName", request.DictName, "字典名称不能为空")
	validateRequired(fields, "dictCode", request.DictCode, "字典编码不能为空")
	validateMax(fields, "dictName", request.DictName, 100, "字典名称长度不能超过 100")
	validateMax(fields, "dictCode", request.DictCode, 100, "字典编码长度不能超过 100")
	if err := validateStatus(request.Status); err != nil {
		fields["status"] = "状态只能为 0 或 1"
	}
	if request.SortOrder != nil && *request.SortOrder < 0 {
		fields["sortOrder"] = "排序不能小于 0"
	}
	return validationFromFields(fields)
}

func validateDictData(request *DictDataSaveRequest) error {
	fields := make(map[string]string)
	if request.DictTypeID <= 0 {
		fields["dictTypeId"] = "字典类型不能为空"
	}
	validateRequired(fields, "dictLabel", request.DictLabel, "字典标签不能为空")
	validateRequired(fields, "dictValue", request.DictValue, "字典值不能为空")
	validateMax(fields, "dictLabel", request.DictLabel, 100, "字典标签长度不能超过 100")
	validateMax(fields, "dictValue", request.DictValue, 100, "字典值长度不能超过 100")
	if request.SortOrder != nil && *request.SortOrder < 0 {
		fields["sortOrder"] = "排序不能小于 0"
	}
	return validationFromFields(fields)
}

func validateConfig(request *ConfigSaveRequest) error {
	fields := make(map[string]string)
	validateRequired(fields, "configName", request.ConfigName, "配置名称不能为空")
	validateRequired(fields, "configKey", request.ConfigKey, "配置键不能为空")
	validateMax(fields, "configName", request.ConfigName, 100, "配置名称长度不能超过 100")
	validateMax(fields, "configKey", request.ConfigKey, 100, "配置键长度不能超过 100")
	if request.ConfigValue != nil && len(*request.ConfigValue) > 500 {
		fields["configValue"] = "配置值长度不能超过 500"
	}
	if err := validateStatus(request.Status); err != nil {
		fields["status"] = "状态只能为 0 或 1"
	}
	return validationFromFields(fields)
}

func validateRequired(fields map[string]string, field, value, message string) {
	if strings.TrimSpace(value) == "" {
		fields[field] = message
	}
}

func validateMax(fields map[string]string, field, value string, max int, message string) {
	if len([]rune(value)) > max {
		fields[field] = message
	}
}

func validateStatus(status *int64) error {
	if status != nil && (*status < 0 || *status > 1) {
		return response.Validation(map[string]string{"status": "状态只能为 0 或 1"})
	}
	return nil
}

func validateRequiredStatus(status *int64) error {
	if status == nil {
		return response.Validation(map[string]string{"status": "状态不能为空"})
	}
	return validateStatus(status)
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

func valueOr(value *int64, fallback int64) int64 {
	if value == nil {
		return fallback
	}
	return *value
}

func notFound() error {
	return response.Business(404, "数据不存在")
}

func isNotFound(err error) bool {
	var apiErr *response.APIError
	return errors.As(err, &apiErr) && apiErr.Code == 404
}

func duplicateError(column string) error {
	switch column {
	case "dict_code":
		return response.Business(400, "字典编码已存在")
	case "config_key":
		return response.Business(400, "配置键已存在")
	default:
		return response.Business(400, "数据已存在")
	}
}

func databaseError(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		switch pgErr.ConstraintName {
		case "uk_dict_code":
			return response.Business(400, "字典编码已存在")
		case "uk_dict_type_value":
			return response.Business(400, "字典值已存在")
		case "uk_config_key":
			return response.Business(400, "配置键已存在")
		}
	}
	return response.Internal()
}
