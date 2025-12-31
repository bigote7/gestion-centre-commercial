package com.centrecommercial.config;

import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Initialise les données de base au démarrage de l'application
 * Crée automatiquement tous les rôles s'ils n'existent pas
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        log.info("🚀 Initialisation des données de base...");
        
        // Créer tous les rôles s'ils n'existent pas
        for (RoleType roleType : RoleType.values()) {
            roleRepository.findByName(roleType).orElseGet(() -> {
                Role role = new Role(roleType);
                roleRepository.save(role);
                log.info("✅ Rôle créé : {}", roleType);
                return role;
            });
        }
        
        log.info("✅ Initialisation terminée - Tous les rôles sont disponibles");
    }
}

