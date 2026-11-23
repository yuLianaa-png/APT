package com.top.notification_service.services;

import com.top.notification_service.DTO.EmailRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

//Envio de correos
@Service
public class EmailService {
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api-key:}")
    private String apiKey;
    @Value("${email.from:}")
    private String fromEmail;
    @Value("${email.from-name:PracticasHub}")
    private String fromName;

    private final RestClient restClient = RestClient.create();

    public void send(EmailRequest email) {
        validate(email);

        if (apiKey.isBlank() || fromEmail.isBlank()) {
            System.out.println("[CORREO SIMULADO] Para: " + email.getTo() + " | Asunto: " + email.getSubject()
                    + " | Enlace: " + email.getActionUrl());
            return;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", Map.of("name", fromName, "email", fromEmail));
        body.put("to", List.of(email.getToName() == null || email.getToName().isBlank()
                ? Map.of("email", email.getTo())
                : Map.of("email", email.getTo(), "name", email.getToName())));
        body.put("subject", email.getSubject());
        body.put("htmlContent", html(email));
        body.put("textContent", text(email));

        restClient.post()
                .uri(BREVO_URL)
                .header("api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    private static void validate(EmailRequest email) {
        if (email == null || email.getTo() == null || !email.getTo().contains("@")) {
            throw new IllegalArgumentException("Falta el destinatario del correo.");
        }
        if (email.getSubject() == null || email.getSubject().isBlank()) {
            throw new IllegalArgumentException("Falta el asunto del correo.");
        }
        //el boton solo puede llevar a una direccion web
        if (email.getActionUrl() != null && !email.getActionUrl().startsWith("https://")
                && !email.getActionUrl().startsWith("http://")) {
            throw new IllegalArgumentException("El enlace del correo no es válido.");
        }
    }

    //diseño simple con estilos en linea - es lo que mejor se ve en Gmail y Outlook
    private static String html(EmailRequest email) {
        StringBuilder html = new StringBuilder();
        html.append("<div style=\"background:#f4f6fa;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937\">")
            .append("<div style=\"max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:28px\">")
            .append("<p style=\"margin:0 0 4px;font-size:13px;color:#19508f;font-weight:bold\">PrácticasHub</p>");
        if (email.getTitle() != null) {
            html.append("<h1 style=\"margin:0 0 16px;font-size:20px\">").append(escape(email.getTitle())).append("</h1>");
        }
        if (email.getParagraphs() != null) {
            for (String paragraph : email.getParagraphs()) {
                html.append("<p style=\"margin:0 0 12px;font-size:15px;line-height:1.5\">").append(escape(paragraph)).append("</p>");
            }
        }
        if (email.getActionUrl() != null) {
            String label = email.getActionLabel() == null ? "Abrir" : email.getActionLabel();
            html.append("<p style=\"margin:20px 0\"><a href=\"").append(escape(email.getActionUrl()))
                .append("\" style=\"display:inline-block;background:#19508f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold\">")
                .append(escape(label)).append("</a></p>")
                .append("<p style=\"margin:0 0 12px;font-size:12px;color:#6b7280\">Si el botón no funciona, copia este enlace en tu navegador:<br>")
                .append(escape(email.getActionUrl())).append("</p>");
        }
        if (email.getFooter() != null) {
            html.append("<hr style=\"border:none;border-top:1px solid #e5e7eb;margin:20px 0\">")
                .append("<p style=\"margin:0;font-size:12px;color:#6b7280\">").append(escape(email.getFooter())).append("</p>");
        }
        return html.append("</div></div>").toString();
    }

    //version en texto plano - ayuda a que el correo no se marque como spam
    private static String text(EmailRequest email) {
        StringBuilder text = new StringBuilder();
        if (email.getTitle() != null) text.append(email.getTitle()).append("\n\n");
        if (email.getParagraphs() != null) email.getParagraphs().forEach(p -> text.append(p).append("\n\n"));
        if (email.getActionUrl() != null) {
            text.append(email.getActionLabel() == null ? "Enlace" : email.getActionLabel())
                .append(": ").append(email.getActionUrl()).append("\n\n");
        }
        if (email.getFooter() != null) text.append(email.getFooter());
        return text.toString();
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }
}
