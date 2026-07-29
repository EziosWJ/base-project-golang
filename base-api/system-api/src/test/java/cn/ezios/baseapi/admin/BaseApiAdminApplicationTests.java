package cn.ezios.baseapi.admin;

import cn.ezios.baseapi.common.model.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

@AutoConfigureMockMvc
@SpringBootTest
class BaseApiAdminApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void protectedApiShouldReturnUnifiedUnauthorizedResponse() throws Exception {
		mockMvc.perform(get("/api/test/protected"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value(401))
				.andExpect(jsonPath("$.message").value("未登录或 token 已失效"));
	}

	@Test
	void validationFailureShouldReturnFieldErrors() throws Exception {
		mockMvc.perform(post("/public/test/validate")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value(400))
				.andExpect(jsonPath("$.message").value("参数错误"))
				.andExpect(jsonPath("$.data.username").value("用户名不能为空"));
	}

	@TestConfiguration
	static class TestControllerConfiguration {

		@Bean
		TestController testController() {
			return new TestController();
		}
	}

	@RestController
	static class TestController {

		@PostMapping("/public/test/validate")
		ApiResponse<Void> validate(@Valid @RequestBody TestRequest request) {
			return ApiResponse.success();
		}
	}

	@Data
	static class TestRequest {

		@NotBlank(message = "用户名不能为空")
		private String username;
	}
}
