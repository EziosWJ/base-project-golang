package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

type userIDContextKey struct{}

type session struct {
	userID    int64
	expiresAt time.Time
}

type SessionStore struct {
	mu       sync.Mutex
	ttl      time.Duration
	sessions map[string]session
}

func NewSessionStore(ttlSeconds int64) *SessionStore {
	return &SessionStore{
		ttl:      time.Duration(ttlSeconds) * time.Second,
		sessions: make(map[string]session),
	}
}

func (s *SessionStore) Create(userID int64) (string, int64, error) {
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

func (s *SessionStore) UserID(token string) (int64, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, ok := s.sessions[token]
	if !ok {
		return 0, false
	}
	if time.Now().After(current.expiresAt) {
		delete(s.sessions, token)
		return 0, false
	}
	return current.userID, true
}

func (s *SessionStore) Delete(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
}

func (s *SessionStore) DeleteUserID(userID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for token, current := range s.sessions {
		if current.userID == userID {
			delete(s.sessions, token)
		}
	}
}

func WithUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, userIDContextKey{}, userID)
}

func UserIDFromContext(ctx context.Context) (int64, bool) {
	userID, ok := ctx.Value(userIDContextKey{}).(int64)
	return userID, ok
}
