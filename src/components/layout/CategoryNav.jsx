import React, { useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';

export const CategoryNav = () => {
  const { restaurant, activeCategory, setActiveCategory } = useRestaurant();
  const scrollContainerRef = useRef(null);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(`cat-${categoryId}`);
    if (element) {
      const yOffset = -120;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav className="category-nav-wrapper" aria-label="Categorias do cardápio">
      <div className="category-scroll-container" ref={scrollContainerRef}>
        {restaurant.categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <span className="category-icon">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
