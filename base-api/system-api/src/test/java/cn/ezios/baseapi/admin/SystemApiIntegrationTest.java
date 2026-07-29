package cn.ezios.baseapi.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 新增接口集成测试：
 * 1. 角色选择列表 GET /api/system/role/options
 * 2. 批量删除 POST /api/system/xxx/batch-delete
 * 3. 文件下载异常返回 JSON
 *
 * 注意：SaToken 拦截器在 MockMvc 环境下未完全生效，
 * 因此部分测试通过登录获取 token 后验证接口功能。
 */
@AutoConfigureMockMvc
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SystemApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ========== 角色选择列表接口 ==========

    @Test
    @Order(1)
    void roleOptions_shouldReturnEnabledRoles() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/role/options")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @Order(2)
    void roleOptions_shouldContainRoleNameAndCode() throws Exception {
        String token = loginAsAdmin();

        // 验证返回的角色包含必要字段
        String response = mockMvc.perform(get("/api/system/role/options")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(response);
        JsonNode data = root.path("data");
        if (data.isArray() && data.size() > 0) {
            JsonNode first = data.get(0);
            assert first.has("id") : "角色应包含 id 字段";
            assert first.has("roleName") : "角色应包含 roleName 字段";
            assert first.has("roleCode") : "角色应包含 roleCode 字段";
            assert first.has("status") : "角色应包含 status 字段";
        }
    }

    // ========== 批量删除 POST 接口 ==========

    @Test
    @Order(10)
    void batchDelete_role_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        // 使用不存在的 ID，验证接口可达且返回正确格式
        mockMvc.perform(post("/api/system/role/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("数据不存在"));
    }

    @Test
    @Order(11)
    void batchDelete_user_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/user/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(12)
    void batchDelete_menu_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/menu/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(13)
    void batchDelete_dept_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/dept/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(14)
    void batchDelete_file_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/file/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(15)
    void batchDelete_dictType_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/dict-type/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(16)
    void batchDelete_dictData_shouldAcceptPost() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(post("/api/system/dict-data/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    // ========== 旧 DELETE /batch 路径应不再工作 ==========

    @Test
    @Order(20)
    void oldBatchDeletePath_shouldReturn404() throws Exception {
        String token = loginAsAdmin();

        // 旧路径 DELETE /batch 应该不再匹配（返回 404 或 500）
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/system/role/batch")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\": [99999]}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 旧路径不应返回 200 成功
                    assert status != 200 : "旧路径 DELETE /batch 不应返回 200";
                });
    }

    // ========== 文件下载异常返回 JSON ==========

    @Test
    @Order(30)
    void fileDownload_shouldReturnJsonError_whenNotFound() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/file/99999/download")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("数据不存在"));
    }

    @Test
    @Order(31)
    void fileView_shouldReturnJsonError_whenNotFound() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/file/99999/view")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("数据不存在"));
    }

    // ========== 操作日志详情字段名验证 ==========

    @Test
    @Order(40)
    void operLogDetail_shouldHaveCorrectFieldNames() throws Exception {
        String token = loginAsAdmin();

        // 获取操作日志分页，验证第一条记录包含正确字段
        String response = mockMvc.perform(get("/api/system/oper-log/page")
                        .header("Authorization", token)
                        .param("page", "1")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(response);
        JsonNode records = root.path("data").path("records");
        if (records.isArray() && records.size() > 0) {
            JsonNode first = records.get(0);
            // 验证存在 requestParams 字段（不是 requestParam 或 requestBody）
            assert first.has("requestParams") : "操作日志应包含 requestParams 字段";
            assert !first.has("requestParam") : "操作日志不应包含 requestParam 字段";
        }
    }

    // ========== 菜单详情字段验证 ==========

    @Test
    @Order(50)
    void menuDetail_shouldContainAllFields() throws Exception {
        String token = loginAsAdmin();

        // 先获取菜单树，找到一个菜单 ID
        String treeResponse = mockMvc.perform(get("/api/system/menu/tree")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode tree = objectMapper.readTree(treeResponse);
        JsonNode menus = tree.path("data");
        if (menus.isArray() && menus.size() > 0) {
            Long menuId = menus.get(0).path("id").asLong();

            // 获取菜单详情，验证完整字段
            mockMvc.perform(get("/api/system/menu/" + menuId)
                            .header("Authorization", token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(200))
                    .andExpect(jsonPath("$.data.id").exists())
                    .andExpect(jsonPath("$.data.parentId").exists())
                    .andExpect(jsonPath("$.data.menuName").exists())
                    .andExpect(jsonPath("$.data.menuType").exists())
                    .andExpect(jsonPath("$.data.path").exists())
                    .andExpect(jsonPath("$.data.visible").exists())
                    .andExpect(jsonPath("$.data.status").exists())
                    .andExpect(jsonPath("$.data.isBuiltin").exists())
                    .andExpect(jsonPath("$.data.createTime").exists());
        }
    }

    // ========== 文件分页字段验证 ==========

    @Test
    @Order(60)
    void filePage_shouldContainAllFields() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/file/page")
                        .header("Authorization", token)
                        .param("page", "1")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").exists());
    }

    // ========== 辅助方法 ==========

    private String loginAsAdmin() throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(response);
        return root.path("data").path("tokenValue").asText();
    }
}
