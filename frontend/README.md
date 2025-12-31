# 🏢 Interface React - Centre Commercial

## 📋 Application Complète Créée

### ✅ Composants Créés

#### Authentification
- ✅ **Login.jsx** - Page de connexion
- ✅ **Register.jsx** - Création de compte client
- ✅ **AuthContext.js** - Gestion de l'authentification JWT

#### Dashboard
- ✅ **Dashboard.jsx** - Tableau de bord avec statistiques
  - Chiffre d'affaires
  - Nombre de services
  - Nombre de clients
  - Tickets en cours et réparés
  - Commissions (pour propriétaires)
  - Actions rapides

#### Tickets de Réparation
- ✅ **TicketList.jsx** - Liste des tickets avec filtres
- ✅ **TicketForm.jsx** - Création de nouveau ticket
- ✅ **TicketDetail.jsx** - Détails et gestion d'un ticket

#### Layout
- ✅ **Navbar.jsx** - Barre de navigation responsive
- ✅ **App.js** - Routing complet avec React Router

#### API
- ✅ **apiClient.js** - Configuration Axios avec JWT
  - Intercepteurs pour authentification
  - Tous les services API (tickets, ouvriers, clients, etc.)

### 🎨 Styles

Tous les composants ont des styles modernes et professionnels :
- ✅ Design moderne avec gradients
- ✅ Animations et transitions fluides
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Badge colorés pour les états
- ✅ Interface intuitive

## 🚀 Utilisation

### Démarrer l'Application

```bash
npm start
```

L'application s'ouvre automatiquement sur `http://localhost:3000`

### Créer un Compte

1. Cliquez sur "Créer un compte"
2. Remplissez le formulaire :
   - Nom complet
   - Email
   - Téléphone
   - Mot de passe
3. Cliquez sur "Créer mon compte"

### Se Connecter

1. Entrez votre email
2. Entrez votre mot de passe
3. Cliquez sur "Se connecter"

Vous serez redirigé vers le dashboard selon votre rôle.

## 📊 Fonctionnalités par Rôle

### 👤 Client
- ✅ Voir son dashboard personnel
- ✅ Créer des tickets de réparation
- ✅ Consulter l'état de ses tickets
- ✅ Voir son historique

### 👷 Ouvrier
- ✅ Voir les tickets assignés
- ✅ Modifier l'état des tickets
- ✅ Consulter le dashboard

### 👔 Administrateur
- ✅ Gérer tous les tickets
- ✅ Assigner des ouvriers
- ✅ Voir tous les clients
- ✅ Dashboard complet

### 🏪 Propriétaire
- ✅ Accès complet à toutes les fonctionnalités
- ✅ Gérer le magasin
- ✅ Voir les commissions
- ✅ Gérer les ouvriers
- ✅ Statistiques complètes

## 🔧 Configuration API

Le backend Spring Boot doit être lancé sur `http://localhost:8080`

La configuration est dans `src/api/apiClient.js` :

```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

## 📱 Pages Disponibles

- `/login` - Connexion
- `/register` - Inscription
- `/dashboard` - Tableau de bord
- `/tickets` - Liste des tickets
- `/tickets/nouveau` - Créer un ticket
- `/tickets/:id` - Détails d'un ticket

## 🎨 Personnalisation

### Couleurs Principales

Les couleurs peuvent être modifiées dans les fichiers CSS :

```css
/* Couleur principale */
#667eea - Violet principal
#764ba2 - Violet foncé

/* États */
#48bb78 - Succès (vert)
#4299e1 - Info (bleu)
#ed8936 - Avertissement (orange)
#f56565 - Erreur (rouge)
```

## 🔒 Sécurité

- ✅ JWT stocké dans localStorage
- ✅ Intercepteurs Axios pour ajouter le token automatiquement
- ✅ Redirection automatique si token expiré
- ✅ Routes protégées avec PrivateRoute
- ✅ Vérification des rôles

## 📦 Dépendances

```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "axios": "^1.6.2"
}
```

## 🐛 Dépannage

### Le backend ne répond pas

Vérifiez que Spring Boot est lancé :
```bash
curl http://localhost:8080/api-docs
```

### Erreur CORS

Le backend est configuré pour accepter `http://localhost:3000`

### Token expiré

Le token JWT expire après 24h. Reconnectez-vous.

## 📚 Documentation

- [React](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [Axios](https://axios-http.com/)

---

**Interface créée avec ❤️ pour le Centre Commercial**
