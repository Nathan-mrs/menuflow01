import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RestaurantProvider } from './context/RestaurantContext';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/admin.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RestaurantProvider>
      <App />
    </RestaurantProvider>
  </StrictMode>
);
