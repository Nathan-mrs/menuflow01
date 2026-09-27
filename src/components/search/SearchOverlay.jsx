import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatPrice, isValidPrice } from '../../utils/formatters';
import { Search, X, Star, ArrowRight } from 'lucide-react';

const displaySearchPrice = (product) => {
  if (product.sizes?.length) {
    const validSizes = product.sizes.filter((size) => isValidPrice(size.price));
    if (!validSizes.length) return 'Preco indisponivel';
    return `a partir de ${formatPrice(Math.min(...validSizes.map((size) => Number(size.price))))}`;
  }
  return formatPrice(product.price);
};

export const SearchOverlay = () => {
  const { restaurant, searchOpen, setSearchOpen, setSelectedProduct } = useRestaurant();
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return restaurant.products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const ingredientsMatch = p.ingredients?.some((ing) => ing.toLowerCase().includes(q));
      return nameMatch || descMatch || catMatch || ingredientsMatch;
    });
  }, [query, restaurant.products]);

  if (!searchOpen) return null;

  return (
    <section className="search-overlay menu-panel-backdrop animate-fade-in" role="region" aria-label="Busca de produtos">
      <div className="search-container menu-panel-sheet">
        <div className="search-input-wrapper">
          <Search size={20} color="var(--accent-secondary)" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Buscar no cardapio (ex: calabresa, Catupiry, refrigerante)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="button" className="icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => setSearchOpen(false)} aria-label="Fechar busca">
            <X size={16} />
          </button>
        </div>

        {!query && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Termos mais buscados:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {['Calabresa', 'Catupiry', 'Margherita', 'Frango', 'Batata', 'Refrigerante'].map((tag) => (
                <button key={tag} type="button" onClick={() => setQuery(tag)} className="search-suggestion-chip">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="search-results-list">
          {query.trim() && filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhum produto encontrado para "{query}"</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Tente pesquisar por ingredientes ou nomes de categorias.</p>
            </div>
          ) : (
            filteredProducts.map((prod) => (
              <button
                type="button"
                key={prod.id}
                className="search-result-item"
                onClick={() => {
                  setSelectedProduct(prod);
                  setSearchOpen(false);
                }}
              >
                <img src={prod.image} alt={prod.name} className="search-result-thumb" />
                <div className="search-result-info">
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>{prod.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--star-gold)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      {prod.reviewsCount > 0 && prod.rating ? <><Star size={11} fill="currentColor" /> {Number(prod.rating).toFixed(1)}</> : 'Sem avaliacoes'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 800 }}>{displaySearchPrice(prod)}</span>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
