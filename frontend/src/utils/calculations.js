/**
 * Calcule la répartition des commissions
 * @param {number|string} price - Prix total
 * @param {number|string} percentage - Pourcentage de commission réparateur
 * @returns {Object} { reparateur, proprietaire }
 */
export const calculateCommission = (price, percentage) => {
  if (!price || !percentage) return { reparateur: 0, proprietaire: 0 };
  
  const priceNum = parseFloat(price);
  const percentageNum = parseFloat(percentage);
  
  if (isNaN(priceNum) || isNaN(percentageNum)) {
    return { reparateur: 0, proprietaire: 0 };
  }
  
  const reparateur = (priceNum * percentageNum / 100);
  const proprietaire = priceNum - reparateur;
  
  return {
    reparateur: parseFloat(reparateur.toFixed(2)),
    proprietaire: parseFloat(proprietaire.toFixed(2)),
  };
};

/**
 * Formate un montant en devise MAD
 * @param {number|string} amount - Montant à formater
 * @returns {string} Montant formaté
 */
export const formatCurrency = (amount) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '0,00 MAD';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

/**
 * Formate une date
 * @param {Date|string} date - Date à formater
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  };
  
  try {
    return new Date(date).toLocaleDateString('fr-FR', defaultOptions);
  } catch (error) {
    return '—';
  }
};

/**
 * Formate une date avec l'heure
 * @param {Date|string} date - Date à formater
 * @returns {string} Date et heure formatées
 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  
  try {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '—';
  }
};

/**
 * Calcule le nombre de jours entre deux dates
 * @param {Date|string} date1 - Première date
 * @param {Date|string} date2 - Deuxième date (défaut: maintenant)
 * @returns {number} Nombre de jours
 */
export const daysBetween = (date1, date2 = new Date()) => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

