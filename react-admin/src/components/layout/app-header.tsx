import { Menu, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  onToggleSidebar: () => void;
};

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="折叠侧边栏"
          title="折叠侧边栏"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <div className="hidden md:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 text-left text-sm text-text-tertiary transition-colors hover:border-slate-300 md:flex"
          aria-label="全局搜索"
        >
          <Search className="h-4 w-4" aria-hidden />
          搜索菜单、页面或操作
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="全局搜索"
          title="全局搜索"
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}

