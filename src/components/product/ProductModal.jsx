import React, { useEffect, useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatPrice, isValidPrice, parsePrice } from '../../utils/formatters';
import { findProductSizeByKey, getBorderPriceForSize, getSizeKey, isPizzaProduct } from '../../utils/pizzaOptions';
import { RatingStars } from '../common/RatingStars';
import { X, Plus, Minus, CheckCircle, ShoppingCart, Star } from 'lucide-react';

export const ProductModal = () => {
  const { restaurant, selectedProduct, setSelectedProduct, addToCart } = useRestaurant();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [flavorMode, setFlavorMode] = useState('whole');
  const [secondFlavorId, setSecondFlavorId] = useState('');
  const [borderId, setBorderId] = useState('none');
  const [formError, setFormError] = useState('');

  const sizes = useMemo(() => selectedProduct?.sizes || [], [selectedProduct]);
  const selectedSize = sizes.find((size) => size.id === selectedSizeId) || null;
  const selectedSizeKey = selectedSize ? getSizeKey(selectedSize) : '';
  const isPizza = selectedProduct ? isPizzaProduct(selectedProduct, restaurant.categories) : false;

  const pizzaFlavors = useMemo(() => {
    if (!selectedProduct || !selectedSizeKey) return [];
    return restaurant.products
      .filter((product) => product.status !== 'paused' && isPizzaProduct(product, restaurant.categories))
      .map((product) => ({ product, size: findProductSizeByKey(product, selectedSizeKey) }))
      .filter((item) => item.size && item.size.isAvailable !== false && isValidPrice(item.size.price));
  }, [restaurant, selectedProduct, selectedSizeKey]);

  const secondFlavor = pizzaFlavors.find((item) => item.product.id === secondFlavorId) || null;
  const currentFlavorSize = selectedProduct && selectedSizeKey ? findProductSizeByKey(selectedProduct, selectedSizeKey) : selectedSize;

  const borderOptions = useMemo(() => {
    if (!selectedSizeKey) return [];
    return (restaurant.borderOptions || [])
      .map((option) => ({ option, price: getBorderPriceForSize(option, selectedSizeKey) }))
      .filter(({ option, price }) => option.isAvailable !== false && price && price.isAvailable !== false && parsePrice(price.priceDelta) !== null);
  }, [restaurant.borderOptions, selectedSizeKey]);
  const selectedBorder = borderId === 'none' ? null : borderOptions.find(({ option }) => option.id === borderId) || null;

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setNotes('');
      setSelectedSizeId('');
      setFlavorMode('whole');
      setSecondFlavorId('');
      setBorderId('none');
      setFormError('');
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    setSecondFlavorId('');
    setBorderId('none');
    setFormError('');
  }, [selectedSizeId, flavorMode]);

  if (!selectedProduct) return null;

  const hasSizes = sizes.length > 0;
  const hasReviews = selectedProduct.reviewsCount > 0 && selectedProduct.rating;
  const basePrice = (() => {
    if (isPizza && hasSizes) {
      if (!selectedSize || !currentFlavorSize) return null;
      const firstPrice = parsePrice(currentFlavorSize.price);
      if (flavorMode === 'half') {
        const secondPrice = parsePrice(secondFlavor?.size?.price);
        if (!isValidPrice(firstPrice) || !isValidPrice(secondPrice)) return null;
        return Math.max(firstPrice, secondPrice);
      }
      return firstPrice;
    }
    return parsePrice(selectedSize ? selectedSize.price : selectedProduct.price);
  })();
  const borderDelta = selectedBorder ? parsePrice(selectedBorder.price.priceDelta) : 0;
  const unitPrice = isValidPrice(basePrice) ? basePrice + (borderDelta || 0) : null;
  const totalPrice = isValidPrice(unitPrice) ? unitPrice * quantity : null;

  const handleAdd = () => {
    if (hasSizes && !selectedSize) { setFormError('Escolha um tamanho para continuar.'); return; }
    if (isPizza && flavorMode === 'half' && !secondFlavor) { setFormError('Escolha o segundo sabor para montar meio a meio.'); return; }
    if (!isValidPrice(unitPrice)) { setFormError('Esta combinacao esta sem preco valido ou indisponivel.'); return; }

    const configuration = isPizza ? {
      mode: flavorMode,
      flavors: flavorMode === 'half'
        ? [{ id: selectedProduct.id, name: selectedProduct.name }, { id: secondFlavor.product.id, name: secondFlavor.product.name }]
        : [{ id: selectedProduct.id, name: selectedProduct.name }],
      pricingRule: flavorMode === 'half' ? 'Meio a meio cobrado pelo maior preco dos dois sabores no tamanho escolhido.' : 'Sabor inteiro.',
      borderChoice: selectedBorder ? 'filled' : 'none',
      border: selectedBorder ? { id: selectedBorder.option.id, name: selectedBorder.option.name, priceDelta: borderDelta } : null,
    } : null;

    addToCart({ product: selectedProduct, size: selectedSize, quantity, notes: notes.trim(), configuration, unitPrice });
    setSelectedProduct(null);
  };

  return (
    <div className="modal-backdrop" onClick={() => setSelectedProduct(null)} role="dialog" aria-modal="true">
      <div className="modal-content-sheet animate-slide-up" onClick={(event) => event.stopPropagation()}>
        <div className="modal-scrollable-body">
          <div className="modal-media-header"><img src={selectedProduct.image} alt={selectedProduct.name} className="modal-media-img" /><div className="modal-media-overlay"></div><div className="modal-top-bar"><button type="button" className="modal-close-btn" onClick={() => setSelectedProduct(null)} aria-label="Fechar"><X size={20} /></button></div></div>

          <div className="modal-info-block">
            {selectedProduct.badge && <span className="pizza-badge inline-badge">{selectedProduct.badge}</span>}
            <h2 className="modal-dish-title">{selectedProduct.name}</h2>
            <div className="modal-price-rating-row"><span className="modal-price">{formatPrice(unitPrice)}</span>{hasReviews ? <div className="modal-rating-badge"><Star size={15} fill="currentColor" /> {Number(selectedProduct.rating).toFixed(1)} ({selectedProduct.reviewsCount})</div> : <span className="empty-review-pill">Ainda sem avaliacoes</span>}</div>
            <p className="modal-dish-desc">{selectedProduct.description}</p>
            {selectedProduct.ingredients?.length > 0 && <div className="ingredients-chips-row">{selectedProduct.ingredients.slice(0, 8).map((ingredient) => <span key={ingredient} className="ingredient-chip">{ingredient}</span>)}</div>}
          </div>

          {hasSizes && <div className="customization-section"><span className="customization-title">Escolha o tamanho</span><div className="options-list">{sizes.map((size) => { const disabled = !isValidPrice(size.price) || size.isAvailable === false; return <button key={size.id} type="button" className={`radio-option-card size-option-card ${selectedSizeId === size.id ? 'selected' : ''}`} onClick={() => { if (!disabled) { setSelectedSizeId(size.id); setFormError(''); } }} disabled={disabled}><span className="option-name">{size.name}</span><span className="option-price">{disabled ? 'Preco indisponivel' : formatPrice(size.price)}</span></button>; })}</div></div>}

          {isPizza && selectedSize && <div className="customization-section"><span className="customization-title">Sabor da pizza</span><div className="segmented-control"><button type="button" className={flavorMode === 'whole' ? 'active' : ''} onClick={() => setFlavorMode('whole')}>Inteira</button><button type="button" className={flavorMode === 'half' ? 'active' : ''} onClick={() => setFlavorMode('half')}>Meio a meio</button></div>{flavorMode === 'half' && <><p className="option-help-text">Meio a meio e cobrado pelo maior preco entre os dois sabores no tamanho escolhido.</p><div className="options-list">{pizzaFlavors.filter(({ product }) => product.id !== selectedProduct.id).map(({ product, size }) => <button key={product.id} type="button" className={`radio-option-card size-option-card ${secondFlavorId === product.id ? 'selected' : ''}`} onClick={() => { setSecondFlavorId(product.id); setFormError(''); }}><span className="option-name">1/2 {product.name}</span><span className="option-price">{formatPrice(size.price)}</span></button>)}</div></>}</div>}

          {isPizza && selectedSize && <div className="customization-section"><span className="customization-title">Borda</span><div className="options-list"><button type="button" className={`radio-option-card size-option-card ${borderId === 'none' ? 'selected' : ''}`} onClick={() => setBorderId('none')}><span className="option-name">Sem borda</span><span className="option-price">Sem acrescimo</span></button>{borderOptions.map(({ option, price }) => <button key={option.id} type="button" className={`radio-option-card size-option-card ${borderId === option.id ? 'selected' : ''}`} onClick={() => setBorderId(option.id)}><span className="option-name">{option.name}</span><span className="option-price">+ {formatPrice(price.priceDelta)}</span></button>)}</div></div>}

          <div className="customization-section"><span className="customization-title">Observacao para a pizzaria</span><textarea className="notes-input-area" placeholder="Ex: sem cebola, cortar em 8 pedacos..." value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={180} />{formError && <span className="form-error-text">{formError}</span>}</div>

          <section className="modal-reviews-section"><div className="reviews-title-row"><div><span className="section-tag">Avaliacoes do produto</span><h3 className="section-title small-title">Compra verificada, quando houver convite</h3></div></div>{hasReviews ? <div className="reviews-feed">{selectedProduct.reviews.map((review) => <div key={review.id} className="review-item"><div className="review-item-header"><div className="review-author"><span>{review.author}</span>{review.verified && <span className="verified-tag"><CheckCircle size={12} /> Compra verificada</span>}</div><span className="review-date">{review.date}</span></div><RatingStars rating={review.rating} size={12} />{review.comment && <p className="review-comment-text">"{review.comment}"</p>}</div>)}</div> : <div className="empty-reviews-card"><strong>Nenhuma avaliacao publicada ainda.</strong><span>Avaliacoes aparecem apenas depois de convite valido gerado para uma compra real.</span></div>}</section>
        </div>

        <div className="modal-fixed-bottom-bar"><div className="quantity-control"><button type="button" className="qty-btn" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14} /></button><span className="qty-value">{quantity}</span><button type="button" className="qty-btn" onClick={() => setQuantity((value) => value + 1)}><Plus size={14} /></button></div><button type="button" className="whatsapp-cta-btn" onClick={handleAdd}><ShoppingCart size={20} /> Adicionar - {formatPrice(totalPrice)}</button></div>
      </div>
    </div>
  );
};
