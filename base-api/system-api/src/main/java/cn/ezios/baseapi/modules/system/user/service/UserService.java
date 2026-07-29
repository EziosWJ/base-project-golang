package cn.ezios.baseapi.modules.system.user.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.user.dto.AvatarUpdateRequest;
import cn.ezios.baseapi.modules.system.user.dto.PasswordChangeRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserPageQuery;
import cn.ezios.baseapi.modules.system.user.dto.UserRoleRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserSaveRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserUpdateRequest;
import cn.ezios.baseapi.modules.system.user.vo.ResetPasswordVO;
import cn.ezios.baseapi.modules.system.user.vo.UserVO;

public interface UserService {

    PageResult<UserVO> page(UserPageQuery query);

    UserVO getDetail(Long id);

    void create(UserSaveRequest request);

    void update(Long id, UserUpdateRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);

    void assignRoles(Long id, UserRoleRequest request);

    ResetPasswordVO resetPassword(Long id);

    void changeCurrentPassword(PasswordChangeRequest request);

    void updateCurrentAvatar(AvatarUpdateRequest request);
}
