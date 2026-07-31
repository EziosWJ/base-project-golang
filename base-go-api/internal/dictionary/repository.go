package dictionary

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// Repository is the only dictionary type coupled to GORM. It implements both
// persistence and audit recording so the rest of the package stays database agnostic.
type Repository struct{ db *gorm.DB }

var (
	_ Store         = (*Repository)(nil)
	_ AuditRecorder = (*Repository)(nil)
)

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) PageTypes(ctx context.Context, query TypePageQuery) (Page[DictType], error) {
	result := Page[DictType]{Records: []DictType{}, Page: query.Page, PageSize: query.PageSize}
	db := r.db.WithContext(ctx).Model(&DictType{}).Where("deleted = 0")
	if query.DictName != "" {
		db = db.Where("dict_name LIKE ?", "%"+query.DictName+"%")
	}
	if query.DictCode != "" {
		db = db.Where("dict_code LIKE ?", "%"+query.DictCode+"%")
	}
	if query.Status != nil {
		db = db.Where("status = ?", *query.Status)
	}
	if err := db.Count(&result.Total).Error; err != nil {
		return result, err
	}
	err := db.Order("sort_order, id").Offset((query.Page - 1) * query.PageSize).Limit(query.PageSize).Find(&result.Records).Error
	return result, err
}

func (r *Repository) FindType(ctx context.Context, id int64) (*DictType, error) {
	var value DictType
	err := r.db.WithContext(ctx).Where("id = ? AND deleted = 0", id).Take(&value).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &value, err
}

func (r *Repository) DictCodeExists(ctx context.Context, code string, excludeID int64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&DictType{}).
		Where("dict_code = ? AND deleted = 0 AND id <> ?", code, excludeID).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) CreateType(ctx context.Context, value DictType) (DictType, error) {
	err := r.db.WithContext(ctx).Create(&value).Error
	return value, conflictError(err, ErrDictCodeConflict)
}

func (r *Repository) UpdateType(ctx context.Context, value DictType) (DictType, error) {
	now := time.Now().UTC()
	err := r.db.WithContext(ctx).Model(&DictType{}).Where("id = ? AND deleted = 0", value.ID).Updates(map[string]any{
		"dict_name": value.DictName, "dict_code": value.DictCode, "status": value.Status,
		"sort_order": value.SortOrder, "remark": value.Remark, "update_time": now,
	}).Error
	value.UpdateTime = now
	return value, conflictError(err, ErrDictCodeConflict)
}

func (r *Repository) CountDataByType(ctx context.Context, typeID int64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&DictData{}).
		Where("dict_type_id = ? AND deleted = 0", typeID).Count(&count).Error
	return count, err
}

func (r *Repository) DeleteTypes(ctx context.Context, ids []int64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return tx.Model(&DictType{}).Where("id IN ? AND deleted = 0", ids).
			Updates(map[string]any{"deleted": 1, "update_time": time.Now().UTC()}).Error
	})
}

func (r *Repository) SetTypeStatus(ctx context.Context, id int64, status int) error {
	return r.db.WithContext(ctx).Model(&DictType{}).Where("id = ? AND deleted = 0", id).
		Updates(map[string]any{"status": status, "update_time": time.Now().UTC()}).Error
}

func (r *Repository) PageData(ctx context.Context, query DataPageQuery) (Page[DictData], error) {
	result := Page[DictData]{Records: []DictData{}, Page: query.Page, PageSize: query.PageSize}
	db := r.dataQuery(ctx)
	if query.DictTypeID != nil {
		db = db.Where("d.dict_type_id = ?", *query.DictTypeID)
	}
	if query.DictCode != "" {
		db = db.Where("t.dict_code = ?", query.DictCode)
	}
	if query.DictLabel != "" {
		db = db.Where("d.dict_label LIKE ?", "%"+query.DictLabel+"%")
	}
	if query.DictValue != "" {
		db = db.Where("d.dict_value LIKE ?", "%"+query.DictValue+"%")
	}
	if err := db.Count(&result.Total).Error; err != nil {
		return result, err
	}
	err := db.Select("d.*, t.dict_code").Order("d.sort_order, d.id").
		Offset((query.Page - 1) * query.PageSize).Limit(query.PageSize).Scan(&result.Records).Error
	return result, err
}

func (r *Repository) FindData(ctx context.Context, id int64) (*DictData, error) {
	var value DictData
	err := r.dataQuery(ctx).Select("d.*, t.dict_code").Where("d.id = ?", id).Take(&value).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &value, err
}

func (r *Repository) DictValueExists(ctx context.Context, typeID int64, value string, excludeID int64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&DictData{}).
		Where("dict_type_id = ? AND dict_value = ? AND deleted = 0 AND id <> ?", typeID, value, excludeID).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) CreateData(ctx context.Context, value DictData) (DictData, error) {
	err := r.db.WithContext(ctx).Create(&value).Error
	return value, conflictError(err, ErrDictValueConflict)
}

func (r *Repository) UpdateData(ctx context.Context, value DictData) (DictData, error) {
	now := time.Now().UTC()
	err := r.db.WithContext(ctx).Model(&DictData{}).Where("id = ? AND deleted = 0", value.ID).Updates(map[string]any{
		"dict_type_id": value.DictTypeID, "dict_label": value.DictLabel, "dict_value": value.DictValue,
		"sort_order": value.SortOrder, "remark": value.Remark, "update_time": now,
	}).Error
	value.UpdateTime = now
	return value, conflictError(err, ErrDictValueConflict)
}

func (r *Repository) DeleteData(ctx context.Context, ids []int64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return tx.Model(&DictData{}).Where("id IN ? AND deleted = 0", ids).
			Updates(map[string]any{"deleted": 1, "update_time": time.Now().UTC()}).Error
	})
}

func (r *Repository) Items(ctx context.Context, dictCode string) ([]DictItem, error) {
	items := []DictItem{}
	err := r.db.WithContext(ctx).Table("sys_dict_data AS d").
		Select("d.dict_label AS label, d.dict_value AS value, d.sort_order").
		Joins("JOIN sys_dict_type AS t ON t.id = d.dict_type_id AND t.deleted = 0").
		Where("t.dict_code = ? AND t.status = ? AND d.deleted = 0", dictCode, StatusEnabled).
		Order("d.sort_order, d.id").Scan(&items).Error
	return items, err
}

func (r *Repository) dataQuery(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).Table("sys_dict_data AS d").
		Joins("JOIN sys_dict_type AS t ON t.id = d.dict_type_id AND t.deleted = 0").
		Where("d.deleted = 0")
}

type operationLog struct {
	ID              int64     `gorm:"column:id;primaryKey"`
	ModuleName      string    `gorm:"column:module_name"`
	OperationType   string    `gorm:"column:operation_type"`
	RequestID       string    `gorm:"column:request_id"`
	RequestMethod   string    `gorm:"column:request_method"`
	RequestURL      string    `gorm:"column:request_url"`
	OperatorID      int64     `gorm:"column:operator_id"`
	OperatorIP      string    `gorm:"column:operator_ip"`
	UserAgent       string    `gorm:"column:user_agent"`
	OperationStatus string    `gorm:"column:operation_status"`
	OperationTime   time.Time `gorm:"column:operation_time"`
	CreateTime      time.Time `gorm:"column:create_time"`
}

func (operationLog) TableName() string { return "sys_oper_log" }

func (r *Repository) Record(ctx context.Context, event AuditEvent) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Create(&operationLog{
		ModuleName: event.Resource, OperationType: event.Action,
		RequestID: event.Metadata.RequestID, RequestMethod: event.Metadata.RequestMethod,
		RequestURL: event.Metadata.RequestURL, OperatorID: event.Metadata.ActorID,
		OperatorIP: event.Metadata.ClientIP, UserAgent: event.Metadata.UserAgent,
		OperationStatus: "SUCCESS", OperationTime: now, CreateTime: now,
	}).Error
}

func conflictError(err error, conflict error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return conflict
	}
	if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
		return conflict
	}
	return err
}
