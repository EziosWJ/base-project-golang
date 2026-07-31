package rbac

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// GORMAuditRecorder persists successful business operations. It is injected
// into Service; HTTP handlers never access its database handle directly.
type GORMAuditRecorder struct{ db *gorm.DB }

func NewGORMAuditRecorder(db *gorm.DB) *GORMAuditRecorder { return &GORMAuditRecorder{db: db} }

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

func (r *GORMAuditRecorder) Record(ctx context.Context, event AuditEvent) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Create(&operationLog{
		ModuleName: event.Resource, OperationType: event.Action,
		RequestID: event.Metadata.RequestID, OperatorID: event.Metadata.ActorID,
		RequestMethod: event.Metadata.RequestMethod, RequestURL: event.Metadata.RequestURL,
		OperatorIP: event.Metadata.ClientIP, UserAgent: event.Metadata.UserAgent,
		OperationStatus: "SUCCESS", OperationTime: now, CreateTime: now,
	}).Error
}
