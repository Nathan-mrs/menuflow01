export const normalizeSizeKey = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const firstToken = text.split(/\s|-|–|—/)[0];
  return firstToken.replace(/[^a-z0-9]/gi, '').toUpperCase();
};

export const getSizeKey = (size = {}) => normalizeSizeKey(size.sizeKey || size.size_key || size.name);

export const isPizzaProduct = (product, categories = []) => {
  const category = categories.find((item) => item.id === product.category);
  const source = `${product.category || ''} ${category?.name || ''}`.toLowerCase();
  return source.includes('pizza');
};

export const findProductSizeByKey = (product, sizeKey) => {
  const normalized = normalizeSizeKey(sizeKey);
  return (product?.sizes || []).find((size) => getSizeKey(size) === normalized && size.isAvailable !== false) || null;
};

export const getBorderPriceForSize = (borderOption, sizeKey) => {
  const normalized = normalizeSizeKey(sizeKey);
  return (borderOption?.prices || []).find((price) => normalizeSizeKey(price.sizeKey) === normalized && price.isAvailable !== false) || null;
};
