package notification

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type testStore struct {
	admin     bool
	published PublishInput
}

func (s *testStore) Page(context.Context, int64, PageQuery) (Page, error) { return Page{}, nil }
func (s *testStore) Find(context.Context, int64, int64) (*Notification, error) {
	return nil, ErrNotFound
}
func (s *testStore) UnreadCount(context.Context, int64) (int64, error) { return 0, nil }
func (s *testStore) MarkRead(context.Context, int64, int64) error      { return nil }
func (s *testStore) MarkAllRead(context.Context, int64) error          { return nil }
func (s *testStore) Publish(_ context.Context, _ int64, in PublishInput, _ string) error {
	s.published = in
	return nil
}
func (s *testStore) AdminPage(context.Context, PageQuery) (Page, error) { return Page{}, nil }
func (s *testStore) IsAdmin(context.Context, int64) (bool, error)       { return s.admin, nil }
func (s *testStore) RecordRoleChange(context.Context, *gorm.DB, int64, []string, []string) error {
	return nil
}

func TestPublishRequiresAdminAndDeduplicatesRecipients(t *testing.T) {
	store := &testStore{admin: true}
	service, _ := NewService(store)
	if err := service.Publish(context.Background(), 1, PublishInput{Title: "公告", Content: "内容", UserIDs: []int64{2, 2, 3}}); err != nil {
		t.Fatalf("Publish() error=%v", err)
	}
	if len(store.published.UserIDs) != 2 {
		t.Fatalf("recipient count=%d,want 2", len(store.published.UserIDs))
	}
	store.admin = false
	if err := service.Publish(context.Background(), 1, PublishInput{Title: "公告", Content: "内容", UserIDs: []int64{2}}); err != ErrForbidden {
		t.Fatalf("non-admin error=%v,want %v", err, ErrForbidden)
	}
}

func TestRegisterRoutesDoesNotConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	service, _ := NewService(&testStore{admin: true})
	handler, _ := NewHandler(service)
	RegisterRoutes(router, handler)
}

func TestPublishRouteRejectsNonAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	service, _ := NewService(&testStore{admin: false})
	handler, _ := NewHandler(service)
	RegisterRoutes(router, handler)
	request := httptest.NewRequest(http.MethodPost, "/notification", strings.NewReader(`{"title":"公告","content":"内容","userIds":[1]}`))
	request.Header.Set("Content-Type", "application/json")
	request = request.WithContext(auth.ContextWithPrincipal(request.Context(), auth.Principal{UserID: 9}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d,want %d", response.Code, http.StatusForbidden)
	}
}
