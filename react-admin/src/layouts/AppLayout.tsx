import { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Divider,
  Drawer,
  Grid,
  Layout,
  Menu,
  Space,
  Tooltip,
  Typography,
  type MenuProps,
} from 'antd';
import { Menu as MenuIcon, Moon, Search, Sun } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appConfig } from '../config/app.config';
import { buildBreadcrumb, buildCommandItems, buildNavigation, flattenNavigation } from '../config/navigation';
import { matchRoute } from '../config/routes';
import { useAppPreferences } from '../app/AppProviders';
import { CommandPalette, type CommandItem } from '../components/CommandPalette/CommandPalette';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useIsMac } from '../hooks/useIsMac';
import { copy } from '../config/copy';
import { useAuthStore } from '../features/auth/store';
import { buildMenuAccess } from '../lib/access';
import { NotificationBell } from '../components/layout/NotificationBell';
import { UserMenu } from '../components/layout/UserMenu';
import { MessageStreams } from '../components/layout/MessageStreams';
import styles from './AppLayout.module.css';

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export default function AppLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const location = useLocation();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppPreferences();
  const isMac = useIsMac();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const menus = useAuthStore((state) => state.menus);

  const access = useMemo(() => buildMenuAccess(menus, user), [menus, user]);
  const navigation = useMemo(
    () => buildNavigation(menus, access.isAdmin),
    [menus, access.isAdmin],
  );
  const commandItems = useMemo(() => buildCommandItems(navigation), [navigation]);
  const leafItems = useMemo(
    () => new Map(flattenNavigation(navigation).filter((item) => item.path).map((item) => [item.path as string, item])),
    [navigation],
  );
  const breadcrumbs = useMemo(
    () => buildBreadcrumb(location.pathname, navigation),
    [location.pathname, navigation],
  );

  const currentPath = normalizePath(location.pathname);
  const currentRoute = matchRoute(currentPath);
  const selectedKeys = leafItems.has(currentPath) ? [currentPath] : [];
  const shortcutLabel = isMac ? '⌘ K' : 'Ctrl K';
  const themeLabel = themeMode === 'dark' ? copy.nav.lightTheme : copy.nav.darkTheme;

  useDocumentTitle(currentRoute?.title ?? copy.errors.title404);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const navigateTo = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(path);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const handleCommandSelect = (item: CommandItem) => navigateTo(item.path);

  const toMenuItems = (items: typeof navigation): MenuProps['items'] =>
    items.map((item) => {
      const Icon = item.icon;
      if (item.children?.length) {
        return {
          key: item.key,
          label: item.label,
          icon: Icon ? <Icon size={16} aria-hidden="true" /> : undefined,
          children: toMenuItems(item.children),
        };
      }
      return {
        key: item.path ?? item.key,
        label: item.label,
        icon: Icon ? <Icon size={16} aria-hidden="true" /> : undefined,
      };
    });

  const menuItems = toMenuItems(navigation);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (typeof key === 'string' && (key.startsWith('/') || /^https?:\/\//i.test(key))) {
      navigateTo(key);
    }
  };

  const menu = (mode: 'horizontal' | 'inline') => (
    <Menu
      mode={mode}
      selectedKeys={selectedKeys}
      items={menuItems}
      onClick={handleMenuClick}
      className={mode === 'horizontal' ? styles.desktopMenu : styles.mobileMenu}
      aria-label={copy.nav.main}
    />
  );

  const drawerExtras = (
    <div className={styles.drawerExtras}>
      <Button
        block
        icon={<Search size={16} />}
        onClick={() => {
          setMobileMenuOpen(false);
          setSearchOpen(true);
        }}
      >
        {copy.command.title}
        <kbd className={styles.drawerShortcut}>{shortcutLabel}</kbd>
      </Button>
      <Button
        block
        icon={themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        onClick={toggleTheme}
      >
        {themeLabel}
      </Button>
    </div>
  );

  return (
    <Layout className={styles.shell}>
      <MessageStreams />
      <a href="#main-content" className={styles.skipLink}>
        {copy.nav.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          {isMobile && (
            <Button
              type="text"
              aria-label={copy.nav.openMenu}
              icon={<MenuIcon size={20} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          )}
          <Link to="/" className={styles.brandLink} aria-label={copy.nav.brandHome(appConfig.name)}>
            <span className={styles.brandMark} aria-hidden="true">
              {appConfig.logoText}
            </span>
            <Typography.Text strong className={styles.brandName}>
              {appConfig.name}
            </Typography.Text>
          </Link>
        </div>

        <nav className={styles.desktopNav} aria-label={copy.nav.main}>
          {!isMobile && menu('horizontal')}
        </nav>

        <Space className={styles.tools} size={2}>
          <Tooltip title={copy.nav.searchTooltip(shortcutLabel)}>
            <Button
              type="default"
              icon={<Search size={16} />}
              onClick={() => setSearchOpen(true)}
              aria-label={copy.nav.openSearch}
            >
              <span className={styles.searchLabel}>{copy.nav.search}</span>
              <kbd className={styles.shortcut}>{shortcutLabel}</kbd>
            </Button>
          </Tooltip>
          <Tooltip title={themeLabel}>
            <Button
              type="text"
              aria-label={themeLabel}
              icon={themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              onClick={toggleTheme}
            />
          </Tooltip>
          <NotificationBell />
          <UserMenu />
        </Space>
      </header>

      <main id="main-content" className={styles.content} tabIndex={-1}>
        {breadcrumbs.length > 1 && (
          <Breadcrumb
            className={styles.breadcrumb}
            aria-label={copy.nav.breadcrumb}
            items={breadcrumbs.map((entry) => ({
              key: entry.key,
              title: entry.path ? <Link to={entry.path}>{entry.title}</Link> : entry.title,
            }))}
          />
        )}
        <Outlet />
      </main>

      <footer className={styles.footer}>{appConfig.footerText}</footer>

      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span className={styles.brandMark} aria-hidden="true">
              {appConfig.logoText}
            </span>
            <div>
              <Typography.Text strong>{appConfig.name}</Typography.Text>
              <Typography.Text type="secondary" className={styles.drawerCaption}>
                {appConfig.sidebarCaption}
              </Typography.Text>
            </div>
          </div>
        }
        placement="left"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size={300}
        styles={{ body: { padding: '12px 8px' }, wrapper: { maxWidth: '100vw' } }}
      >
        {drawerExtras}
        <Divider className={styles.drawerDivider} />
        {menu('inline')}
      </Drawer>

      <CommandPalette
        open={searchOpen}
        items={commandItems}
        onClose={() => setSearchOpen(false)}
        onSelect={handleCommandSelect}
      />
    </Layout>
  );
}
