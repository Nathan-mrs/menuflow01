import React from 'react';
import { Star } from 'lucide-react';

export const RatingStars = ({
  rating = 5,
  size = 14,
  interactive = false,
  onRate,
  showScore = false,
  reviewsCount = null,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {stars.map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onRate && onRate(star)}
              style={{
                cursor: interactive ? 'pointer' : 'default',
                padding: interactive ? '2px' : 0,
                display: 'inline-flex',
                alignItems: 'center',
                color: filled ? 'var(--star-gold, #FFB800)' : 'rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (interactive) e.currentTarget.style.transform = 'scale(1.25)';
              }}
              onMouseLeave={(e) => {
                if (interactive) e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label={`${star} estrelas`}
            >
              <Star
                size={size}
                fill={filled ? 'currentColor' : 'transparent'}
                strokeWidth={filled ? 0 : 2}
              />
            </button>
          );
        })}
      </div>

      {showScore && (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '2px' }}>
          {Number(rating).toFixed(1)}
        </span>
      )}

      {reviewsCount !== null && (
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '2px' }}>
          ({reviewsCount})
        </span>
      )}
    </div>
  );
};
