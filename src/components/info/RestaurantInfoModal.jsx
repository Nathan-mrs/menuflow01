import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { X, MapPin, Clock, Phone, Navigation, CreditCard, ShieldCheck } from 'lucide-react';

const InstagramIcon = ({ size = 18, color = '#E1306C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const RestaurantInfoModal = () => {
  const { restaurant, infoOpen, setInfoOpen } = useRestaurant();
  if (!infoOpen) return null;

  const hasMapsUrl = Boolean(restaurant.mapsUrl && !restaurant.isDemo);
  const hasInstagram = Boolean(restaurant.instagram);
  const hasPhone = Boolean(restaurant.phone);

  return (
    <section className="menu-panel-backdrop info-panel" role="region" aria-label="Informacoes da pizzaria">
      <div className="menu-panel-sheet animate-slide-up info-panel-sheet">
        <div className="modal-drag-handle"></div>
        <div className="info-modal-header">
          <div className="info-brand-row"><span>{restaurant.logo}</span><div><h3>{restaurant.name}</h3><small>Informacoes e contato</small></div></div>
          <button type="button" className="icon-btn" onClick={() => setInfoOpen(false)} aria-label="Fechar informacoes"><X size={18} /></button>
        </div>

        <div className="info-modal-body">
          <div className="info-highlight-card"><p>{restaurant.tagline}</p><span>{restaurant.slogan}</span></div>
          <div className="info-row-card"><div className="info-icon-box"><Clock size={18} color="var(--accent-secondary)" /></div><div><small>Horario de funcionamento</small><strong>{restaurant.openingHours || 'Horario nao informado'}</strong><span><span className="status-dot"></span>{restaurant.statusText || 'Consulte disponibilidade'}</span></div></div>
          <div className="info-row-card"><div className="info-icon-box"><MapPin size={18} color="var(--accent-secondary)" /></div><div><small>Endereco</small><strong>{restaurant.address || 'Endereco nao informado'}</strong>{restaurant.isDemo && <span>Endereco ilustrativo para demonstracao. Nenhuma rota real foi configurada.</span>}{hasMapsUrl && <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link-btn"><Navigation size={14} /> Ver rota no Google Maps</a>}</div></div>
          <div className="info-actions-grid">
            {hasInstagram && <a href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary-action"><InstagramIcon size={18} color="#E1306C" /> Instagram</a>}
            {hasPhone && <a href={`tel:${restaurant.phone.replace(/\D/g, '')}`} className="btn-secondary-action"><Phone size={18} color="var(--accent-secondary)" /> Ligar</a>}
          </div>
          <div className="payment-card"><div><CreditCard size={16} color="var(--accent-secondary)" /><strong>Pagamento</strong></div><span>A forma de pagamento e taxa de entrega sao confirmadas na conversa com a pizzaria.</span></div>
          <div className="info-footer-note"><ShieldCheck size={20} color="#34D399" /><span>{restaurant.isDemo ? 'Demonstracao MenuFlow com dados ficticios.' : 'Cardapio digital personalizado mantido pelo desenvolvedor.'} Avaliacoes aparecem quando coletadas por convite verificado.</span></div>
        </div>
      </div>
    </section>
  );
};
