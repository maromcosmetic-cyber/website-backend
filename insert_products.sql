-- Insert products into the database
-- Run this in Supabase SQL Editor

INSERT INTO products (name, slug, price, originalPrice, category, description, benefits, image)
VALUES
    ('Moringa Hair Care Gift Set', 'moringa-hair-care-gift-set', 999, 1287, 'Set', 
     'The ultimate ritual for complete hair transformation. Includes our signature Shampoo, Conditioner, and Serum in a beautiful gift box.',
     '["Full routine coverage", "Value pricing", "Ideal gift"]'::jsonb,
     '/images/products/set.png'),
    
    ('Moringa & Reishi Hair Serum', 'moringa-reishi-hair-serum', 249, 279, 'Hair',
     'A lightweight, potent serum that strengthens, hydrates, and protects hair. Rich in antioxidants from Reishi mushroom.',
     '["Strengthens follicles", "Reduces frizz", "Heat protection"]'::jsonb,
     '/images/products/serum.png'),
    
    ('Moringa & Keratin Conditioner', 'moringa-keratin-conditioner', 319, 389, 'Hair',
     'Deeply hydrates and smooths hair without harmful chemicals. Fortified with Keratin for structural repair.',
     '["Intense hydration", "Structural repair", "Smooths cuticle"]'::jsonb,
     '/images/products/conditioner.png'),
    
    ('Moringa Shampoo', 'moringa-anti-hairfall-shampoo', 349, NULL, 'Hair',
     'Designed to cleanse, nourish, and strengthen hair naturally. Features Eclipta Prostrata to reduce hair fall.',
     '["Reduces hair fall", "Gentle cleansing", "Scalp health"]'::jsonb,
     '/images/products/shampoo.png'),
    
    ('Natural Mosquito Repellent', 'natural-mosquito-repellent', 189, NULL, 'Skin',
     'A gentle, chemical-free formula that keeps mosquitoes away while moisturizing the skin. Safe for families.',
     '["DEET-free", "Moisturizing", "Pleasant scent"]'::jsonb,
     '/images/products/mosquito.jpg')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    originalPrice = EXCLUDED.originalPrice,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    benefits = EXCLUDED.benefits,
    image = EXCLUDED.image;

-- Verify
SELECT name, slug, price FROM products ORDER BY name;
