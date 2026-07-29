package rolemenu

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
)

type handler struct{ db *pgxpool.Pool }
type page[T any] struct {
	Records  []T   `json:"records"`
	Total    int64 `json:"total"`
	Page     int64 `json:"page"`
	PageSize int64 `json:"pageSize"`
}
type ids struct {
	IDs []int64 `json:"ids"`
}
type status struct {
	Status *int64 `json:"status"`
}
type menuIDs struct {
	MenuIDs []int64 `json:"menuIds"`
}
type roleInput struct {
	RoleName  string  `json:"roleName"`
	RoleCode  string  `json:"roleCode"`
	Status    *int64  `json:"status"`
	SortOrder *int64  `json:"sortOrder"`
	Remark    *string `json:"remark"`
}
type roleRecord struct {
	ID         int64   `json:"id"`
	RoleName   string  `json:"roleName"`
	RoleCode   string  `json:"roleCode"`
	Status     int64   `json:"status"`
	SortOrder  int64   `json:"sortOrder"`
	IsBuiltin  int64   `json:"isBuiltin"`
	Remark     *string `json:"remark"`
	CreateTime *string `json:"createTime"`
	MenuIDs    []int64 `json:"menuIds,omitempty"`
}
type menuInput struct {
	ParentID       *int64  `json:"parentId"`
	MenuName       string  `json:"menuName"`
	MenuType       string  `json:"menuType"`
	Path           *string `json:"path"`
	Component      *string `json:"component"`
	Icon           *string `json:"icon"`
	PermissionCode *string `json:"permissionCode"`
	SortOrder      *int64  `json:"sortOrder"`
	Visible        *int64  `json:"visible"`
	Status         *int64  `json:"status"`
	ExternalURL    *string `json:"externalUrl"`
	Remark         *string `json:"remark"`
}
type menuRecord struct {
	ID             int64         `json:"id"`
	ParentID       int64         `json:"parentId"`
	MenuName       string        `json:"menuName"`
	MenuType       string        `json:"menuType"`
	Path           *string       `json:"path"`
	Component      *string       `json:"component"`
	Icon           *string       `json:"icon"`
	PermissionCode *string       `json:"permissionCode"`
	SortOrder      int64         `json:"sortOrder"`
	Visible        int64         `json:"visible"`
	Status         int64         `json:"status"`
	ExternalURL    *string       `json:"externalUrl"`
	IsBuiltin      int64         `json:"isBuiltin"`
	Remark         *string       `json:"remark"`
	CreateTime     *string       `json:"createTime"`
	UpdateTime     *string       `json:"updateTime"`
	Children       []*menuRecord `json:"children"`
}

func result(ctx context.Context, w http.ResponseWriter, v any, e error) {
	if e != nil {
		httpx.ErrorCtx(ctx, w, e)
	} else {
		httpx.OkJsonCtx(ctx, w, v)
	}
}
func body(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return response.Validation(map[string]string{"body": "请求体格式不正确"})
	}
	return nil
}
func id(r *http.Request) (int64, error) {
	v, e := strconv.ParseInt(pathvar.Vars(r)["id"], 10, 64)
	if e != nil || v < 1 {
		return 0, response.Validation(map[string]string{"id": "ID 不正确"})
	}
	return v, nil
}
func paging(r *http.Request) (int64, int64, error) {
	p, s := int64(1), int64(10)
	var e error
	if raw := r.URL.Query().Get("page"); raw != "" {
		p, e = strconv.ParseInt(raw, 10, 64)
	}
	if e != nil || p < 1 {
		return 0, 0, response.Validation(map[string]string{"page": "页码不能小于 1"})
	}
	if raw := r.URL.Query().Get("pageSize"); raw != "" {
		s, e = strconv.ParseInt(raw, 10, 64)
	}
	if e != nil || s < 1 || s > 500 {
		return 0, 0, response.Validation(map[string]string{"pageSize": "每页条数必须在 1 到 500 之间"})
	}
	return p, s, nil
}
func nullable(v *string) *string {
	if v == nil {
		return nil
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nil
	}
	return &s
}
func timestamp(v *time.Time) *string {
	if v == nil {
		return nil
	}
	s := v.Format("2006-01-02T15:04:05")
	return &s
}

func (h *handler) rolePage(w http.ResponseWriter, r *http.Request) {
	p, s, e := paging(r)
	if e == nil {
		v, x := h.roles(r.Context(), r, p, s)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) roleOptions(w http.ResponseWriter, r *http.Request) {
	rows, e := h.db.Query(r.Context(), `SELECT id,role_name,role_code,status,sort_order,is_builtin,remark,create_time FROM sys_role WHERE deleted=0 AND status=1 ORDER BY sort_order,id`)
	if e != nil {
		result(r.Context(), w, nil, response.Internal())
		return
	}
	defer rows.Close()
	v := []roleRecord{}
	for rows.Next() {
		x, e := scanRole(rows)
		if e != nil {
			result(r.Context(), w, nil, response.Internal())
			return
		}
		v = append(v, *x)
	}
	result(r.Context(), w, v, rows.Err())
}
func (h *handler) roleDetail(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	if e == nil {
		v, x := h.role(r.Context(), i, true)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) createRole(w http.ResponseWriter, r *http.Request) {
	var in roleInput
	e := body(r, &in)
	if e == nil {
		v, x := h.saveRole(r.Context(), 0, in)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) updateRole(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	var in roleInput
	if e == nil {
		e = body(r, &in)
	}
	if e == nil {
		v, x := h.saveRole(r.Context(), i, in)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) deleteRole(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	if e == nil {
		e = h.removeRole(r.Context(), i)
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) roleBatchDelete(w http.ResponseWriter, r *http.Request) {
	var in ids
	e := body(r, &in)
	if e == nil && len(in.IDs) == 0 {
		e = response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, i := range in.IDs {
		if e == nil {
			e = h.removeRole(r.Context(), i)
		}
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) roleStatus(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	var in status
	if e == nil {
		e = body(r, &in)
	}
	if e == nil {
		e = h.setRoleStatus(r.Context(), i, in.Status)
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) assignMenus(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	var in menuIDs
	if e == nil {
		e = body(r, &in)
	}
	if e == nil {
		e = h.setRoleMenus(r.Context(), i, in.MenuIDs)
	}
	result(r.Context(), w, nil, e)
}

func (h *handler) roles(ctx context.Context, r *http.Request, p, s int64) (*page[roleRecord], error) {
	where, args := " WHERE deleted=0", []any{}
	for k, c := range map[string]string{"roleName": "role_name", "roleCode": "role_code"} {
		if v := strings.TrimSpace(r.URL.Query().Get(k)); v != "" {
			args = append(args, "%"+v+"%")
			where += " AND " + c + " ILIKE $" + strconv.Itoa(len(args))
		}
	}
	if v := r.URL.Query().Get("status"); v != "" {
		args = append(args, v)
		where += " AND status=$" + strconv.Itoa(len(args))
	}
	var total int64
	if e := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_role"+where, args...).Scan(&total); e != nil {
		return nil, response.Internal()
	}
	args = append(args, s, (p-1)*s)
	rows, e := h.db.Query(ctx, `SELECT id,role_name,role_code,status,sort_order,is_builtin,remark,create_time FROM sys_role`+where+" ORDER BY sort_order,id LIMIT $"+strconv.Itoa(len(args)-1)+" OFFSET $"+strconv.Itoa(len(args)), args...)
	if e != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	records := []roleRecord{}
	for rows.Next() {
		v, e := scanRole(rows)
		if e != nil {
			return nil, response.Internal()
		}
		records = append(records, *v)
	}
	return &page[roleRecord]{Records: records, Total: total, Page: p, PageSize: s}, rows.Err()
}
func (h *handler) role(ctx context.Context, i int64, withMenus bool) (*roleRecord, error) {
	v, e := scanRole(h.db.QueryRow(ctx, `SELECT id,role_name,role_code,status,sort_order,is_builtin,remark,create_time FROM sys_role WHERE id=$1 AND deleted=0`, i))
	if errors.Is(e, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if e != nil {
		return nil, response.Internal()
	}
	if withMenus {
		rows, e := h.db.Query(ctx, `SELECT menu_id FROM sys_role_menu WHERE role_id=$1 ORDER BY menu_id`, i)
		if e != nil {
			return nil, response.Internal()
		}
		defer rows.Close()
		for rows.Next() {
			var m int64
			if e = rows.Scan(&m); e != nil {
				return nil, response.Internal()
			}
			v.MenuIDs = append(v.MenuIDs, m)
		}
	}
	return v, nil
}
func (h *handler) saveRole(ctx context.Context, i int64, in roleInput) (*roleRecord, error) {
	fields := map[string]string{}
	if strings.TrimSpace(in.RoleName) == "" {
		fields["roleName"] = "角色名称不能为空"
	}
	if strings.TrimSpace(in.RoleCode) == "" {
		fields["roleCode"] = "角色编码不能为空"
	}
	if len(fields) > 0 {
		return nil, response.Validation(fields)
	}
	if i > 0 {
		old, e := h.role(ctx, i, false)
		if e != nil {
			return nil, e
		}
		if old.IsBuiltin == 1 && old.RoleCode != strings.TrimSpace(in.RoleCode) {
			return nil, response.Business(400, "内置角色禁止修改编码")
		}
	}
	var count int64
	q := `SELECT COUNT(*) FROM sys_role WHERE role_code=$1 AND deleted=0`
	a := []any{strings.TrimSpace(in.RoleCode)}
	if i > 0 {
		q += " AND id<>$2"
		a = append(a, i)
	}
	if e := h.db.QueryRow(ctx, q, a...).Scan(&count); e != nil {
		return nil, response.Internal()
	}
	if count > 0 {
		return nil, response.Business(400, "角色编码已存在")
	}
	status, sort := int64(1), int64(0)
	if in.Status != nil {
		status = *in.Status
	}
	if in.SortOrder != nil {
		sort = *in.SortOrder
	}
	if status != 0 && status != 1 {
		return nil, response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
	}
	if i == 0 {
		e := h.db.QueryRow(ctx, `INSERT INTO sys_role(role_name,role_code,status,sort_order,is_builtin,remark) VALUES($1,$2,$3,$4,0,$5) RETURNING id`, strings.TrimSpace(in.RoleName), strings.TrimSpace(in.RoleCode), status, sort, nullable(in.Remark)).Scan(&i)
		if e != nil {
			return nil, response.Internal()
		}
	} else if _, e := h.db.Exec(ctx, `UPDATE sys_role SET role_name=$1,role_code=$2,status=$3,sort_order=$4,remark=$5,update_time=NOW() WHERE id=$6`, strings.TrimSpace(in.RoleName), strings.TrimSpace(in.RoleCode), status, sort, nullable(in.Remark), i); e != nil {
		return nil, response.Internal()
	}
	return h.role(ctx, i, false)
}
func (h *handler) removeRole(ctx context.Context, i int64) error {
	v, e := h.role(ctx, i, false)
	if e != nil {
		return e
	}
	if v.IsBuiltin == 1 {
		return response.Business(400, "内置角色禁止删除")
	}
	var n int64
	if e = h.db.QueryRow(ctx, `SELECT COUNT(*) FROM sys_user_role WHERE role_id=$1`, i).Scan(&n); e != nil {
		return response.Internal()
	}
	if n > 0 {
		return response.Business(400, "角色已绑定用户，禁止删除")
	}
	tx, e := h.db.Begin(ctx)
	if e != nil {
		return response.Internal()
	}
	defer tx.Rollback(ctx)
	if _, e = tx.Exec(ctx, `UPDATE sys_role SET deleted=1,update_time=NOW() WHERE id=$1`, i); e == nil {
		_, e = tx.Exec(ctx, `DELETE FROM sys_role_menu WHERE role_id=$1`, i)
	}
	if e != nil {
		return response.Internal()
	}
	if e = tx.Commit(ctx); e != nil {
		return response.Internal()
	}
	return nil
}
func (h *handler) setRoleStatus(ctx context.Context, i int64, s *int64) error {
	if s == nil || (*s != 0 && *s != 1) {
		return response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
	}
	if _, e := h.role(ctx, i, false); e != nil {
		return e
	}
	if _, e := h.db.Exec(ctx, `UPDATE sys_role SET status=$1,update_time=NOW() WHERE id=$2`, *s, i); e != nil {
		return response.Internal()
	}
	return nil
}
func (h *handler) setRoleMenus(ctx context.Context, i int64, ids []int64) error {
	if _, e := h.role(ctx, i, false); e != nil {
		return e
	}
	tx, e := h.db.Begin(ctx)
	if e != nil {
		return response.Internal()
	}
	defer tx.Rollback(ctx)
	if _, e = tx.Exec(ctx, `DELETE FROM sys_role_menu WHERE role_id=$1`, i); e != nil {
		return response.Internal()
	}
	seen := map[int64]struct{}{}
	for _, m := range ids {
		if _, ok := seen[m]; ok {
			continue
		}
		seen[m] = struct{}{}
		var n int64
		if e = tx.QueryRow(ctx, `SELECT COUNT(*) FROM sys_menu WHERE id=$1 AND deleted=0`, m).Scan(&n); e != nil {
			return response.Internal()
		}
		if n == 0 {
			return response.Business(400, "菜单不存在")
		}
		if _, e = tx.Exec(ctx, `INSERT INTO sys_role_menu(role_id,menu_id) VALUES($1,$2)`, i, m); e != nil {
			return response.Internal()
		}
	}
	if e = tx.Commit(ctx); e != nil {
		return response.Internal()
	}
	return nil
}
func scanRole(row pgx.Row) (*roleRecord, error) {
	v := new(roleRecord)
	var created *time.Time
	e := row.Scan(&v.ID, &v.RoleName, &v.RoleCode, &v.Status, &v.SortOrder, &v.IsBuiltin, &v.Remark, &created)
	v.CreateTime = timestamp(created)
	v.MenuIDs = []int64{}
	return v, e
}

func (h *handler) menuTree(w http.ResponseWriter, r *http.Request) {
	v, e := h.menus(r.Context(), "", nil, 0, 0)
	if e == nil {
		byID := map[int64]*menuRecord{}
		for _, x := range v.Records {
			x.Children = []*menuRecord{}
			byID[x.ID] = &x
		}
		roots := []*menuRecord{}
		for _, x := range v.Records {
			item := byID[x.ID]
			if parent, ok := byID[item.ParentID]; ok && item.ParentID != 0 {
				parent.Children = append(parent.Children, item)
			} else {
				roots = append(roots, item)
			}
		}
		result(r.Context(), w, roots, nil)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) menuPage(w http.ResponseWriter, r *http.Request) {
	p, s, e := paging(r)
	if e == nil {
		v, x := h.menus(r.Context(), r.URL.Query().Get("menuName"), r.URL.Query(), p, s)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) menuDetail(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	if e == nil {
		v, x := h.menu(r.Context(), i)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) createMenu(w http.ResponseWriter, r *http.Request) {
	var in menuInput
	e := body(r, &in)
	if e == nil {
		v, x := h.saveMenu(r.Context(), 0, in)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) updateMenu(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	var in menuInput
	if e == nil {
		e = body(r, &in)
	}
	if e == nil {
		v, x := h.saveMenu(r.Context(), i, in)
		result(r.Context(), w, v, x)
		return
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) deleteMenu(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	if e == nil {
		e = h.removeMenu(r.Context(), i)
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) menuBatchDelete(w http.ResponseWriter, r *http.Request) {
	var in ids
	e := body(r, &in)
	if e == nil && len(in.IDs) == 0 {
		e = response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, i := range in.IDs {
		if e == nil {
			e = h.removeMenu(r.Context(), i)
		}
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) menuStatus(w http.ResponseWriter, r *http.Request) {
	i, e := id(r)
	var in status
	if e == nil {
		e = body(r, &in)
	}
	if e == nil {
		if in.Status == nil || (*in.Status != 0 && *in.Status != 1) {
			e = response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
		} else if _, x := h.menu(r.Context(), i); x != nil {
			e = x
		} else {
			_, x = h.db.Exec(r.Context(), `UPDATE sys_menu SET status=$1,update_time=NOW() WHERE id=$2`, *in.Status, i)
			if x != nil {
				e = response.Internal()
			}
		}
	}
	result(r.Context(), w, nil, e)
}
func (h *handler) menus(ctx context.Context, name string, q url.Values, p, s int64) (*page[menuRecord], error) {
	where, args := " WHERE deleted=0", []any{}
	if strings.TrimSpace(name) != "" {
		args = append(args, "%"+strings.TrimSpace(name)+"%")
		where += " AND menu_name ILIKE $" + strconv.Itoa(len(args))
	}
	if q != nil {
		for k, c := range map[string]string{"menuType": "menu_type", "status": "status", "visible": "visible"} {
			if v := q.Get(k); v != "" {
				args = append(args, v)
				where += " AND " + c + "=$" + strconv.Itoa(len(args))
			}
		}
	}
	var total int64
	if e := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_menu"+where, args...).Scan(&total); e != nil {
		return nil, response.Internal()
	}
	limit := ""
	if s > 0 {
		args = append(args, s, (p-1)*s)
		limit = " LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))
	}
	rows, e := h.db.Query(ctx, menuSelect+where+" ORDER BY sort_order,id"+limit, args...)
	if e != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	records := []menuRecord{}
	for rows.Next() {
		v, e := scanMenu(rows)
		if e != nil {
			return nil, response.Internal()
		}
		records = append(records, *v)
	}
	return &page[menuRecord]{Records: records, Total: total, Page: p, PageSize: s}, rows.Err()
}

const menuSelect = `SELECT id,parent_id,menu_name,menu_type,path,component,icon,permission_code,sort_order,visible,status,external_url,is_builtin,remark,create_time,update_time FROM sys_menu`

func (h *handler) menu(ctx context.Context, i int64) (*menuRecord, error) {
	v, e := scanMenu(h.db.QueryRow(ctx, menuSelect+` WHERE id=$1 AND deleted=0`, i))
	if errors.Is(e, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if e != nil {
		return nil, response.Internal()
	}
	v.Children = []*menuRecord{}
	return v, nil
}
func (h *handler) saveMenu(ctx context.Context, i int64, in menuInput) (*menuRecord, error) {
	fields := map[string]string{}
	if in.ParentID == nil {
		fields["parentId"] = "父级菜单不能为空"
	}
	if strings.TrimSpace(in.MenuName) == "" {
		fields["menuName"] = "菜单名称不能为空"
	}
	if in.MenuType != "DIR" && in.MenuType != "MENU" && in.MenuType != "LINK" {
		fields["menuType"] = "菜单类型不正确"
	}
	if len(fields) > 0 {
		return nil, response.Validation(fields)
	}
	if i > 0 {
		old, e := h.menu(ctx, i)
		if e != nil {
			return nil, e
		}
		if old.IsBuiltin == 1 && !same(old.PermissionCode, nullable(in.PermissionCode)) {
			return nil, response.Business(400, "内置菜单禁止修改权限编码")
		}
	}
	perm := nullable(in.PermissionCode)
	if perm != nil {
		var n int64
		q := `SELECT COUNT(*) FROM sys_menu WHERE permission_code=$1 AND deleted=0`
		a := []any{*perm}
		if i > 0 {
			q += " AND id<>$2"
			a = append(a, i)
		}
		if e := h.db.QueryRow(ctx, q, a...).Scan(&n); e != nil {
			return nil, response.Internal()
		}
		if n > 0 {
			return nil, response.Business(400, "权限编码已存在")
		}
	}
	sort, visible, status := int64(0), int64(1), int64(1)
	if in.SortOrder != nil {
		sort = *in.SortOrder
	}
	if in.Visible != nil {
		visible = *in.Visible
	}
	if in.Status != nil {
		status = *in.Status
	}
	if i == 0 {
		e := h.db.QueryRow(ctx, `INSERT INTO sys_menu(parent_id,menu_name,menu_type,path,component,icon,permission_code,sort_order,visible,status,external_url,is_builtin,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12) RETURNING id`, *in.ParentID, strings.TrimSpace(in.MenuName), in.MenuType, nullable(in.Path), nullable(in.Component), nullable(in.Icon), perm, sort, visible, status, nullable(in.ExternalURL), nullable(in.Remark)).Scan(&i)
		if e != nil {
			return nil, response.Internal()
		}
	} else if _, e := h.db.Exec(ctx, `UPDATE sys_menu SET parent_id=$1,menu_name=$2,menu_type=$3,path=$4,component=$5,icon=$6,permission_code=$7,sort_order=$8,visible=$9,status=$10,external_url=$11,remark=$12,update_time=NOW() WHERE id=$13`, *in.ParentID, strings.TrimSpace(in.MenuName), in.MenuType, nullable(in.Path), nullable(in.Component), nullable(in.Icon), perm, sort, visible, status, nullable(in.ExternalURL), nullable(in.Remark), i); e != nil {
		return nil, response.Internal()
	}
	return h.menu(ctx, i)
}
func (h *handler) removeMenu(ctx context.Context, i int64) error {
	v, e := h.menu(ctx, i)
	if e != nil {
		return e
	}
	if v.IsBuiltin == 1 {
		return response.Business(400, "内置菜单禁止删除")
	}
	var children, roles int64
	if e = h.db.QueryRow(ctx, `SELECT COUNT(*) FROM sys_menu WHERE parent_id=$1 AND deleted=0`, i).Scan(&children); e != nil {
		return response.Internal()
	}
	if children > 0 {
		return response.Business(400, "存在子菜单，禁止删除")
	}
	if e = h.db.QueryRow(ctx, `SELECT COUNT(*) FROM sys_role_menu WHERE menu_id=$1`, i).Scan(&roles); e != nil {
		return response.Internal()
	}
	if roles > 0 {
		return response.Business(400, "菜单已绑定角色，禁止删除")
	}
	if _, e = h.db.Exec(ctx, `UPDATE sys_menu SET deleted=1,update_time=NOW() WHERE id=$1`, i); e != nil {
		return response.Internal()
	}
	return nil
}
func same(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}
func scanMenu(row pgx.Row) (*menuRecord, error) {
	v := new(menuRecord)
	var c, u *time.Time
	e := row.Scan(&v.ID, &v.ParentID, &v.MenuName, &v.MenuType, &v.Path, &v.Component, &v.Icon, &v.PermissionCode, &v.SortOrder, &v.Visible, &v.Status, &v.ExternalURL, &v.IsBuiltin, &v.Remark, &c, &u)
	v.CreateTime = timestamp(c)
	v.UpdateTime = timestamp(u)
	return v, e
}
