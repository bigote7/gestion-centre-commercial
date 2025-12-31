package com.centrecommercial.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.Arrays;

/**
 * Configuration du cache Spring pour améliorer les performances
 * Utilise un cache en mémoire (ConcurrentMapCacheManager)
 * Pour la production, envisager Redis pour un cache distribué
 */
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    @Profile("!redis") // Utiliser ce cache si Redis n'est pas configuré
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(Arrays.asList(
            "tickets",           // Cache pour les tickets
            "ticketDetails",     // Cache pour les détails de tickets
            "users",             // Cache pour les utilisateurs
            "reparateurs",       // Cache pour les réparateurs
            "commissions",      // Cache pour les commissions
            "payments",          // Cache pour les paiements
            "commissionsSummary" // Cache pour les résumés de commissions
        ));
        cacheManager.setAllowNullValues(false);
        return cacheManager;
    }
}

