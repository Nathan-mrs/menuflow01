import React, { useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { copyToClipboard, getPublicMenuUrl } from '../../utils/formatters';
import { X, Download, Copy, Check, QrCode } from 'lucide-react';

const qrImageUrl = (url, size = 420) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=24&ecc=H&color=111111&bgcolor=FFFFFF&data=${encodeURIComponent(url)}`;

export const QRCodeModal = () => {
  const { restaurant, qrCodeOpen, setQrCodeOpen, showToast } = useRestaurant();
  const [copied, setCopied] = useState(false);
  const menuUrl = useMemo(() => getPublicMenuUrl(restaurant), [restaurant]);
  const imageUrl = menuUrl ? qrImageUrl(menuUrl, 720) : '';

  if (!qrCodeOpen) return null;

  const handleCopyLink = async () => {
    if (!menuUrl) return;
    const success = await copyToClipboard(menuUrl);
    if (success) {
      setCopied(true);
      showToast('Link do cardapio copiado.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setQrCodeOpen(false)} role="dialog" aria-modal="true">
      <div className="modal-content-sheet animate-slide-up qr-modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-drag-handle"></div>
        <div className="qr-modal-header">
          <div className="qr-title-row"><QrCode size={19} color="var(--accent-secondary)" /><h3>QR Code do cardapio</h3></div>
          <button type="button" className="icon-btn" onClick={() => setQrCodeOpen(false)} aria-label="Fechar QR Code"><X size={18} /></button>
        </div>

        <div className="qr-modal-body">
          {!menuUrl ? (
            <div className="empty-reviews-card qr-empty-card">
              <strong>URL publica nao configurada.</strong>
              <span>Defina a URL publica do cardapio no admin antes de gerar o QR para impressao. URLs localhost nao sao aceitas.</span>
            </div>
          ) : (
            <>
              <p className="qr-helper-text">Use este QR em impressos, mesas ou redes sociais. Ele aponta para a URL publica configurada para {restaurant.name}.</p>
              <div className="qr-print-card">
                <div className="qr-print-brand"><span>{restaurant.logo || restaurant.name?.slice(0, 2)}</span><strong>{restaurant.name}</strong></div>
                <img className="qr-image" src={imageUrl} alt={`QR Code do cardapio de ${restaurant.name}`} />
                <div className="qr-url-label">{menuUrl}</div>
              </div>
              <div className="qr-actions-row">
                <a className="btn-primary-action" href={imageUrl} download={`MenuFlow-QRCode-${restaurant.slug || 'cardapio'}.png`} target="_blank" rel="noopener noreferrer">
                  <Download size={16} /> Baixar PNG
                </a>
                <button type="button" className="btn-secondary-action" onClick={handleCopyLink}>
                  {copied ? <Check size={16} color="#34D399" /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
