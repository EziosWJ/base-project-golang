package usermgmt

import (
	"context"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/rbac"
)

// RBACAuditRecorder adapts the shared operation-log writer to user events.
// It deliberately carries no password or response payload, so password reset
// values can never reach the audit table.
type RBACAuditRecorder struct{ recorder rbac.AuditRecorder }

func NewRBACAuditRecorder(recorder rbac.AuditRecorder) *RBACAuditRecorder {
	return &RBACAuditRecorder{recorder: recorder}
}

func (r *RBACAuditRecorder) Record(ctx context.Context, event AuditEvent) error {
	if r == nil || r.recorder == nil {
		return nil
	}
	return r.recorder.Record(ctx, rbac.AuditEvent{
		Action:     event.Action,
		Resource:   "user",
		ResourceID: event.UserID,
		Summary:    "用户管理操作",
		Metadata: rbac.AuditMetadata{
			ActorID:       event.Metadata.ActorID,
			RequestID:     event.Metadata.RequestID,
			ClientIP:      event.Metadata.ClientIP,
			UserAgent:     event.Metadata.UserAgent,
			RequestMethod: event.Metadata.Method,
			RequestURL:    event.Metadata.URL,
		},
	})
}
