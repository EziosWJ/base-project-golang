import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/http";
import { useAuthStore } from "@/store/auth-store";

export function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.nickname || user?.username || "管理员";
  const username = user?.username ?? "admin";
  const avatarUrl = user?.avatar ? buildApiUrl(user.avatar) : "";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuRootRef.current &&
        event.target instanceof Node &&
        !menuRootRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRootRef} className="relative">
      <Button
        variant="ghost"
        className="flex h-auto justify-between items-center gap-2 rounded-lg border border-border bg-surface px-3 py-0.5 text-left hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-text-secondary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="hidden min-w-0 text-left md:block">
          <div className="truncate text-sm font-medium text-text-primary">
            {displayName}
          </div>
          <div className="mt-1 truncate text-xs text-text-tertiary">
            {username}
          </div>
        </div>
      </Button>

      {menuOpen && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-44 rounded-admin border border-border bg-surface p-1 shadow-admin"
          role="menu"
        >
          <Link
            to="/account/profile"
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-text-secondary hover:bg-slate-50 hover:text-text-primary"
            role="menuitem"
            onClick={closeMenu}
          >
            <UserRound className="h-4 w-4" aria-hidden />
            个人中心
          </Link>
          <Link
            to="/account/change-password"
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-text-secondary hover:bg-slate-50 hover:text-text-primary"
            role="menuitem"
            onClick={closeMenu}
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            修改密码
          </Link>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-secondary hover:bg-slate-50 hover:text-text-primary"
            onClick={() => void handleLogout()}
            role="menuitem"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
