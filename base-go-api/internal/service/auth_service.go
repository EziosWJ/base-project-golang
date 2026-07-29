package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/requestmeta"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/types"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// AuthService 封装认证域核心逻辑，包括登录、退出、当前用户和菜单查询。
// 数据库连接池与会话存储由应用级 ServiceContext 注入并复用。
type AuthService struct {
	db       *pgxpool.Pool
	sessions *auth.SessionStore
}

// userRow 是认证模块内部使用的数据库投影，只保留登录和当前用户所需字段。
type userRow struct {
	id            int64
	username      string
	nickname      string
	password      string
	phone         *string
	email         *string
	avatar        *string
	deptID        *int64
	status        int64
	lastLoginTime *time.Time
	lastLoginIP   *string
}

// NewAuthService 创建认证服务。
func NewAuthService(db *pgxpool.Pool, sessions *auth.SessionStore) *AuthService {
	return &AuthService{db: db, sessions: sessions}
}

// Login 校验登录参数、用户状态和 BCrypt 密码，成功后创建会话 Token。
func (s *AuthService) Login(ctx context.Context, request *types.LoginRequest) (*types.LoginToken, error) {
	fields := make(map[string]string)
	if strings.TrimSpace(request.Username) == "" {
		fields["username"] = "用户名不能为空"
	}
	if strings.TrimSpace(request.Password) == "" {
		fields["password"] = "密码不能为空"
	}
	if len(fields) > 0 {
		return nil, response.Validation(fields)
	}

	// 用户不存在和密码错误对客户端返回相同提示，避免泄露账号是否存在。
	user, err := s.findUserByUsername(ctx, request.Username)
	if errors.Is(err, pgx.ErrNoRows) {
		s.recordLogin(ctx, request.Username, "FAIL", "用户不存在")
		return nil, response.Business(400, "用户名或密码错误")
	}
	if err != nil {
		return nil, response.Internal()
	}
	if user.status != 1 {
		s.recordLogin(ctx, request.Username, "FAIL", "用户已禁用")
		return nil, response.Business(403, "用户已禁用")
	}
	if bcrypt.CompareHashAndPassword([]byte(user.password), []byte(request.Password)) != nil {
		s.recordLogin(ctx, request.Username, "FAIL", "密码错误")
		return nil, response.Business(400, "用户名或密码错误")
	}

	// 密码验证通过后创建服务端会话，Token 本身不携带用户业务数据。
	token, expiresIn, err := s.sessions.Create(user.id)
	if err != nil {
		return nil, response.Internal()
	}

	// 登录成功时同步更新最近登录时间和来源 IP，便于后台审计和用户信息展示。
	if _, err = s.db.Exec(ctx, `UPDATE sys_user SET last_login_time = NOW(), last_login_ip = $1 WHERE id = $2`, requestmeta.IP(ctx), user.id); err != nil {
		return nil, response.Internal()
	}
	s.recordLogin(ctx, user.username, "SUCCESS", "登录成功")
	return &types.LoginToken{TokenName: "Authorization", TokenValue: "Bearer " + token, ExpiresIn: expiresIn}, nil
}

// Logout 删除当前请求使用的会话 Token，实现服务端主动失效。
func (s *AuthService) Logout(ctx context.Context) error {
	token := strings.TrimSpace(strings.TrimPrefix(requestToken(ctx), "Bearer"))
	if token != "" {
		s.sessions.Delete(token)
	}
	return nil
}

// CurrentUser 根据认证中间件写入的用户 ID 查询当前用户、角色和部门信息。
func (s *AuthService) CurrentUser(ctx context.Context) (*types.AuthUser, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, response.Unauthorized()
	}
	user, err := s.findUserByID(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, response.Internal()
	}
	roles, err := s.rolesByUserID(ctx, user.id)
	if err != nil {
		return nil, response.Internal()
	}
	dept, err := s.deptByID(ctx, user.deptID)
	if err != nil {
		return nil, response.Internal()
	}
	return &types.AuthUser{
		Id: user.id, Username: user.username, Nickname: user.nickname,
		Avatar: user.avatar, Phone: user.phone, Email: user.email, Dept: dept, Roles: roles,
		LastLoginTime: formatTime(user.lastLoginTime), LastLoginIp: user.lastLoginIP,
	}, nil
}

// CurrentUserMenus 查询当前用户通过角色关联获得的可见菜单，并组装为树形结构。
func (s *AuthService) CurrentUserMenus(ctx context.Context) ([]types.AuthMenu, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, response.Unauthorized()
	}

	// 只返回启用、未删除且可见的菜单；角色本身也必须处于可用状态。
	rows, err := s.db.Query(ctx, `
SELECT DISTINCT m.id, m.parent_id, m.menu_name, m.menu_type, m.path, m.component,
       m.external_url, m.icon, m.permission_code, m.sort_order, m.visible
FROM sys_menu m
INNER JOIN sys_role_menu rm ON rm.menu_id = m.id
INNER JOIN sys_user_role ur ON ur.role_id = rm.role_id
INNER JOIN sys_role r ON r.id = ur.role_id
WHERE ur.user_id = $1 AND r.deleted = 0 AND r.status = 1
  AND m.deleted = 0 AND m.status = 1 AND m.visible = 1
ORDER BY m.sort_order ASC, m.id ASC`, userID)
	if err != nil {
		return nil, response.Internal()
	}
	defer rows.Close()

	// 先按 ID 建立索引，再在第二遍中挂接父子关系，避免递归查询数据库。
	menus := make(map[int64]*types.AuthMenu)
	orderedIDs := make([]int64, 0)
	for rows.Next() {
		menu := new(types.AuthMenu)
		var component, externalURL, icon, permissionCode *string
		if err := rows.Scan(&menu.Id, &menu.ParentId, &menu.MenuName, &menu.MenuType, &menu.Path,
			&component, &externalURL, &icon, &permissionCode, &menu.SortOrder, &menu.Visible); err != nil {
			return nil, response.Internal()
		}
		menu.Component = component
		menu.ExternalUrl = externalURL
		menu.Icon = icon
		menu.PermissionCode = permissionCode
		menu.Children = make([]*types.AuthMenu, 0)
		menus[menu.Id] = menu
		orderedIDs = append(orderedIDs, menu.Id)
	}
	if err := rows.Err(); err != nil {
		return nil, response.Internal()
	}

	roots := make([]*types.AuthMenu, 0)
	for _, id := range orderedIDs {
		menu := menus[id]
		parent, found := menus[menu.ParentId]
		// 父节点不在当前结果集中时按根节点处理，避免因权限裁剪导致菜单丢失。
		if menu.ParentId == 0 || !found {
			roots = append(roots, menu)
			continue
		}
		parent.Children = append(parent.Children, menu)
	}
	result := make([]types.AuthMenu, len(roots))
	for index, menu := range roots {
		result[index] = *menu
	}
	return result, nil
}

// findUserByUsername 查询未逻辑删除的用户，用于登录认证。
func (s *AuthService) findUserByUsername(ctx context.Context, username string) (*userRow, error) {
	return s.scanUser(s.db.QueryRow(ctx, `SELECT id, username, nickname, password, phone, email, avatar, dept_id, status, last_login_time, last_login_ip FROM sys_user WHERE username = $1 AND deleted = 0 LIMIT 1`, username))
}

// findUserByID 查询未逻辑删除的用户，用于已认证请求获取用户信息。
func (s *AuthService) findUserByID(ctx context.Context, id int64) (*userRow, error) {
	return s.scanUser(s.db.QueryRow(ctx, `SELECT id, username, nickname, password, phone, email, avatar, dept_id, status, last_login_time, last_login_ip FROM sys_user WHERE id = $1 AND deleted = 0`, id))
}

// scanUser 将 pgx Row 统一映射为认证模块内部用户结构。
func (s *AuthService) scanUser(row pgx.Row) (*userRow, error) {
	user := new(userRow)
	err := row.Scan(&user.id, &user.username, &user.nickname, &user.password, &user.phone, &user.email, &user.avatar, &user.deptID, &user.status, &user.lastLoginTime, &user.lastLoginIP)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// rolesByUserID 查询用户当前关联且有效的角色列表。
func (s *AuthService) rolesByUserID(ctx context.Context, userID int64) ([]types.AuthRole, error) {
	rows, err := s.db.Query(ctx, `SELECT r.id, r.role_name, r.role_code FROM sys_role r INNER JOIN sys_user_role ur ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.deleted = 0 AND r.status = 1 ORDER BY r.sort_order ASC, r.id ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	roles := make([]types.AuthRole, 0)
	for rows.Next() {
		var role types.AuthRole
		if err := rows.Scan(&role.Id, &role.RoleName, &role.RoleCode); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

// deptByID 查询用户所属部门；未设置部门或部门已不存在时返回 nil。
func (s *AuthService) deptByID(ctx context.Context, id *int64) (*types.AuthDept, error) {
	if id == nil {
		return nil, nil
	}
	dept := new(types.AuthDept)
	err := s.db.QueryRow(ctx, `SELECT id, dept_name, dept_code FROM sys_dept WHERE id = $1 AND deleted = 0`, *id).Scan(&dept.Id, &dept.DeptName, &dept.DeptCode)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return dept, nil
}

// recordLogin 记录登录结果；日志写入失败不覆盖原始认证结果。
func (s *AuthService) recordLogin(ctx context.Context, username, status, message string) {
	_, _ = s.db.Exec(ctx, `INSERT INTO sys_login_log (username, login_status, login_ip, user_agent, message, login_time) VALUES ($1, $2, $3, $4, $5, NOW())`, username, status, requestmeta.IP(ctx), requestmeta.UserAgent(ctx), message)
}

// formatTime 将数据库时间统一格式化为前端约定的本地日期时间字符串。
func formatTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format("2006-01-02T15:04:05")
	return &formatted
}

// tokenContextKey 使用私有类型隔离当前请求 Token 的 context key。
type tokenContextKey struct{}

// WithRequestToken 保存原始 Authorization 请求头，供退出登录时定位当前会话。
func WithRequestToken(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, tokenContextKey{}, token)
}

// requestToken 从请求上下文读取认证中间件保存的 Authorization 请求头。
func requestToken(ctx context.Context) string {
	token, _ := ctx.Value(tokenContextKey{}).(string)
	return token
}
