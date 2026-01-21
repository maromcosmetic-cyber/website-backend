-- Fix incorrect image path for Hydrolyzed Keratin
UPDATE ingredients 
SET image = '/ingredients/hydrolyzed-keratin.jpg' 
WHERE id = 'keratin';

-- Verify the change
SELECT id, name, image FROM ingredients WHERE id = 'keratin';
