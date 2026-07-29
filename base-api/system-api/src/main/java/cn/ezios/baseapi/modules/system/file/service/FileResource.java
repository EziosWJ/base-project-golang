package cn.ezios.baseapi.modules.system.file.service;

import org.springframework.core.io.Resource;

public record FileResource(Resource resource, String originalName, String mimeType) {
}
