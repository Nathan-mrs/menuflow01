// Formatting and WhatsApp message helpers for MenuFlow

export const parsePrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export const isValidPrice = (value) => {
  const parsed = parsePrice(value);
  return parsed !== null && parsed > 0;
};

export const formatPrice = (value) => {
  const parsed = parsePrice(value);
  if (parsed === null || parsed <= 0) return 'Preço indisponível';
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const cleanWhatsAppPhone = (phone = '') => String(phone).replace(/\D/g, '');

export const getPublicMenuUrl = (restaurant = {}) => {
  const explicitUrl = String(restaurant.publicMenuUrl || '').trim();
  if (!explicitUrl) return '';
  try {
    const url = new URL(explicitUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
};

const describeCartItem = (item) => {
  const config = item.configuration || {};
  const parts = [];
  if (item.size?.name) parts.push(`Tamanho: ${item.size.name}`);
  if (config.mode === 'half' && config.flavors?.length === 2) {
    parts.push(`Sabores: 1/2 ${config.flavors[0].name} + 1/2 ${config.flavors[1].name}`);
    parts.push('Regra: cobrado pelo maior preço entre os dois sabores');
  } else if (config.flavors?.[0]?.name) {
    parts.push(`Sabor: ${config.flavors[0].name}`);
  }
  if (config.border?.name) {
    const delta = parsePrice(config.border.priceDelta) || 0;
    parts.push(`Borda: ${config.border.name}${delta > 0 ? ` (+ ${formatPrice(delta)})` : ''}`);
  } else if (config.borderChoice === 'none') {
    parts.push('Borda: sem borda');
  }
  return parts;
};

export const createCartWhatsAppOrderLink = ({ phone, restaurantName, items = [], total = 0 }) => {
  const cleanPhone = cleanWhatsAppPhone(phone);
  if (!cleanPhone) return '';
  if (!items.length || !isValidPrice(total)) return '';
  if (items.some((item) => !isValidPrice(item.unitPrice) || !Number.isFinite(item.quantity) || item.quantity <= 0)) return '';

  const lines = [];
  lines.push(`Ola, ${restaurantName || 'pizzaria'}!`);
  lines.push('Gostaria de confirmar este pedido:');
  lines.push('');

  items.forEach((item) => {
    const subtotal = item.unitPrice * item.quantity;
    lines.push(`${item.quantity}x ${item.product.name} - ${formatPrice(subtotal)}`);
    describeCartItem(item).forEach((line) => lines.push(`- ${line}`));
    lines.push(`Preco unitario: ${formatPrice(item.unitPrice)}`);
    if (item.notes) lines.push(`Obs: ${item.notes}`);
    lines.push('');
  });

  lines.push(`Valor estimado: ${formatPrice(total)}`);
  lines.push('O pedido ainda nao esta confirmado pelo site. Por favor, confirme disponibilidade, endereco, taxa de entrega e forma de pagamento por aqui.');

  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(lines.join('\n'))}`;
};

export const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    textArea.remove();
    return true;
  } catch {
    textArea.remove();
    return false;
  }
};
