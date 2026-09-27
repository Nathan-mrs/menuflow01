import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  createReviewInvite,
  deleteBorderOption,
  loadAdminInvites,
  loadAdminReviews,
  loadOwnedRestaurant,
  replaceProductSizes,
  saveBorderOption,
  setReviewVisibility,
  toCategoryPayload,
  toProductPayload,
  toRestaurantUpdate,
  uploadMenuImage,
} from '../../services/menuRepository';
import { copyToClipboard, formatPrice, isValidPrice, parsePrice } from '../../utils/formatters';
import { Copy, LogOut, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';

const emptyRestaurantForm = {
  name: '', slug: 'bola-pizza', tagline: '', slogan: '', heroSubtitle: '', statusText: 'Aberto agora',
  openingHours: '', deliveryTime: '', phone: '', whatsapp: '', instagram: '', address: '', mapsUrl: '', publicMenuUrl: '', logo: '', coverImage: '',
};
const emptyCategoryForm = { id: '', name: '', icon: '', description: '', sortOrder: 0, isAvailable: true };
const emptySize = () => ({ id: '', name: '', sizeKey: '', price: '', sortOrder: 0, isAvailable: true });
const emptyProductForm = { id: '', name: '', categoryId: '', description: '', price: '', image: '', badge: '', ingredients: '', servings: '', prepTime: '', status: 'active', featured: false, sortOrder: 0, sizes: [] };
const emptyBorderForm = () => ({ id: '', name: '', sortOrder: 0, isAvailable: true, prices: ['P', 'M', 'G'].map((sizeKey) => ({ sizeKey, priceDelta: '', isAvailable: true })) });

const restaurantToForm = (r) => ({
  name: r?.name || '', slug: r?.slug || 'bola-pizza', tagline: r?.tagline || '', slogan: r?.slogan || '', heroSubtitle: r?.heroSubtitle || '', statusText: r?.statusText || 'Aberto agora',
  openingHours: r?.openingHours || '', deliveryTime: r?.deliveryTime || '', phone: r?.phone || '', whatsapp: r?.whatsapp || '', instagram: r?.instagram || '', address: r?.address || '', mapsUrl: r?.mapsUrl || '', publicMenuUrl: r?.publicMenuUrl || '', logo: r?.logo || '', coverImage: r?.coverImage || '',
});
const categoryToForm = (c) => ({ id: c.id, name: c.name || '', icon: c.icon || '', description: c.description || '', sortOrder: c.sortOrder || 0, isAvailable: c.isAvailable !== false });
const productToForm = (p) => ({
  id: p.id, name: p.name || '', categoryId: p.category || '', description: p.description || '', price: String(p.price || ''), image: p.image || '', badge: p.badge || '', ingredients: (p.ingredients || []).join(', '), servings: p.servings || '', prepTime: p.prepTime || '', status: p.status || 'active', featured: Boolean(p.featured), sortOrder: p.sortOrder || 0,
  sizes: (p.sizes || []).map((size) => ({ id: size.id, name: size.name, sizeKey: size.sizeKey || '', price: String(size.price || ''), sortOrder: size.sortOrder || 0, isAvailable: size.isAvailable !== false })),
});
const borderToForm = (option) => ({
  id: option.id, name: option.name || '', sortOrder: option.sortOrder || 0, isAvailable: option.isAvailable !== false,
  prices: ['P', 'M', 'G'].map((sizeKey) => {
    const found = (option.prices || []).find((price) => price.sizeKey === sizeKey);
    return { sizeKey, priceDelta: found ? String(found.priceDelta ?? '') : '', isAvailable: found?.isAvailable !== false };
  }),
});
const usableSizes = (sizes) => sizes
  .map((size, index) => ({ ...size, name: size.name.trim(), sizeKey: String(size.sizeKey || size.name).trim().toUpperCase(), sortOrder: Number(size.sortOrder || index), price: parsePrice(size.price) }))
  .filter((size) => size.name && size.sizeKey && isValidPrice(size.price));

export const AdminPage = () => {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [invites, setInvites] = useState([]);
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurantForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [borderForm, setBorderForm] = useState(emptyBorderForm);
  const [inviteForm, setInviteForm] = useState({ productId: '', orderReference: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const categoryById = useMemo(() => Object.fromEntries((restaurant?.categories || []).map((c) => [c.id, c])), [restaurant]);
  const productById = useMemo(() => Object.fromEntries((restaurant?.products || []).map((p) => [p.id, p])), [restaurant]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const checkAdmin = async () => {
    if (!session) { setIsAdmin(false); return false; }
    const { data, error } = await supabase.rpc('is_menuflow_admin');
    if (error) { setMessage('Permissao administrativa nao configurada no banco. Rode as migracoes incrementais.'); setIsAdmin(false); return false; }
    setIsAdmin(Boolean(data));
    return Boolean(data);
  };

  const loadAdminData = async () => {
    if (!session) return;
    setLoading(true); setMessage('');
    try {
      const allowed = await checkAdmin();
      if (!allowed) return;
      const loaded = await loadOwnedRestaurant();
      setRestaurant(loaded);
      setRestaurantForm(loaded ? restaurantToForm(loaded) : emptyRestaurantForm);
      setCategoryForm(emptyCategoryForm); setProductForm(emptyProductForm); setBorderForm(emptyBorderForm());
      if (loaded?.id) {
        const [loadedReviews, loadedInvites] = await Promise.all([loadAdminReviews(loaded.id), loadAdminInvites(loaded.id)]);
        setReviews(loadedReviews); setInvites(loadedInvites);
      }
    } catch (error) { setMessage(error.message || 'Nao foi possivel carregar o painel.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAdminData(); }, [session]);

  const handleLogin = async (event) => { event.preventDefault(); setLoading(true); setMessage(''); const { error } = await supabase.auth.signInWithPassword(loginForm); if (error) setMessage(error.message); setLoading(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); setRestaurant(null); setIsAdmin(false); };

  const saveRestaurant = async (event) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      const payload = toRestaurantUpdate(restaurantForm);
      if (restaurant?.id) {
        const { error } = await supabase.from('restaurants').update(payload).eq('id', restaurant.id);
        if (error) throw error;
      } else {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const { error } = await supabase.from('restaurants').insert({ ...payload, owner_id: userData.user.id });
        if (error) throw error;
      }
      setMessage('Dados da pizzaria salvos.'); await loadAdminData();
    } catch (error) { setMessage(error.message || 'Erro ao salvar pizzaria.'); }
    finally { setLoading(false); }
  };

  const saveCategory = async (event) => {
    event.preventDefault(); if (!restaurant?.id) return;
    setLoading(true); setMessage('');
    try {
      const payload = toCategoryPayload(categoryForm, restaurant.id);
      const { error } = categoryForm.id ? await supabase.from('categories').update(payload).eq('id', categoryForm.id) : await supabase.from('categories').insert(payload);
      if (error) throw error;
      setMessage('Categoria salva.'); await loadAdminData();
    } catch (error) { setMessage(error.message || 'Erro ao salvar categoria.'); }
    finally { setLoading(false); }
  };

  const saveProductSizes = async (productId, sizes) => {
    const rows = usableSizes(sizes).map((size) => ({ name: size.name, sizeKey: size.sizeKey, price: size.price, sortOrder: size.sortOrder, isAvailable: Boolean(size.isAvailable) }));
    await replaceProductSizes(productId, rows);
  };

  const saveProduct = async (event) => {
    event.preventDefault(); if (!restaurant?.id) return;
    setLoading(true); setMessage('');
    try {
      const sizes = usableSizes(productForm.sizes);
      const effectivePrice = sizes.length ? Math.min(...sizes.map((size) => size.price)) : parsePrice(productForm.price);
      if (!isValidPrice(effectivePrice)) throw new Error('Informe um preco valido maior que zero para o produto ou seus tamanhos.');
      const payload = toProductPayload({ ...productForm, price: effectivePrice }, restaurant.id);
      let productId = productForm.id;
      if (productId) {
        const { error } = await supabase.from('products').update(payload).eq('id', productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
      }
      await saveProductSizes(productId, productForm.sizes);
      setMessage('Produto salvo. Os tamanhos foram substituidos em uma RPC transacional; se algum tamanho falhar, os anteriores permanecem.'); await loadAdminData();
    } catch (error) { setMessage(error.message || 'Erro ao salvar produto.'); }
    finally { setLoading(false); }
  };

  const saveBorder = async (event) => {
    event.preventDefault(); if (!restaurant?.id) return;
    setLoading(true); setMessage('');
    try {
      await saveBorderOption({ restaurantId: restaurant.id, optionId: borderForm.id, name: borderForm.name.trim(), sortOrder: borderForm.sortOrder, isAvailable: borderForm.isAvailable, prices: borderForm.prices });
      setBorderForm(emptyBorderForm()); setMessage('Borda salva.'); await loadAdminData();
    } catch (error) { setMessage(error.message || 'Erro ao salvar borda.'); }
    finally { setLoading(false); }
  };

  const deleteCategory = async (categoryId) => { if (!confirm('Excluir esta categoria?')) return; const { error } = await supabase.from('categories').delete().eq('id', categoryId); setMessage(error ? error.message : 'Categoria excluida.'); await loadAdminData(); };
  const deleteProduct = async (productId) => { if (!confirm('Excluir este produto?')) return; const { error } = await supabase.from('products').delete().eq('id', productId); setMessage(error ? error.message : 'Produto excluido.'); await loadAdminData(); };
  const removeBorder = async (optionId) => { if (!confirm('Excluir esta borda?')) return; try { await deleteBorderOption(optionId); setMessage('Borda excluida.'); await loadAdminData(); } catch (error) { setMessage(error.message || 'Erro ao excluir borda.'); } };

  const uploadImage = async (file, target) => {
    if (!restaurant?.id || !file) return;
    setLoading(true); setMessage('');
    try {
      const publicUrl = await uploadMenuImage(restaurant.id, file);
      if (target === 'cover') setRestaurantForm((prev) => ({ ...prev, coverImage: publicUrl }));
      else setProductForm((prev) => ({ ...prev, image: publicUrl }));
      setMessage('Imagem enviada. Salve o formulario para aplicar.');
    } catch (error) { setMessage(error.message || 'Erro ao enviar imagem.'); }
    finally { setLoading(false); }
  };

  const generateInvite = async (event) => {
    event.preventDefault(); if (!restaurant?.id || !inviteForm.productId) return;
    setLoading(true); setMessage('');
    try {
      const invite = await createReviewInvite({ restaurantId: restaurant.id, productId: inviteForm.productId, orderReference: inviteForm.orderReference });
      await copyToClipboard(`${window.location.origin}/avaliar/${invite.token}`);
      setMessage('Convite gerado e link copiado. Envie manualmente ao cliente apos pedido confirmado.');
      setInviteForm({ productId: '', orderReference: '' }); await loadAdminData();
    } catch (error) { setMessage(error.message || 'Erro ao gerar convite.'); }
    finally { setLoading(false); }
  };
  const copyInvite = async (token) => { await copyToClipboard(`${window.location.origin}/avaliar/${token}`); setMessage('Link copiado.'); };
  const toggleReview = async (review) => { try { await setReviewVisibility(review.id, !review.is_public); setMessage(!review.is_public ? 'Avaliacao publicada.' : 'Avaliacao ocultada para conferencia.'); await loadAdminData(); } catch (error) { setMessage(error.message || 'Erro ao atualizar avaliacao.'); } };

  const updateSize = (index, field, value) => setProductForm((current) => ({ ...current, sizes: current.sizes.map((size, sizeIndex) => sizeIndex === index ? { ...size, [field]: value } : size) }));
  const removeSize = (index) => setProductForm((current) => ({ ...current, sizes: current.sizes.filter((_, sizeIndex) => sizeIndex !== index) }));
  const updateBorderPrice = (sizeKey, field, value) => setBorderForm((current) => ({ ...current, prices: current.prices.map((price) => price.sizeKey === sizeKey ? { ...price, [field]: value } : price) }));

  if (!isSupabaseConfigured) return <div className="admin-fullscreen admin-auth-screen"><div className="admin-auth-card"><h1>Supabase nao configurado</h1><p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p></div></div>;
  if (authLoading) return <div className="admin-fullscreen admin-auth-screen">Carregando...</div>;
  if (!session) return <div className="admin-fullscreen admin-auth-screen"><form className="admin-auth-card" onSubmit={handleLogin}><span className="admin-auth-kicker">MenuFlow</span><h1>Entrar no painel</h1><p>Acesso privado do desenvolvedor para atualizar o cardapio desta pizzaria.</p><label className="form-label">E-mail</label><input className="form-input" type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required /><label className="form-label">Senha</label><input className="form-input" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />{message && <div className="admin-message">{message}</div>}<button className="btn-primary-action admin-auth-submit" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button></form></div>;
  if (!isAdmin) return <div className="admin-fullscreen admin-auth-screen"><div className="admin-auth-card"><span className="admin-auth-kicker">MenuFlow</span><h1>Acesso administrativo negado</h1><p>Seu usuario Supabase esta autenticado, mas nao esta na allowlist public.admin_users.</p>{message && <div className="admin-message">{message}</div>}<button type="button" className="btn-secondary-action" onClick={handleLogout}>Sair</button></div></div>;

  return <div className="admin-fullscreen"><header className="admin-header-bar"><div className="admin-brand"><span style={{ fontSize: '1.4rem' }}>{restaurant?.logo || 'BP'}</span><div><h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>{restaurant?.name || 'Pizzaria'}</h1><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cardapio personalizado - acesso privado do desenvolvedor</span></div></div><div className="admin-actions-row"><button type="button" className="admin-close-action-btn" onClick={loadAdminData} disabled={loading}><RefreshCw size={14} /> Atualizar</button><button type="button" className="admin-close-action-btn" onClick={handleLogout}><LogOut size={14} /> Sair</button></div></header><main className="admin-body-container"><section className="admin-welcome-card"><div><h2 className="admin-welcome-title">Atualizar cardapio da pizzaria</h2><p className="admin-welcome-sub">Produtos, tamanhos, bordas, fotos, convites e avaliacoes.</p></div>{message && <div className="admin-message">{message}</div>}</section><nav className="admin-tabs-nav" aria-label="Secoes do painel">{[['products','Produtos'],['borders','Bordas'],['categories','Categorias'],['reviews','Convites e avaliacoes'],['settings','Pizzaria']].map(([id,label]) => <button key={id} type="button" className={`admin-tab-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>

  {activeTab === 'settings' && <section className="admin-card-surface admin-editor-card"><div className="admin-table-header-bar"><div><h3>Dados da pizzaria</h3><span>Nome, WhatsApp, rota, URL publica e textos exibidos no cardapio.</span></div></div><form className="admin-form-grid" onSubmit={saveRestaurant}><input className="form-input" placeholder="Nome" value={restaurantForm.name} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} required /><input className="form-input" placeholder="Slug publico" value={restaurantForm.slug} onChange={(e) => setRestaurantForm({ ...restaurantForm, slug: e.target.value })} required /><input className="form-input" placeholder="Logo ou texto curto" value={restaurantForm.logo} onChange={(e) => setRestaurantForm({ ...restaurantForm, logo: e.target.value })} /><input className="form-input" placeholder="Status" value={restaurantForm.statusText} onChange={(e) => setRestaurantForm({ ...restaurantForm, statusText: e.target.value })} /><input className="form-input" placeholder="Subtitulo" value={restaurantForm.tagline} onChange={(e) => setRestaurantForm({ ...restaurantForm, tagline: e.target.value })} /><input className="form-input" placeholder="Chamada do topo" value={restaurantForm.heroSubtitle} onChange={(e) => setRestaurantForm({ ...restaurantForm, heroSubtitle: e.target.value })} /><textarea className="notes-input-area admin-span-2" placeholder="Frase principal" value={restaurantForm.slogan} onChange={(e) => setRestaurantForm({ ...restaurantForm, slogan: e.target.value })} /><input className="form-input" placeholder="WhatsApp com DDI" value={restaurantForm.whatsapp} onChange={(e) => setRestaurantForm({ ...restaurantForm, whatsapp: e.target.value })} /><input className="form-input" placeholder="Tempo de entrega" value={restaurantForm.deliveryTime} onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryTime: e.target.value })} /><input className="form-input admin-span-2" placeholder="Endereco" value={restaurantForm.address} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} /><input className="form-input admin-span-2" placeholder="URL do Google Maps" value={restaurantForm.mapsUrl} onChange={(e) => setRestaurantForm({ ...restaurantForm, mapsUrl: e.target.value })} /><input className="form-input admin-span-2" placeholder="URL publica do cardapio para QR Code" value={restaurantForm.publicMenuUrl} onChange={(e) => setRestaurantForm({ ...restaurantForm, publicMenuUrl: e.target.value })} /><input className="form-input admin-span-2" placeholder="URL da imagem de capa" value={restaurantForm.coverImage} onChange={(e) => setRestaurantForm({ ...restaurantForm, coverImage: e.target.value })} /><label className="admin-upload-btn admin-span-2"><Upload size={15} /> Enviar capa<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'cover')} /></label><button className="btn-primary-action admin-span-2" type="submit" disabled={loading}><Save size={16} /> Salvar pizzaria</button></form></section>}

  {activeTab === 'products' && <section className="admin-two-column admin-products-layout"><form className="admin-card-surface admin-editor-card" onSubmit={saveProduct}><h3>{productForm.id ? 'Editar produto' : 'Novo produto'}</h3><input className="form-input" placeholder="Nome" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required /><select className="form-input" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}><option value="">Sem categoria</option>{(restaurant?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input className="form-input" placeholder="Preco unico ou minimo" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /><select className="form-input" value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}><option value="active">Disponivel</option><option value="paused">Indisponivel</option></select><textarea className="notes-input-area" placeholder="Descricao curta" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /><input className="form-input" placeholder="URL da foto" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} /><label className="admin-upload-btn"><Upload size={15} /> Enviar foto<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'product')} /></label><input className="form-input" placeholder="Badge discreta" value={productForm.badge} onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })} /><input className="form-input" placeholder="Ingredientes separados por virgula" value={productForm.ingredients} onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })} /><input className="form-input" placeholder="Serve" value={productForm.servings} onChange={(e) => setProductForm({ ...productForm, servings: e.target.value })} /><input className="form-input" type="number" placeholder="Ordem" value={productForm.sortOrder} onChange={(e) => setProductForm({ ...productForm, sortOrder: e.target.value })} /><label className="admin-checkbox-row"><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} /> Destaque</label><div className="admin-sizes-editor"><div className="admin-sizes-header"><h4>Tamanhos e precos</h4><button type="button" className="btn-secondary-action" onClick={() => setProductForm((current) => ({ ...current, sizes: [...current.sizes, emptySize()] }))}><Plus size={14} /> Adicionar tamanho</button></div>{productForm.sizes.length === 0 && <p className="admin-help-text">Sem tamanhos: o produto usa o preco unico acima.</p>}{productForm.sizes.map((size, index) => <div className="admin-size-row" key={index}><input className="form-input" placeholder="Nome: P - 4 fatias" value={size.name} onChange={(e) => updateSize(index, 'name', e.target.value)} /><input className="form-input" placeholder="Chave: P" value={size.sizeKey} onChange={(e) => updateSize(index, 'sizeKey', e.target.value.toUpperCase())} /><input className="form-input" placeholder="Preco" value={size.price} onChange={(e) => updateSize(index, 'price', e.target.value)} /><input className="form-input" type="number" placeholder="Ordem" value={size.sortOrder} onChange={(e) => updateSize(index, 'sortOrder', e.target.value)} /><label className="admin-checkbox-row"><input type="checkbox" checked={size.isAvailable} onChange={(e) => updateSize(index, 'isAvailable', e.target.checked)} /> Ativo</label><button type="button" className="btn-danger-action" onClick={() => removeSize(index)}><Trash2 size={14} /></button></div>)}</div><button className="btn-primary-action" type="submit" disabled={loading || !restaurant}><Save size={16} /> Salvar produto</button>{productForm.id && <button className="btn-secondary-action" type="button" onClick={() => setProductForm(emptyProductForm)}><Plus size={16} /> Novo produto</button>}</form><div className="admin-card-surface admin-list-card">{(restaurant?.products || []).map((product) => <div className="admin-list-row" key={product.id}><div className="admin-product-line">{product.image && <img src={product.image} alt="" />}<div><strong>{product.name}</strong><span>{categoryById[product.category]?.name || 'Sem categoria'} - {product.sizes?.length ? `${product.sizes.length} tamanhos` : formatPrice(product.price)} - {product.status === 'active' ? 'Disponivel' : 'Indisponivel'}</span></div></div><div className="admin-row-actions"><button className="btn-secondary-action" onClick={() => setProductForm(productToForm(product))}>Editar</button><button className="btn-danger-action" onClick={() => deleteProduct(product.id)}><Trash2 size={14} /></button></div></div>)}</div></section>}

  {activeTab === 'borders' && <section className="admin-two-column"><form className="admin-card-surface admin-editor-card" onSubmit={saveBorder}><h3>{borderForm.id ? 'Editar borda' : 'Nova borda'}</h3><input className="form-input" placeholder="Nome da borda" value={borderForm.name} onChange={(e) => setBorderForm({ ...borderForm, name: e.target.value })} required /><input className="form-input" type="number" placeholder="Ordem" value={borderForm.sortOrder} onChange={(e) => setBorderForm({ ...borderForm, sortOrder: e.target.value })} /><label className="admin-checkbox-row"><input type="checkbox" checked={borderForm.isAvailable} onChange={(e) => setBorderForm({ ...borderForm, isAvailable: e.target.checked })} /> Disponivel</label><div className="admin-sizes-editor"><div className="admin-sizes-header"><h4>Acrescimos por tamanho</h4></div>{borderForm.prices.map((price) => <div className="admin-size-row" key={price.sizeKey}><strong>{price.sizeKey}</strong><input className="form-input" placeholder="Acrescimo" value={price.priceDelta} onChange={(e) => updateBorderPrice(price.sizeKey, 'priceDelta', e.target.value)} /><label className="admin-checkbox-row"><input type="checkbox" checked={price.isAvailable} onChange={(e) => updateBorderPrice(price.sizeKey, 'isAvailable', e.target.checked)} /> Ativo</label></div>)}</div><button className="btn-primary-action" type="submit" disabled={loading || !restaurant}><Save size={16} /> Salvar borda</button>{borderForm.id && <button className="btn-secondary-action" type="button" onClick={() => setBorderForm(emptyBorderForm())}>Nova borda</button>}</form><div className="admin-card-surface admin-list-card">{(restaurant?.borderOptions || []).map((option) => <div className="admin-list-row" key={option.id}><div><strong>{option.name}</strong><span>{option.prices.map((price) => `${price.sizeKey}: +${formatPrice(price.priceDelta)}`).join(' | ')}</span></div><div className="admin-row-actions"><button className="btn-secondary-action" onClick={() => setBorderForm(borderToForm(option))}>Editar</button><button className="btn-danger-action" onClick={() => removeBorder(option.id)}><Trash2 size={14} /></button></div></div>)}</div></section>}

  {activeTab === 'categories' && <section className="admin-two-column"><form className="admin-card-surface admin-editor-card" onSubmit={saveCategory}><h3>{categoryForm.id ? 'Editar categoria' : 'Nova categoria'}</h3><input className="form-input" placeholder="Nome" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required /><input className="form-input" placeholder="Icone" value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} /><input className="form-input" type="number" placeholder="Ordem" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })} /><textarea className="notes-input-area" placeholder="Descricao" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /><label className="admin-checkbox-row"><input type="checkbox" checked={categoryForm.isAvailable} onChange={(e) => setCategoryForm({ ...categoryForm, isAvailable: e.target.checked })} /> Disponivel no cardapio</label><button className="btn-primary-action" type="submit" disabled={loading || !restaurant}><Save size={16} /> Salvar categoria</button>{categoryForm.id && <button className="btn-secondary-action" type="button" onClick={() => setCategoryForm(emptyCategoryForm)}>Limpar edicao</button>}</form><div className="admin-card-surface admin-list-card">{(restaurant?.categories || []).map((category) => <div className="admin-list-row" key={category.id}><div><strong>{category.icon} {category.name}</strong><span>{category.description}</span></div><div className="admin-row-actions"><button className="btn-secondary-action" onClick={() => setCategoryForm(categoryToForm(category))}>Editar</button><button className="btn-danger-action" onClick={() => deleteCategory(category.id)}><Trash2 size={14} /></button></div></div>)}</div></section>}

  {activeTab === 'reviews' && <section className="admin-two-column"><form className="admin-card-surface admin-editor-card" onSubmit={generateInvite}><h3>Gerar convite de avaliacao</h3><p className="admin-help-text">Gere apenas apos confirmar manualmente que o cliente recebeu o pedido.</p><select className="form-input" value={inviteForm.productId} onChange={(e) => setInviteForm({ ...inviteForm, productId: e.target.value })} required><option value="">Escolha o produto</option>{(restaurant?.products || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input className="form-input" placeholder="Referencia opcional do pedido" value={inviteForm.orderReference} onChange={(e) => setInviteForm({ ...inviteForm, orderReference: e.target.value })} /><button className="btn-primary-action" type="submit" disabled={loading || !restaurant}><Plus size={16} /> Gerar e copiar link</button><h3 style={{ marginTop: 18 }}>Convites recentes</h3>{invites.slice(0, 8).map((invite) => <div className="admin-mini-row" key={invite.id}><span>{productById[invite.product_id]?.name || 'Produto'} - {invite.used_at ? 'usado' : 'aberto'}</span><button type="button" className="btn-secondary-action" onClick={() => copyInvite(invite.token)}><Copy size={13} /></button></div>)}</form><div className="admin-card-surface admin-list-card"><h3>Avaliacoes</h3>{reviews.length === 0 && <div className="empty-reviews-card"><strong>Nenhuma avaliacao recebida ainda.</strong><span>Quando um convite valido for usado, a avaliacao aparece aqui.</span></div>}{reviews.map((review) => <div className="admin-list-row" key={review.id}><div><strong>{productById[review.product_id]?.name || 'Produto'} - {review.rating}/5</strong><span>{review.display_name || 'Cliente'}: {review.comment || 'Sem comentario'} {review.verified_purchase ? '- compra verificada' : ''}</span></div><button type="button" className="btn-secondary-action" onClick={() => toggleReview(review)}>{review.is_public ? 'Ocultar' : 'Publicar'}</button></div>)}</div></section>}
  </main></div>;
};
