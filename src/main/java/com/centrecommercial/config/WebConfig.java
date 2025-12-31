package com.centrecommercial.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    // Configuration pour s'assurer que les routes API sont bien priorisées
    // Les contrôleurs REST ont la priorité sur les ressources statiques
}

