import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatPrice, isValidPrice } from '../../utils/formatters';
import { X, Heart, Star, Trash2, Pizza } from 'lucide-react';

const displayFavoritePrice = (product) => {
  if (product.sizes?.length) {
    const validSizes = product.sizes.filter((size) => isValidPrice(size.price));
    if (!validSizes.length) return 'Preco indisponivel';
    return `a partir de ${formatPrice(Math.min(...validSizes.map((size) => Number(size.price))))}`;
  }
  return formatPrice(product.price);
};

export const FavoritesDrawer = () => {
  const { restaurant, favorites, toggleFavorite, favoritesOpen, setFavoritesOpen, setSelectedProduct } = useRestaurant();
  if (!favoritesOpen) return null;

  const favoritedProducts = (restaurant?.products || []).filter((product) => favorites.includes(product.id));

  return (
    <section className="menu-panel-backdrop favorites-panel" role="region" aria-label="Favoritos">
      <div className="menu-panel-sheet animate-slide-up favorites-sheet">
        <div className="modal-drag-handle"></div>
        <div className="drawer-heading-row">
          <div className="drawer-title-row"><Heart size={20} fill="#EF4444" color="#EF4444" /><h3>Favoritos ({favoritedProducts.length})</h3></div>
          <button type="button" className="icon-btn" onClick={() => setFavoritesOpen(false)} aria-label="Fechar favoritos"><X size={18} /></button>
        </div>

        <div className="favorites-content">
          {favoritedProducts.length === 0 ? (
            <div className="favorites-empty-state">
              <div className="favorites-empty-icon"><Pizza size={28} /></div>
              <h4>Nenhum favorito ainda</h4>
              <p>Toque no coracao de uma pizza ou produto para guardar seus preferidos aqui.</p>
              <button type="button" className="btn-primary-action" onClick={() => setFavoritesOpen(false)}>Explorar cardapio</button>
            </div>
          ) : (
            favoritedProducts.map((product) => (
              <div key={product.id} role="button" tabIndex={0} className="search-result-item favorite-result-item" onClick={() => { setSelectedProduct(product); setFavoritesOpen(false); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { setSelectedProduct(product); setFavoritesOpen(false); } }}>
                <img src={product.image} alt={product.name} className="search-result-thumb" />
                <div className="search-result-info">
                  <h4>{product.name}</h4>
                  <div className="favorite-meta-row">
                    <span>{product.reviewsCount > 0 && product.rating ? <><Star size={11} fill="currentColor" /> {Number(product.rating).toFixed(1)}</> : 'Sem avaliacoes'}</span>
                    <strong>{displayFavoritePrice(product)}</strong>
                  </div>
                </div>
                <button type="button" className="favorite-remove-btn" onClick={(event) => { event.stopPropagation(); toggleFavorite(product.id); }} aria-label={`Remover ${product.name} dos favoritos`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
