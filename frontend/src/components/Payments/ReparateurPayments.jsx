import React, { useEffect, useState } from 'react';
import { commissionAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Loading } from '../Common/Loading';
import './ReparateurPayments.css';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'EN_ATTENTE', label: 'En attente' },
];

function ReparateurPayments() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { user, hasRole } = useAuth();
  const { error: showError } = useNotification();
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');

  useEffect(() => {
    if (isReparateur) {
      loadData();
    }
  }, [isReparateur, selectedMonth, selectedYear]);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, statusFilter, payments]);

  const getMonthDateRange = (month, year) => {
    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59);
    end.setHours(23, 59, 59, 999);
    // Retourner les dates en format ISO string pour l'API
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthDateRange(selectedMonth, selectedYear);
      
      console.log('Chargement paiements pour:', { start, end, month: selectedMonth, year: selectedYear });
      
      // Appeler les APIs séparément pour mieux gérer les erreurs
      let paymentsRes, summaryRes;
      
      try {
        paymentsRes = await commissionAPI.getMyPayments(start, end);
        console.log('Paiements reçus:', paymentsRes.data);
      } catch (error) {
        console.error('Erreur chargement paiements:', error);
        console.error('URL appelée:', error.config?.url);
        console.error('Response:', error.response);
        // Continuer même si les paiements échouent
        paymentsRes = { data: [] };
      }
      
      try {
        summaryRes = await commissionAPI.getMySummary(start, end);
        console.log('Résumé reçu:', summaryRes.data);
      } catch (error) {
        console.error('Erreur chargement résumé:', error);
        console.error('URL appelée:', error.config?.url);
        console.error('Response:', error.response);
        // Continuer avec un résumé vide
        summaryRes = { data: null };
      }
      
      const paymentsData = paymentsRes.data || [];
      const summaryData = summaryRes.data;
      
      console.log(`Nombre de paiements: ${paymentsData.length}`);
      
      setPayments(paymentsData);
      setSummary(summaryData);
      
      if (paymentsData.length === 0 && !summaryData) {
        console.log('Aucune donnée trouvée pour ce mois');
        showError('Aucune donnée disponible pour ce mois. Vérifiez que vous avez des réparations avec paiements validés.');
      }
    } catch (error) {
      console.error('Erreur générale chargement:', error);
      console.error('Détails erreur:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Impossible de charger les paiements';
      showError(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filtre par recherche
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          (payment.clientFirstName && payment.clientFirstName.toLowerCase().includes(search)) ||
          (payment.clientLastName && payment.clientLastName.toLowerCase().includes(search)) ||
          (payment.appareilType && payment.appareilType.toLowerCase().includes(search)) ||
          (payment.clientFirstName + ' ' + payment.clientLastName).toLowerCase().includes(search)
      );
    }

    // Filtre par statut paiement réparateur
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((payment) => payment.statutPaiementReparateur === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getClientPaymentStatusBadge = (status) => {
    if (status === 'VALIDE') {
      return <span className="status-badge status-paid">Payé</span>;
    } else if (status === 'EN_ATTENTE') {
      return <span className="status-badge status-pending">Non payé</span>;
    } else {
      return <span className="status-badge status-unpaid">Non payé</span>;
    }
  };

  const getReparateurPaymentStatusBadge = (status) => {
    if (status === 'PAYE') {
      return <span className="status-badge status-paid">Payé</span>;
    } else {
      return <span className="status-badge status-pending">En attente</span>;
    }
  };

  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!isReparateur) {
    return (
      <div className="reparateur-payments-container">
        <div className="no-access">
          <h2>🔒 Accès refusé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading fullScreen text="Chargement de vos paiements..." />;
  }

  // Calculer les statistiques du mois
  const revenuTotal = summary ? parseFloat(summary.totalCommissions) : 0;
  const nombreAppareils = summary ? summary.totalTicketsRepares : 0;
  const totalPaye = summary ? parseFloat(summary.totalPaye) : 0;
  // S'assurer que le montant en attente n'est jamais négatif
  const montantEnAttente = summary ? Math.max(0, parseFloat(summary.soldeRestant)) : 0;

  return (
    <div className="reparateur-payments-container">
      <div className="payments-header">
        <div>
          <h1>💳 Mes Paiements</h1>
          <p>Suivez vos réparations, commissions et revenus</p>
        </div>
      </div>

      {/* Section résumé (Dashboard) */}
      <div className="summary-cards">
        <div className="summary-card card-revenu">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Revenu total du mois</div>
            <div className="card-value">{formatCurrency(revenuTotal)} MAD</div>
          </div>
        </div>
        <div className="summary-card card-appareils">
          <div className="card-icon">🔧</div>
          <div className="card-content">
            <div className="card-label">Appareils réparés</div>
            <div className="card-value">{nombreAppareils}</div>
          </div>
        </div>
        <div className="summary-card card-paye">
          <div className="card-icon">💳</div>
          <div className="card-content">
            <div className="card-label">Total déjà payé</div>
            <div className="card-value">{formatCurrency(totalPaye)} MAD</div>
          </div>
        </div>
        <div className={`summary-card card-attente ${montantEnAttente > 0 ? 'has-pending' : 'no-pending'}`}>
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <div className="card-label">Montant en attente</div>
            <div className={`card-value ${montantEnAttente > 0 ? 'pending-amount' : 'no-pending-amount'}`}>
              {formatCurrency(montantEnAttente)} MAD
            </div>
            {montantEnAttente === 0 && (
              <div className="card-hint">✅ Toutes vos commissions ont été payées</div>
            )}
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="payments-filters">
        <div className="filter-group">
          <label>Mois :</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="filter-select"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Année :</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="filter-select"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par client ou type d'appareil..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Statut paiement :</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des paiements */}
      <div className="payments-table-wrapper">
        {filteredPayments.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <h3>Aucune réparation trouvée</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL'
                ? 'Essayez de modifier vos critères de recherche'
                : `Aucune réparation enregistrée pour ${months[selectedMonth - 1].label} ${selectedYear}`}
            </p>
          </div>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type d'appareil</th>
                <th>Date réparation</th>
                <th>Prix total payé</th>
                <th>% Commission</th>
                <th>Montant commission</th>
                <th>Statut client</th>
                <th>Statut réparateur</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.commissionId}>
                  <td className="client-cell">
                    <div className="client-name">
                      <strong>
                        {payment.clientFirstName || ''} {payment.clientLastName || ''}
                      </strong>
                    </div>
                    {payment.ticketCode && (
                      <div className="ticket-code-small">#{payment.ticketCode}</div>
                    )}
                  </td>
                  <td>
                    <span className="appareil-type">{payment.appareilType || 'Non spécifié'}</span>
                  </td>
                  <td>{formatDate(payment.dateReparation)}</td>
                  <td className="amount-cell">
                    <strong>{formatCurrency(payment.prixTotalPaye)}</strong> MAD
                  </td>
                  <td className="percentage-cell">
                    {formatCurrency(payment.pourcentageCommission)}%
                  </td>
                  <td className="amount-cell highlight">
                    <strong>{formatCurrency(payment.montantCommission)}</strong> MAD
                  </td>
                  <td>{getClientPaymentStatusBadge(payment.statutPaiementClient)}</td>
                  <td>{getReparateurPaymentStatusBadge(payment.statutPaiementReparateur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ReparateurPayments;

