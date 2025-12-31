package com.centrecommercial.dto.ticket;

import com.centrecommercial.domain.ticket.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketCreateRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank String description,
        TicketPriority priority,
        
        // Informations client
        Long clientId, // ID du client existant (optionnel si création rapide)
        String clientFirstName, // Pour création rapide
        String clientLastName,
        String clientEmail,
        String clientPhone,
        
        // Informations appareil
        String deviceType, // SMARTPHONE, LAPTOP, PC, TABLETTE, AUTRE
        String brand, // Marque
        String model, // Modèle
        String accessories // Accessoires donnés (JSON ou texte)
        
        // Réparateur et commission seront assignés après la création du ticket
) {}
