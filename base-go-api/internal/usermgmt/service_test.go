package usermgmt

import (
	"context"
	"golang.org/x/crypto/bcrypt"
	"testing"
)

type fake struct {
	u       User
	revoked bool
}

func (f *fake) Page(context.Context, PageQuery) (Page[User], error)         { return Page[User]{}, nil }
func (f *fake) Find(context.Context, int64) (*User, error)                  { return &f.u, nil }
func (f *fake) UsernameExists(context.Context, string, int64) (bool, error) { return false, nil }
func (f *fake) DeptExists(context.Context, int64) (bool, error)             { return true, nil }
func (f *fake) RolesExist(context.Context, []int64) (bool, error)           { return true, nil }
func (f *fake) Create(context.Context, User) (User, error)                  { return f.u, nil }
func (f *fake) Update(_ context.Context, u User, revoke bool) error {
	f.u.Status = u.Status
	f.revoked = revoke
	return nil
}
func (f *fake) Delete(context.Context, int64) error                 { f.revoked = true; return nil }
func (f *fake) AssignRoles(context.Context, int64, []int64) error   { return nil }
func (f *fake) ResetPassword(context.Context, int64, string) error  { f.revoked = true; return nil }
func (f *fake) ChangePassword(context.Context, int64, string) error { f.revoked = true; return nil }
func (f *fake) UpdateAvatar(context.Context, int64, *string) error  { return nil }

type sink struct{ n int }

func (s *sink) Record(context.Context, AuditEvent) error { s.n++; return nil }
func TestDisableAndPasswordChangeRevokeAndAudit(t *testing.T) {
	h, _ := bcrypt.GenerateFromPassword([]byte("oldpass"), bcrypt.MinCost)
	f := &fake{u: User{ID: 1, Username: "u", Nickname: "u", Password: string(h), Status: 1}}
	a := new(sink)
	s, e := NewService(f, a, "default123")
	if e != nil {
		t.Fatal(e)
	}
	if e = s.SetUserStatus(context.Background(), AuditMetadata{}, 1, 0); e != nil || !f.revoked {
		t.Fatalf("disable e=%v revoked=%v", e, f.revoked)
	}
	f.revoked = false
	if e = s.ChangeCurrentPassword(context.Background(), AuditMetadata{}, 1, ChangePasswordInput{"oldpass", "newpass"}); e != nil || !f.revoked {
		t.Fatalf("password e=%v revoked=%v", e, f.revoked)
	}
	if a.n != 2 {
		t.Fatalf("audit=%d", a.n)
	}
}
