package userdept

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func (h *handler) userPage(w http.ResponseWriter, r *http.Request) {
	page, size, err := pageValues(r)
	if err == nil {
		value, next := h.service.userPage(r.Context(), r, page, size)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) userDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		value, next := h.service.userByID(r.Context(), id, true)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) createUser(w http.ResponseWriter, r *http.Request) {
	var input userInput
	err := decodeBody(r, &input)
	if err == nil {
		value, next := h.service.createUser(r.Context(), input)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) updateUser(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var input userInput
	if err == nil {
		err = decodeBody(r, &input)
	}
	if err == nil {
		value, next := h.service.updateUser(r.Context(), id, input)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) deleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = h.service.deleteUser(r.Context(), id)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) batchDeleteUser(w http.ResponseWriter, r *http.Request) {
	var input idsInput
	err := decodeBody(r, &input)
	if err == nil {
		err = h.service.batchDeleteUser(r.Context(), input.IDs)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) updateUserStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var input statusInput
	if err == nil {
		err = decodeBody(r, &input)
	}
	if err == nil {
		err = h.service.updateUserStatus(r.Context(), id, input.Status)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) assignUserRoles(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var input roleIDsInput
	if err == nil {
		err = decodeBody(r, &input)
	}
	if err == nil {
		err = h.service.assignRoles(r.Context(), id, input.RoleIDs)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) resetUserPassword(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		value, next := h.service.resetPassword(r.Context(), id)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) changeCurrentPassword(w http.ResponseWriter, r *http.Request) {
	var input passwordInput
	err := decodeBody(r, &input)
	if err == nil {
		err = h.service.changePassword(r.Context(), input)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) updateCurrentAvatar(w http.ResponseWriter, r *http.Request) {
	var input avatarInput
	err := decodeBody(r, &input)
	if err == nil {
		err = h.service.updateAvatar(r.Context(), input)
	}
	writeResult(r.Context(), w, nil, err)
}

func (s *service) userPage(ctx context.Context, r *http.Request, page, size int64) (*pageResult[*userRecord], error) {
	where, args := " WHERE u.deleted=0", make([]any, 0)
	query := r.URL.Query()
	if keyword := strings.TrimSpace(query.Get("keyword")); keyword != "" {
		args = append(args, "%"+keyword+"%")
		p := placeholder(args)
		where += " AND (u.username ILIKE $" + p + " OR u.nickname ILIKE $" + p + ")"
	}
	for key, col := range map[string]string{"username": "u.username", "nickname": "u.nickname", "phone": "u.phone", "email": "u.email"} {
		if v := strings.TrimSpace(query.Get(key)); v != "" {
			args = append(args, "%"+v+"%")
			where += " AND " + col + " ILIKE $" + placeholder(args)
		}
	}
	if raw := query.Get("status"); raw != "" && raw != "all" {
		status, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || status < 0 || status > 1 {
			return nil, response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
		}
		args = append(args, status)
		where += " AND u.status=$" + placeholder(args)
	}
	if raw := query.Get("deptId"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || id < 1 {
			return nil, response.Validation(map[string]string{"deptId": "部门 ID 不正确"})
		}
		args = append(args, id)
		where += " AND u.dept_id=$" + placeholder(args)
	}
	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_user u"+where, args...).Scan(&total); err != nil {
		return nil, response.Internal()
	}
	args = append(args, size, (page-1)*size)
	rows, err := s.db.Query(ctx, userSelect+where+" ORDER BY u.create_time DESC,u.id LIMIT $"+strconv.Itoa(len(args)-1)+" OFFSET $"+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	records := make([]*userRecord, 0)
	for rows.Next() {
		item, err := scanUser(rows)
		if err != nil {
			return nil, response.Internal()
		}
		records = append(records, item)
	}
	if err := rows.Err(); err != nil {
		return nil, response.Internal()
	}
	return &pageResult[*userRecord]{Records: records, Total: total, Page: page, PageSize: size}, nil
}

const userSelect = `SELECT u.id,u.username,u.nickname,u.phone,u.email,u.avatar,u.gender,u.dept_id,u.status,u.is_builtin,u.last_login_time,u.last_login_ip,u.remark,u.create_time,u.update_time,d.id,d.dept_name,d.dept_code FROM sys_user u LEFT JOIN sys_dept d ON d.id=u.dept_id AND d.deleted=0`

func (s *service) userByID(ctx context.Context, id int64, withRoles bool) (*userRecord, error) {
	item, err := scanUser(s.db.QueryRow(ctx, userSelect+` WHERE u.id=$1 AND u.deleted=0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, response.Internal()
	}
	if withRoles {
		roles, err := s.rolesByUserID(ctx, id)
		if err != nil {
			return nil, response.Internal()
		}
		item.Roles = roles
	}
	return item, nil
}
func (s *service) createUser(ctx context.Context, input userInput) (*userRecord, error) {
	if err := validateUser(input, true); err != nil {
		return nil, err
	}
	if err := s.ensureUsername(ctx, input.Username, 0); err != nil {
		return nil, err
	}
	password, err := bcrypt.GenerateFromPassword([]byte(s.defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, response.Internal()
	}
	gender, status := "UNSPECIFIED", int64(1)
	if input.Gender != nil && *input.Gender != "" {
		gender = *input.Gender
	}
	if input.Status != nil {
		status = *input.Status
	}
	var id int64
	err = s.db.QueryRow(ctx, `INSERT INTO sys_user(username,nickname,password,phone,email,avatar,gender,dept_id,status,is_builtin,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10) RETURNING id`, strings.TrimSpace(input.Username), strings.TrimSpace(input.Nickname), string(password), normalizedString(input.Phone), normalizedString(input.Email), normalizedString(input.Avatar), gender, input.DeptID, status, normalizedString(input.Remark)).Scan(&id)
	if err != nil {
		return nil, response.Internal()
	}
	return s.userByID(ctx, id, true)
}
func (s *service) updateUser(ctx context.Context, id int64, input userInput) (*userRecord, error) {
	if _, err := s.userByID(ctx, id, false); err != nil {
		return nil, err
	}
	if err := validateUser(input, false); err != nil {
		return nil, err
	}
	gender, status := "UNSPECIFIED", int64(1)
	if input.Gender != nil && *input.Gender != "" {
		gender = *input.Gender
	}
	if input.Status != nil {
		status = *input.Status
	}
	_, err := s.db.Exec(ctx, `UPDATE sys_user SET nickname=$1,phone=$2,email=$3,avatar=$4,gender=$5,dept_id=$6,status=$7,remark=$8,update_time=NOW() WHERE id=$9`, strings.TrimSpace(input.Nickname), normalizedString(input.Phone), normalizedString(input.Email), normalizedString(input.Avatar), gender, input.DeptID, status, normalizedString(input.Remark), id)
	if err != nil {
		return nil, response.Internal()
	}
	if status != 1 {
		s.sessions.DeleteUserID(id)
	}
	return s.userByID(ctx, id, true)
}
func (s *service) deleteUser(ctx context.Context, id int64) error {
	item, err := s.userByID(ctx, id, false)
	if err != nil {
		return err
	}
	if item.IsBuiltin == 1 {
		return response.Business(400, "内置用户禁止删除")
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return response.Internal()
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `UPDATE sys_user SET deleted=1,update_time=NOW() WHERE id=$1`, id); err == nil {
		_, err = tx.Exec(ctx, `DELETE FROM sys_user_role WHERE user_id=$1`, id)
	}
	if err != nil {
		return response.Internal()
	}
	if err = tx.Commit(ctx); err != nil {
		return response.Internal()
	}
	s.sessions.DeleteUserID(id)
	return nil
}
func (s *service) batchDeleteUser(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, id := range ids {
		if err := s.deleteUser(ctx, id); err != nil {
			return err
		}
	}
	return nil
}
func (s *service) updateUserStatus(ctx context.Context, id int64, status *int64) error {
	if status == nil || (*status != 0 && *status != 1) {
		return response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
	}
	if _, err := s.userByID(ctx, id, false); err != nil {
		return err
	}
	if _, err := s.db.Exec(ctx, `UPDATE sys_user SET status=$1,update_time=NOW() WHERE id=$2`, *status, id); err != nil {
		return response.Internal()
	}
	if *status != 1 {
		s.sessions.DeleteUserID(id)
	}
	return nil
}
func (s *service) assignRoles(ctx context.Context, id int64, roleIDs []int64) error {
	if _, err := s.userByID(ctx, id, false); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return response.Internal()
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DELETE FROM sys_user_role WHERE user_id=$1`, id); err != nil {
		return response.Internal()
	}
	seen := map[int64]struct{}{}
	for _, roleID := range roleIDs {
		if _, ok := seen[roleID]; ok {
			continue
		}
		seen[roleID] = struct{}{}
		var count int64
		if err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM sys_role WHERE id=$1 AND deleted=0`, roleID).Scan(&count); err != nil || count == 0 {
			return response.Business(400, "角色不存在")
		}
		if _, err = tx.Exec(ctx, `INSERT INTO sys_user_role(user_id,role_id) VALUES($1,$2)`, id, roleID); err != nil {
			return response.Internal()
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return response.Internal()
	}
	return nil
}
func (s *service) resetPassword(ctx context.Context, id int64) (map[string]string, error) {
	if _, err := s.userByID(ctx, id, false); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(s.defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, response.Internal()
	}
	if _, err = s.db.Exec(ctx, `UPDATE sys_user SET password=$1,update_time=NOW() WHERE id=$2`, string(hash), id); err != nil {
		return nil, response.Internal()
	}
	s.sessions.DeleteUserID(id)
	return map[string]string{"password": s.defaultPassword}, nil
}
func (s *service) changePassword(ctx context.Context, input passwordInput) error {
	fields := map[string]string{}
	if strings.TrimSpace(input.OldPassword) == "" {
		fields["oldPassword"] = "旧密码不能为空"
	}
	if len(input.NewPassword) < 6 || len(input.NewPassword) > 50 {
		fields["newPassword"] = "新密码长度必须在 6 到 50 之间"
	}
	if len(fields) > 0 {
		return response.Validation(fields)
	}
	id, err := currentUserID(ctx)
	if err != nil {
		return err
	}
	var hash string
	if err = s.db.QueryRow(ctx, `SELECT password FROM sys_user WHERE id=$1 AND deleted=0`, id).Scan(&hash); errors.Is(err, pgx.ErrNoRows) {
		return response.Business(404, "数据不存在")
	}
	if err != nil {
		return response.Internal()
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(input.OldPassword)) != nil {
		return response.Business(400, "旧密码错误")
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Internal()
	}
	if _, err = s.db.Exec(ctx, `UPDATE sys_user SET password=$1,update_time=NOW() WHERE id=$2`, string(newHash), id); err != nil {
		return response.Internal()
	}
	s.sessions.DeleteUserID(id)
	return nil
}
func (s *service) updateAvatar(ctx context.Context, input avatarInput) error {
	if strings.TrimSpace(input.Avatar) == "" || len(input.Avatar) > 255 {
		return response.Validation(map[string]string{"avatar": "头像不能为空且长度不能超过 255"})
	}
	id, err := currentUserID(ctx)
	if err != nil {
		return err
	}
	if _, err = s.db.Exec(ctx, `UPDATE sys_user SET avatar=$1,update_time=NOW() WHERE id=$2 AND deleted=0`, strings.TrimSpace(input.Avatar), id); err != nil {
		return response.Internal()
	}
	return nil
}
func (s *service) rolesByUserID(ctx context.Context, id int64) ([]userRole, error) {
	rows, err := s.db.Query(ctx, `SELECT r.id,r.role_name,r.role_code,r.status FROM sys_role r INNER JOIN sys_user_role ur ON ur.role_id=r.id WHERE ur.user_id=$1 AND r.deleted=0 ORDER BY r.sort_order,r.id`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	roles := make([]userRole, 0)
	for rows.Next() {
		var role userRole
		if err := rows.Scan(&role.ID, &role.RoleName, &role.RoleCode, &role.Status); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}
func (s *service) ensureUsername(ctx context.Context, username string, exclude int64) error {
	query, args := `SELECT COUNT(*) FROM sys_user WHERE username=$1 AND deleted=0`, []any{strings.TrimSpace(username)}
	if exclude > 0 {
		query += " AND id<>$2"
		args = append(args, exclude)
	}
	var count int64
	if err := s.db.QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return response.Internal()
	}
	if count > 0 {
		return response.Business(400, "用户名已存在")
	}
	return nil
}
func validateUser(input userInput, creating bool) error {
	fields := map[string]string{}
	if creating && strings.TrimSpace(input.Username) == "" {
		fields["username"] = "用户名不能为空"
	}
	if strings.TrimSpace(input.Nickname) == "" {
		fields["nickname"] = "昵称不能为空"
	}
	if input.Status != nil && *input.Status != 0 && *input.Status != 1 {
		fields["status"] = "状态必须为 0 或 1"
	}
	if len(fields) > 0 {
		return response.Validation(fields)
	}
	return nil
}
func scanUser(row pgx.Row) (*userRecord, error) {
	item := new(userRecord)
	var last, create, update *time.Time
	var deptID *int64
	var deptName, deptCode *string
	err := row.Scan(&item.ID, &item.Username, &item.Nickname, &item.Phone, &item.Email, &item.Avatar, &item.Gender, &item.DeptID, &item.Status, &item.IsBuiltin, &last, &item.LastLoginIP, &item.Remark, &create, &update, &deptID, &deptName, &deptCode)
	if deptID != nil {
		item.Dept = &userDept{ID: *deptID, DeptName: *deptName, DeptCode: *deptCode}
	}
	item.LastLoginTime = timeString(last)
	item.CreateTime = timeString(create)
	item.UpdateTime = timeString(update)
	item.Roles = []userRole{}
	return item, err
}
