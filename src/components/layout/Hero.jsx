import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';

export const Hero = () => {
  const { restaurant } = useRestaurant();

  return (
    <section className="hero-section pizza-hero" aria-label="Destaque da pizzaria">
      <div className="hero-media-wrapper">
        <img src={restaurant.coverImage} alt={restaurant.name} className="hero-img" loading="eager" />
        <div className="hero-overlay"></div>
      </div>
      <div className="hero-content">
        <span className="hero-subtitle">{restaurant.heroSubtitle || 'Demonstracao de cardapio digital'}</span>
        <h2 className="hero-title">{restaurant.slogan || 'Pizzas artesanais, fotos reais e pedido direto pelo WhatsApp.'}</h2>
      </div>
    </section>
  );
};
