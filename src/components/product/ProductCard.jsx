import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatPrice, isValidPrice } from '../../utils/formatters';
import { Star, Plus, Heart } from 'lucide-react';

const displayPrice = (product) => {
  if (product.sizes?.length) {
    const validSizes = product.sizes.filter((size) => isValidPrice(size.price));
    if (!validSizes.length) return 'Preco indisponivel';
    const minPrice = Math.min(...validSizes.map((size) => Number(size.price)));
    return `a partir de ${formatPrice(minPrice)}`;
  }
  return formatPrice(product.price);
};

export const ProductCard = ({ product }) => {
  const { setSelectedProduct, addToCart, toggleFavorite, isFavorite } = useRestaurant();
  const hasReviews = product.reviewsCount > 0 && product.rating;
  const hasSizes = product.sizes?.length > 0;
  const favorited = isFavorite(product.id);

  const handleQuickAdd = () => {
    if (hasSizes) {
      setSelectedProduct(product);
      return;
    }
    addToCart({ product, quantity: 1 });
  };

  return (
    <article className="product-card pizza-product-card">
      <button type="button" className="product-card-main" onClick={() => setSelectedProduct(product)}>
        <div className="product-card-media">
          <img src={product.image} alt={product.name} className="product-card-img" loading="lazy" />
          {product.badge && <span className="pizza-badge">{product.badge}</span>}
        </div>
        <div className="product-card-body">
          <div className="product-header-row">
            <h3 className="product-title">{product.name}</h3>
            <span className="price-text">{displayPrice(product)}</span>
          </div>
          <p className="product-desc">{product.description}</p>
          <div className="product-meta-row">
            {hasReviews ? (
              <span className="rating-pill"><Star size={11} fill="currentColor" /> {Number(product.rating).toFixed(1)} ({product.reviewsCount})</span>
            ) : (
              <span className="empty-review-pill">Sem avaliacoes ainda</span>
            )}
            {hasSizes && <span>{product.sizes.length} tamanhos</span>}
            {product.servings && <span>{product.servings}</span>}
          </div>
        </div>
      </button>
      <button type="button" className={`favorite-btn product-favorite-btn ${favorited ? 'favorited' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label={favorited ? `Remover ${product.name} dos favoritos` : `Salvar ${product.name} nos favoritos`}>
        <Heart size={16} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="quick-add-btn" onClick={handleQuickAdd} aria-label={`Adicionar ${product.name} ao carrinho`}>
        <Plus size={18} />
      </button>
    </article>
  );
};
