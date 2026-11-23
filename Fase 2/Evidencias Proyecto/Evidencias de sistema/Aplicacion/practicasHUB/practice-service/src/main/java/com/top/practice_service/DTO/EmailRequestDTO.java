package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EmailRequestDTO {
    private String to;
    private String toName;
    private String subject;
    private String title;
    private List<String> paragraphs;
    private String actionUrl;
    private String actionLabel;
    private String footer;
}
