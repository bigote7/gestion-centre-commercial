package com.centrecommercial.service;

import com.centrecommercial.domain.commission.Commission;
import com.centrecommercial.domain.payment.Payment;
import com.centrecommercial.domain.payment.PaymentStatus;
import com.centrecommercial.domain.ticket.Ticket;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.payment.PaymentDetailResponse;
import com.centrecommercial.dto.payment.PaymentRequest;
import com.centrecommercial.dto.payment.PaymentResponse;
import com.centrecommercial.dto.payment.PaymentValidationRequest;
import com.centrecommercial.exception.BusinessException;
import com.centrecommercial.exception.NotFoundException;
import com.centrecommercial.repository.CommissionRepository;
import com.centrecommercial.repository.PaymentRepository;
import com.centrecommercial.repository.TicketRepository;
import com.centrecommercial.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final CommissionRepository commissionRepository;

    public List<PaymentResponse> findByUser(Long userId) {
        return paymentRepository.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    public List<PaymentResponse> findByTicket(Long ticketId) {
        return paymentRepository.findByTicketId(ticketId).stream().map(this::toResponse).toList();
    }

    @Cacheable(value = "payments", key = "'all'")
    @Transactional(readOnly = true)
    public List<PaymentDetailResponse> findAllWithDetails() {
        log.debug("Récupération de tous les paiements avec détails");
        try {
            List<Payment> payments = paymentRepository.findAllWithDetails();
            log.debug("Paiements trouvés: {}", payments.size());
            return payments.stream()
                    .map(this::toDetailResponse)
                    .toList();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des paiements", e);
            throw new BusinessException("Erreur lors de la récupération des paiements: " + e.getMessage());
        }
    }

    @CacheEvict(value = {"payments", "commissions", "commissionsSummary"}, allEntries = true)
    @Transactional
    public PaymentResponse create(Long userId, PaymentRequest request) {
        log.debug("Création paiement - User ID: {}, Montant: {}", userId, request.amount());
        User user = getUser(userId);
        Ticket ticket = request.ticketId() != null ? getTicket(request.ticketId()) : null;

        Payment payment = new Payment();
        payment.setAmount(request.amount());
        payment.setCurrency(request.currency() != null ? request.currency() : "MAD");
        if (request.method() != null) {
            payment.setMethod(request.method());
        }
        payment.setNotes(request.notes());
        payment.setTicket(ticket);
        payment.setUser(user);
        Payment saved = paymentRepository.save(payment);
        log.info("Paiement créé avec succès - ID: {}, Montant: {}", saved.getId(), saved.getAmount());
        return toResponse(saved);
    }

    @CacheEvict(value = {"payments", "commissions", "commissionsSummary"}, allEntries = true)
    @Transactional
    public PaymentResponse validate(Long paymentId, PaymentValidationRequest request, Long validatorId) {
        log.debug("Validation paiement - ID: {}, Statut: {}, Validateur: {}", paymentId, request.status(), validatorId);
        try {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new NotFoundException("Paiement introuvable"));
            
            log.debug("Paiement trouvé - ID: {}, Ticket: {}", payment.getId(), 
                      payment.getTicket() != null ? payment.getTicket().getId() : "null");
            
            payment.setStatus(request.status());
            payment.setReceiptUrl(request.receiptUrl());
            payment.setNotes(request.notes());
            payment.setValidatedBy(getUser(validatorId));
            payment.setValidatedAt(Instant.now());
            
            // Si le paiement est validé, calculer les commissions
            if (request.status() == PaymentStatus.VALIDE && payment.getTicket() != null) {
                log.debug("Calcul des commissions pour le paiement ID: {}", paymentId);
                try {
                    calculateCommissions(payment);
                    log.info("Commissions calculées avec succès pour le paiement ID: {}", paymentId);
                } catch (Exception e) {
                    log.error("Erreur lors du calcul des commissions pour le paiement ID: {}", paymentId, e);
                    // On continue quand même la validation du paiement
                }
            }
            
            Payment saved = paymentRepository.save(payment);
            log.info("Paiement validé avec succès - ID: {}, Statut: {}", saved.getId(), saved.getStatus());
            return toResponse(saved);
        } catch (Exception e) {
            log.error("Erreur lors de la validation du paiement ID: {}", paymentId, e);
            throw e;
        }
    }

    private void calculateCommissions(Payment payment) {
        Ticket ticket = payment.getTicket();
        
        // Récupérer le réparateur (agent assigné au ticket)
        User reparateur = ticket.getAssignedAgent();
        if (reparateur == null) {
            throw new BusinessException("Aucun réparateur assigné au ticket");
        }
        
        // Récupérer le propriétaire (chercher un utilisateur avec le rôle PROPRIETAIRE)
        // Pour simplifier, on prend le premier propriétaire trouvé
        // Dans un vrai système, il faudrait lier le ticket à un magasin qui a un propriétaire
        User proprietaire = userRepository.findAll().stream()
                .filter(u -> u.hasRole(RoleType.ROLE_PROPRIETAIRE))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Aucun propriétaire trouvé dans le système"));
        
        // Récupérer le pourcentage de commission du ticket (saisi par le propriétaire lors de l'assignation)
        // Chaque appareil/ticket a son propre pourcentage de commission, pas de commission fixe pour le réparateur
        if (ticket.getCommissionPercentage() == null) {
            throw new BusinessException(
                "Le pourcentage de commission n'a pas été défini pour ce ticket. " +
                "Le propriétaire doit définir le pourcentage lors de l'assignation du réparateur."
            );
        }
        BigDecimal pourcentageReparateur = ticket.getCommissionPercentage();
        
        // Le reste va au propriétaire (100% - pourcentage réparateur)
        BigDecimal pourcentageProprietaire = new BigDecimal("100.00").subtract(pourcentageReparateur);
        
        // Vérifier que le pourcentage réparateur est valide (entre 0 et 100)
        if (pourcentageReparateur.compareTo(BigDecimal.ZERO) < 0 || 
            pourcentageReparateur.compareTo(new BigDecimal("100.00")) > 0) {
            throw new BusinessException("Le pourcentage de commission doit être entre 0% et 100%. Actuellement: " + pourcentageReparateur + "%");
        }
        
        // Calculer les montants
        BigDecimal montantTotal = payment.getAmount();
        BigDecimal montantReparateur = montantTotal.multiply(pourcentageReparateur)
                                                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal montantProprietaire = montantTotal.subtract(montantReparateur);
        
        // Créer la commission
        Commission commission = new Commission();
        commission.setPayment(payment);
        commission.setReparateur(reparateur);
        commission.setProprietaire(proprietaire);
        commission.setMontantReparateur(montantReparateur);
        commission.setMontantProprietaire(montantProprietaire);
        commission.setPourcentageReparateur(pourcentageReparateur);
        commission.setPourcentageProprietaire(pourcentageProprietaire);
        
        commissionRepository.save(commission);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }

    private Ticket getTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket introuvable"));
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getMethod(),
                payment.getTicket() != null ? payment.getTicket().getId() : null,
                payment.getUser() != null ? payment.getUser().getId() : null,
                payment.getValidatedBy() != null ? payment.getValidatedBy().getId() : null,
                payment.getValidatedAt(),
                payment.getReceiptUrl(),
                payment.getNotes(),
                payment.getCreatedAt()
        );
    }

    private PaymentDetailResponse toDetailResponse(Payment payment) {
        User client = payment.getUser();
        Ticket ticket = payment.getTicket();
        
        // Extraire le type d'appareil du titre du ticket
        String appareilType = extractAppareilType(ticket != null ? ticket.getTitle() : null);
        
        // Calculer le statut de paiement
        String statutPaiement = calculateStatutPaiement(payment);
        
        // Pour le prix total, on utilise le montant du paiement
        // Si plusieurs paiements pour un ticket, il faudrait les sommer
        BigDecimal totalReparation = payment.getAmount();
        BigDecimal montantPaye = payment.getStatus() == PaymentStatus.VALIDE ? payment.getAmount() : BigDecimal.ZERO;
        
        return new PaymentDetailResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getMethod(),
                payment.getCreatedAt(),
                // Informations client
                client != null ? client.getId() : null,
                client != null ? client.getFirstName() : null,
                client != null ? client.getLastName() : null,
                // Informations ticket
                ticket != null ? ticket.getId() : null,
                ticket != null ? ticket.getCode() : null,
                ticket != null ? ticket.getTitle() : null,
                appareilType,
                totalReparation,
                montantPaye,
                statutPaiement
        );
    }

    private String extractAppareilType(String title) {
        if (title == null || title.isEmpty()) {
            return "Non spécifié";
        }
        
        String lowerTitle = title.toLowerCase();
        if (lowerTitle.contains("téléphone") || lowerTitle.contains("telephone") || lowerTitle.contains("phone") || lowerTitle.contains("smartphone")) {
            return "Téléphone";
        } else if (lowerTitle.contains("ordinateur") || lowerTitle.contains("pc") || lowerTitle.contains("laptop")) {
            return "Ordinateur";
        } else if (lowerTitle.contains("tv") || lowerTitle.contains("télévision") || lowerTitle.contains("television")) {
            return "TV";
        } else if (lowerTitle.contains("tablette") || lowerTitle.contains("tablet")) {
            return "Tablette";
        } else if (lowerTitle.contains("écran") || lowerTitle.contains("ecran") || lowerTitle.contains("screen")) {
            return "Écran";
        } else if (lowerTitle.contains("imprimante") || lowerTitle.contains("printer")) {
            return "Imprimante";
        } else if (lowerTitle.contains("réfrigérateur") || lowerTitle.contains("refrigerateur") || lowerTitle.contains("frigo")) {
            return "Réfrigérateur";
        } else if (lowerTitle.contains("lave-linge") || lowerTitle.contains("machine à laver")) {
            return "Lave-linge";
        } else {
            return "Autre";
        }
    }

    private String calculateStatutPaiement(Payment payment) {
        if (payment.getStatus() == PaymentStatus.VALIDE) {
            return "PAYE";
        } else if (payment.getStatus() == PaymentStatus.EN_ATTENTE) {
            // Si le montant payé est partiel (on pourrait comparer avec le total du ticket)
            // Pour l'instant, on considère EN_ATTENTE comme NON_PAYE
            return "NON_PAYE";
        } else if (payment.getStatus() == PaymentStatus.REFUSE) {
            return "NON_PAYE";
        } else {
            return "NON_PAYE";
        }
    }
}

