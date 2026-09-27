import React from 'react';
import { RatingStars } from '../common/RatingStars';
import { CheckCircle } from 'lucide-react';

export const ReviewCard = ({ review }) => {
  return (
    <div className="social-proof-card">
      <div className="social-proof-dish">
        <img
          src={review.dishImage}
          alt={review.dishName}
          className="social-proof-dish-img"
          loading="lazy"
        />
        <div>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Prato Avaliado
          </span>
          <h4 className="social-proof-dish-title">{review.dishName}</h4>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <RatingStars rating={review.rating} size={12} />
      </div>

      <p className="social-proof-comment">"{review.comment}"</p>

      <div className="social-proof-author-row">
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{review.author}</span>
        {review.verified && (
          <span className="verified-tag">
            <CheckCircle size={12} />
            Cliente verificado
          </span>
        )}
      </div>
    </div>
  );
};
