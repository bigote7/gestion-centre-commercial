import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useUsers } from '../../hooks/useUsers';
import { PRIORITIES, DEVICE_TYPES, ACCESSORIES } from '../../constants/ticketConstants';
import { calculateCommission, formatCurrency } from '../../utils/calculations';
import { ticketValidationRules } from '../../utils/validationRules';
import { Loading, LoadingButton } from '../Common/Loading';
import { ConfirmModal } from '../Common/ConfirmModal';
import './Tickets.css';
import './TicketFormModern.css';

const initialFormData = {
  clientId: '',
  clientFirstName: '',
  clientLastName: '',
  clientEmail: '',
  clientPhone: '',
  deviceType: '',
  brand: '',
  model: '',
  title: '',
  description: '',
  accessories: [],
  priority: 'BASSE',
};

function TicketForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { hasRole, loading: authLoading } = useAuth();
  const { success, error: showError } = useNotification();
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');

  // Utiliser le hook useUsers au lieu de fetch direct
  const { users: clients, loading: clientsLoading } = useUsers('clients');
  const { users: reparateurs, loading: reparateursLoading } = useUsers('reparateurs');

  // Empêcher les réparateurs d'accéder
  useEffect(() => {
    if (!authLoading && isReparateur) {
      showError('Accès refusé : Les réparateurs ne peuvent pas créer de nouvelles demandes.');
      navigate('/tickets');
    }
  }, [authLoading, isReparateur, navigate, showError]);

  if (authLoading || isReparateur) {
    return <Loading fullScreen text="Chargement..." />;
  }

  const validateField = (name, value) => {
    const rules = ticketValidationRules[name];
    if (!rules) return '';

    for (const rule of rules) {
      const error = rule(value, formData);
      if (error) return error;
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const accessoryValue = e.target.dataset.value;
      setFormData(prev => ({
        ...prev,
        accessories: checked 
          ? [...prev.accessories, accessoryValue]
          : prev.accessories.filter(a => a !== accessoryValue)
      }));
    } else {
      const newValue = value;
      setFormData(prev => {
        const updated = { ...prev, [name]: newValue };
        
        // Auto-générer le titre
        if (name === 'deviceType' || name === 'brand' || name === 'model') {
          const deviceLabel = DEVICE_TYPES.find(d => 
            d.value === (name === 'deviceType' ? newValue : updated.deviceType)
          )?.label || '';
          const brand = name === 'brand' ? newValue : updated.brand;
          const model = name === 'model' ? newValue : updated.model;
          
          let title = `Réparation ${deviceLabel}`;
          if (brand) title += ` ${brand}`;
          if (model) title += ` ${model}`;
          
          updated.title = title;
        }
        
        return updated;
      });
      
      // Valider le champ si déjà touché
      if (fieldErrors[name] !== undefined) {
        const error = validateField(name, newValue);
        setFieldErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleNewClientChange = (e) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateClient = () => {
    // Valider les champs requis
    if (!newClient.firstName || !newClient.lastName || !newClient.phone) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Valider le téléphone
    const phoneError = ticketValidationRules.clientPhone[0](newClient.phone);
    if (phoneError) {
      showError(phoneError);
      return;
    }

    // Copier les données du nouveau client dans le formulaire
    setFormData(prev => ({
      ...prev,
      clientId: '',
      clientFirstName: newClient.firstName,
      clientLastName: newClient.lastName,
      clientEmail: newClient.email,
      clientPhone: newClient.phone,
    }));
    setShowClientModal(false);
    setNewClient({ firstName: '', lastName: '', email: '', phone: '' });
    success('Informations client ajoutées');
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (!formData.clientId && (!formData.clientFirstName || !formData.clientLastName || !formData.clientPhone)) {
          errors.step = 'Veuillez sélectionner un client ou remplir les informations pour en créer un nouveau';
        } else if (!formData.clientId) {
          // Valider les champs du nouveau client
          if (!formData.clientFirstName) errors.clientFirstName = 'Le prénom est requis';
          if (!formData.clientLastName) errors.clientLastName = 'Le nom est requis';
          const phoneError = validateField('clientPhone', formData.clientPhone);
          if (phoneError) errors.clientPhone = phoneError;
        }
        break;
      case 2:
        const deviceError = validateField('deviceType', formData.deviceType);
        const descError = validateField('description', formData.description);
        if (deviceError) errors.deviceType = deviceError;
        if (descError) errors.description = descError;
        if (!formData.deviceType || !formData.description) {
          errors.step = 'Veuillez remplir le type d\'appareil et la description du problème';
        }
        break;
      case 3:
        if (!formData.priority) {
          errors.step = 'Veuillez sélectionner une priorité';
        }
        break;
      case 4:
        // Plus besoin de valider le réparateur à la création
        // Il sera assigné après la création du ticket
        if (false) {
          errors.step = 'Veuillez assigner un réparateur';
        }
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setFieldErrors({});
    } else {
      showError(fieldErrors.step || 'Veuillez corriger les erreurs avant de continuer');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) {
      showError(fieldErrors.step || 'Veuillez corriger les erreurs');
      return;
    }
    
    setLoading(true);
    
    try {
      const requestData = {
        title: formData.title || `Réparation ${formData.deviceType}`,
        description: formData.description,
        priority: formData.priority,
        clientId: formData.clientId || null,
        clientFirstName: formData.clientFirstName || null,
        clientLastName: formData.clientLastName || null,
        clientEmail: formData.clientEmail || null,
        clientPhone: formData.clientPhone || null,
        deviceType: formData.deviceType,
        brand: formData.brand || null,
        model: formData.model || null,
        accessories: formData.accessories.join(', '),
      };
      
      await ticketAPI.create(requestData);
      
      success('Ticket créé avec succès !');
      setTimeout(() => {
        navigate('/tickets');
      }, 1500);
    } catch (err) {
      console.error('Erreur création ticket:', err);
      showError(err.response?.data?.message || 'Impossible de créer le ticket.');
    } finally {
      setLoading(false);
    }
  };

  // Plus besoin de calculer la commission à la création

  if (clientsLoading || reparateursLoading) {
    return <Loading text="Chargement des données..." />;
  }

  return (
    <div className="ticket-form-modern-container">
      <div className="ticket-form-modern-header">
        <h1>🔧 Nouvelle Demande de Réparation</h1>
        <p>Créez un nouveau ticket de réparation en quelques étapes</p>
      </div>

      {/* Steps Indicator */}
      <div className="steps-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Client</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Appareil</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Ticket</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form-modern">
        {/* Step 1: Client */}
        {currentStep === 1 && (
          <div className="form-step">
            <h2>👤 Informations du Client</h2>
            
            <div className="form-card">
              <label className="form-label">
                <span className="label-icon">👥</span>
                Sélectionner un client existant
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">-- Sélectionnez un client --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} - {client.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="divider">
              <span>OU</span>
            </div>

            <div className="form-card">
              <div className="card-header">
                <h3>Nouveau client</h3>
                <button
                  type="button"
                  className="btn-add-client"
                  onClick={() => setShowClientModal(true)}
                >
                  + Ajouter rapidement
                </button>
              </div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="clientFirstName"
                    value={formData.clientFirstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${fieldErrors.clientFirstName ? 'input-error' : ''}`}
                    placeholder="Prénom du client"
                    disabled={formData.clientId}
                  />
                  {fieldErrors.clientFirstName && (
                    <span className="error-text">{fieldErrors.clientFirstName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    Nom
                  </label>
                  <input
                    type="text"
                    name="clientLastName"
                    value={formData.clientLastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${fieldErrors.clientLastName ? 'input-error' : ''}`}
                    placeholder="Nom du client"
                    disabled={formData.clientId}
                  />
                  {fieldErrors.clientLastName && (
                    <span className="error-text">{fieldErrors.clientLastName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📧</span>
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${fieldErrors.clientEmail ? 'input-error' : ''}`}
                    placeholder="email@example.com"
                    disabled={formData.clientId}
                  />
                  {fieldErrors.clientEmail && (
                    <span className="error-text">{fieldErrors.clientEmail}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📞</span>
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${fieldErrors.clientPhone ? 'input-error' : ''}`}
                    placeholder="06 12 34 56 78"
                    disabled={formData.clientId}
                  />
                  {fieldErrors.clientPhone && (
                    <span className="error-text">{fieldErrors.clientPhone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Appareil */}
        {currentStep === 2 && (
          <div className="form-step">
            <h2>📱 Informations de l'Appareil</h2>
            
            <div className="form-card">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📱</span>
                  Type d'appareil *
                </label>
                <div className="device-type-grid">
                  {DEVICE_TYPES.map(device => (
                    <label key={device.value} className={`device-type-card ${formData.deviceType === device.value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="deviceType"
                        value={device.value}
                        checked={formData.deviceType === device.value}
                        onChange={handleChange}
                      />
                      <span className="device-icon">{device.icon}</span>
                      <span className="device-label">{device.label}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.deviceType && (
                  <span className="error-text">{fieldErrors.deviceType}</span>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🏭</span>
                    Marque
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: Apple, Samsung, HP..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📋</span>
                    Modèle
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: iPhone 13, Galaxy S21..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📝</span>
                  Problème constaté *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
                  rows="6"
                  placeholder="Décrivez en détail le problème rencontré..."
                  required
                />
                {fieldErrors.description && (
                  <span className="error-text">{fieldErrors.description}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🎒</span>
                  Accessoires donnés
                </label>
                <div className="accessories-grid">
                  {ACCESSORIES.map(acc => (
                    <label key={acc.value} className="checkbox-card">
                      <input
                        type="checkbox"
                        data-value={acc.value}
                        checked={formData.accessories.includes(acc.value)}
                        onChange={handleChange}
                      />
                      <span>{acc.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Ticket */}
        {currentStep === 3 && (
          <div className="form-step">
            <h2>🎫 Informations du Ticket</h2>
            
            <div className="form-card">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🏷️</span>
                  Titre du ticket
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Généré automatiquement"
                />
                <small className="form-hint">Le titre est généré automatiquement selon l'appareil</small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">⚡</span>
                  Priorité *
                </label>
                <div className="priority-grid">
                  {PRIORITIES.map(priority => (
                    <label key={priority.value} className={`priority-card ${formData.priority === priority.value ? 'selected' : ''} priority-${priority.value.toLowerCase()}`}>
                      <input
                        type="radio"
                        name="priority"
                        value={priority.value}
                        checked={formData.priority === priority.value}
                        onChange={handleChange}
                      />
                      <span className="priority-icon">{priority.icon}</span>
                      <span className="priority-label">{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Navigation Buttons */}
        <div className="form-navigation">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary"
              disabled={loading}
            >
              ← Précédent
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="btn-cancel"
            disabled={loading}
          >
            Annuler
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary"
              disabled={loading}
            >
              Suivant →
            </button>
          ) : (
            <LoadingButton
              type="submit"
              className="btn-success"
              loading={loading}
              disabled={loading}
            >
              📝 Enregistrer le Ticket
            </LoadingButton>
          )}
        </div>
      </form>

      {/* Modal Création Rapide Client */}
      {showClientModal && (
        <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Ajouter un client rapidement</h2>
              <button className="modal-close" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="firstName"
                  value={newClient.firstName}
                  onChange={handleNewClientChange}
                  className="form-input"
                  placeholder="Prénom"
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="lastName"
                  value={newClient.lastName}
                  onChange={handleNewClientChange}
                  className="form-input"
                  placeholder="Nom"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={newClient.email}
                  onChange={handleNewClientChange}
                  className="form-input"
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={newClient.phone}
                  onChange={handleNewClientChange}
                  className="form-input"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowClientModal(false)}>
                Annuler
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreateClient}
                disabled={!newClient.firstName || !newClient.lastName || !newClient.phone}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'annulation */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false);
          navigate('/tickets');
        }}
        title="Annuler la création"
        message="Êtes-vous sûr de vouloir annuler ? Toutes les données saisies seront perdues."
        confirmText="Oui, annuler"
        cancelText="Non, continuer"
        type="warning"
      />
    </div>
  );
}

export default TicketForm;
