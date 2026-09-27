import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { createCartWhatsAppOrderLink, formatPrice } from '../../utils/formatters';
import { Minus, Plus, Send, Trash2, X } from 'lucide-react';

const CartItemDetails = ({ item }) => {
  const config = item.configuration || {};
  return (
    <>
      {item.size?.name && <span>Tamanho: {item.size.name}</span>}
      {config.mode === 'half' && config.flavors?.length === 2 && <span>Sabores: 1/2 {config.flavors[0].name} + 1/2 {config.flavors[1].name}</span>}
      {config.mode !== 'half' && config.flavors?.[0]?.name && <span>Sabor: {config.flavors[0].name}</span>}
      {config.border?.name && <span>Borda: {config.border.name}{config.border.priceDelta > 0 ? ` (+ ${formatPrice(config.border.priceDelta)})` : ''}</span>}
      {config.borderChoice === 'none' && <span>Borda: sem borda</span>}
      <span>{formatPrice(item.unitPrice)} cada</span>
      <span>Subtotal: {formatPrice(item.unitPrice * item.quantity)}</span>
      {item.notes && <small>Obs: {item.notes}</small>}
    </>
  );
};

export const CartDrawer = () => {
  const { restaurant, cartItems, cartOpen, setCartOpen, updateCartItem, clearCart, cartTotal } = useRestaurant();
  if (!cartOpen) return null;

  const whatsappLink = createCartWhatsAppOrderLink({ phone: restaurant.whatsapp, restaurantName: restaurant.name, items: cartItems, total: cartTotal });
  const canCheckout = Boolean(whatsappLink && cartItems.length > 0);

  return (
    <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer animate-slide-up" onClick={(event) => event.stopPropagation()} aria-label="Carrinho">
        <div className="cart-header"><div><span className="section-tag">Pedido pelo WhatsApp</span><h2>Seu carrinho</h2></div><button type="button" className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho"><X size={18} /></button></div>

        {cartItems.length === 0 ? (
          <div className="empty-reviews-card"><strong>Carrinho vazio.</strong><span>Escolha uma pizza para montar a mensagem do WhatsApp.</span></div>
        ) : (
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.product.image} alt="" />
                <div className="cart-item-info"><strong>{item.product.name}</strong><CartItemDetails item={item} /></div>
                <div className="cart-item-actions"><button type="button" onClick={() => updateCartItem(item.id, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" onClick={() => updateCartItem(item.id, item.quantity + 1)}><Plus size={13} /></button></div>
              </div>
            ))}
          </div>
        )}

        <div className="cart-footer">
          <div className="cart-total-row"><span>Valor estimado</span><strong>{formatPrice(cartTotal)}</strong></div>
          <p>O pedido nao e confirmado pelo site. A pizzaria confirma disponibilidade, endereco, taxa de entrega e forma de pagamento na conversa.</p>
          {canCheckout ? <a className="whatsapp-cta-btn" href={whatsappLink} target="_blank" rel="noopener noreferrer"><Send size={18} /> Finalizar no WhatsApp</a> : <button className="whatsapp-cta-btn disabled" type="button" disabled>Configure o WhatsApp da pizzaria</button>}
          {cartItems.length > 0 && <button className="clear-cart-btn" type="button" onClick={clearCart}><Trash2 size={14} /> Limpar carrinho</button>}
        </div>
      </aside>
    </div>
  );
};
