package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

// userIDContextKey 使用私有类型作为 context key，避免与其他包写入的键发生冲突。
type userIDContextKey struct{}

// session 保存一次登录会话对应的用户和过期时间。
type session struct {
	userID    int64
	expiresAt time.Time
}

// SessionStore 是进程内会话存储。
// 通过互斥锁保护 sessions，保证并发请求下的读写安全。
type SessionStore struct {
	mu       sync.Mutex
	ttl      time.Duration
	sessions map[string]session
}

// NewSessionStore 创建具有固定有效期的内存会话存储。
func NewSessionStore(ttlSeconds int64) *SessionStore {
	return &SessionStore{
		ttl:      time.Duration(ttlSeconds) * time.Second,
		sessions: make(map[string]session),
	}
}

// Create 为用户创建随机 Token，并返回 Token 与剩余有效期秒数。
func (s *SessionStore) Create(userID int64) (string, int64, error) {
	// 使用密码学安全随机数生成不可预测的 Bearer Token。
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", 0, err
	}
	token := base64.RawURLEncoding.EncodeToString(bytes)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[token] = session{userID: userID, expiresAt: time.Now().Add(s.ttl)}
	return token, int64(s.ttl.Seconds()), nil
}

// UserID 校验 Token 是否存在且未过期，并返回对应用户 ID。
func (s *SessionStore) UserID(token string) (int64, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, ok := s.sessions[token]
	if !ok {
		return 0, false
	}
	// 访问到过期会话时顺便清理，避免继续占用内存。
	if time.Now().After(current.expiresAt) {
		delete(s.sessions, token)
		return 0, false
	}
	return current.userID, true
}

// Delete 删除指定 Token，用于用户主动退出登录。
func (s *SessionStore) Delete(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

// DeleteUserID 删除某个用户的全部会话，适用于禁用账号或修改密码后强制下线。
func (s *SessionStore) DeleteUserID(userID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for token, current := range s.sessions {
		if current.userID == userID {
			delete(s.sessions, token)
		}
	}
}

// WithUserID 将认证后的用户 ID 写入请求上下文，供后续业务逻辑读取。
func WithUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, userIDContextKey{}, userID)
}

// UserIDFromContext 从请求上下文中读取当前登录用户 ID。
func UserIDFromContext(ctx context.Context) (int64, bool) {
	userID, ok := ctx.Value(userIDContextKey{}).(int64)
	return userID, ok
}
