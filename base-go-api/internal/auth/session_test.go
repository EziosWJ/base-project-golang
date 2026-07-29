package auth

import "testing"

func TestSessionStoreCreateAndDelete(t *testing.T) {
	store := NewSessionStore(60)
	token, expiresIn, err := store.Create(42)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if token == "" || expiresIn != 60 {
		t.Fatalf("Create() = (%q, %d), want non-empty token and 60", token, expiresIn)
	}
	if userID, ok := store.UserID(token); !ok || userID != 42 {
		t.Fatalf("UserID() = (%d, %t), want (42, true)", userID, ok)
	}
	store.Delete(token)
	if _, ok := store.UserID(token); ok {
		t.Fatal("UserID() returned a deleted token")
	}
}
