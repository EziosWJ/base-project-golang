package userdept

import "time"

type pageResult[T any] struct {
	Records  []T   `json:"records"`
	Total    int64 `json:"total"`
	Page     int64 `json:"page"`
	PageSize int64 `json:"pageSize"`
}

type deptRecord struct {
	ID         int64         `json:"id"`
	ParentID   int64         `json:"parentId"`
	DeptName   string        `json:"deptName"`
	DeptCode   string        `json:"deptCode"`
	Leader     *string       `json:"leader"`
	Phone      *string       `json:"phone"`
	Email      *string       `json:"email"`
	SortOrder  int64         `json:"sortOrder"`
	Status     int64         `json:"status"`
	IsBuiltin  int64         `json:"isBuiltin"`
	Remark     *string       `json:"remark"`
	CreateTime *string       `json:"createTime"`
	UpdateTime *string       `json:"updateTime"`
	Children   []*deptRecord `json:"children"`
}

type deptInput struct {
	ParentID  *int64  `json:"parentId"`
	DeptName  string  `json:"deptName"`
	DeptCode  string  `json:"deptCode"`
	Leader    *string `json:"leader"`
	Phone     *string `json:"phone"`
	Email     *string `json:"email"`
	SortOrder *int64  `json:"sortOrder"`
	Status    *int64  `json:"status"`
	Remark    *string `json:"remark"`
}

type userRole struct {
	ID       int64  `json:"id"`
	RoleName string `json:"roleName"`
	RoleCode string `json:"roleCode"`
	Status   int64  `json:"status"`
}

type userDept struct {
	ID       int64  `json:"id"`
	DeptName string `json:"deptName"`
	DeptCode string `json:"deptCode"`
}

type userRecord struct {
	ID            int64      `json:"id"`
	Username      string     `json:"username"`
	Nickname      string     `json:"nickname"`
	Phone         *string    `json:"phone"`
	Email         *string    `json:"email"`
	Avatar        *string    `json:"avatar"`
	Gender        string     `json:"gender"`
	DeptID        *int64     `json:"deptId"`
	Status        int64      `json:"status"`
	IsBuiltin     int64      `json:"isBuiltin"`
	LastLoginTime *string    `json:"lastLoginTime"`
	LastLoginIP   *string    `json:"lastLoginIp"`
	Remark        *string    `json:"remark"`
	CreateTime    *string    `json:"createTime"`
	UpdateTime    *string    `json:"updateTime"`
	Dept          *userDept  `json:"dept"`
	Roles         []userRole `json:"roles"`
}

type userInput struct {
	Username string  `json:"username"`
	Nickname string  `json:"nickname"`
	Phone    *string `json:"phone"`
	Email    *string `json:"email"`
	Avatar   *string `json:"avatar"`
	Gender   *string `json:"gender"`
	DeptID   *int64  `json:"deptId"`
	Status   *int64  `json:"status"`
	Remark   *string `json:"remark"`
}

type idsInput struct {
	IDs []int64 `json:"ids"`
}

type statusInput struct {
	Status *int64 `json:"status"`
}

type roleIDsInput struct {
	RoleIDs []int64 `json:"roleIds"`
}

type passwordInput struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type avatarInput struct {
	Avatar string `json:"avatar"`
}

func timeString(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format("2006-01-02T15:04:05")
	return &formatted
}
