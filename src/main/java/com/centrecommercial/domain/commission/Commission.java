package com.centrecommercial.domain.commission;

import com.centrecommercial.domain.common.BaseEntity;
import com.centrecommercial.domain.payment.Payment;
import com.centrecommercial.domain.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "commissions")
public class Commission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reparateur_id")
    private User reparateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proprietaire_id")
    private User proprietaire;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal montantReparateur;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal montantProprietaire;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal pourcentageReparateur;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal pourcentageProprietaire;
}

