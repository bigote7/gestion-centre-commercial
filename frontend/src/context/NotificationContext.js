import React, { createContext, useContext, useState, useCallback } from 'react';
import './NotificationContext.css';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  const success = useCallback((message, duration) => {
    return showNotification(message, 'success', duration);
  }, [showNotification]);

  const error = useCallback((message, duration) => {
    return showNotification(message, 'error', duration);
  }, [showNotification]);

  const warning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration);
  }, [showNotification]);

  const info = useCallback((message, duration) => {
    return showNotification(message, 'info', duration);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      showNotification, 
      removeNotification,
      success,
      error,
      warning,
      info
    }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map(notif => (
        <div 
          key={notif.id} 
          className={`notification notification-${notif.type}`}
          onClick={() => onRemove(notif.id)}
        >
          <div className="notification-icon">
            {notif.type === 'success' && '✅'}
            {notif.type === 'error' && '❌'}
            {notif.type === 'warning' && '⚠️'}
            {notif.type === 'info' && 'ℹ️'}
          </div>
          <div className="notification-content">
            <span className="notification-message">{notif.message}</span>
          </div>
          <button 
            className="notification-close" 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notif.id);
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification doit être utilisé dans un NotificationProvider');
  }
  return context;
};

