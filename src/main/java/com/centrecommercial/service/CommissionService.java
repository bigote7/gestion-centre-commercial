package com.centrecommercial.service;

import com.centrecommercial.domain.commission.Commission;
import com.centrecommercial.domain.payment.Payment;
import com.centrecommercial.domain.payment.ReparateurPayment;
import com.centrecommercial.domain.ticket.Ticket;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.commission.CommissionResponse;
import com.centrecommercial.dto.commission.CommissionSummaryResponse;
import com.centrecommercial.dto.commission.ReparateurPaymentDetailResponse;
import com.centrecommercial.dto.commission.ReparateurPaymentRequest;
import com.centrecommercial.exception.BusinessException;
import com.centrecommercial.repository.CommissionRepository;
import com.centrecommercial.repository.ReparateurPaymentRepository;
import com.centrecommercial.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommissionService {

    private final CommissionRepository commissionRepository;
    private final UserRepository userRepository;
    private final ReparateurPaymentRepository reparateurPaymentRepository;

    @Transactional(readOnly = true)
    public List<CommissionResponse> findByReparateur(Long reparateurId, Instant dateDebut, Instant dateFin) {
        List<Commission> commissions = commissionRepository.findByReparateurId(reparateurId);
        
        return commissions.stream()
                .filter(c -> {
                    if (dateDebut != null && c.getCreatedAt().isBefore(dateDebut)) return false;
                    if (dateFin != null && c.getCreatedAt().isAfter(dateFin)) return false;
                    return true;
                })
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CommissionSummaryResponse getSummary(Long reparateurId, Instant dateDebut, Instant dateFin) {
        try {
            User reparateur = userRepository.findById(reparateurId)
                    .orElseThrow(() -> new RuntimeException("Réparateur introuvable"));

            List<Commission> commissions = commissionRepository.findByReparateurIdWithDetails(reparateurId);
        
            List<Commission> filteredCommissions = commissions.stream()
                    .filter(c -> {
                        if (dateDebut != null && c.getCreatedAt().isBefore(dateDebut)) return false;
                        if (dateFin != null && c.getCreatedAt().isAfter(dateFin)) return false;
                        return true;
                    })
                    .collect(Collectors.toList());

            BigDecimal totalReparations = filteredCommissions.isEmpty() ? BigDecimal.ZERO :
                    filteredCommissions.stream()
                            .map(c -> c.getPayment() != null ? c.getPayment().getAmount() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalCommissions = filteredCommissions.isEmpty() ? BigDecimal.ZERO :
                    filteredCommissions.stream()
                            .map(Commission::getMontantReparateur)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculer les paiements déjà effectués au réparateur pour cette période
        BigDecimal totalPaye = reparateurPaymentRepository.calculateTotalPayments(
                reparateurId, dateDebut, dateFin);

        // Récupérer tous les paiements du réparateur pour déterminer quelles commissions sont payées
        List<ReparateurPayment> allReparateurPayments = reparateurPaymentRepository.findByReparateurAndDateRange(
                reparateurId, dateDebut, dateFin);
        
        // Calculer le montant en attente en se basant sur les commissions non payées
        BigDecimal montantEnAttente = BigDecimal.ZERO;
        for (Commission commission : filteredCommissions) {
            boolean isPaid = false;
            BigDecimal montantCommission = commission.getMontantReparateur();
            
            // Vérifier si cette commission a été payée
            // On doit vérifier si un paiement couvre cette commission spécifique
            BigDecimal montantPayePourCetteCommission = BigDecimal.ZERO;
            for (ReparateurPayment rp : allReparateurPayments) {
                // Si le paiement est postérieur ou égal à la création de la commission
                if (rp.getDatePaiement().isAfter(commission.getCreatedAt()) || 
                    rp.getDatePaiement().equals(commission.getCreatedAt())) {
                    // Accumuler les paiements pour cette commission
                    montantPayePourCetteCommission = montantPayePourCetteCommission.add(rp.getMontant());
                }
            }
            
            // Vérifier si le montant payé couvre cette commission
            if (montantPayePourCetteCommission.compareTo(montantCommission) >= 0) {
                BigDecimal difference = montantPayePourCetteCommission.subtract(montantCommission).abs();
                // Tolérance de 0.01 MAD pour les arrondis
                if (difference.compareTo(new BigDecimal("0.01")) <= 0 || 
                    montantPayePourCetteCommission.compareTo(montantCommission) >= 0) {
                    isPaid = true;
                }
            }
            
            // Si la commission n'est pas payée, l'ajouter au montant en attente
            if (!isPaid) {
                montantEnAttente = montantEnAttente.add(montantCommission);
            }
        }
        
        // S'assurer que le montant en attente n'est jamais négatif
        BigDecimal soldeRestant = montantEnAttente.max(BigDecimal.ZERO);
        
        // Calculer le pourcentage moyen pondéré basé sur les commissions réelles de chaque ticket
        // Chaque ticket a son propre pourcentage de commission défini par le propriétaire
        BigDecimal pourcentageMoyen = BigDecimal.ZERO;
        if (!filteredCommissions.isEmpty() && totalCommissions.compareTo(BigDecimal.ZERO) > 0) {
            // Calculer la moyenne pondérée : somme(pourcentage * montant) / somme(montant)
            BigDecimal sommePondere = filteredCommissions.stream()
                    .map(c -> {
                        BigDecimal pourcentageTicket = c.getPourcentageReparateur();
                        BigDecimal montantCommission = c.getMontantReparateur();
                        return pourcentageTicket.multiply(montantCommission);
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            pourcentageMoyen = sommePondere.divide(totalCommissions, 2, java.math.RoundingMode.HALF_UP);
        } else {
            // Si aucune commission, utiliser une valeur par défaut
            pourcentageMoyen = new BigDecimal("30.00");
        }

            List<CommissionSummaryResponse.ReparationItem> reparations = filteredCommissions.stream()
                    .filter(c -> c.getPayment() != null && c.getPayment().getTicket() != null)
                    .map(c -> {
                        Ticket ticket = c.getPayment().getTicket();
                        // Utiliser le pourcentage de commission du ticket (variable, défini par le propriétaire)
                        BigDecimal pourcentageTicket = ticket.getCommissionPercentage() != null 
                            ? ticket.getCommissionPercentage() 
                            : c.getPourcentageReparateur(); // Fallback sur le pourcentage de la commission si le ticket n'a pas de pourcentage
                        return new CommissionSummaryResponse.ReparationItem(
                                ticket.getId(),
                                ticket.getCode(),
                                ticket.getRequester() != null 
                                    ? ticket.getRequester().getFirstName() + " " + ticket.getRequester().getLastName()
                                    : "Non spécifié",
                                ticket.getTitle(),
                                c.getPayment().getAmount(),
                                ticket.getCreatedAt(),
                                ticket.getStatus().name(),
                                pourcentageTicket, // Pourcentage spécifique de ce ticket
                                c.getMontantReparateur() // Montant de commission calculé pour ce ticket
                        );
                    })
                    .collect(Collectors.toList());

            return new CommissionSummaryResponse(
                    reparateur.getId(),
                    reparateur.getFirstName() + " " + reparateur.getLastName(),
                    reparateur.getPhone() != null ? reparateur.getPhone() : "Non spécifié",
                    reparateur.getSpecialite() != null ? reparateur.getSpecialite() : "Technicien",
                    filteredCommissions.size(),
                    totalReparations,
                    totalCommissions,
                    totalPaye,
                    soldeRestant,
                    pourcentageMoyen, // Pourcentage moyen pondéré basé sur les commissions réelles
                    reparations
            );
        } catch (Exception e) {
            throw new BusinessException("Erreur lors de la récupération du résumé: " + e.getMessage());
        }
    }

    @Transactional
    public CommissionResponse recordReparateurPayment(Long reparateurId, ReparateurPaymentRequest request, Long actorId) {
        // Vérifier que le réparateur existe
        User reparateur = userRepository.findById(reparateurId)
                .orElseThrow(() -> new RuntimeException("Réparateur introuvable"));

        // Vérifier que l'acteur existe
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Créer l'enregistrement du paiement
        ReparateurPayment payment = ReparateurPayment.builder()
                .reparateur(reparateur)
                .montant(request.montant())
                .modePaiement(request.modePaiement())
                .datePaiement(Instant.now())
                .commentaire(request.commentaire())
                .effectuePar(actor)
                .build();

        reparateurPaymentRepository.save(payment);

        // Retourner une réponse de confirmation
        return new CommissionResponse(
                payment.getId(),
                null, // ticketId
                null, // ticketCode
                "Paiement réparateur",
                reparateur.getFirstName() + " " + reparateur.getLastName(),
                "Paiement au réparateur",
                request.montant(),
                request.montant(),
                BigDecimal.ZERO,
                payment.getCreatedAt(),
                payment.getDatePaiement(),
                request.modePaiement(),
                request.commentaire(),
                "PAYE"
        );
    }

    @Transactional(readOnly = true)
    public List<CommissionResponse> getReparateurPayments(Long reparateurId) {
        List<ReparateurPayment> payments = reparateurPaymentRepository.findByReparateurId(reparateurId);
        
        return payments.stream()
                .map(payment -> new CommissionResponse(
                        payment.getId(),
                        null, // ticketId
                        null, // ticketCode
                        "Paiement réparateur",
                        payment.getReparateur().getFirstName() + " " + payment.getReparateur().getLastName(),
                        "Paiement au réparateur",
                        payment.getMontant(),
                        payment.getMontant(),
                        BigDecimal.ZERO,
                        payment.getCreatedAt(),
                        payment.getDatePaiement(),
                        payment.getModePaiement(),
                        payment.getCommentaire(),
                        "PAYE"
                ))
                .collect(Collectors.toList());
    }

    @CacheEvict(value = {"commissions", "commissionsSummary"}, allEntries = true)
    @Transactional
    public ReparateurPaymentDetailResponse payCommission(Long commissionId, ReparateurPaymentRequest request, Long actorId) {
        log.debug("Paiement commission - ID: {}, Montant: {}, Mode: {}", commissionId, request.montant(), request.modePaiement());
        try {
            // Récupérer la commission
            Commission commission = commissionRepository.findById(commissionId)
                    .orElseThrow(() -> new BusinessException("Commission introuvable avec l'ID: " + commissionId));
            
            log.debug("Commission trouvée: ID={}, Montant={}", commission.getId(), commission.getMontantReparateur());
            
            // Utiliser le montant de la commission (pas celui de la requête pour éviter les erreurs)
            BigDecimal montantCommission = commission.getMontantReparateur();
            BigDecimal montantPaye = request.montant();
            
            // Vérifier que le montant correspond (ou est proche) - tolérance de 0.01 MAD
            BigDecimal difference = montantCommission.subtract(montantPaye).abs();
            if (difference.compareTo(new BigDecimal("0.01")) > 0) {
                log.error("Montant ne correspond pas - Commission: {}, Payé: {}", montantCommission, montantPaye);
                throw new BusinessException(
                    String.format("Le montant payé (%.2f MAD) ne correspond pas au montant de la commission (%.2f MAD)", 
                        montantPaye, montantCommission));
            }
            
            // Vérifier que l'acteur existe
            User actor = userRepository.findById(actorId)
                    .orElseThrow(() -> new BusinessException("Utilisateur introuvable avec l'ID: " + actorId));
            
            log.debug("Acteur trouvé: {} {}", actor.getFirstName(), actor.getLastName());
            
            // Créer l'enregistrement du paiement avec le montant exact de la commission
            ReparateurPayment payment = ReparateurPayment.builder()
                    .reparateur(commission.getReparateur())
                    .montant(montantCommission) // Utiliser le montant exact de la commission
                    .modePaiement(request.modePaiement())
                    .datePaiement(Instant.now())
                    .commentaire(request.commentaire())
                    .effectuePar(actor)
                    .build();
            
            reparateurPaymentRepository.save(payment);
            log.info("Paiement commission sauvegardé - ID: {}, Commission ID: {}, Montant: {}", 
                     payment.getId(), commissionId, montantCommission);
            
            // Recharger les détails pour retourner la réponse mise à jour
            List<ReparateurPaymentDetailResponse> details = getReparateurPaymentDetails(commission.getReparateur().getId(), null, null);
            log.debug("Détails rechargés: {} commissions", details.size());
            
            return details.stream()
                    .filter(detail -> detail.commissionId().equals(commissionId))
                    .findFirst()
                    .orElseThrow(() -> {
                        log.error("Commission non trouvée dans les détails après paiement - ID: {}", commissionId);
                        return new BusinessException("Erreur lors de la mise à jour du statut");
                    });
        } catch (Exception e) {
            log.error("Erreur lors du paiement de la commission - ID: {}", commissionId, e);
            throw e;
        }
    }

    @Cacheable(value = "commissions", key = "#reparateurId + '_' + (#dateDebut != null ? #dateDebut.toString() : 'null') + '_' + (#dateFin != null ? #dateFin.toString() : 'null')")
    @Transactional(readOnly = true)
    public List<ReparateurPaymentDetailResponse> getReparateurPaymentDetails(Long reparateurId, Instant dateDebut, Instant dateFin) {
        log.debug("Récupération détails paiements réparateur - ID: {}, Date début: {}, Date fin: {}", 
                  reparateurId, dateDebut, dateFin);
        try {
            List<Commission> commissions = commissionRepository.findByReparateurIdWithDetails(reparateurId);
            log.debug("Commissions trouvées: {}", commissions.size());
            
            if (commissions.isEmpty()) {
                log.debug("Aucune commission trouvée pour le réparateur {}", reparateurId);
                return List.of(); // Retourner une liste vide si aucune commission
            }
            
            // Filtrer par date si fourni
            List<Commission> filteredCommissions = commissions.stream()
                    .filter(c -> {
                        if (dateDebut != null && c.getCreatedAt().isBefore(dateDebut)) return false;
                        if (dateFin != null && c.getCreatedAt().isAfter(dateFin)) return false;
                        return true;
                    })
                    .collect(Collectors.toList());
        
        // Récupérer tous les paiements du réparateur triés par date (plus ancien en premier)
        List<ReparateurPayment> reparateurPayments = reparateurPaymentRepository.findByReparateurId(reparateurId)
                .stream()
                .sorted((a, b) -> a.getDatePaiement().compareTo(b.getDatePaiement()))
                .collect(Collectors.toList());
        
        // Créer une liste pour suivre les paiements déjà utilisés
        java.util.Set<Long> paiementsUtilises = new java.util.HashSet<>();
        
        return filteredCommissions.stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt())) // Trier par date de création (plus ancien en premier)
                .map(commission -> {
                    Payment payment = commission.getPayment();
                    Ticket ticket = payment.getTicket();
                    User client = ticket != null && ticket.getRequester() != null ? ticket.getRequester() : null;
                    
                    // Extraire le type d'appareil
                    String appareilType = extractAppareilType(ticket != null ? ticket.getTitle() : null);
                    
                    // Déterminer le statut de paiement du réparateur
                    // Chercher si cette commission a été payée en faisant correspondre le montant exact
                    Instant datePaiementReparateur = null;
                    String statutPaiementReparateur = "EN_ATTENTE";
                    BigDecimal montantCommission = commission.getMontantReparateur();
                    
                    // Chercher un paiement qui correspond à cette commission spécifique
                    // Critères : 
                    // 1. Le paiement doit être postérieur ou égal à la création de la commission
                    // 2. Le montant doit correspondre (avec tolérance de 0.01 MAD)
                    // 3. Le paiement ne doit pas avoir été déjà utilisé pour une autre commission
                    for (ReparateurPayment rp : reparateurPayments) {
                        if (paiementsUtilises.contains(rp.getId())) {
                            continue; // Ce paiement a déjà été utilisé
                        }
                        
                        // Vérifier que le paiement est postérieur ou égal à la création de la commission
                        if (rp.getDatePaiement().isBefore(commission.getCreatedAt())) {
                            continue; // Le paiement est antérieur à la commission, on passe
                        }
                        
                        // Vérifier que le montant correspond (avec tolérance)
                        BigDecimal difference = montantCommission.subtract(rp.getMontant()).abs();
                        if (difference.compareTo(new BigDecimal("0.01")) <= 0) {
                            // Correspondance trouvée !
                            datePaiementReparateur = rp.getDatePaiement();
                            statutPaiementReparateur = "PAYE";
                            paiementsUtilises.add(rp.getId()); // Marquer ce paiement comme utilisé
                            log.trace("Commission {} (montant: {}) correspond au paiement {} (montant: {})", 
                                     commission.getId(), montantCommission, rp.getId(), rp.getMontant());
                            break;
                        }
                    }
                    
                    if (statutPaiementReparateur.equals("EN_ATTENTE")) {
                        log.trace("Commission {} (montant: {}) n'a pas de paiement correspondant - EN_ATTENTE", 
                                 commission.getId(), montantCommission);
                    }
                    
                    return new ReparateurPaymentDetailResponse(
                            commission.getId(),
                            ticket != null ? ticket.getId() : null,
                            ticket != null ? ticket.getCode() : null,
                            client != null ? client.getFirstName() : null,
                            client != null ? client.getLastName() : null,
                            appareilType,
                            ticket != null ? ticket.getCreatedAt() : commission.getCreatedAt(),
                            payment.getAmount(),
                            commission.getPourcentageReparateur(),
                            commission.getMontantReparateur(),
                            payment.getStatus(),
                            statutPaiementReparateur,
                            datePaiementReparateur
                    );
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            throw new BusinessException("Erreur lors de la récupération des détails de paiement: " + e.getMessage());
        }
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

    private CommissionResponse toResponse(Commission commission) {
        Payment payment = commission.getPayment();
        Ticket ticket = payment.getTicket();
        
        return new CommissionResponse(
                commission.getId(),
                ticket.getId(),
                ticket.getCode(),
                ticket.getTitle(),
                ticket.getRequester() != null 
                    ? ticket.getRequester().getFirstName() + " " + ticket.getRequester().getLastName()
                    : "Non spécifié",
                ticket.getTitle(),
                payment.getAmount(),
                commission.getMontantReparateur(),
                commission.getPourcentageReparateur(),
                ticket.getCreatedAt(),
                commission.getCreatedAt(),
                payment.getMethod() != null ? payment.getMethod().name() : "N/A",
                null, // Commentaire
                "EN_ATTENTE" // Status
        );
    }

    @Transactional(readOnly = true)
    public List<ReparateurPaymentDetailResponse> getPendingPayments() {
        // Récupérer toutes les commissions
        List<Commission> allCommissions = commissionRepository.findAll();
        
        // Récupérer tous les paiements aux réparateurs
        List<ReparateurPayment> allPayments = reparateurPaymentRepository.findAll();
        
        // Filtrer les commissions qui n'ont pas encore été payées
        return allCommissions.stream()
                .filter(commission -> {
                    // Vérifier si cette commission a été payée
                    BigDecimal montantCommission = commission.getMontantReparateur();
                    Instant dateCreationCommission = commission.getCreatedAt();
                    
                    for (ReparateurPayment rp : allPayments) {
                        if (rp.getReparateur().getId().equals(commission.getReparateur().getId())) {
                            // Vérifier que le paiement est postérieur à la création de la commission
                            if (rp.getDatePaiement().isAfter(dateCreationCommission) || 
                                rp.getDatePaiement().equals(dateCreationCommission)) {
                                // Vérifier que le montant correspond
                                BigDecimal difference = montantCommission.subtract(rp.getMontant()).abs();
                                if (difference.compareTo(new BigDecimal("0.01")) <= 0) {
                                    return false; // Cette commission a été payée
                                }
                            }
                        }
                    }
                    return true; // Cette commission n'a pas été payée
                })
                .map(commission -> {
                    Payment payment = commission.getPayment();
                    Ticket ticket = payment.getTicket();
                    User client = ticket != null && ticket.getRequester() != null ? ticket.getRequester() : null;
                    
                    String appareilType = extractAppareilType(ticket != null ? ticket.getTitle() : null);
                    
                    return new ReparateurPaymentDetailResponse(
                            commission.getId(),
                            ticket != null ? ticket.getId() : null,
                            ticket != null ? ticket.getCode() : null,
                            client != null ? client.getFirstName() : null,
                            client != null ? client.getLastName() : null,
                            appareilType,
                            ticket != null ? ticket.getCreatedAt() : commission.getCreatedAt(),
                            payment.getAmount(),
                            commission.getPourcentageReparateur(),
                            commission.getMontantReparateur(),
                            payment.getStatus(),
                            "EN_ATTENTE",
                            null
                    );
                })
                .collect(Collectors.toList());
    }
}

