export const PRIORITIES = [
  { value: 'BASSE', label: 'Normal', icon: '🟢', color: '#48bb78' },
  { value: 'MOYENNE', label: 'Urgent', icon: '🟡', color: '#ed8936' },
  { value: 'HAUTE', label: 'Très urgent', icon: '🔴', color: '#f56565' },
];

export const DEVICE_TYPES = [
  { value: 'SMARTPHONE', label: 'Téléphone', icon: '📱' },
  { value: 'ORDINATEUR', label: 'Laptop', icon: '💻' },
  { value: 'ORDINATEUR_BUREAU', label: 'PC', icon: '🖥️' },
  { value: 'TABLETTE', label: 'Tablette', icon: '📱' },
  { value: 'AUTRE', label: 'Autre', icon: '🔧' },
];

export const ACCESSORIES = [
  { value: 'CHARGEUR', label: 'Chargeur' },
  { value: 'COQUE', label: 'Coque' },
  { value: 'CARTE_SIM', label: 'Carte SIM' },
  { value: 'AUCUN', label: 'Aucun' },
];

export const TICKET_STATUSES = {
  EN_ATTENTE: { label: 'En attente', color: '#ed8936', icon: '⏳' },
  EN_COURS: { label: 'En cours', color: '#4299e1', icon: '🔧' },
  RESOLU: { label: 'Résolu', color: '#48bb78', icon: '✅' },
  REJETE: { label: 'Rejeté', color: '#f56565', icon: '❌' },
};

export const APPAREIL_STATUSES = [
  { value: 'PAS_COMMENCE', label: '⏳ Pas commencé', color: '#a0aec0' },
  { value: 'EN_COURS_REPARATION', label: '🔧 En cours de réparation', color: '#4299e1' },
  { value: 'BIEN_REPARE', label: '✅ Bien réparé', color: '#48bb78' },
];

