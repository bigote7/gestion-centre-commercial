import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketAPI, paymentAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './Tickets.css';
import './TicketDetailModern.css';

const statuses = ['EN_ATTENTE', 'EN_COURS', 'RESOLU', 'REJETE'];

const appareilStatuses = [
  { value: 'PAS_COMMENCE', label: '⏳ Pas commencé' },
  { value: 'EN_COURS_REPARATION', label: '🔧 En cours de réparation' },
  { value: 'BIEN_REPARE', label: '✅ Bien réparé' },
];

function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('EN_ATTENTE');
  const [appareilStatus, setAppareilStatus] = useState('PAS_COMMENCE');
  const [note, setNote] = useState('');
  const [agentId, setAgentId] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('30');
  const [reparateurs, setReparateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [technicalNote, setTechnicalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [payments, setPayments] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    currency: 'MAD',
    method: 'CARTE_BANCAIRE',
    notes: ''
  });
  const [creatingPayment, setCreatingPayment] = useState(false);
  const { success, error: showError } = useNotification();
  const canManageStatus = hasRole('ROLE_ADMIN') || hasRole('ROLE_PROPRIETAIRE');
  const canAssign = hasRole('ROLE_ADMIN') || hasRole('ROLE_PROPRIETAIRE');
  const canManageAppareilStatus = hasRole('ROLE_ADMIN') || hasRole('ROLE_REPARATEUR');
  const canCreatePayment = hasRole('ROLE_ADMIN') || hasRole('ROLE_PROPRIETAIRE') || (hasRole('ROLE_USER') && !hasRole('ROLE_REPARATEUR'));
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');

  useEffect(() => {
    loadTicket();
    if (canAssign) {
      loadReparateurs();
    }
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTicket = async () => {
    try {
      const [ticketRes, historyRes] = await Promise.all([
        ticketAPI.detail(id),
        ticketAPI.history(id),
      ]);
      console.log('=== CHARGEMENT DU TICKET ===');
      console.log('Réponse complète de l\'API:', ticketRes.data);
      console.log('Commission Percentage:', ticketRes.data.commissionPercentage);
      console.log('Type de commissionPercentage:', typeof ticketRes.data.commissionPercentage);
      console.log('commissionPercentage === null:', ticketRes.data.commissionPercentage === null);
      console.log('commissionPercentage === undefined:', ticketRes.data.commissionPercentage === undefined);
      console.log('commissionPercentage === "":', ticketRes.data.commissionPercentage === "");
      console.log('JSON.stringify(commissionPercentage):', JSON.stringify(ticketRes.data.commissionPercentage));
      setTicket(ticketRes.data);
      setStatus(ticketRes.data.status);
      setAppareilStatus(ticketRes.data.appareilStatus || 'PAS_COMMENCE');
      setHistory(historyRes.data);
      
      // Mettre à jour le formulaire d'assignation avec les valeurs actuelles du ticket
      if (ticketRes.data.assignedAgentId) {
        setAgentId(ticketRes.data.assignedAgentId.toString());
      }
      
      // Mettre à jour le pourcentage de commission avec la valeur actuelle du ticket (si elle existe)
      if (ticketRes.data.commissionPercentage !== null && 
          ticketRes.data.commissionPercentage !== undefined) {
        const currentCommission = parseFloat(ticketRes.data.commissionPercentage);
        if (!isNaN(currentCommission) && currentCommission > 0) {
          setCommissionPercentage(currentCommission.toString());
          console.log('Pourcentage de commission mis à jour dans le formulaire:', currentCommission);
        } else {
          // Si la valeur n'est pas valide, garder 30 par défaut
          setCommissionPercentage('30');
        }
      } else {
        // Si aucune commission n'est définie, garder 30 par défaut
        setCommissionPercentage('30');
      }
    } catch (error) {
      console.error('Erreur ticket', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReparateurs = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/users/reparateurs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReparateurs(data);
      }
    } catch (error) {
      console.error('Erreur chargement réparateurs', error);
    }
  };

  const handleStatusChange = async () => {
    try {
      await ticketAPI.updateStatus(id, { status, note });
      setNote('');
      await loadTicket();
    } catch (error) {
      alert('Impossible de mettre à jour le statut');
    }
  };

  const handleAssign = async () => {
    if (!agentId) {
      alert('Veuillez sélectionner un réparateur');
      return;
    }

    // Valider que le pourcentage de commission est bien saisi
    if (!commissionPercentage || commissionPercentage.trim() === '') {
      alert('Veuillez saisir le pourcentage de commission du réparateur');
      return;
    }

    const commission = parseFloat(commissionPercentage);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      alert('Le pourcentage de commission doit être un nombre entre 0 et 100');
      return;
    }

    const selectedRep = reparateurs.find(r => r.id === parseInt(agentId));
    const repName = selectedRep ? `${selectedRep.firstName} ${selectedRep.lastName}` : 'ce réparateur';
    
    if (!window.confirm(
      `🔧 Confirmer l'assignation\n\n` +
      `Réparateur : ${repName}\n` +
      `${selectedRep?.specialite ? `Spécialité : ${selectedRep.specialite}\n` : ''}` +
      `Commission réparateur : ${commission}%\n` +
      `Commission propriétaire : ${100 - commission}%\n` +
      `\n✅ Le statut de l'appareil passera automatiquement à "EN COURS DE RÉPARATION"\n\n` +
      `Confirmer l'assignation ?`
    )) {
      return;
    }
    
    try {
      console.log('=== ENVOI ASSIGNATION ===');
      console.log('Ticket ID:', id);
      console.log('Agent ID:', Number(agentId));
      console.log('Commission Percentage (avant envoi):', commission);
      console.log('Type:', typeof commission);
      
      const payload = { 
        agentId: Number(agentId),
        commissionPercentage: commission
      };
      console.log('Payload complet:', JSON.stringify(payload));
      
      const response = await ticketAPI.assign(id, payload);
      console.log('Réponse assignation:', response.data);
      console.log('Commission Percentage dans la réponse:', response.data.commissionPercentage);
      console.log('Type de commissionPercentage dans la réponse:', typeof response.data.commissionPercentage);
      
      // Mettre à jour le ticket immédiatement avec la réponse
      if (response.data) {
        setTicket(response.data);
        setStatus(response.data.status);
        setAppareilStatus(response.data.appareilStatus || 'PAS_COMMENCE');
      }
      
      // Ne pas réinitialiser les champs après assignation réussie
      // Les valeurs restent pour permettre une réassignation si nécessaire
      // setAgentId('');
      // setCommissionPercentage('30');
      
      // Recharger le ticket pour être sûr d'avoir toutes les données
      await loadTicket();
      alert(
        `✅ Réparateur assigné avec succès !\n\n` +
        `${repName} a été assigné à ce ticket avec ${commission}% de commission.\n` +
        `Le statut de l'appareil est maintenant "EN COURS DE RÉPARATION".\n\n` +
        `Le réparateur peut maintenant travailler sur l'appareil.`
      );
    } catch (error) {
      alert('❌ Erreur lors de l\'assignation : ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAppareilStatusChange = async (newStatus) => {
    try {
      await ticketAPI.updateAppareilStatus(id, { status: newStatus });
      setAppareilStatus(newStatus);
      await loadTicket();
      
      // Messages personnalisés selon le nouveau statut
      if (newStatus === 'EN_COURS_REPARATION') {
        alert(
          `✅ Intervention démarrée !\n\n` +
          `L'appareil est maintenant en cours de réparation.\n` +
          `Le client sera informé de l'avancement.\n\n` +
          `Bon travail ! 🔧`
        );
      } else if (newStatus === 'BIEN_REPARE') {
        alert(
          `🎉 Félicitations ! Réparation terminée avec succès !\n\n` +
          `✅ L'appareil est maintenant PRÊT À ÊTRE RÉCUPÉRÉ\n\n` +
          `Le client a été notifié.\n` +
          `L'administration peut maintenant traiter le paiement.\n\n` +
          `Excellent travail ! 👏`
        );
      } else if (isReparateur) {
        const statusLabel = appareilStatuses.find(s => s.value === newStatus)?.label || newStatus;
        alert(`✅ État de l'appareil mis à jour avec succès !\n\nNouvel état : ${statusLabel}\n\nCette modification a été enregistrée dans l'historique.`);
      }
    } catch (error) {
      console.error('Erreur mise à jour statut appareil', error);
      const errorMessage = error.response?.data?.message || 'Impossible de mettre à jour le statut de l\'appareil';
      alert(`❌ Erreur : ${errorMessage}`);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    const statusLabel = appareilStatuses.find(s => s.value === newStatus)?.label || newStatus;
    
    let confirmMessage = '';
    
    if (newStatus === 'EN_COURS_REPARATION') {
      confirmMessage = isReparateur 
        ? `🔧 Démarrer l'intervention\n\nVous allez commencer à travailler sur cet appareil.\n\nL'état passera à "EN COURS DE RÉPARATION".\n\nConfirmer ?`
        : `Voulez-vous changer le statut de l'appareil à "${statusLabel}" ?`;
    } else if (newStatus === 'BIEN_REPARE') {
      confirmMessage = isReparateur
        ? `✅ Finaliser la réparation\n\nÊtes-vous sûr que la réparation est terminée ?\n\n` +
          `L'appareil sera marqué comme "PRÊT À ÊTRE RÉCUPÉRÉ".\n\n` +
          `Le client et l'administration seront notifiés.\n\nConfirmer ?`
        : `Voulez-vous marquer l'appareil comme réparé ?`;
    } else {
      confirmMessage = isReparateur 
        ? `🔧 Confirmation - Modification de l'état de l'appareil\n\nVoulez-vous changer l'état à : "${statusLabel}" ?\n\nCette action sera enregistrée dans l'historique.`
        : `Voulez-vous changer le statut de l'appareil à "${statusLabel}" ?`;
    }
    
    if (window.confirm(confirmMessage)) {
      await handleAppareilStatusChange(newStatus);
    }
  };

  const handleSaveTechnicalNote = async () => {
    setSavingNote(true);
    try {
      // TODO: Implémenter l'API pour sauvegarder les notes techniques
      // await ticketAPI.addTechnicalNote(id, { note: technicalNote });
      await ticketAPI.updateAppareilStatus(id, { status: appareilStatus, note: technicalNote });
      setTechnicalNote('');
      await loadTicket();
      alert('Rapport technique enregistré avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde note technique', error);
      alert('Impossible d\'enregistrer le rapport technique');
    } finally {
      setSavingNote(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await paymentAPI.listByTicket(id);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Erreur chargement paiements', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      showError('Veuillez saisir un montant valide');
      return;
    }

    setCreatingPayment(true);
    try {
      await paymentAPI.create({
        amount: parseFloat(paymentData.amount),
        currency: paymentData.currency,
        method: paymentData.method,
        ticketId: parseInt(id),
        notes: paymentData.notes
      });
      success('Paiement créé avec succès ! Un administrateur doit le valider pour générer les commissions.');
      setPaymentData({
        amount: '',
        currency: 'MAD',
        method: 'CARTE_BANCAIRE',
        notes: ''
      });
      setShowPaymentForm(false);
      await loadPayments();
    } catch (error) {
      console.error('Erreur création paiement', error);
      showError(error.response?.data?.message || 'Impossible de créer le paiement');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePhotoUpload = async (e, photoType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // TODO: Implémenter l'API pour uploader les photos
      // const formData = new FormData();
      // formData.append('photo', file);
      // formData.append('type', photoType); // 'AVANT' ou 'APRES'
      // await ticketAPI.uploadPhoto(id, formData);
      
      // Simulation pour l'instant
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, { type: photoType, url: reader.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
      
      alert(`Photo ${photoType === 'AVANT' ? 'avant' : 'après'} téléchargée avec succès (simulation)`);
    } catch (error) {
      console.error('Erreur upload photo', error);
      alert('Impossible de télécharger la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (!ticket) {
    return <div className="error">Dossier de réparation introuvable</div>;
  }

  // Calculer le prix total payé (somme des paiements validés)
  const totalPaye = payments
    .filter(p => p.status === 'VALIDE')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // Calculer la commission du réparateur
  // Gérer différents formats possibles (string, number, BigDecimal)
  let ticketCommissionPct = 0;
  if (ticket.commissionPercentage !== null && ticket.commissionPercentage !== undefined && ticket.commissionPercentage !== '') {
    // Le backend sérialise BigDecimal en STRING grâce à @JsonFormat(shape = JsonFormat.Shape.STRING)
    const rawValue = ticket.commissionPercentage;
    console.log('Raw commissionPercentage:', rawValue, 'Type:', typeof rawValue);
    
    if (typeof rawValue === 'string') {
      ticketCommissionPct = parseFloat(rawValue);
      if (isNaN(ticketCommissionPct)) {
        console.warn('Impossible de parser commissionPercentage comme nombre:', rawValue);
        ticketCommissionPct = 0;
      }
    } else if (typeof rawValue === 'number') {
      ticketCommissionPct = rawValue;
    } else {
      // Si c'est un objet, essayer de le convertir en string puis en number
      const stringValue = String(rawValue);
      ticketCommissionPct = parseFloat(stringValue) || 0;
    }
  }
  
  console.log('ticketCommissionPct calculé:', ticketCommissionPct);
  console.log('ticket.commissionPercentage original:', ticket.commissionPercentage);
  console.log('ticketCommissionPct est valide:', ticketCommissionPct > 0 && !isNaN(ticketCommissionPct));
  const commissionReparateur = totalPaye > 0 && ticketCommissionPct > 0 
    ? (totalPaye * ticketCommissionPct / 100).toFixed(2)
    : 0;
  const commissionProprietaire = totalPaye > 0 && ticketCommissionPct > 0
    ? (totalPaye * (100 - ticketCommissionPct) / 100).toFixed(2)
    : 0;

  return (
    <div className="detail-container">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/tickets')}>
          ← Retour à la liste
        </button>
        <h1>Dossier de Réparation #{ticket.code}</h1>
      </div>

      {/* Section Informations Financières - Toujours visible pour le réparateur */}
      {isReparateur && (
        <section className="detail-card financial-info-card">
          <h2>💰 Votre Rémunération</h2>
          {/* Debug info - à retirer après */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', borderRadius: '4px' }}>
              <strong>Debug Commission:</strong><br/>
              Raw commissionPercentage: {JSON.stringify(ticket.commissionPercentage)}<br/>
              Type: {typeof ticket.commissionPercentage}<br/>
              Parsed ticketCommissionPct: {ticketCommissionPct}<br/>
              Is Valid: {ticketCommissionPct > 0 && !isNaN(ticketCommissionPct) ? 'OUI' : 'NON'}<br/>
              Is NaN: {isNaN(ticketCommissionPct) ? 'OUI' : 'NON'}
            </div>
          )}
          {ticketCommissionPct > 0 && !isNaN(ticketCommissionPct) ? (
            <>
              <div className="financial-grid">
                {totalPaye > 0 ? (
                  <>
                    <div className="financial-item">
                      <div className="financial-label">💵 Prix Total Payé par le Client</div>
                      <div className="financial-value primary">{totalPaye.toFixed(2)} MAD</div>
                      <div className="financial-detail">
                        {payments.filter(p => p.status === 'VALIDE').length} paiement(s) validé(s)
                      </div>
                    </div>
                    <div className="financial-item">
                      <div className="financial-label">📊 Votre Commission</div>
                      <div className="financial-value success">{commissionReparateur} MAD</div>
                      <div className="financial-detail">
                        {ticketCommissionPct}% du montant payé (défini par le propriétaire)
                      </div>
                    </div>
                    <div className="financial-item">
                      <div className="financial-label">🏢 Commission Propriétaire</div>
                      <div className="financial-value info">{commissionProprietaire} MAD</div>
                      <div className="financial-detail">
                        {100 - ticketCommissionPct}% du montant payé
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="financial-item">
                      <div className="financial-label">📊 Votre Pourcentage de Commission</div>
                      <div className="financial-value success">{ticketCommissionPct}%</div>
                      <div className="financial-detail">
                        Défini par le propriétaire pour cet appareil
                      </div>
                    </div>
                    <div className="financial-item">
                      <div className="financial-label">💵 Prix Payé par le Client</div>
                      <div className="financial-value pending">En attente</div>
                      <div className="financial-detail">
                        Aucun paiement validé pour le moment
                      </div>
                    </div>
                    <div className="financial-item">
                      <div className="financial-label">💰 Votre Commission</div>
                      <div className="financial-value pending">Calculée après paiement</div>
                      <div className="financial-detail">
                        {ticketCommissionPct}% du montant payé par le client
                      </div>
                    </div>
                  </>
                )}
              </div>
              {totalPaye === 0 && (
                <div className="financial-info-box">
                  <p>ℹ️ <strong>Information importante :</strong></p>
                  <p>Votre commission sera calculée automatiquement à {ticketCommissionPct}% du montant payé par le client une fois le paiement validé par l'administrateur.</p>
                </div>
              )}
            </>
          ) : (
            <div className="financial-warning-box">
              <p>⚠️ <strong>Pourcentage de commission non défini</strong></p>
              <p>Le propriétaire n'a pas encore défini votre pourcentage de commission pour cet appareil. Contactez le propriétaire pour définir votre commission.</p>
            </div>
          )}
        </section>
      )}
      
      {/* Section Informations Financières - Pour Admin/Propriétaire */}
      {!isReparateur && canManageStatus && totalPaye > 0 && (
        <section className="detail-card financial-info-card">
          <h2>💰 Informations Financières</h2>
          <div className="financial-grid">
            <div className="financial-item">
              <div className="financial-label">💵 Prix Total Payé par le Client</div>
              <div className="financial-value primary">{totalPaye.toFixed(2)} MAD</div>
              <div className="financial-detail">
                {payments.filter(p => p.status === 'VALIDE').length} paiement(s) validé(s)
              </div>
            </div>
            {ticketCommissionPct > 0 && (
              <>
                <div className="financial-item">
                  <div className="financial-label">📊 Commission Réparateur</div>
                  <div className="financial-value success">{commissionReparateur} MAD</div>
                  <div className="financial-detail">
                    {ticketCommissionPct}% du montant payé
                  </div>
                </div>
                <div className="financial-item">
                  <div className="financial-label">🏢 Commission Propriétaire</div>
                  <div className="financial-value info">{commissionProprietaire} MAD</div>
                  <div className="financial-detail">
                    {100 - ticketCommissionPct}% du montant payé
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="detail-grid">
        {/* Carte Informations Principales */}
        <section className="detail-card info-principale-card">
          <h2>📋 Informations du Dossier</h2>
          
          <div className="ticket-header-badge">
            <div className={`ticket-status-badge status-${ticket.status.toLowerCase()}`}>
              {ticket.status === 'EN_ATTENTE' && '⏳'}
              {ticket.status === 'EN_COURS' && '🔄'}
              {ticket.status === 'RESOLU' && '✅'}
              {ticket.status === 'REJETE' && '❌'}
              <span>{ticket.status.replace('_', ' ')}</span>
            </div>
            <div className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
              {ticket.priority === 'HAUTE' ? '🔴 Urgent' : 
               ticket.priority === 'MOYENNE' ? '🟡 Normal' : 
               ticket.priority === 'BASSE' ? '🟢 Faible' : 
               ticket.priority}
            </div>
          </div>

          <p className="info-row">
            <span>📅 Date de création :</span>
            <strong>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</strong>
          </p>
          <p className="info-row">
            <span>👤 Client demandeur :</span>
            <strong>{ticket.requesterName || 'Non spécifié'}</strong>
          </p>
          <p className="info-row">
            <span>👨‍🔧 Technicien assigné :</span>
            <strong>{ticket.assignedAgentName ?? '⚠️ Aucun technicien assigné'}</strong>
          </p>
          {ticketCommissionPct > 0 && !isNaN(ticketCommissionPct) && (
            <p className="info-row highlight">
              <span>📊 Pourcentage de Commission (défini par le propriétaire) :</span>
              <strong className="commission-highlight">{ticketCommissionPct}%</strong>
            </p>
          )}
          <p className="info-row">
            <span>🔧 État de l'appareil :</span>
            <strong>
              {ticket.appareilStatus === 'PAS_COMMENCE' ? '⏳ En attente' :
               ticket.appareilStatus === 'EN_COURS_REPARATION' ? '🔧 En cours' :
               ticket.appareilStatus === 'BIEN_REPARE' ? '✅ Terminée' :
               'Non défini'}
            </strong>
          </p>
          
          <div className="description-section">
            <h3>📝 Description du problème :</h3>
            <p className="description-text">{ticket.description || 'Aucune description fournie'}</p>
          </div>
        </section>

        {/* Carte Informations Appareil */}
        <section className="detail-card appareil-card">
          <h2>📱 Informations de l'Appareil</h2>
          <p className="info-row">
            <span>📱 Type :</span>
            <strong>{ticket.title || 'Non spécifié'}</strong>
          </p>
          <p className="info-row">
            <span>🏷️ Code ticket :</span>
            <strong className="code-badge">{ticket.code}</strong>
          </p>
          {ticket.resolvedAt && (
            <p className="info-row">
              <span>✅ Résolu le :</span>
              <strong>{new Date(ticket.resolvedAt).toLocaleString('fr-FR')}</strong>
            </p>
          )}
          
          <div className="timeline-section">
            <h3>⏱️ Chronologie</h3>
            <div className="timeline-item">
              <span className="timeline-icon">🆕</span>
              <div>
                <strong>Création</strong>
                <small>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</small>
              </div>
            </div>
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <div className="timeline-item">
                <span className="timeline-icon">🔄</span>
                <div>
                  <strong>Dernière mise à jour</strong>
                  <small>{new Date(ticket.updatedAt).toLocaleString('fr-FR')}</small>
                </div>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="timeline-item">
                <span className="timeline-icon">✅</span>
                <div>
                  <strong>Résolution</strong>
                  <small>{new Date(ticket.resolvedAt).toLocaleString('fr-FR')}</small>
                </div>
              </div>
            )}
          </div>
        </section>

        {canManageStatus && (
          <section className="detail-card">
            <h2>📊 Gestion du Statut de la Demande</h2>
            <div className="form-group">
              <label>Statut de la demande :</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Notes et commentaires :</label>
              <textarea
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ajouter des notes ou commentaires sur cette demande..."
              />
            </div>
            <button className="btn-primary" onClick={handleStatusChange}>
              💾 Enregistrer les modifications
            </button>
          </section>
        )}

        {canAssign && (
          <section className="detail-card assignation-card">
            <h2>👨‍🔧 Assignation du Réparateur</h2>
            
            {ticket.assignedAgentName ? (
              <div className="current-reparateur">
                <div className="reparateur-assigned-badge">
                  <span className="badge-icon">✅</span>
                  <div className="badge-content">
                    <span className="badge-label">Réparateur actuellement assigné :</span>
                    <span className="badge-name">{ticket.assignedAgentName}</span>
                  </div>
                </div>
                <p className="reassign-hint">
                  💡 Vous pouvez réassigner ce ticket à un autre réparateur si nécessaire
                </p>
              </div>
            ) : (
              <div className="no-reparateur-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">Aucun réparateur n'est assigné à ce ticket</span>
              </div>
            )}

            <div className="form-group">
              <label>Sélectionner un réparateur :</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="reparateur-select"
              >
                <option value="">-- Choisir un réparateur --</option>
                {reparateurs.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    👨‍🔧 {rep.firstName} {rep.lastName}
                    {rep.specialite ? ` - ${rep.specialite}` : ''}
                    {rep.phone ? ` (${rep.phone})` : ''}
                  </option>
                ))}
              </select>
              {agentId && (
                <small className="form-hint-blue">
                  ✓ Réparateur sélectionné prêt à être assigné
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Pourcentage de commission du réparateur (%) :</label>
              <input
                type="number"
                value={commissionPercentage}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permettre la saisie vide temporairement et valider la plage 0-100
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                    setCommissionPercentage(value);
                  }
                }}
                className="form-control"
                placeholder={ticket?.commissionPercentage ? ticket.commissionPercentage.toString() : "30"}
                min="0"
                max="100"
                step="0.01"
                required
              />
              {ticket?.commissionPercentage && parseFloat(commissionPercentage) !== parseFloat(ticket.commissionPercentage) && (
                <small style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  💡 Pourcentage actuel : {ticket.commissionPercentage}% (vous pouvez le modifier)
                </small>
              )}
              <small className="form-hint">
                Le reste ({100 - (parseFloat(commissionPercentage) || 0)}%) ira au propriétaire
              </small>
            </div>
            
            <button 
              className="btn-assign" 
              onClick={handleAssign} 
              disabled={!agentId || !commissionPercentage}
            >
              <span className="btn-icon">✅</span>
              <span>Assigner le Réparateur</span>
            </button>
          </section>
        )}

        {canManageAppareilStatus && (
          <section className="detail-card reparateur-workspace">
            <div className="reparateur-header-badge">
              {isReparateur && (
                <div className="reparateur-badge">
                  <span className="badge-icon">🔧</span>
                  <span className="badge-text">Vous êtes le technicien assigné - Vous pouvez modifier l'état de l'appareil</span>
                </div>
              )}
            </div>
            <h2>🔧 Centre de Contrôle de l'Intervention</h2>
            <div className="appareil-status-display">
              <div className="current-status-badge">
                <span className="status-label">État actuel de l'intervention :</span>
                <span className={`status-value status-${appareilStatus.toLowerCase().replace('_', '-')}`}>
                  {appareilStatus === 'PAS_COMMENCE' ? '⏳ En attente de prise en charge' :
                   appareilStatus === 'EN_COURS_REPARATION' ? '🔧 Intervention en cours' :
                   appareilStatus === 'BIEN_REPARE' ? '✅ Réparation terminée avec succès' :
                   'Non défini'}
                </span>
              </div>
            </div>

            <div className="reparation-workflow">
              <h3>Processus de Réparation</h3>
              <div className="workflow-steps">
                <button
                  className={`workflow-btn ${appareilStatus === 'PAS_COMMENCE' ? 'active' : ''} ${appareilStatus !== 'PAS_COMMENCE' ? 'completed' : ''}`}
                  onClick={() => handleQuickStatusChange('PAS_COMMENCE')}
                  disabled={appareilStatus === 'PAS_COMMENCE'}
                >
                  <div className="workflow-icon">⏳</div>
                  <div className="workflow-content">
                    <div className="workflow-title">En Attente</div>
                    <div className="workflow-desc">Demande enregistrée, en attente de prise en charge</div>
                  </div>
                  {appareilStatus === 'PAS_COMMENCE' && <span className="workflow-check">✓</span>}
                </button>

                <div className="workflow-arrow">→</div>

                <button
                  className={`workflow-btn ${appareilStatus === 'EN_COURS_REPARATION' ? 'active' : ''} ${appareilStatus === 'BIEN_REPARE' ? 'completed' : ''}`}
                  onClick={() => handleQuickStatusChange('EN_COURS_REPARATION')}
                  disabled={appareilStatus === 'BIEN_REPARE'}
                >
                  <div className="workflow-icon">🔧</div>
                  <div className="workflow-content">
                    <div className="workflow-title">Intervention en Cours</div>
                    <div className="workflow-desc">Technicien en train d'intervenir</div>
                  </div>
                  {appareilStatus === 'EN_COURS_REPARATION' && <span className="workflow-check">✓</span>}
                </button>

                <div className="workflow-arrow">→</div>

                <button
                  className={`workflow-btn ${appareilStatus === 'BIEN_REPARE' ? 'active' : ''}`}
                  onClick={() => handleQuickStatusChange('BIEN_REPARE')}
                  disabled={appareilStatus === 'BIEN_REPARE'}
                >
                  <div className="workflow-icon">✅</div>
                  <div className="workflow-content">
                    <div className="workflow-title">Réparation Terminée</div>
                    <div className="workflow-desc">Intervention finalisée avec succès</div>
                  </div>
                  {appareilStatus === 'BIEN_REPARE' && <span className="workflow-check">✓</span>}
                </button>
              </div>
            </div>

            <div className="quick-actions">
              <h3>⚡ Actions Rapides</h3>
              <div className="action-buttons-grid">
                {appareilStatus !== 'EN_COURS_REPARATION' && appareilStatus !== 'BIEN_REPARE' && (
                  <button
                    className="action-btn action-start"
                    onClick={() => handleQuickStatusChange('EN_COURS_REPARATION')}
                  >
                    <span className="action-icon">▶️</span>
                    <span className="action-text">Démarrer l'Intervention</span>
                  </button>
                )}
                {appareilStatus === 'EN_COURS_REPARATION' && (
                  <button
                    className="action-btn action-complete"
                    onClick={() => handleQuickStatusChange('BIEN_REPARE')}
                  >
                    <span className="action-icon">✅</span>
                    <span className="action-text">Finaliser la Réparation</span>
                  </button>
                )}
                {appareilStatus === 'BIEN_REPARE' && (
                  <div className="completion-message">
                    <span className="completion-icon">🎉</span>
                    <span className="completion-text">Intervention terminée avec succès ! L'appareil est prêt à être récupéré.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="manual-select-section">
              <h3>🔧 Modification Manuelle du Statut</h3>
              <div className="form-group">
                <label>Nouvel état de l'intervention :</label>
                <select 
                  value={appareilStatus} 
                  onChange={(e) => setAppareilStatus(e.target.value)}
                  className="status-select"
                >
                  {appareilStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                className="btn-primary btn-update-status" 
                onClick={() => handleAppareilStatusChange(appareilStatus)}
              >
                💾 Enregistrer la Modification
              </button>
            </div>
          </section>
        )}

        {/* Section Commentaires/Rapport Technique pour Réparateur */}
        {isReparateur && (
          <section className="detail-card technical-report-section">
            <h2>📝 Rapport Technique & Commentaires</h2>
            <div className="form-group">
              <label>Ajouter un commentaire ou rapport technique :</label>
              <textarea
                rows="6"
                value={technicalNote}
                onChange={(e) => setTechnicalNote(e.target.value)}
                placeholder="Décrivez les interventions effectuées, les pièces remplacées, les tests réalisés, les observations techniques..."
                className="technical-note-textarea"
              />
              <small className="form-hint">
                💡 Ce rapport sera visible par le client et l'administration. Soyez précis et professionnel.
              </small>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleSaveTechnicalNote}
              disabled={savingNote || !technicalNote.trim()}
            >
              {savingNote ? '⏳ Enregistrement...' : '💾 Enregistrer le Rapport Technique'}
            </button>
          </section>
        )}

        {/* Section Photos Avant-Après pour Réparateur */}
        {isReparateur && (
          <section className="detail-card photos-section">
            <h2>📸 Photos Avant / Après Réparation</h2>
            <div className="photos-container">
              <div className="photo-upload-group">
                <h3>📷 Photo Avant Réparation</h3>
                <label className="photo-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'AVANT')}
                    disabled={uploadingPhoto}
                    style={{ display: 'none' }}
                  />
                  <span className="upload-icon">📤</span>
                  {uploadingPhoto ? 'Téléchargement...' : 'Télécharger Photo Avant'}
                </label>
                <div className="photos-grid">
                  {photos.filter(p => p.type === 'AVANT').map((photo, idx) => (
                    <div key={idx} className="photo-item">
                      <img src={photo.url} alt="Avant" />
                      <span className="photo-label">Avant</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="photo-upload-group">
                <h3>✅ Photo Après Réparation</h3>
                <label className="photo-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'APRES')}
                    disabled={uploadingPhoto}
                    style={{ display: 'none' }}
                  />
                  <span className="upload-icon">📤</span>
                  {uploadingPhoto ? 'Téléchargement...' : 'Télécharger Photo Après'}
                </label>
                <div className="photos-grid">
                  {photos.filter(p => p.type === 'APRES').map((photo, idx) => (
                    <div key={idx} className="photo-item">
                      <img src={photo.url} alt="Après" />
                      <span className="photo-label">Après</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {photos.length === 0 && (
              <p className="no-photos-hint">
                📷 Aucune photo téléchargée. Ajoutez des photos avant et après la réparation pour documenter votre intervention.
              </p>
            )}
          </section>
        )}

        {/* Section Commission pour Réparateur - Améliorée */}
        {isReparateur && (
          <section className="detail-card commission-section">
            <h2>💰 Votre Rémunération</h2>
            {totalPaye > 0 ? (
              <div className="commission-info-enhanced">
                <div className="commission-summary-card">
                  <div className="commission-header">
                    <span className="commission-icon">💵</span>
                    <div>
                      <div className="commission-title">Prix Total Payé</div>
                      <div className="commission-subtitle">Montant payé par le client</div>
                    </div>
                  </div>
                  <div className="commission-amount primary">{totalPaye.toFixed(2)} MAD</div>
                </div>
                
                {ticketCommissionPct > 0 ? (
                  <>
                    <div className="commission-summary-card">
                      <div className="commission-header">
                        <span className="commission-icon">📊</span>
                        <div>
                          <div className="commission-title">Votre Commission</div>
                          <div className="commission-subtitle">{ticketCommissionPct}% du montant payé</div>
                        </div>
                      </div>
                      <div className="commission-amount success">{commissionReparateur} MAD</div>
                    </div>
                    
                    <div className="commission-summary-card">
                      <div className="commission-header">
                        <span className="commission-icon">🏢</span>
                        <div>
                          <div className="commission-title">Commission Propriétaire</div>
                          <div className="commission-subtitle">{100 - ticketCommissionPct}% du montant payé</div>
                        </div>
                      </div>
                      <div className="commission-amount info">{commissionProprietaire} MAD</div>
                    </div>
                  </>
                ) : (
                  <div className="commission-warning">
                    ⚠️ Le pourcentage de commission n'a pas encore été défini par le propriétaire
                  </div>
                )}
              </div>
            ) : (
              <div className="commission-no-payment">
                <p>💳 Aucun paiement validé pour ce ticket</p>
                <p className="hint">Votre commission sera calculée automatiquement une fois le paiement validé</p>
              </div>
            )}
            <button 
              className="btn-secondary" 
              onClick={() => navigate('/payments')}
            >
              📊 Voir Tous Mes Paiements
            </button>
          </section>
        )}

        {/* Section Paiements */}
        {canCreatePayment && (
          <section className="detail-card payment-section">
            <h2>💳 Paiements</h2>
            
            {payments.length > 0 && (
              <div className="payments-list">
                <h3>Paiements enregistrés</h3>
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Montant</th>
                      <th>Méthode</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{parseFloat(payment.amount).toFixed(2)} {payment.currency || 'MAD'}</td>
                        <td>{payment.method || 'N/A'}</td>
                        <td>
                          <span className={`payment-status status-${payment.status?.toLowerCase()}`}>
                            {payment.status === 'VALIDE' ? '✅ Validé' :
                             payment.status === 'REFUSE' ? '❌ Refusé' :
                             '⏳ En attente'}
                          </span>
                        </td>
                        <td>{new Date(payment.createdAt).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showPaymentForm ? (
              <button
                className="btn-primary"
                onClick={() => setShowPaymentForm(true)}
              >
                ➕ Enregistrer un Paiement
              </button>
            ) : (
              <div className="payment-form">
                <h3>Nouveau Paiement</h3>
                <div className="form-group">
                  <label>Montant (MAD):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="form-control"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Méthode de paiement:</label>
                  <select
                    value={paymentData.method}
                    onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                    className="form-control"
                  >
                    <option value="CARTE_BANCAIRE">💳 Carte bancaire</option>
                    <option value="ESPECES">💵 Espèces</option>
                    <option value="VIREMENT">🏦 Virement</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes (optionnel):</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="form-control"
                    rows="3"
                    placeholder="Notes sur le paiement..."
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPaymentData({
                        amount: '',
                        currency: 'MAD',
                        method: 'CARTE_BANCAIRE',
                        notes: ''
                      });
                    }}
                    disabled={creatingPayment}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleCreatePayment}
                    disabled={creatingPayment || !paymentData.amount}
                  >
                    {creatingPayment ? 'Création...' : '✅ Enregistrer le Paiement'}
                  </button>
                </div>
                <p className="form-hint">
                  ⚠️ Note: Le paiement sera en statut "EN_ATTENTE". Un administrateur doit le valider pour générer les commissions.
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      <section className="detail-card">
        <h2>📜 Historique des Interventions</h2>
        {history.length === 0 ? (
          <p className="no-history">Aucune intervention enregistrée pour le moment.</p>
        ) : (
          <div className="history-container">
            <div className="history-summary">
              <span className="history-count">📊 {history.length} action{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}</span>
            </div>
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-header">
                    <div className="history-action">
                      <strong>{item.action}</strong>
                      {item.fromStatus && item.toStatus && (
                        <span className="history-status-change">
                          {item.fromStatus} → {item.toStatus}
                        </span>
                      )}
                    </div>
                    <div className="history-badge">
                      {item.action === 'CREATION' && '🆕'}
                      {item.action === 'ASSIGNATION' && '👤'}
                      {item.action === 'STATUS_CHANGE' && '🔄'}
                      {item.action === 'APPAREIL_STATUS_CHANGE' && '🔧'}
                    </div>
                  </div>
                  <small className="history-meta">
                    <span className="history-actor">👤 {item.actor ?? 'Système automatique'}</span>
                    <span className="history-date">
                      📅 {item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Date inconnue'}
                    </span>
                  </small>
                  {item.note && (
                    <p className="history-note">
                      <strong>📝 Note :</strong> {item.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export default TicketDetail;

