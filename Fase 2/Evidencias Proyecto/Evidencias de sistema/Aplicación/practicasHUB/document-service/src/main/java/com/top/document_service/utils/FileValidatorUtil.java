package com.top.document_service.utils;

import org.springframework.web.multipart.MultipartFile;
import java.util.Arrays;
import java.util.List;

public class FileValidatorUtil {
    private static final long MAX_FILE_SIZE = 40 * 1024 * 1024;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "jpg", "jpeg", "png"
    );


    private static final List<String> FORBIDDEN_MIME_TYPES = Arrays.asList(
            "application/x-msdownload",
            "application/x-sh",
            "video/mp4", "video/x-msvideo", "video/quicktime"
    );

    public static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo no puede estar vacío.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("El archivo supera el límite máximo permitido de 40 MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("El archivo no tiene una extensión válida.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Tipo de archivo no permitido. Solo se aceptan: PDF, Office, TXT e Imágenes.");
        }

        String contentType = file.getContentType();
        if (contentType != null) {
            boolean isForbidden = FORBIDDEN_MIME_TYPES.stream().anyMatch(contentType::startsWith);
            if (isForbidden || contentType.startsWith("video/")) {
                throw new IllegalArgumentException("VIOLACIÓN DE SEGURIDAD: No se permiten videos ni archivos ejecutables.");
            }
        }
    }
}
