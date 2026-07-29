package cn.ezios.baseapi.modules.system.log.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class LoginLogPageQuery extends PageQuery {

    private String username;

    private String loginStatus;

    private String loginIp;
}
