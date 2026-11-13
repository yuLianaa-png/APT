package com.top.practice_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class PracticeServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(PracticeServiceApplication.class, args);
	}

}
