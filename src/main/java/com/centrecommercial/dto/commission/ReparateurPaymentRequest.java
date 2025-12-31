package com.centrecommercial.dto.commission;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ReparateurPaymentRequest(
        @NotNull(message = "Le montant est requis")
        @DecimalMin(value = "0.01", message = "Le montant doit être supérieur à 0")
        BigDecimal montant,
        
        @NotBlank(message = "Le mode de paiement est requis")
        String modePaiement, // CASH, VIREMENT, AUTRE
        
        String commentaire
) {}

