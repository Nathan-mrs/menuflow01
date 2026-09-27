import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Home, Search, Heart, Info } from 'lucide-react';

export const BottomNavigation = () => {
  const {
    favorites,
    searchOpen,
    setSearchOpen,
    favoritesOpen,
    setFavoritesOpen,
    infoOpen,
    setInfoOpen,
    setCartOpen,
  } = useRestaurant();

  const handleHomeClick = () => {
    setSearchOpen(false);
    setFavoritesOpen(false);
    setInfoOpen(false);
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSearch = () => {
    setFavoritesOpen(false);
    setInfoOpen(false);
    setSearchOpen(true);
  };

  const openFavorites = () => {
    setSearchOpen(false);
    setInfoOpen(false);
    setFavoritesOpen(true);
  };

  const openInfo = () => {
    setSearchOpen(false);
    setFavoritesOpen(false);
    setInfoOpen(true);
  };

  const isHomeActive = !searchOpen && !favoritesOpen && !infoOpen;

  return (
    <nav className="bottom-nav" aria-label="Navegacao inferior movel">
      <button type="button" className={`nav-item ${isHomeActive ? 'active' : ''}`} onClick={handleHomeClick} aria-current={isHomeActive ? 'page' : undefined}>
        <Home size={20} className="nav-icon" />
        <span>Inicio</span>
      </button>

      <button type="button" className={`nav-item ${searchOpen ? 'active' : ''}`} onClick={openSearch} aria-current={searchOpen ? 'page' : undefined}>
        <Search size={20} className="nav-icon" />
        <span>Buscar</span>
      </button>

      <button type="button" className={`nav-item ${favoritesOpen ? 'active' : ''}`} onClick={openFavorites} aria-current={favoritesOpen ? 'page' : undefined}>
        <span className="nav-icon-wrap">
          <Heart size={20} className="nav-icon" fill={favoritesOpen ? 'currentColor' : 'none'} />
          {favorites.length > 0 && <span className="nav-count-badge">{favorites.length}</span>}
        </span>
        <span>Favoritos</span>
      </button>

      <button type="button" className={`nav-item ${infoOpen ? 'active' : ''}`} onClick={openInfo} aria-current={infoOpen ? 'page' : undefined}>
        <Info size={20} className="nav-icon" />
        <span>Sobre</span>
      </button>
    </nav>
  );
};
