import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Search, QrCode, Info, Star, Clock } from 'lucide-react';

export const Header = () => {
  const { restaurant, setSearchOpen, setInfoOpen, setQrCodeOpen } = useRestaurant();
  const hasRating = restaurant.reviewsCount > 0 && restaurant.rating > 0;

  return (
    <header className="main-header pizza-header">
      <div className="brand-info">
        <div className="brand-row">
          <span className="brand-logo">{restaurant.logo || ''}</span>
          <h1 className="brand-title">{restaurant.name || 'Bola Pizza'}</h1>
        </div>
        <div className="brand-meta">
          <span className="badge badge-status"><span className="status-dot"></span>{restaurant.statusText || 'Demonstracao'}</span>
          {restaurant.deliveryTime && <span><Clock size={11} color="var(--accent-secondary)" /> {restaurant.deliveryTime}</span>}
          {hasRating && <span className="brand-rating"><Star size={11} fill="currentColor" /> {Number(restaurant.rating).toFixed(1)}</span>}
        </div>
      </div>

      <div className="header-actions">
        <button type="button" className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Buscar produtos"><Search size={18} /></button>
        <button type="button" className="icon-btn" onClick={() => setQrCodeOpen(true)} aria-label="Ver QR Code"><QrCode size={18} /></button>
        <button type="button" className="icon-btn" onClick={() => setInfoOpen(true)} aria-label="Informacoes"><Info size={18} /></button>
      </div>
    </header>
  );
};
