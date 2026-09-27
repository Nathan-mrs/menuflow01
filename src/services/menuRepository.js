import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { parsePrice } from '../utils/formatters';
import { normalizeSizeKey } from '../utils/pizzaOptions';

const PUBLIC_SLUG = import.meta.env.VITE_PUBLIC_RESTAURANT_SLUG || 'bola-pizza';

const mapReview = (row) => ({
  id: row.id,
  productId: row.product_id,
  author: row.display_name || 'Cliente',
  rating: Number(row.rating || 0),
  comment: row.comment || '',
  date: row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
  verified: Boolean(row.verified_purchase),
});

const mapBorderOptions = (options = [], prices = []) => {
  const pricesByOption = prices.reduce((acc, row) => {
    if (!acc[row.border_option_id]) acc[row.border_option_id] = [];
    acc[row.border_option_id].push({
      id: row.id,
      sizeKey: normalizeSizeKey(row.size_key),
      priceDelta: parsePrice(row.price_delta),
      isAvailable: row.is_available !== false,
    });
    return acc;
  }, {});

  return (options || []).map((option) => ({
    id: option.id,
    restaurantId: option.restaurant_id,
    name: option.name,
    sortOrder: option.sort_order || 0,
    isAvailable: option.is_available !== false,
    prices: (pricesByOption[option.id] || []).sort((a, b) => a.sizeKey.localeCompare(b.sizeKey)),
  })).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
};

const attachSizes = (products, sizes = []) => {
  const sizesByProduct = sizes.reduce((acc, size) => {
    if (!acc[size.product_id]) acc[size.product_id] = [];
    acc[size.product_id].push({
      id: size.id,
      name: size.name,
      sizeKey: normalizeSizeKey(size.size_key || size.name),
      price: parsePrice(size.price),
      sortOrder: size.sort_order || 0,
      isAvailable: size.is_available !== false,
    });
    return acc;
  }, {});

  return products.map((product) => ({
    ...product,
    sizes: (sizesByProduct[product.id] || []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
};

const attachReviews = (products, reviews = []) => {
  const reviewsByProduct = reviews.reduce((acc, review) => {
    if (!acc[review.product_id]) acc[review.product_id] = [];
    acc[review.product_id].push(mapReview(review));
    return acc;
  }, {});

  return products.map((product) => {
    const productReviews = reviewsByProduct[product.id] || [];
    const reviewsCount = productReviews.length;
    const rating = reviewsCount
      ? Number((productReviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount).toFixed(1))
      : null;

    return {
      ...mapProduct(product),
      rating,
      reviewsCount,
      reviews: productReviews,
      ratingsDistribution: productReviews.reduce((acc, review) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      }, {}),
    };
  });
};

const mapRestaurant = (row, categories = [], products = [], borderOptions = []) => ({
  id: row.id,
  slug: row.slug,
  ownerId: row.owner_id,
  name: row.name,
  tagline: row.tagline || '',
  slogan: row.slogan || '',
  heroSubtitle: row.hero_subtitle || '',
  status: row.status || 'open',
  statusText: row.status_text || 'Aberto agora',
  openingHours: row.opening_hours || '',
  deliveryTime: row.delivery_time || '',
  phone: row.phone || '',
  whatsapp: row.whatsapp || '',
  instagram: row.instagram || '',
  address: row.address || '',
  mapsUrl: row.maps_url || '',
  publicMenuUrl: row.public_menu_url || '',
  logo: row.logo || '',
  coverImage: row.cover_image || '',
  rating: Number(row.rating || 0),
  reviewsCount: Number(row.reviews_count || 0),
  isDemo: false,
  accentColor: '#FF8A1F',
  accentGradient: 'linear-gradient(135deg, #FF8A1F 0%, #FFB347 100%)',
  categories: categories.map(mapCategory),
  products,
  borderOptions,
  socialProof: [],
});

export const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
  icon: row.icon || '',
  description: row.description || '',
  sortOrder: row.sort_order || 0,
  isAvailable: row.is_available !== false,
});

export const mapProduct = (row) => ({
  id: row.id,
  category: row.category_id,
  name: row.name,
  description: row.description || '',
  price: parsePrice(row.price),
  image: row.image || '',
  badge: row.badge || '',
  ingredients: row.ingredients || [],
  servings: row.servings || '',
  prepTime: row.prep_time || '',
  status: row.status || 'active',
  featured: Boolean(row.featured),
  rating: null,
  reviewsCount: 0,
  sortOrder: row.sort_order || 0,
  sizes: row.sizes || [],
  addons: [],
  reviews: [],
  ratingsDistribution: {},
});

export const toRestaurantUpdate = (form) => ({
  name: form.name,
  slug: form.slug,
  tagline: form.tagline || null,
  slogan: form.slogan || null,
  hero_subtitle: form.heroSubtitle || null,
  status_text: form.statusText || null,
  opening_hours: form.openingHours || null,
  delivery_time: form.deliveryTime || null,
  phone: form.phone || null,
  whatsapp: form.whatsapp || null,
  instagram: form.instagram || null,
  address: form.address || null,
  maps_url: form.mapsUrl || null,
  public_menu_url: form.publicMenuUrl || null,
  logo: form.logo || null,
  cover_image: form.coverImage || null,
  updated_at: new Date().toISOString(),
});

export const toCategoryPayload = (form, restaurantId) => ({
  restaurant_id: restaurantId,
  name: form.name,
  icon: form.icon || null,
  description: form.description || null,
  sort_order: Number(form.sortOrder || 0),
  is_available: Boolean(form.isAvailable),
});

export const toProductPayload = (form, restaurantId) => ({
  restaurant_id: restaurantId,
  category_id: form.categoryId || null,
  name: form.name,
  description: form.description || null,
  price: parsePrice(form.price),
  image: form.image || null,
  badge: form.badge || null,
  ingredients: form.ingredients
    ? form.ingredients.split(',').map((item) => item.trim()).filter(Boolean)
    : [],
  servings: form.servings || null,
  prep_time: form.prepTime || null,
  status: form.status || 'active',
  featured: Boolean(form.featured),
  sort_order: Number(form.sortOrder || 0),
  updated_at: new Date().toISOString(),
});

const loadRestaurantBundle = async (restaurant, publicOnly) => {
  const [categoriesResult, productsResult, sizesResult, reviewsResult, bordersResult, borderPricesResult] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('products').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('product_sizes').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('product_reviews').select('*').eq('restaurant_id', restaurant.id).eq('is_public', true).order('created_at', { ascending: false }),
    supabase.from('pizza_border_options').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('pizza_border_prices').select('*').eq('restaurant_id', restaurant.id),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  if (sizesResult.error) throw sizesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (bordersResult.error) throw bordersResult.error;
  if (borderPricesResult.error) throw borderPricesResult.error;

  const categories = publicOnly ? (categoriesResult.data || []).filter((category) => category.is_available !== false) : categoriesResult.data || [];
  const productsRaw = publicOnly ? (productsResult.data || []).filter((product) => product.status === 'active') : productsResult.data || [];
  const availableSizes = publicOnly ? (sizesResult.data || []).filter((size) => size.is_available !== false) : sizesResult.data || [];
  const borderOptionsRaw = publicOnly ? (bordersResult.data || []).filter((option) => option.is_available !== false) : bordersResult.data || [];
  const borderPricesRaw = publicOnly ? (borderPricesResult.data || []).filter((price) => price.is_available !== false) : borderPricesResult.data || [];
  const products = attachReviews(attachSizes(productsRaw, availableSizes), reviewsResult.data || []);
  const borderOptions = mapBorderOptions(borderOptionsRaw, borderPricesRaw);

  return mapRestaurant(restaurant, categories, products, borderOptions);
};

export const loadPublicRestaurant = async (slug = PUBLIC_SLUG) => {
  if (!isSupabaseConfigured) return null;
  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) return null;
  return loadRestaurantBundle(restaurant, true);
};

export const loadOwnedRestaurant = async () => {
  if (!isSupabaseConfigured) throw new Error('Supabase nao configurado.');
  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) return null;
  return loadRestaurantBundle(restaurant, false);
};

export const replaceProductSizes = async (productId, sizes) => {
  const { error } = await supabase.rpc('replace_product_sizes', { target_product_id: productId, new_sizes: sizes });
  if (error) throw error;
};

export const saveBorderOption = async ({ restaurantId, optionId, name, sortOrder, isAvailable, prices }) => {
  const payload = { restaurant_id: restaurantId, name, sort_order: Number(sortOrder || 0), is_available: Boolean(isAvailable) };
  let savedId = optionId;
  if (savedId) {
    const { error } = await supabase.from('pizza_border_options').update(payload).eq('id', savedId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('pizza_border_options').insert(payload).select('id').single();
    if (error) throw error;
    savedId = data.id;
  }

  const rows = (prices || []).map((price) => ({
    restaurant_id: restaurantId,
    border_option_id: savedId,
    size_key: normalizeSizeKey(price.sizeKey),
    price_delta: parsePrice(price.priceDelta) || 0,
    is_available: Boolean(price.isAvailable),
  })).filter((price) => price.size_key && price.price_delta >= 0);

  const { error: deleteError } = await supabase.from('pizza_border_prices').delete().eq('border_option_id', savedId);
  if (deleteError) throw deleteError;
  if (rows.length) {
    const { error } = await supabase.from('pizza_border_prices').insert(rows);
    if (error) throw error;
  }
};

export const deleteBorderOption = async (optionId) => {
  const { error } = await supabase.from('pizza_border_options').delete().eq('id', optionId);
  if (error) throw error;
};

export const loadAdminReviews = async (restaurantId) => {
  const { data, error } = await supabase.from('product_reviews').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const loadAdminInvites = async (restaurantId) => {
  const { data, error } = await supabase.from('review_invites').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createReviewInvite = async ({ restaurantId, productId, orderReference }) => {
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  const { data, error } = await supabase.from('review_invites').insert({ restaurant_id: restaurantId, product_id: productId, token, order_reference: orderReference || null, expires_at: expiresAt }).select('*').single();
  if (error) throw error;
  return data;
};

export const validateReviewInvite = async (token) => {
  const { data, error } = await supabase.rpc('get_review_invite_status', { invite_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
};

export const submitReviewInvite = async ({ token, rating, comment, displayName }) => {
  const { data, error } = await supabase.rpc('submit_invited_review', { invite_token: token, review_rating: rating, review_comment: comment || null, review_display_name: displayName || null });
  if (error) throw error;
  return data;
};

export const setReviewVisibility = async (reviewId, isPublic) => {
  const { error } = await supabase.from('product_reviews').update({ is_public: isPublic, updated_at: new Date().toISOString() }).eq('id', reviewId);
  if (error) throw error;
};

export const uploadMenuImage = async (restaurantId, file) => {
  if (!file) return '';
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${restaurantId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('menu-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
};
