package cn.ezios.baseapi.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ConfigModuleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    /** 记录测试中创建的配置 ID，用于最终清理 */
    private static final List<Long> createdIds = new ArrayList<>();

    private static final String PREFIX = "itest." + System.currentTimeMillis() + ".";

    // ========== 分页查询 ==========

    @Test
    @Order(1)
    void configPage_shouldReturnSuccess() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/page")
                        .header("Authorization", token)
                        .param("page", "1")
                        .param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.records").isArray())
                .andExpect(jsonPath("$.data.total").isNumber())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(10));
    }

    @Test
    @Order(2)
    void configPage_shouldContainAllFields() throws Exception {
        String token = loginAsAdmin();

        String response = mockMvc.perform(get("/api/system/config/page")
                        .header("Authorization", token)
                        .param("page", "1")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode records = objectMapper.readTree(response).path("data").path("records");
        if (records.isArray() && !records.isEmpty()) {
            JsonNode first = records.get(0);
            assert first.has("id") : "应包含 id";
            assert first.has("configName") : "应包含 configName";
            assert first.has("configKey") : "应包含 configKey";
            assert first.has("configValue") : "应包含 configValue";
            assert first.has("configType") : "应包含 configType";
            assert first.has("valueType") : "应包含 valueType";
            assert first.has("status") : "应包含 status";
            assert first.has("isBuiltin") : "应包含 isBuiltin";
            assert first.has("createTime") : "应包含 createTime";
            assert first.has("updateTime") : "应包含 updateTime";
        }
    }

    @Test
    @Order(3)
    void configPage_shouldFilterByConfigType() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/page")
                        .header("Authorization", token)
                        .param("page", "1")
                        .param("pageSize", "10")
                        .param("configType", "SYSTEM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.records").isArray());
    }

    // ========== 详情 ==========

    @Test
    @Order(10)
    void configDetail_shouldReturnBuiltinConfig() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/1")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.configKey").value("system.log-clear-enabled"))
                .andExpect(jsonPath("$.data.isBuiltin").value(1));
    }

    @Test
    @Order(11)
    void configDetail_shouldReturn404_whenNotFound() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/99999")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("数据不存在"));
    }

    // ========== 按配置键查询 ==========

    @Test
    @Order(20)
    void configByKey_shouldReturnBuiltinConfig() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/key/system.log-clear-enabled")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.configKey").value("system.log-clear-enabled"))
                .andExpect(jsonPath("$.data.configValue").exists())
                .andExpect(jsonPath("$.data.valueType").exists())
                .andExpect(jsonPath("$.data.configName").exists());
    }

    @Test
    @Order(21)
    void configByKey_shouldReturnOnlyFourFields() throws Exception {
        String token = loginAsAdmin();

        String response = mockMvc.perform(get("/api/system/config/key/system.log-clear-enabled")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        assert data.has("configKey") : "应包含 configKey";
        assert data.has("configValue") : "应包含 configValue";
        assert data.has("valueType") : "应包含 valueType";
        assert data.has("configName") : "应包含 configName";
        assert !data.has("id") : "按键查询不应返回 id";
        assert !data.has("status") : "按键查询不应返回 status";
        assert !data.has("isBuiltin") : "按键查询不应返回 isBuiltin";
    }

    @Test
    @Order(22)
    void configByKey_shouldReturn404_whenNotFound() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/system/config/key/nonexistent.key.999")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("数据不存在"));
    }

    // ========== 新增 ==========

    @Test
    @Order(30)
    void createConfig_shouldSucceed() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "create.ok";

        String body = """
                {
                    "configName": "测试配置",
                    "configKey": "%s",
                    "configValue": "hello",
                    "configType": "CUSTOM",
                    "valueType": "TEXT",
                    "status": 1,
                    "remark": "集成测试创建"
                }
                """.formatted(key);

        mockMvc.perform(post("/api/system/config")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 查询确认创建成功
        mockMvc.perform(get("/api/system/config/key/" + key)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.configKey").value(key))
                .andExpect(jsonPath("$.data.configValue").value("hello"));

        // 记录 ID 用于清理
        long id = findConfigByKey(token, key);
        createdIds.add(id);
    }

    @Test
    @Order(31)
    void createConfig_shouldFail_whenDuplicateKey() throws Exception {
        String token = loginAsAdmin();

        // 内置配置的 configKey
        String body = """
                {
                    "configName": "重复键测试",
                    "configKey": "system.log-clear-enabled"
                }
                """;

        mockMvc.perform(post("/api/system/config")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("配置键已存在"));
    }

    @Test
    @Order(32)
    void createConfig_shouldUseDefaultValues() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "defaults";

        String body = """
                {
                    "configName": "默认值测试",
                    "configKey": "%s"
                }
                """.formatted(key);

        mockMvc.perform(post("/api/system/config")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 通过详情接口验证默认值
        long id = findConfigByKey(token, key);
        createdIds.add(id);

        String detailResponse = mockMvc.perform(get("/api/system/config/" + id)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(detailResponse).path("data");
        assert "SYSTEM".equals(data.path("configType").asText()) : "configType 默认应为 SYSTEM";
        assert "TEXT".equals(data.path("valueType").asText()) : "valueType 默认应为 TEXT";
        assert data.path("status").asInt() == 1 : "status 默认应为 1";
        assert data.path("isBuiltin").asInt() == 0 : "isBuiltin 应为 0";
    }

    @Test
    @Order(33)
    void createConfig_shouldFail_whenMissingRequiredFields() throws Exception {
        String token = loginAsAdmin();

        // 缺少 configName — 参数校验失败返回 HTTP 400
        String body1 = """
                {
                    "configKey": "test.missing.name"
                }
                """;
        mockMvc.perform(post("/api/system/config")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.data.configName").value("配置名称不能为空"));

        // 缺少 configKey
        String body2 = """
                {
                    "configName": "缺少键"
                }
                """;
        mockMvc.perform(post("/api/system/config")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body2))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.data.configKey").value("配置键不能为空"));
    }

    // ========== 修改 ==========

    @Test
    @Order(40)
    void updateConfig_shouldSucceed() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "to.update";

        // 创建
        createConfigDirectly(token, key, "待修改配置");
        long id = findConfigByKey(token, key);
        createdIds.add(id);

        // 修改
        String updateBody = """
                {
                    "configName": "已修改配置",
                    "configKey": "%s",
                    "configValue": "after"
                }
                """.formatted(key);
        mockMvc.perform(put("/api/system/config/" + id)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 验证修改成功
        mockMvc.perform(get("/api/system/config/" + id)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.configName").value("已修改配置"))
                .andExpect(jsonPath("$.data.configValue").value("after"));
    }

    @Test
    @Order(41)
    void updateConfig_shouldFail_whenBuiltin() throws Exception {
        String token = loginAsAdmin();

        // 内置配置 id=1
        String body = """
                {
                    "configName": "尝试修改内置",
                    "configKey": "system.log-clear-enabled",
                    "configValue": "false"
                }
                """;
        mockMvc.perform(put("/api/system/config/1")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("内置配置项禁止修改"));
    }

    @Test
    @Order(42)
    void updateConfig_shouldFail_whenDuplicateKey() throws Exception {
        String token = loginAsAdmin();
        String keyA = PREFIX + "dup.a";
        String keyB = PREFIX + "dup.b";

        createConfigDirectly(token, keyA, "dupA");
        createConfigDirectly(token, keyB, "dupB");
        long idA = findConfigByKey(token, keyA);
        long idB = findConfigByKey(token, keyB);
        createdIds.add(idA);
        createdIds.add(idB);

        // 尝试将 B 的 key 改为 A 的 key
        String body = """
                {
                    "configName": "重复键",
                    "configKey": "%s"
                }
                """.formatted(keyA);
        mockMvc.perform(put("/api/system/config/" + idB)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("配置键已存在"));
    }

    // ========== 删除 ==========

    @Test
    @Order(50)
    void deleteConfig_shouldSucceed() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "to.delete";

        createConfigDirectly(token, key, "待删除");
        long id = findConfigByKey(token, key);

        mockMvc.perform(delete("/api/system/config/" + id)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 验证已删除（逻辑删除，详情返回 404）
        mockMvc.perform(get("/api/system/config/" + id)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @Order(51)
    void deleteConfig_shouldFail_whenBuiltin() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(delete("/api/system/config/1")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("内置配置项禁止删除"));
    }

    @Test
    @Order(52)
    void deleteConfig_shouldReturn404_whenNotFound() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(delete("/api/system/config/99999")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    // ========== 批量删除 ==========

    @Test
    @Order(60)
    void batchDelete_shouldSucceed() throws Exception {
        String token = loginAsAdmin();
        String keyA = PREFIX + "batch.a";
        String keyB = PREFIX + "batch.b";

        createConfigDirectly(token, keyA, "batchA");
        createConfigDirectly(token, keyB, "batchB");
        long idA = findConfigByKey(token, keyA);
        long idB = findConfigByKey(token, keyB);

        String body = "{\"ids\": [" + idA + ", " + idB + "]}";
        mockMvc.perform(post("/api/system/config/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(61)
    void batchDelete_shouldSkipBuiltin() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "batch.skip";

        createConfigDirectly(token, key, "batchSkip");
        long id = findConfigByKey(token, key);

        // 和内置配置一起删除
        String body = "{\"ids\": [1, " + id + "]}";
        mockMvc.perform(post("/api/system/config/batch-delete")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 内置配置仍存在
        mockMvc.perform(get("/api/system/config/1")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.isBuiltin").value(1));
    }

    // ========== 启用/禁用 ==========

    @Test
    @Order(70)
    void updateStatus_shouldSucceed() throws Exception {
        String token = loginAsAdmin();
        String key = PREFIX + "status";

        createConfigDirectly(token, key, "statusTest");
        long id = findConfigByKey(token, key);
        createdIds.add(id);

        // 禁用
        mockMvc.perform(patch("/api/system/config/" + id + "/status")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": 0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 验证已禁用
        mockMvc.perform(get("/api/system/config/" + id)
                        .header("Authorization", token))
                .andExpect(jsonPath("$.data.status").value(0));

        // 按键查询应返回 404（禁用配置不返回）
        mockMvc.perform(get("/api/system/config/key/" + key)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));

        // 重新启用
        mockMvc.perform(patch("/api/system/config/" + id + "/status")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": 1}"))
                .andExpect(jsonPath("$.code").value(200));

        // 按键查询应返回 200
        mockMvc.perform(get("/api/system/config/key/" + key)
                        .header("Authorization", token))
                .andExpect(jsonPath("$.code").value(200));
    }

    // ========== 清理 ==========

    @AfterAll
    static void cleanup(@Autowired MockMvc mockMvc) throws Exception {
        String token = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andReturn().getResponse().getContentAsString();
        token = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(token).path("data").path("tokenValue").asText();

        for (Long id : createdIds) {
            try {
                mockMvc.perform(delete("/api/system/config/" + id)
                        .header("Authorization", token));
            } catch (Exception ignored) {
            }
        }
    }

    // ========== 辅助方法 ==========

    private String loginAsAdmin() throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).path("data").path("tokenValue").asText();
    }

    private long findConfigByKey(String token, String configKey) throws Exception {
        String response = mockMvc.perform(get("/api/system/config/page")
                        .header("Authorization", token)
                        .param("configKey", configKey)
                        .param("page", "1")
                        .param("pageSize", "10"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode records = objectMapper.readTree(response).path("data").path("records");
        if (records.isArray()) {
            for (JsonNode record : records) {
                if (configKey.equals(record.path("configKey").asText())) {
                    return record.path("id").asLong();
                }
            }
        }
        throw new RuntimeException("未找到配置: " + configKey);
    }

    private void createConfigDirectly(String token, String configKey, String configName) throws Exception {
        String body = """
                {
                    "configName": "%s",
                    "configKey": "%s",
                    "configValue": "test"
                }
                """.formatted(configName, configKey);
        mockMvc.perform(post("/api/system/config")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
