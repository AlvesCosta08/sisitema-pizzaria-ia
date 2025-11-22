import React, { useState, useEffect } from 'react';
import PizzaRecommender from './PizzaRecommender';
import './ChatWidget.css';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Simular notificações (em produção, viria do backend)
    const interval = setInterval(() => {
      setNotificationCount(prev => (prev < 9 ? prev + 1 : prev));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    setIsVisible(true);
    setTimeout(() => setIsOpen(true), 50);
    setNotificationCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) {
    return (
      <div className="pizzaria-ia-widget">
        <button className="floating-button" onClick={handleOpen}>
          🍕
          {notificationCount > 0 && (
            <span className="notification-badge">
              {notificationCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="pizzaria-ia-widget">
      <div className={`chat-modal ${isOpen ? 'fade-in' : ''}`}>
        <div className="chat-header">
          <h3>
            🍕 Pizzaria IA
            <span className="chat-status">• Online</span>
          </h3>
          <button onClick={handleClose}>×</button>
        </div>
        <div className="chat-body">
          <PizzaRecommender />
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;