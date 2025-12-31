package com.centrecommercial.domain.payment;

import com.centrecommercial.domain.common.BaseEntity;
import com.centrecommercial.domain.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GenerationType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entité représentant un paiement effectué à un réparateur
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "reparateur_payments")
public class ReparateurPayment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reparateur_id", nullable = false)
    private User reparateur;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal montant;

    @Column(name = "mode_paiement", nullable = false, length = 30)
    private String modePaiement; // CASH, VIREMENT, CHEQUE, AUTRE

    @Column(name = "date_paiement", nullable = false)
    private Instant datePaiement;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "effectue_par", nullable = false)
    private User effectuePar; // L'utilisateur (admin/propriétaire) qui a effectué le paiement

    @Column(name = "reference_paiement", length = 100)
    private String referencePaiement; // Numéro de chèque, référence virement, etc.
}

