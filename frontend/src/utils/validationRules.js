/**
 * Règles de validation pour les formulaires
 */

// Validation du téléphone marocain
export const validatePhone = (value) => {
  if (!value) return 'Le téléphone est requis';
  const phoneRegex = /^0[5-7][0-9]{8}$/;
  if (!phoneRegex.test(value.replace(/\s/g, ''))) {
    return 'Format invalide (ex: 0612345678)';
  }
  return '';
};

// Validation de l'email
export const validateEmail = (value, required = false) => {
  if (required && !value) return 'L\'email est requis';
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Format d\'email invalide';
  }
  return '';
};

// Validation du mot de passe
export const validatePassword = (value, minLength = 6) => {
  if (!value) return 'Le mot de passe est requis';
  if (value.length < minLength) {
    return `Le mot de passe doit contenir au moins ${minLength} caractères`;
  }
  return '';
};

// Validation de confirmation de mot de passe
export const validateConfirmPassword = (value, password) => {
  if (!value) return 'La confirmation est requise';
  if (value !== password) {
    return 'Les mots de passe ne correspondent pas';
  }
  return '';
};

// Validation de texte requis
export const validateRequired = (value, fieldName = 'Ce champ') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} est requis`;
  }
  return '';
};

// Validation de nombre positif
export const validatePositiveNumber = (value, fieldName = 'Le montant') => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} doit être un nombre`;
  if (num < 0) return `${fieldName} doit être positif`;
  return '';
};

// Validation de pourcentage
export const validatePercentage = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Le pourcentage doit être un nombre';
  if (num < 0 || num > 100) return 'Le pourcentage doit être entre 0 et 100';
  return '';
};

// Règles de validation pour le formulaire de ticket
export const ticketValidationRules = {
  clientPhone: [
    (value) => validatePhone(value)
  ],
  clientFirstName: [
    (value, allValues) => {
      if (!allValues.clientId && !value) {
        return 'Le prénom est requis pour un nouveau client';
      }
      return '';
    }
  ],
  clientLastName: [
    (value, allValues) => {
      if (!allValues.clientId && !value) {
        return 'Le nom est requis pour un nouveau client';
      }
      return '';
    }
  ],
  clientEmail: [
    (value) => validateEmail(value, false)
  ],
  deviceType: [
    (value) => validateRequired(value, 'Le type d\'appareil')
  ],
  description: [
    (value) => validateRequired(value, 'La description'),
    (value) => {
      if (value && value.length < 10) {
        return 'La description doit faire au moins 10 caractères';
      }
      return '';
    }
  ],
  priority: [
    (value) => validateRequired(value, 'La priorité')
  ],
  assignedReparateurId: [
    (value) => validateRequired(value, 'Le réparateur')
  ],
  estimatedPrice: [
    (value) => validatePositiveNumber(value, 'Le prix estimé')
  ],
  commissionPercentage: [
    (value) => validatePercentage(value)
  ]
};

// Règles de validation pour l'inscription
export const registerValidationRules = {
  firstName: [
    (value) => validateRequired(value, 'Le prénom')
  ],
  lastName: [
    (value) => validateRequired(value, 'Le nom')
  ],
  email: [
    (value) => validateEmail(value, true)
  ],
  phone: [
    (value) => validatePhone(value)
  ],
  password: [
    (value) => validatePassword(value, 6)
  ],
  confirmPassword: [
    (value, allValues) => validateConfirmPassword(value, allValues.password)
  ]
};

