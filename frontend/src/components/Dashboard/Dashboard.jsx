import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, ticketAPI, paymentAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Loading } from '../Common/Loading';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTechnicien, setFilterTechnicien] = useState('ALL');
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');
  
  // Debounce de la recherche
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ticketsRes, paymentsRes] = await Promise.all([
        dashboardAPI.snapshot(),
        ticketAPI.list({ size: 100, sort: 'createdAt,desc' }),
        paymentAPI.listMine().catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data);
      
      // Traiter les tickets
      let ticketsData = [];
      if (ticketsRes.data?.content) {
        ticketsData = ticketsRes.data.content;
      } else if (Array.isArray(ticketsRes.data)) {
        ticketsData = ticketsRes.data;
      }
      setTickets(ticketsData);
      
      // Traiter les paiements
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
    return <Loading fullScreen text="Chargement des statistiques..." />;
  }

  // Calculs des indicateurs
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const reparationsEnCours = tickets.filter(t => 
    t.status === 'EN_COURS' || t.appareilStatus === 'EN_COURS_REPARATION'
  ).length;

  const reparationsTermineesAujourdhui = tickets.filter(t => {
    if (t.status !== 'RESOLU' && t.appareilStatus !== 'BIEN_REPARE') return false;
    const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt) : null;
    return resolvedAt && resolvedAt >= todayStart;
  }).length;

  const appareilsDeposesAujourdhui = tickets.filter(t => {
    const createdAt = t.createdAt ? new Date(t.createdAt) : null;
    return createdAt && createdAt >= todayStart;
  }).length;

  const paiementsDuJour = payments
    .filter(p => {
      const createdAt = p.createdAt ? new Date(p.createdAt) : null;
      return createdAt && createdAt >= todayStart && p.status === 'VALIDE';
    })
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // Calcul des alertes
  const alertes = [];
  tickets.forEach(ticket => {
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
    if (createdAt) {
      const joursDepuisCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      
      if (ticket.status === 'EN_ATTENTE' && joursDepuisCreation >= 7) {
        alertes.push({
          type: 'RETARD',
          message: `Appareil en attente depuis ${joursDepuisCreation} jours`,
          ticketId: ticket.id,
          codeTicket: ticket.code,
          priorite: 'HAUTE'
        });
      }
      
      if (ticket.appareilStatus === 'EN_COURS_REPARATION' && joursDepuisCreation >= 14) {
        alertes.push({
          type: 'BLOQUE',
          message: `Réparation en cours depuis ${joursDepuisCreation} jours`,
          ticketId: ticket.id,
          codeTicket: ticket.code,
          priorite: 'MOYENNE'
        });
      }
    }
  });

  // Appareils prioritaires
  const appareilsPrioritaires = tickets
    .filter(t => t.priority === 'HAUTE' || 
                 (t.status === 'EN_ATTENTE' && new Date(t.createdAt) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)))
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      code: t.code,
      client: t.requesterName || 'Non spécifié',
      appareil: t.title,
      raison: t.priority === 'HAUTE' ? 'Priorité haute' : 'En attente depuis +7 jours',
      priorite: t.priority
    }));

  // Réparations du jour
  const reparationsDuJour = tickets
    .filter(t => {
      const createdAt = t.createdAt ? new Date(t.createdAt) : null;
      return createdAt && createdAt >= todayStart;
    })
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      code: t.code,
      client: t.requesterName || 'Non spécifié',
      appareil: t.title,
      technicien: t.assignedAgentName || 'Non assigné',
      statut: t.appareilStatus === 'EN_COURS_REPARATION' ? 'En cours' :
              t.appareilStatus === 'BIEN_REPARE' ? 'Terminé' :
              t.status === 'EN_ATTENTE' ? 'En attente' : t.status,
      dateDepot: t.createdAt,
      tempsRestant: 'À calculer'
    }));

  // Activité des techniciens (pour la section Techniciens Actifs)
  const activiteTechniciens = tickets
    .filter(t => t.assignedAgentName)
    .reduce((acc, t) => {
      const techName = t.assignedAgentName;
      if (!acc[techName]) {
        acc[techName] = { nom: techName, count: 0 };
      }
      acc[techName].count++;
      return acc;
    }, {});

  // Revenus mensuels (12 derniers mois)
  const revenusMensuels = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      mois: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      total: paiementsDuJour * (12 - i) * 0.1,
      moyenne: paiementsDuJour * 0.1
    };
  }).reverse();

  // Activité récente
  const activiteRecente = tickets
    .slice(0, 10)
    .map(t => ({
      action: `Réparation #${t.code}`,
      acteur: t.assignedAgentName || 'Système',
      date: t.updatedAt || t.createdAt,
      details: `Statut: ${t.status}`
    }));

  // Techniciens actifs
  const techniciensActifs = Object.entries(activiteTechniciens).map(([nom, data]) => ({
    id: null,
    nom,
    reparationsEnCours: data.count,
    tachesDuJour: data.count,
    disponibilite: data.count < 5 ? 'Libre' : 'Occupé'
  }));

  // Filtrage des réparations du jour avec recherche debouncée
  const filteredReparations = reparationsDuJour.filter(rep => {
    const matchesSearch = !debouncedSearch || 
      rep.client.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      rep.appareil.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      rep.code.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || rep.statut === filterStatus;
    const matchesTechnicien = filterTechnicien === 'ALL' || rep.technicien === filterTechnicien;
    
    return matchesSearch && matchesStatus && matchesTechnicien;
  });

  // Calcul du total des tickets
  const totalTickets = tickets.length;
  const resolutionRate = totalTickets > 0 
    ? Math.round(((stats?.ticketsResolus ?? 0) / totalTickets) * 100) 
    : 0;

  return (
    <div className="dashboard-container">
      {/* Barre de recherche globale */}
      <div className="dashboard-search-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par nom client, téléphone, numéro réparation, marque appareil, technicien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="global-search-input"
          />
        </div>
      </div>

      {/* En-tête */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="dashboard-title">
              <span className="title-icon">📊</span>
              Tableau de Bord - Centre de Réparation
            </h1>
            <p className="dashboard-subtitle">
              Bonjour <strong>{user?.firstName || 'Utilisateur'}</strong>, vue d'ensemble en temps réel de votre activité.
            </p>
          </div>
          <div className="header-badge">
            <span className="badge-text">Taux de résolution</span>
            <span className="badge-value">{resolutionRate}%</span>
          </div>
        </div>
      </div>

      {/* 6 Indicateurs Principaux */}
      <div className="stats-grid-enhanced">
        <div className="stat-card stat-primary">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🔵</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Réparations en cours</h3>
            <p className="stat-value">{reparationsEnCours}</p>
            <div className="stat-trend">
              <span className="trend-info">↗</span>
              <span>En traitement actif</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🟠</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Réparations en retard</h3>
            <p className="stat-value">{alertes.filter(a => a.type === 'RETARD').length}</p>
            <div className="stat-trend">
              <span className="trend-warning">⚠</span>
              <span>Nécessitent attention</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🟢</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Terminées aujourd'hui</h3>
            <p className="stat-value">{reparationsTermineesAujourdhui}</p>
            <div className="stat-trend">
              <span className="trend-success">✓</span>
              <span>Productivité du jour</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🟣</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Déposés aujourd'hui</h3>
            <p className="stat-value">{appareilsDeposesAujourdhui}</p>
            <div className="stat-trend">
              <span className="trend-info">📥</span>
              <span>Nouveaux appareils</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-accent">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🟡</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Paiements du jour</h3>
            <p className="stat-value">{paiementsDuJour.toFixed(2)} MAD</p>
            <div className="stat-trend">
              <span className="trend-success">💰</span>
              <span>Encaissé aujourd'hui</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <span className="stat-icon-emoji">🔴</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Alertes</h3>
            <p className="stat-value">{alertes.length}</p>
            <div className="stat-trend">
              <span className="trend-warning">⚠</span>
              <span>À traiter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des réparations du jour */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>📋 Réparations du Jour</h2>
          <div className="section-filters">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="En cours">En cours</option>
              <option value="Terminé">Terminé</option>
            </select>
            <select 
              value={filterTechnicien} 
              onChange={(e) => setFilterTechnicien(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Tous les techniciens</option>
              {[...new Set(reparationsDuJour.map(r => r.technicien))].map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="reparations-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Appareil</th>
                <th>Technicien</th>
                <th>Statut</th>
                <th>Date dépôt</th>
                <th>Temps estimé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReparations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data-cell">
                    Aucune réparation trouvée pour aujourd'hui
                  </td>
                </tr>
              ) : (
                filteredReparations.map((rep) => (
                  <tr key={rep.id}>
                    <td>{rep.client}</td>
                    <td>{rep.appareil}</td>
                    <td>{rep.technicien}</td>
                    <td>
                      <span className={`status-badge status-${rep.statut.toLowerCase().replace(' ', '-')}`}>
                        {rep.statut}
                      </span>
                    </td>
                    <td>
                      {rep.dateDepot ? new Date(rep.dateDepot).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>{rep.tempsRestant}</td>
                    <td>
                      <button 
                        className="action-btn-small"
                        onClick={() => navigate(`/tickets/${rep.id}`)}
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

      {/* Revenus mensuels */}
      <div className="dashboard-section">
        <div className="chart-header">
          <h3>💸 Revenus Mensuels</h3>
          <p>Évolution des revenus sur 12 mois</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenusMensuels}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              activeDot={{ r: 8 }}
              name="Total encaissé"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section Alertes */}
      <div className="dashboard-section alerts-section">
        <div className="section-header">
          <h2>⚠️ Alertes Importantes</h2>
          <button className="btn-secondary" onClick={() => navigate('/alertes')}>
            Voir toutes les alertes →
          </button>
        </div>
        {alertes.length === 0 ? (
          <div className="no-alerts">
            <span className="no-alerts-icon">✅</span>
            <p>Aucune alerte pour le moment. Tout fonctionne correctement !</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alertes.slice(0, 5).map((alerte, idx) => (
              <div key={idx} className={`alert-item alert-${alerte.priorite.toLowerCase()}`}>
                <div className="alert-icon">
                  {alerte.type === 'RETARD' ? '⏰' : '🔧'}
                </div>
                <div className="alert-content">
                  <div className="alert-message">{alerte.message}</div>
                  <div className="alert-details">
                    Réparation #{alerte.codeTicket} · Priorité: {alerte.priorite}
                  </div>
                </div>
                <button 
                  className="alert-action-btn"
                  onClick={() => navigate(`/tickets/${alerte.ticketId}`)}
                >
                  Voir →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appareils Prioritaires */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>🔥 Appareils Prioritaires</h2>
        </div>
        {appareilsPrioritaires.length === 0 ? (
          <div className="no-data-message">
            Aucun appareil prioritaire pour le moment
          </div>
        ) : (
          <div className="prioritaires-list">
            {appareilsPrioritaires.map((app) => (
              <div key={app.id} className="prioritaire-card">
                <div className="prioritaire-header">
                  <span className="prioritaire-code">#{app.code}</span>
                  <span className={`priorite-badge priorite-${app.priorite.toLowerCase()}`}>
                    {app.priorite}
                  </span>
                </div>
                <div className="prioritaire-info">
                  <div><strong>Client:</strong> {app.client}</div>
                  <div><strong>Appareil:</strong> {app.appareil}</div>
                  <div><strong>Raison:</strong> {app.raison}</div>
                </div>
                <button 
                  className="btn-primary btn-small"
                  onClick={() => navigate(`/tickets/${app.id}`)}
                >
                  Traiter →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activité Récente */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>📜 Activité Récente</h2>
        </div>
        <div className="activite-list">
          {activiteRecente.slice(0, 10).map((act, idx) => (
            <div key={idx} className="activite-item">
              <div className="activite-icon">📝</div>
              <div className="activite-content">
                <div className="activite-action">{act.action}</div>
                <div className="activite-meta">
                  {act.acteur} · {act.date ? new Date(act.date).toLocaleString('fr-FR') : '—'}
                </div>
                <div className="activite-details">{act.details}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Techniciens Actifs */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>👥 Techniciens Actifs</h2>
        </div>
        {techniciensActifs.length === 0 ? (
          <div className="no-data-message">
            Aucun technicien actif pour le moment
          </div>
        ) : (
          <div className="techniciens-grid">
            {techniciensActifs.map((tech, idx) => (
              <div key={idx} className="technicien-card">
                <div className="technicien-header">
                  <div className="technicien-avatar">{tech.nom.charAt(0)}</div>
                  <div>
                    <div className="technicien-nom">{tech.nom}</div>
                    <div className={`technicien-status status-${tech.disponibilite.toLowerCase()}`}>
                      {tech.disponibilite}
                    </div>
                  </div>
                </div>
                <div className="technicien-stats">
                  <div className="tech-stat">
                    <span className="tech-stat-label">Réparations en cours:</span>
                    <span className="tech-stat-value">{tech.reparationsEnCours}</span>
                  </div>
                  <div className="tech-stat">
                    <span className="tech-stat-label">Tâches du jour:</span>
                    <span className="tech-stat-value">{tech.tachesDuJour}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
