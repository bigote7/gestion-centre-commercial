import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, paymentAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Loading } from '../Common/Loading';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/calculations';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

function ProprietaireDashboard() {
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL'); // ALL, PAYE, EN_ATTENTE
  const [filterReparateur, setFilterReparateur] = useState('ALL');
  const navigate = useNavigate();
  const { user } = useAuth();
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, paymentsRes] = await Promise.all([
        ticketAPI.list({ size: 1000, sort: 'createdAt,desc' }),
        paymentAPI.listMine().catch(() => ({ data: [] }))
      ]);

      let ticketsData = [];
      if (ticketsRes.data?.content) {
        ticketsData = ticketsRes.data.content;
      } else if (Array.isArray(ticketsRes.data)) {
        ticketsData = ticketsRes.data;
      }
      setTickets(ticketsData);

      let paymentsData = [];
      if (Array.isArray(paymentsRes.data)) {
        paymentsData = paymentsRes.data;
      } else if (paymentsRes.data?.content) {
        paymentsData = paymentsRes.data.content;
      }
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erreur chargement dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Chargement du tableau de bord..." />;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ========== CALCULS FINANCIERS ==========
  
  // Tous les appareils réparés
  const appareilsRepares = tickets.filter(t => 
    t.appareilStatus === 'BIEN_REPARE' || t.status === 'RESOLU'
  );

  // Appareils non traités
  const appareilsNonTraites = tickets.filter(t => 
    t.appareilStatus === 'PAS_COMMENCE' || 
    (t.status === 'EN_ATTENTE' && t.appareilStatus !== 'EN_COURS_REPARATION')
  );

  // Calcul des revenus
  const revenusTotaux = payments
    .filter(p => p.status === 'VALIDE')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const revenusEnAttente = appareilsRepares
    .filter(t => {
      const payment = payments.find(p => p.ticketId === t.id && p.status === 'VALIDE');
      return !payment;
    })
    .reduce((sum, t) => sum + (parseFloat(t.estimatedPrice) || 0), 0);

  const revenusCeMois = payments
    .filter(p => {
      if (p.status !== 'VALIDE') return false;
      const paymentDate = new Date(p.createdAt);
      return paymentDate.getMonth() === currentMonth && 
             paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // ========== REVENUS MENSUELS (12 derniers mois) ==========
  const revenusMensuels = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const revenuMois = payments
      .filter(p => {
        if (p.status !== 'VALIDE') return false;
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return {
      mois: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      revenu: revenuMois,
      moisIndex: date.getMonth(),
      annee: date.getFullYear()
    };
  }).reverse();

  // ========== PERFORMANCE PAR RÉPARATEUR ==========
  const performanceReparateurs = tickets
    .filter(t => t.assignedAgentName)
    .reduce((acc, ticket) => {
      const reparateurName = ticket.assignedAgentName;
      const reparateurId = ticket.assignedAgentId;
      
      if (!acc[reparateurName]) {
        acc[reparateurName] = {
          id: reparateurId,
          nom: reparateurName,
          totalRepares: 0,
          totalEnCours: 0,
          revenusGeneres: 0,
          commissions: 0,
          revenusProprietaire: 0,
          tickets: []
        };
      }

      acc[reparateurName].tickets.push(ticket);

      if (ticket.appareilStatus === 'BIEN_REPARE' || ticket.status === 'RESOLU') {
        acc[reparateurName].totalRepares++;
        
        const payment = payments.find(p => p.ticketId === ticket.id && p.status === 'VALIDE');
        if (payment) {
          const montant = parseFloat(payment.amount) || 0;
          // Commission par défaut de 30% si non spécifiée
          const commissionPct = parseFloat(ticket.commissionPercentage || ticket.commission_percentage || 30);
          const commission = montant * commissionPct / 100;
          const revenuProprietaire = montant - commission;
          
          acc[reparateurName].revenusGeneres += montant;
          acc[reparateurName].commissions += commission;
          acc[reparateurName].revenusProprietaire += revenuProprietaire;
        }
      } else if (ticket.appareilStatus === 'EN_COURS_REPARATION') {
        acc[reparateurName].totalEnCours++;
      }

      return acc;
    }, {});

  const reparateursData = Object.values(performanceReparateurs).map(rep => ({
    ...rep,
    tauxReussite: rep.totalRepares > 0 
      ? Math.round((rep.totalRepares / rep.tickets.length) * 100) 
      : 0
  }));

  // ========== TABLEAUX D'APPAREILS ==========
  
  // Appareils réparés avec infos de paiement
  const appareilsReparesAvecPaiement = appareilsRepares.map(ticket => {
    const payment = payments.find(p => p.ticketId === ticket.id);
    const montant = parseFloat(ticket.estimatedPrice) || 0;
    const estPaye = payment && payment.status === 'VALIDE';
    const datePaiement = payment ? new Date(payment.createdAt) : null;

    return {
      ...ticket,
      montant,
      estPaye,
      datePaiement,
      paymentStatus: estPaye ? 'PAYE' : 'EN_ATTENTE',
      paymentId: payment?.id
    };
  });

  // Filtrage des appareils réparés
  const filteredAppareilsRepares = appareilsReparesAvecPaiement.filter(appareil => {
    const matchesSearch = !debouncedSearch || 
      (appareil.requesterName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (appareil.title || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (appareil.code || '').toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesPayment = filterPaymentStatus === 'ALL' || 
      appareil.paymentStatus === filterPaymentStatus;
    
    const matchesReparateur = filterReparateur === 'ALL' || 
      appareil.assignedAgentName === filterReparateur;

    return matchesSearch && matchesPayment && matchesReparateur;
  });

  // Filtrage des appareils non traités
  const filteredAppareilsNonTraites = appareilsNonTraites.filter(appareil => {
    const matchesSearch = !debouncedSearch || 
      (appareil.requesterName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (appareil.title || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (appareil.code || '').toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesReparateur = filterReparateur === 'ALL' || 
      appareil.assignedAgentName === filterReparateur;

    return matchesSearch && matchesReparateur;
  });

  // Liste des réparateurs uniques pour les filtres
  const reparateursList = [...new Set(tickets
    .filter(t => t.assignedAgentName)
    .map(t => t.assignedAgentName))];

  return (
    <div className="dashboard-container proprietaire-dashboard">
      {/* En-tête */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="dashboard-title">
              <span className="title-icon">💰</span>
              Tableau de Bord Propriétaire
            </h1>
            <p className="dashboard-subtitle">
              Bonjour <strong>{user?.firstName || 'Propriétaire'}</strong>, gestion de vos revenus et appareils
            </p>
          </div>
        </div>
      </div>

      {/* Indicateurs Financiers */}
      <div className="stats-grid-enhanced">
        <div className="stat-card stat-success">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">💵</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Revenus Totaux</h3>
            <p className="stat-value">{formatCurrency(revenusTotaux)}</p>
            <div className="stat-trend">
              <span className="trend-success">✓</span>
              <span>Tous les paiements validés</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">⏳</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">En Attente de Paiement</h3>
            <p className="stat-value">{formatCurrency(revenusEnAttente)}</p>
            <div className="stat-trend">
              <span className="trend-warning">⚠</span>
              <span>{appareilsReparesAvecPaiement.filter(a => !a.estPaye).length} appareils</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-primary">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">📅</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Revenus Ce Mois</h3>
            <p className="stat-value">{formatCurrency(revenusCeMois)}</p>
            <div className="stat-trend">
              <span className="trend-info">📈</span>
              <span>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">✅</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Appareils Réparés</h3>
            <p className="stat-value">{appareilsRepares.length}</p>
            <div className="stat-trend">
              <span className="trend-success">✓</span>
              <span>Total réparations</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">⏸️</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Non Traités</h3>
            <p className="stat-value">{appareilsNonTraites.length}</p>
            <div className="stat-trend">
              <span className="trend-warning">⚠</span>
              <span>Nécessitent attention</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-accent">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">👥</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Réparateurs Actifs</h3>
            <p className="stat-value">{reparateursData.length}</p>
            <div className="stat-trend">
              <span className="trend-info">🔧</span>
              <span>En activité</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="dashboard-search-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par client, appareil, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="global-search-input"
          />
        </div>
        <div className="filters-wrapper">
          <select 
            value={filterPaymentStatus} 
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">Tous les statuts de paiement</option>
            <option value="PAYE">Payé</option>
            <option value="EN_ATTENTE">En attente</option>
          </select>
          <select 
            value={filterReparateur} 
            onChange={(e) => setFilterReparateur(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">Tous les réparateurs</option>
            {reparateursList.map(rep => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Graphique Revenus Mensuels */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>📈 Évolution des Revenus (12 derniers mois)</h2>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={revenusMensuels}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" />
            <YAxis />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelStyle={{ color: '#1e40af' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenu" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              activeDot={{ r: 8 }}
              name="Revenus (MAD)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance par Réparateur */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>👨‍🔧 Performance par Réparateur</h2>
        </div>
        <div className="table-container">
          <table className="reparations-table">
            <thead>
              <tr>
                <th>Réparateur</th>
                <th>Réparés</th>
                <th>En cours</th>
                <th>Revenus générés</th>
                <th>Commissions</th>
                <th>Votre part</th>
                <th>Taux réussite</th>
              </tr>
            </thead>
            <tbody>
              {reparateursData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data-cell">
                    Aucun réparateur actif
                  </td>
                </tr>
              ) : (
                reparateursData.map((rep) => (
                  <tr key={rep.nom}>
                    <td><strong>{rep.nom}</strong></td>
                    <td>{rep.totalRepares}</td>
                    <td>{rep.totalEnCours}</td>
                    <td>{formatCurrency(rep.revenusGeneres)}</td>
                    <td>{formatCurrency(rep.commissions)}</td>
                    <td><strong className="text-success">{formatCurrency(rep.revenusProprietaire)}</strong></td>
                    <td>
                      <span className={`badge badge-${rep.tauxReussite >= 80 ? 'success' : rep.tauxReussite >= 50 ? 'warning' : 'danger'}`}>
                        {rep.tauxReussite}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appareils Réparés */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>✅ Appareils Réparés ({filteredAppareilsRepares.length})</h2>
        </div>
        <div className="table-container">
          <table className="reparations-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Client</th>
                <th>Appareil</th>
                <th>Réparateur</th>
                <th>Date réparation</th>
                <th>Montant</th>
                <th>Statut paiement</th>
                <th>Date paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppareilsRepares.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data-cell">
                    Aucun appareil réparé trouvé
                  </td>
                </tr>
              ) : (
                filteredAppareilsRepares.map((appareil) => (
                  <tr key={appareil.id}>
                    <td><strong>#{appareil.code}</strong></td>
                    <td>{appareil.requesterName || 'Non spécifié'}</td>
                    <td>{appareil.title}</td>
                    <td>{appareil.assignedAgentName || 'Non assigné'}</td>
                    <td>{formatDate(appareil.resolvedAt || appareil.updatedAt)}</td>
                    <td><strong>{formatCurrency(appareil.montant)}</strong></td>
                    <td>
                      <span className={`status-badge ${appareil.estPaye ? 'status-paye' : 'status-en-attente'}`}>
                        {appareil.estPaye ? '✅ Payé' : '⏳ En attente'}
                      </span>
                    </td>
                    <td>{appareil.datePaiement ? formatDateTime(appareil.datePaiement) : '—'}</td>
                    <td>
                      <button 
                        className="action-btn-small"
                        onClick={() => navigate(`/tickets/${appareil.id}`)}
                      >
                        👁️ Voir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appareils Non Traités */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>⏸️ Appareils Non Traités ({filteredAppareilsNonTraites.length})</h2>
        </div>
        <div className="table-container">
          <table className="reparations-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Client</th>
                <th>Appareil</th>
                <th>Réparateur</th>
                <th>Date dépôt</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppareilsNonTraites.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data-cell">
                    Tous les appareils sont en cours de traitement
                  </td>
                </tr>
              ) : (
                filteredAppareilsNonTraites.map((appareil) => (
                  <tr key={appareil.id}>
                    <td><strong>#{appareil.code}</strong></td>
                    <td>{appareil.requesterName || 'Non spécifié'}</td>
                    <td>{appareil.title}</td>
                    <td>{appareil.assignedAgentName || 'Non assigné'}</td>
                    <td>{formatDate(appareil.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${appareil.status?.toLowerCase() || 'en-attente'}`}>
                        {appareil.status || 'En attente'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${appareil.priority?.toLowerCase() || 'moyenne'}`}>
                        {appareil.priority || 'MOYENNE'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn-small"
                        onClick={() => navigate(`/tickets/${appareil.id}`)}
                      >
                        👁️ Voir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProprietaireDashboard;

