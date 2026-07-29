package cn.ezios.baseapi.modules.system.log.service;

import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.modules.system.log.dto.LoginLogPageQuery;
import cn.ezios.baseapi.modules.system.log.dto.OperLogPageQuery;
import cn.ezios.baseapi.modules.system.log.vo.LoginLogVO;
import cn.ezios.baseapi.modules.system.log.vo.OperLogVO;

public interface LogService {

    PageResult<LoginLogVO> loginPage(LoginLogPageQuery query);

    LoginLogVO loginDetail(Long id);

    void clearLoginLog();

    PageResult<OperLogVO> operPage(OperLogPageQuery query);

    OperLogVO operDetail(Long id);

    void clearOperLog();
}
