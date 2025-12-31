import { useState, useEffect } from 'react';
import { userAPI } from '../api/apiClient';

export const useUsers = (type = 'all') => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Utiliser l'API client qui gère déjà l'authentification
        const response = await userAPI.list();
        let usersData = response.data;
        
        // Filtrer selon le type si nécessaire
        if (type === 'clients') {
          usersData = usersData.filter(user => 
            user.roles?.includes('ROLE_USER') && 
            !user.roles?.includes('ROLE_ADMIN') &&
            !user.roles?.includes('ROLE_PROPRIETAIRE') &&
            !user.roles?.includes('ROLE_REPARATEUR')
          );
        } else if (type === 'reparateurs') {
          usersData = usersData.filter(user => 
            user.roles?.includes('ROLE_REPARATEUR')
          );
        }
        
        setUsers(usersData);
      } catch (err) {
        console.error('Erreur chargement utilisateurs:', err);
        setError(err.response?.data?.message || 'Erreur de chargement des utilisateurs');
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [type]);

  return { users, loading, error };
};

