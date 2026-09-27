import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const Toast = () => {
  const { toast } = useRestaurant();

  if (!toast) return null;

  return (
    <div className="toast-banner">
      {toast.type === 'error' ? (
        <AlertCircle size={18} color="#EF4444" />
      ) : (
        <CheckCircle2 size={18} color="var(--accent-secondary)" />
      )}
      <span>{toast.message}</span>
    </div>
  );
};
