# Gestion centre de réparation

Application web complète pour gérer un centre de réparation d'appareils électroniques et électroménagers. Développé dans le cadre d'un projet académique.

**Auteur :** LABIB LAYACHI

## Description

Cette application permet de gérer tout le cycle de vie d'une réparation : depuis le dépôt de l'appareil par le client jusqu'au paiement final, en passant par l'assignation des réparateurs et le suivi des états.

## Fonctionnalités principales

### Gestion des tickets
- Création de tickets avec description de la panne
- Attribution automatique ou manuelle des réparateurs selon leurs spécialités
- Suivi en temps réel des états (en attente, en réparation, réparé, échoué, pièce en attente)
- Historique complet des modifications

### Gestion des utilisateurs
L'application gère quatre types d'utilisateurs avec des droits différents :

- **Propriétaire** : accès aux statistiques globales et gestion des commissions
- **Administrateur** : gestion complète des magasins, réparateurs et opérations
- **Réparateur** : consultation et mise à jour des tickets qui lui sont assignés
- **Client** : création de tickets et suivi de ses propres réparations

### Gestion des paiements
- Enregistrement des paiements clients
- Calcul automatique des commissions pour les propriétaires
- Historique des transactions
- Suivi du chiffre d'affaires

### Tableau de bord
- Statistiques en temps réel
- Nombre de tickets en cours et réparés
- Performances des réparateurs
- Chiffre d'affaires global et par période

### Notifications
- Notifications en base de données
- Envoi d'emails automatiques lors des changements d'état (si configuré)
- Support pour notifications push (configurable)

## Technologies

### Backend
- Java 17
- Spring Boot 3.2.0
- Spring Security avec JWT
- Spring Data JPA
- MySQL (production) / H2 (développement)
- Maven

### Frontend
- React 18
- Axios pour les appels API
- React Router pour la navigation

## Installation

### Prérequis
- Java 17 ou supérieur
- Maven 3.6+
- MySQL 8.0+ (pour la production)
- Node.js et npm (pour le frontend)

### Backend

1. Cloner le projet :
```bash
git clone https://github.com/bigote7/gestion-centre-commercial.git
cd gestion-centre-commercial
```

2. Créer la base de données MySQL :
```sql
CREATE DATABASE centre_commercial;
```

3. Configurer la base de données dans `src/main/resources/application.properties` :
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/centre_commercial
spring.datasource.username=votre_utilisateur
spring.datasource.password=votre_mot_de_passe
```

4. Compiler et lancer :
```bash
mvn clean install
mvn spring-boot:run
```

Le backend sera accessible sur `http://localhost:8081`

### Frontend

1. Aller dans le dossier frontend :
```bash
cd frontend
```

2. Installer les dépendances :
```bash
npm install
```

3. Lancer l'application :
```bash
npm start
```

Le frontend sera accessible sur `http://localhost:3000`

## Documentation API

Une fois le backend lancé, la documentation Swagger est disponible à :
```
http://localhost:8081/swagger-ui.html
```

## Structure du projet

```
gestion-centre-commercial/
├── src/main/java/com/centrecommercial/
│   ├── config/          # Configurations Spring
│   ├── controller/       # Controllers REST API
│   ├── domain/          # Entités JPA
│   ├── dto/             # Objets de transfert de données
│   ├── repository/      # Interfaces d'accès aux données
│   ├── service/         # Logique métier
│   └── security/        # Configuration de sécurité JWT
├── src/main/resources/
│   ├── application.properties
│   └── db/migration/    # Scripts de migration Flyway
├── frontend/            # Application React
│   └── src/
│       ├── components/  # Composants React
│       ├── api/         # Client API
│       └── context/      # Contextes React
└── pom.xml
```

## Tests

Pour exécuter les tests :
```bash
mvn test
```

## Notes

- Les notifications par email nécessitent une configuration SMTP dans `application.properties`
- Le secret JWT doit faire au moins 32 caractères
- En mode développement, une base H2 en mémoire est utilisée automatiquement

## Support

Pour toute question, ouvrez une issue sur GitHub.

---

Développé par LABIB LAYACHI
