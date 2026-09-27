import React from 'react';
import { useRestaurant } from './context/RestaurantContext';
import { Header } from './components/layout/Header';
import { Hero } from './components/layout/Hero';
import { CategoryNav } from './components/layout/CategoryNav';
import { ProductCard } from './components/product/ProductCard';
import { ProductModal } from './components/product/ProductModal';
import { SearchOverlay } from './components/search/SearchOverlay';
import { RestaurantInfoModal } from './components/info/RestaurantInfoModal';
import { QRCodeModal } from './components/qrcode/QRCodeModal';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { FavoritesDrawer } from './components/favorites/FavoritesDrawer';
import { Toast } from './components/common/Toast';
import { AdminPage } from './components/admin/AdminPage';
import { CartDrawer } from './components/cart/CartDrawer';
import { ReviewInvitePage } from './components/reviews/ReviewInvitePage';
import { formatPrice } from './utils/formatters';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';

const MenuErrorPage = ({ message, onRetry, loading }) => (
  <div className="app-shell pizza-menu-shell menu-error-shell">
    <div className="tenant-bar"><div className="tenant-brand-pill">MenuFlow</div></div>
    <section className="menu-error-card">
      <div className="menu-error-icon"><AlertTriangle size={30} /></div>
      <span className="section-tag">Cardapio indisponivel</span>
      <h1>Nao foi possivel carregar este cardapio agora.</h1>
      <p>{message || 'Verifique a configuracao do Supabase e tente novamente.'}</p>
      <button type="button" className="whatsapp-cta-btn" onClick={onRetry} disabled={loading}>
        <RefreshCw size={18} /> {loading ? 'Tentando...' : 'Tentar novamente'}
      </button>
    </section>
    <Toast />
  </div>
);

function AppContent() {
  const {
    restaurant,
    isDemoMode,
    menuLoading,
    menuError,
    refreshPublicMenu,
    cartCount,
    cartTotal,
    setCartOpen,
  } = useRestaurant();

  if (menuError && !restaurant) {
    return <MenuErrorPage message={menuError} onRetry={refreshPublicMenu} loading={menuLoading} />;
  }

  if (menuLoading && !restaurant) {
    return (
      <div className="app-shell pizza-menu-shell menu-error-shell">
        <div className="tenant-bar"><div className="tenant-brand-pill">MenuFlow</div></div>
        <section className="menu-error-card"><span className="section-tag">Carregando</span><h1>Buscando cardapio...</h1></section>
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="app-shell pizza-menu-shell">
      <div className="tenant-bar">
        <div className="tenant-brand-pill">MenuFlow</div>
      </div>

      <Header />
      <Hero />
      {menuError && <div className="demo-notice">{menuError}</div>}
      <CategoryNav />

      <main className="section-container menu-main" id="cardapio-completo">
        <div className="menu-heading">
          <span className="section-tag">{isDemoMode || restaurant.isDemo ? 'Demonstracao' : 'Cardapio digital'}</span>
          <h2 className="section-title">{restaurant.name}</h2>
          <p className="section-subtitle">{restaurant.isDemo ? 'Dados ficticios para demonstracao comercial.' : (restaurant.tagline || 'Escolha seus itens e confirme o pedido pelo WhatsApp da pizzaria.')}</p>
        </div>

        {restaurant.categories.map((cat) => {
          const categoryProducts = restaurant.products.filter(
            (product) => product.category === cat.id && product.status !== 'paused'
          );
          if (categoryProducts.length === 0) return null;

          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="products-category-group">
              <div className="category-group-header">
                <span className="category-icon">{cat.icon}</span>
                <h3 className="category-group-title">{cat.name}</h3>
              </div>
              <div className="products-grid">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {cartCount > 0 && (
        <button type="button" className="cart-fab" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={18} />
          <span>{cartCount} item{cartCount > 1 ? 's' : ''}</span>
          <strong>{formatPrice(cartTotal)}</strong>
        </button>
      )}

      <ProductModal />
      <CartDrawer />
      <SearchOverlay />
      <RestaurantInfoModal />
      <QRCodeModal />
      <FavoritesDrawer />
      <BottomNavigation />
      <Toast />
    </div>
  );
}

export default function App() {
  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/admin') return <AdminPage />;
  if (normalizedPath.startsWith('/avaliar/')) {
    const token = decodeURIComponent(normalizedPath.replace('/avaliar/', ''));
    return <ReviewInvitePage token={token} />;
  }

  return <AppContent />;
}

