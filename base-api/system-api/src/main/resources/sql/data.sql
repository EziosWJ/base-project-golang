INSERT INTO sys_dept (id, parent_id, dept_name, dept_code, sort_order, status, is_builtin, remark)
VALUES (1, 0, '总部', 'ROOT', 1, 1, 1, '内置根部门');

INSERT INTO sys_role (id, role_name, role_code, status, sort_order, is_builtin, remark)
VALUES (1, '超级管理员', 'ADMIN', 1, 1, 1, '内置超级管理员角色');

INSERT INTO sys_user (id, username, nickname, password, gender, dept_id, status, is_builtin, remark)
VALUES (1, 'admin', '管理员', '$2a$10$H/LRi5UDBbOtTBHaABVki.qtv6zGtB8FjdvEbp7ahvSXBzYSTXpi6', 'UNSPECIFIED', 1, 1, 1, '内置管理员用户');

INSERT INTO sys_user_role (user_id, role_id) VALUES (1, 1);

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, permission_code, sort_order, visible, status, is_builtin)
VALUES
(1, 0, '系统管理', 'DIR', '/system', NULL, 'Settings', 'system', 1, 1, 1, 1),
(2, 1, '用户管理', 'MENU', '/system/user', 'system/user/index', 'User', 'system:user', 1, 1, 1, 1),
(3, 1, '角色管理', 'MENU', '/system/role', 'system/role/index', 'Shield', 'system:role', 2, 1, 1, 1),
(4, 1, '菜单管理', 'MENU', '/system/menu', 'system/menu/index', 'Menu', 'system:menu', 3, 1, 1, 1),
(5, 1, '部门管理', 'MENU', '/system/dept', 'system/dept/index', 'Building2', 'system:dept', 4, 1, 1, 1),
(6, 1, '字典管理', 'MENU', '/system/dict', 'system/dict/index', 'BookOpen', 'system:dict', 5, 1, 1, 1),
(7, 0, '日志管理', 'DIR', '/log', NULL, 'ListChecks', 'system:log', 2, 1, 1, 1),
(8, 7, '登录日志', 'MENU', '/system/login-log', 'system/login-log/index', 'LogIn', 'system:login-log', 1, 1, 1, 1),
(9, 7, '操作日志', 'MENU', '/system/oper-log', 'system/oper-log/index', 'ClipboardList', 'system:oper-log', 2, 1, 1, 1),
(10, 0, '文件管理', 'MENU', '/system/file', 'system/file/index', 'File', 'system:file', 3, 1, 1, 1),
(11, 1, '配置管理', 'MENU', '/system/config', 'system/config/index', 'Settings2', 'system:config', 6, 1, 1, 1),
(12, 0, '页面示例', 'DIR', '/examples', NULL, 'FileText', 'examples', 4, 1, 1, 1),
(13, 12, '表单示例', 'MENU', '/forms/basic', 'forms/basic/index', 'FileText', 'examples:form', 1, 1, 1, 1),
(14, 12, '列表页 Demo', 'MENU', '/examples/list', 'examples/list/index', 'Table2', 'examples:list', 2, 1, 1, 1),
(15, 12, '树形结构 Demo', 'MENU', '/examples/tree', 'examples/tree/index', 'Network', 'examples:tree', 3, 1, 1, 1),
(16, 12, '左树右表 Demo', 'MENU', '/examples/tree-table', 'examples/tree-table/index', 'PanelLeft', 'examples:tree-table', 4, 1, 1, 1),
(17, 12, '详情页 Demo', 'MENU', '/examples/detail', 'examples/detail/index', 'FileSearch', 'examples:detail', 5, 1, 1, 1);

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE deleted = 0;

INSERT INTO sys_dict_type (id, dict_name, dict_code, status, sort_order, is_builtin, remark)
VALUES
(1, '用户状态', 'USER_STATUS', 1, 1, 1, '用户启用状态'),
(2, '性别', 'GENDER', 1, 2, 1, '用户性别'),
(3, '菜单类型', 'MENU_TYPE', 1, 3, 1, '菜单类型'),
(4, '通用状态', 'COMMON_STATUS', 1, 4, 1, '通用启用状态'),
(5, '操作类型', 'OPERATION_TYPE', 1, 5, 1, '操作日志类型'),
(6, '登录状态', 'LOGIN_STATUS', 1, 6, 1, '登录日志状态'),
(7, '文件业务模块', 'FILE_BUSINESS_MODULE', 1, 7, 1, '文件业务归属');

INSERT INTO sys_dict_data (dict_type_id, dict_label, dict_value, sort_order, remark)
VALUES
(1, '启用', '1', 1, NULL),
(1, '禁用', '0', 2, NULL),
(2, '未知', 'UNSPECIFIED', 1, NULL),
(2, '男', 'MALE', 2, NULL),
(2, '女', 'FEMALE', 3, NULL),
(3, '目录', 'DIR', 1, NULL),
(3, '菜单', 'MENU', 2, NULL),
(3, '外链', 'LINK', 3, NULL),
(4, '启用', '1', 1, NULL),
(4, '禁用', '0', 2, NULL),
(5, '新增', 'CREATE', 1, NULL),
(5, '修改', 'UPDATE', 2, NULL),
(5, '删除', 'DELETE', 3, NULL),
(5, '导入', 'IMPORT', 4, NULL),
(5, '导出', 'EXPORT', 5, NULL),
(6, '成功', 'SUCCESS', 1, NULL),
(6, '失败', 'FAIL', 2, NULL),
(7, '头像', 'avatar', 1, NULL),
(7, '导入', 'import', 2, NULL),
(7, '附件', 'attachment', 3, NULL);

INSERT INTO sys_dict_type (id, dict_name, dict_code, status, sort_order, is_builtin, remark)
VALUES
(8, '配置类型', 'CONFIG_TYPE', 1, 8, 1, '系统配置归属类型'),
(9, '配置值类型', 'CONFIG_VALUE_TYPE', 1, 9, 1, '配置值数据类型');

INSERT INTO sys_dict_data (dict_type_id, dict_label, dict_value, sort_order, remark)
VALUES
(8, '系统配置', 'SYSTEM', 1, NULL),
(8, '自定义配置', 'CUSTOM', 2, NULL),
(9, '文本', 'TEXT', 1, NULL),
(9, '数字', 'NUMBER', 2, NULL),
(9, '布尔', 'BOOLEAN', 3, NULL);

INSERT INTO sys_config (id, config_name, config_key, config_value, config_type, value_type, status, is_builtin, remark)
VALUES
(1, '日志清空开关', 'system.log-clear-enabled', 'true', 'SYSTEM', 'BOOLEAN', 1, 1, '控制日志清空接口是否可用，dev 默认开启，prod 默认关闭');
