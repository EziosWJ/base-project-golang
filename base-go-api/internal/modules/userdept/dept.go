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
)

func (h *handler) deptTree(w http.ResponseWriter, r *http.Request) {
	value, err := h.service.deptTree(r.Context(), false)
	writeResult(r.Context(), w, value, err)
}
func (h *handler) deptOptions(w http.ResponseWriter, r *http.Request) {
	value, err := h.service.deptTree(r.Context(), true)
	writeResult(r.Context(), w, value, err)
}
func (h *handler) deptPage(w http.ResponseWriter, r *http.Request) {
	page, size, err := pageValues(r)
	if err == nil {
		value, next := h.service.deptPage(r.Context(), r, page, size)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) deptDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		value, next := h.service.deptByID(r.Context(), id)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) createDept(w http.ResponseWriter, r *http.Request) {
	var input deptInput
	err := decodeBody(r, &input)
	if err == nil {
		value, next := h.service.createDept(r.Context(), input)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) updateDept(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var input deptInput
	if err == nil {
		err = decodeBody(r, &input)
	}
	if err == nil {
		value, next := h.service.updateDept(r.Context(), id, input)
		writeResult(r.Context(), w, value, next)
		return
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) deleteDept(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = h.service.deleteDept(r.Context(), id)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) batchDeleteDept(w http.ResponseWriter, r *http.Request) {
	var input idsInput
	err := decodeBody(r, &input)
	if err == nil {
		err = h.service.batchDeleteDept(r.Context(), input.IDs)
	}
	writeResult(r.Context(), w, nil, err)
}
func (h *handler) updateDeptStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var input statusInput
	if err == nil {
		err = decodeBody(r, &input)
	}
	if err == nil {
		err = h.service.updateDeptStatus(r.Context(), id, input.Status)
	}
	writeResult(r.Context(), w, nil, err)
}

func (s *service) deptTree(ctx context.Context, enabledOnly bool) ([]*deptRecord, error) {
	query := `SELECT id,parent_id,dept_name,dept_code,leader,phone,email,sort_order,status,is_builtin,remark,create_time,update_time FROM sys_dept WHERE deleted=0`
	if enabledOnly {
		query += " AND status=1"
	}
	query += " ORDER BY sort_order,id"
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	items, byID := make([]*deptRecord, 0), make(map[int64]*deptRecord)
	for rows.Next() {
		item, err := scanDept(rows)
		if err != nil {
			return nil, response.Internal()
		}
		item.Children = []*deptRecord{}
		items = append(items, item)
		byID[item.ID] = item
	}
	if err := rows.Err(); err != nil {
		return nil, response.Internal()
	}
	roots := make([]*deptRecord, 0)
	for _, item := range items {
		if parent, ok := byID[item.ParentID]; ok && item.ParentID != 0 {
			parent.Children = append(parent.Children, item)
		} else {
			roots = append(roots, item)
		}
	}
	return roots, nil
}

func (s *service) deptPage(ctx context.Context, r *http.Request, page, size int64) (*pageResult[*deptRecord], error) {
	where, args := " WHERE deleted=0", make([]any, 0)
	for key, column := range map[string]string{"deptName": "dept_name", "deptCode": "dept_code"} {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			args = append(args, "%"+value+"%")
			where += " AND " + column + " ILIKE $" + placeholder(args)
		}
	}
	if raw := r.URL.Query().Get("status"); raw != "" {
		status, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || status < 0 || status > 1 {
			return nil, response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
		}
		args = append(args, status)
		where += " AND status=$" + placeholder(args)
	}
	var total int64
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM sys_dept"+where, args...).Scan(&total); err != nil {
		return nil, response.Internal()
	}
	args = append(args, size, (page-1)*size)
	query := `SELECT id,parent_id,dept_name,dept_code,leader,phone,email,sort_order,status,is_builtin,remark,create_time,update_time FROM sys_dept` + where + " ORDER BY sort_order,id LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, response.Internal()
	}
	defer rows.Close()
	records := make([]*deptRecord, 0)
	for rows.Next() {
		item, err := scanDept(rows)
		if err != nil {
			return nil, response.Internal()
		}
		item.Children = []*deptRecord{}
		records = append(records, item)
	}
	if err := rows.Err(); err != nil {
		return nil, response.Internal()
	}
	return &pageResult[*deptRecord]{Records: records, Total: total, Page: page, PageSize: size}, nil
}

func (s *service) deptByID(ctx context.Context, id int64) (*deptRecord, error) {
	item, err := scanDept(s.db.QueryRow(ctx, `SELECT id,parent_id,dept_name,dept_code,leader,phone,email,sort_order,status,is_builtin,remark,create_time,update_time FROM sys_dept WHERE id=$1 AND deleted=0`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, response.Business(404, "数据不存在")
	}
	if err != nil {
		return nil, response.Internal()
	}
	item.Children = []*deptRecord{}
	return item, nil
}
func (s *service) createDept(ctx context.Context, input deptInput) (*deptRecord, error) {
	if err := validateDept(input); err != nil {
		return nil, err
	}
	if err := s.ensureDeptCode(ctx, input.DeptCode, 0); err != nil {
		return nil, err
	}
	parent, sort, status := int64(0), int64(0), int64(1)
	if input.ParentID != nil {
		parent = *input.ParentID
	}
	if input.SortOrder != nil {
		sort = *input.SortOrder
	}
	if input.Status != nil {
		status = *input.Status
	}
	var id int64
	err := s.db.QueryRow(ctx, `INSERT INTO sys_dept(parent_id,dept_name,dept_code,leader,phone,email,sort_order,status,is_builtin,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,$9) RETURNING id`, parent, strings.TrimSpace(input.DeptName), strings.TrimSpace(input.DeptCode), normalizedString(input.Leader), normalizedString(input.Phone), normalizedString(input.Email), sort, status, normalizedString(input.Remark)).Scan(&id)
	if err != nil {
		return nil, response.Internal()
	}
	return s.deptByID(ctx, id)
}
func (s *service) updateDept(ctx context.Context, id int64, input deptInput) (*deptRecord, error) {
	existing, err := s.deptByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := validateDept(input); err != nil {
		return nil, err
	}
	if existing.IsBuiltin == 1 && existing.DeptCode != strings.TrimSpace(input.DeptCode) {
		return nil, response.Business(400, "内置部门禁止修改编码")
	}
	if err := s.ensureDeptCode(ctx, input.DeptCode, id); err != nil {
		return nil, err
	}
	parent, sort, status := int64(0), int64(0), int64(1)
	if input.ParentID != nil {
		parent = *input.ParentID
	}
	if input.SortOrder != nil {
		sort = *input.SortOrder
	}
	if input.Status != nil {
		status = *input.Status
	}
	_, err = s.db.Exec(ctx, `UPDATE sys_dept SET parent_id=$1,dept_name=$2,dept_code=$3,leader=$4,phone=$5,email=$6,sort_order=$7,status=$8,remark=$9,update_time=NOW() WHERE id=$10`, parent, strings.TrimSpace(input.DeptName), strings.TrimSpace(input.DeptCode), normalizedString(input.Leader), normalizedString(input.Phone), normalizedString(input.Email), sort, status, normalizedString(input.Remark), id)
	if err != nil {
		return nil, response.Internal()
	}
	return s.deptByID(ctx, id)
}
func (s *service) deleteDept(ctx context.Context, id int64) error {
	item, err := s.deptByID(ctx, id)
	if err != nil {
		return err
	}
	if item.IsBuiltin == 1 {
		return response.Business(400, "内置部门禁止删除")
	}
	var children, users int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM sys_dept WHERE parent_id=$1 AND deleted=0`, id).Scan(&children); err != nil {
		return response.Internal()
	}
	if children > 0 {
		return response.Business(400, "存在子部门，禁止删除")
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM sys_user WHERE dept_id=$1 AND deleted=0`, id).Scan(&users); err != nil {
		return response.Internal()
	}
	if users > 0 {
		return response.Business(400, "部门已关联用户，禁止删除")
	}
	if _, err = s.db.Exec(ctx, `UPDATE sys_dept SET deleted=1,update_time=NOW() WHERE id=$1`, id); err != nil {
		return response.Internal()
	}
	return nil
}
func (s *service) batchDeleteDept(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return response.Validation(map[string]string{"ids": "ID 列表不能为空"})
	}
	for _, id := range ids {
		if err := s.deleteDept(ctx, id); err != nil {
			return err
		}
	}
	return nil
}
func (s *service) updateDeptStatus(ctx context.Context, id int64, status *int64) error {
	if status == nil || (*status != 0 && *status != 1) {
		return response.Validation(map[string]string{"status": "状态必须为 0 或 1"})
	}
	if _, err := s.deptByID(ctx, id); err != nil {
		return err
	}
	if _, err := s.db.Exec(ctx, `UPDATE sys_dept SET status=$1,update_time=NOW() WHERE id=$2`, *status, id); err != nil {
		return response.Internal()
	}
	return nil
}
func (s *service) ensureDeptCode(ctx context.Context, code string, exclude int64) error {
	query, args := `SELECT COUNT(*) FROM sys_dept WHERE dept_code=$1 AND deleted=0`, []any{strings.TrimSpace(code)}
	if exclude > 0 {
		query += " AND id<>$2"
		args = append(args, exclude)
	}
	var count int64
	if err := s.db.QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return response.Internal()
	}
	if count > 0 {
		return response.Business(400, "部门编码已存在")
	}
	return nil
}
func validateDept(input deptInput) error {
	fields := map[string]string{}
	if input.ParentID == nil {
		fields["parentId"] = "父级部门不能为空"
	}
	if strings.TrimSpace(input.DeptName) == "" {
		fields["deptName"] = "部门名称不能为空"
	}
	if strings.TrimSpace(input.DeptCode) == "" {
		fields["deptCode"] = "部门编码不能为空"
	}
	if input.Status != nil && *input.Status != 0 && *input.Status != 1 {
		fields["status"] = "状态必须为 0 或 1"
	}
	if len(fields) > 0 {
		return response.Validation(fields)
	}
	return nil
}
func scanDept(row pgx.Row) (*deptRecord, error) {
	item := new(deptRecord)
	var create, update *time.Time
	err := row.Scan(&item.ID, &item.ParentID, &item.DeptName, &item.DeptCode, &item.Leader, &item.Phone, &item.Email, &item.SortOrder, &item.Status, &item.IsBuiltin, &item.Remark, &create, &update)
	item.CreateTime = timeString(create)
	item.UpdateTime = timeString(update)
	return item, err
}
func placeholder(args []any) string { return strconv.Itoa(len(args)) }
