package com.centrecommercial;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class CentreCommercialApplication {

    public static void main(String[] args) {
        SpringApplication.run(CentreCommercialApplication.class, args);
    }
}

