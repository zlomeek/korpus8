"use client";

import React, { useState } from 'react';
import { decors, Decor } from '@/data/decors';
import styles from './DecorSelector.module.css';

interface DecorSelectorProps {
  onSelect: (decor: Decor) => void;
  onClose: () => void;
  title: string;
}

export default function DecorSelector({ onSelect, onClose, title }: DecorSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredDecors = decors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Szukaj dekoru (np. dąb, biały...)" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.grid}>
          {filteredDecors.length > 0 ? (
            <>
              {/* Grupowanie po kategoriach */}
              {['laminowana', 'lakierowana'].map(cat => {
                const decorsInCategory = filteredDecors.filter(d => d.category === cat);
                if (decorsInCategory.length === 0) return null;
                
                return (
                  <div key={cat} className={styles.categorySection}>
                    <h4 className={styles.categoryTitle}>
                      {cat === 'laminowana' ? 'Płyty Laminowane' : 'Płyty Lakierowane'}
                    </h4>
                    <div className={styles.categoryGrid}>
                      {decorsInCategory.map(decor => (
                        <div 
                          key={decor.id} 
                          className={styles.decorCard}
                          onClick={() => onSelect(decor)}
                        >
                          <div className={styles.previewContainer}>
                            {decor.imageUrl ? (
                              <img src={decor.thumbnailUrl} alt={decor.name} className={styles.previewImg} />
                            ) : (
                              <div className={styles.placeholder} style={{ backgroundColor: '#ffffff' }}></div>
                            )}
                          </div>
                          <div className={styles.decorInfo}>
                            <span className={styles.decorName}>{decor.name}</span>
                            <span className={styles.decorType}>{decor.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className={styles.noResults}>Nie znaleziono dekorów o podanej nazwie.</div>
          )}
        </div>
      </div>
    </div>
  );
}
