# Architecture de l'application

Documentation technique de l'architecture du système.

## Vue d'ensemble

L'application suit une architecture en couches classique avec Spring Boot :

```
┌─────────────────────────────────┐
│      React Frontend             │
│      (Port 3000)                │
└──────────────┬──────────────────┘
               │ HTTP/REST + JWT
               │
┌──────────────▼──────────────────┐
│   Spring Boot Application        │
│   (Port 8081)                    │
│                                  │
│  ┌────────────────────────────┐ │
│  │   REST Controllers         │ │
│  │   - AuthController         │ │
│  │   - TicketController       │ │
│  │   - PaymentController     │ │
│  └───────────┬────────────────┘ │
│              │                   │
│  ┌───────────▼────────────────┐ │
│  │   Service Layer            │ │
│  │   - AuthService            │ │
│  │   - TicketService          │ │
│  │   - PaymentService         │ │
│  └───────────┬────────────────┘ │
│              │                   │
│  ┌───────────▼────────────────┐ │
│  │   Repository Layer         │ │
│  │   - TicketRepository       │ │
│  │   - UserRepository         │ │
│  └───────────┬────────────────┘ │
│              │                   │
│  ┌───────────▼────────────────┐ │
│  │   JPA Entities             │ │
│  │   - User (abstract)        │ │
│  │   - Ticket                 │ │
│  │   - Payment                │ │
│  └───────────┬────────────────┘ │
└──────────────┼──────────────────┘
               │ JDBC
               │
┌──────────────▼──────────────────┐
│   MySQL Database                │
│   (ou H2 en dev)                │
└──────────────────────────────────┘
```

## Flux de données

### Authentification JWT

```
Client → AuthController → AuthService → UserRepository → Database
                                              │
                                              ▼
                                         JWT Token
                                              │
                                              ▼
                                         Client
```

### Création d'un ticket

```
Client → TicketController → TicketService
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        TicketRepository  NotificationService  Email
                │               │
                ▼               ▼
            Database        Database
```

### Changement d'état et notification

```
Réparateur → TicketController → TicketService
                                      │
                      ┌───────────────┼───────────────┐
                      ▼               ▼               ▼
              TicketRepository  NotificationService  Client
                      │               │
                      ▼               ▼
                  Database        Email/SMS
```

### Enregistrement de paiement et commission

```
Admin → PaymentController → PaymentService
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
         PaymentRepository  CommissionService  TicketRepository
                 │               │               │
                 ▼               ▼               ▼
             Database        Commission      Database
```

## Modèle de données

```
                    ┌──────────────┐
                    │ Utilisateur  │ (abstract)
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌─────────┐    ┌─────────┐   ┌──────────────┐
      │ Client  │    │ Ouvrier │   │ Proprietaire │
      └────┬────┘    └────┬────┘   └──────┬───────┘
           │              │               │
           │ 1:n          │ 1:n           │ 1:1
           │              │               ▼
           ▼              ▼         ┌──────────┐
    ┌─────────────┐  ┌─────────────┐ │ Magasin │
    │TicketRepara │  │TicketRepara │ └────┬─────┘
    │   tion      │◄─┤   tion      │      │ 1:n
    │ (déposé)    │  │  (traité)   │      ▼
    └──────┬──────┘  └─────────────┘  ┌──────┐
           │                           │Piece │
           │ 1:1                       └──────┘
           ▼
    ┌──────────┐
    │ Paiement │
    └────┬─────┘
         │ 1:n
         ▼
    ┌────────────┐
    │ Commission │
    └────────────┘
```

## Sécurité

### Flux d'authentification

```
Request → AuthTokenFilter → JWT Validation
                                │
                                ▼ (valid)
                        SecurityContext
                                │
                                ▼
                          Controller
                                │
                 @PreAuthorize("hasRole('...')")
                                │
                                ▼
                           Service
```

### Hiérarchie des rôles

**PROPRIETAIRE** (accès complet)
- Gestion magasins
- Toutes statistiques
- Toutes commissions
- Tous les droits ADMIN

**ADMIN**
- Gestion utilisateurs
- Gestion tickets
- Gestion services
- Consultation clients

**OUVRIER**
- Ses tickets assignés
- Changer états tickets
- Enregistrer services

**CLIENT**
- Ses propres tickets
- Son historique
- Ses données

## Patterns utilisés

### Repository Pattern
Abstraction de l'accès aux données, séparation entre logique métier et persistance.

### Service Layer Pattern
Logique métier centralisée, transactions gérées au niveau service.

### DTO Pattern
Transfert de données optimisé, séparation entre modèle de domaine et API.

### Strategy Pattern
Différentes stratégies de notification (Email, SMS, Push).

## Gestion des transactions

Les services utilisent `@Transactional` pour gérer les transactions automatiquement :

```java
@Service
@Transactional
public class TicketService {
    public TicketDTO createTicket(TicketDTO dto) {
        // Toutes les opérations dans une transaction
        // Rollback automatique en cas d'exception
    }
}
```

## Extensions possibles

### Ajouter un nouveau type d'utilisateur

```java
@Entity
public class Superviseur extends Utilisateur {
    // Nouvelle classe héritant de Utilisateur
}
```

### Ajouter un nouveau canal de notification

```java
public interface NotificationStrategy {
    void send(Utilisateur user, String message);
}

public class WhatsAppNotification implements NotificationStrategy {
    // Implémentation WhatsApp
}
```

### Ajouter de nouveaux états de réparation

```java
public enum EtatReparation {
    EN_ATTENTE,
    EN_REPARATION,
    REPARE,
    ECHOUE,
    PIECE_EN_ATTENTE,
    EN_LIVRAISON,  // Nouveau
    LIVRE          // Nouveau
}
```

## Performance

### Lazy Loading
Les relations sont chargées à la demande pour éviter les requêtes inutiles :
```java
@OneToMany(fetch = FetchType.LAZY)
private List<TicketReparation> tickets;
```

### Pagination
Les listes sont paginées pour améliorer les performances :
```java
public Page<TicketDTO> getTickets(Pageable pageable) {
    return ticketRepository.findAll(pageable);
}
```

## Monitoring

- **Logs applicatifs** : SLF4J + Logback
- **Logs de sécurité** : Spring Security
- **Logs SQL** : Hibernate (en dev uniquement)
