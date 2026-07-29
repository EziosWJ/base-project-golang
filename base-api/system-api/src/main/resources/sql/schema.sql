CREATE TABLE IF NOT EXISTS sys_dept (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT NOT NULL DEFAULT 0,
    dept_name VARCHAR(100) NOT NULL,
    dept_code VARCHAR(50) NOT NULL,
    leader VARCHAR(50) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_dept_code (dept_code),
    KEY idx_parent_id (parent_id),
    KEY idx_deleted_status_sort (deleted, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    avatar VARCHAR(255) NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'UNSPECIFIED',
    dept_id BIGINT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    last_login_time DATETIME NULL,
    last_login_ip VARCHAR(45) NULL,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_username (username),
    KEY idx_dept_id (dept_id),
    KEY idx_deleted_status (deleted, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_role (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_role_code (role_code),
    KEY idx_deleted_status_sort (deleted, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_menu (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT NOT NULL DEFAULT 0,
    menu_name VARCHAR(50) NOT NULL,
    menu_type VARCHAR(20) NOT NULL,
    path VARCHAR(255) NULL,
    component VARCHAR(255) NULL,
    external_url VARCHAR(500) NULL,
    icon VARCHAR(100) NULL,
    permission_code VARCHAR(100) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    visible TINYINT NOT NULL DEFAULT 1,
    status TINYINT NOT NULL DEFAULT 1,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_permission_code (permission_code),
    KEY idx_parent_id (parent_id),
    KEY idx_deleted_status_sort (deleted, status, sort_order),
    KEY idx_menu_type (menu_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_user_role (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    UNIQUE KEY uk_user_role (user_id, role_id),
    KEY idx_user_id (user_id),
    KEY idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_role_menu (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    UNIQUE KEY uk_role_menu (role_id, menu_id),
    KEY idx_role_id (role_id),
    KEY idx_menu_id (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_dict_type (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dict_name VARCHAR(100) NOT NULL,
    dict_code VARCHAR(100) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_dict_code (dict_code),
    KEY idx_deleted_status_sort (deleted, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_dict_data (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dict_type_id BIGINT NOT NULL,
    dict_label VARCHAR(100) NOT NULL,
    dict_value VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_type_value (dict_type_id, dict_value),
    KEY idx_dict_type_id (dict_type_id),
    KEY idx_deleted_sort (deleted, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_login_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    login_status VARCHAR(20) NOT NULL,
    login_ip VARCHAR(45) NULL,
    login_location VARCHAR(100) NULL,
    browser VARCHAR(100) NULL,
    os VARCHAR(100) NULL,
    user_agent VARCHAR(500) NULL,
    message VARCHAR(500) NULL,
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_username (username),
    KEY idx_login_status (login_status),
    KEY idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_oper_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    request_method VARCHAR(20) NULL,
    request_url VARCHAR(500) NULL,
    operator_id BIGINT NULL,
    operator_name VARCHAR(50) NULL,
    operator_ip VARCHAR(45) NULL,
    operator_location VARCHAR(100) NULL,
    request_params TEXT NULL,
    response_result TEXT NULL,
    cost_time BIGINT NULL,
    operation_status VARCHAR(20) NOT NULL,
    error_message TEXT NULL,
    operation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_module_name (module_name),
    KEY idx_operation_type (operation_type),
    KEY idx_operator_id (operator_id),
    KEY idx_operation_status (operation_status),
    KEY idx_operation_time (operation_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_file (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    storage_name VARCHAR(255) NOT NULL,
    extension VARCHAR(50) NULL,
    mime_type VARCHAR(100) NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_md5 VARCHAR(32) NULL,
    storage_path VARCHAR(500) NOT NULL,
    access_url VARCHAR(500) NULL,
    business_module VARCHAR(50) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_file_md5 (file_md5),
    KEY idx_business_module (business_module),
    KEY idx_deleted_status (deleted, status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_config (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value VARCHAR(500) NULL,
    config_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    value_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    status TINYINT NOT NULL DEFAULT 1,
    is_builtin TINYINT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by BIGINT NULL,
    update_by BIGINT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_config_key (config_key),
    KEY idx_config_type (config_type),
    KEY idx_deleted_status (deleted, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
