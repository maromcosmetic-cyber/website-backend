const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Product data from app/data/products.ts
const products = [
    {
        id: 'p1',
        name: 'Moringa Hair Care Gift Set',
        slug: 'moringa-hair-care-gift-set',
        price: 999,
        originalPrice: 1197,
        category: 'Bundle',
        description: 'Complete hair care ritual with our best-selling trio.',
        benefits: ['Strengthens hair', 'Reduces hair fall', 'Promotes growth'],
        image: '/images/products/trio.jpg'
    },
    {
        id: 'p2',
        name: 'Moringa & Reishi Hair Serum',
        slug: 'moringa-reishi-hair-serum',
        price: 399,
        category: 'Hair Care',
        description: 'Lightweight serum that strengthens and protects.',
        benefits: ['Strengthens strands', 'Adds shine', 'Heat protection'],
        image: '/images/products/serum.jpg'
    },
    {
        id: 'p3',
        name: 'Moringa & Keratin Conditioner',
        slug: 'moringa-keratin-conditioner',
        price: 399,
        category: 'Hair Care',
        description: 'Deep conditioning treatment for soft, manageable hair.',
        benefits: ['Deep hydration', 'Detangles', 'Smooths frizz'],
        image: '/images/products/conditioner.jpg'
    },
    {
        id: 'p4',
        name: 'Moringa Strengthening Shampoo',
        slug: 'moringa-strengthening-shampoo',
        price: 399,
        category: 'Hair Care',
        description: 'Gentle cleansing shampoo that nourishes from root to tip.',
        benefits: ['Gentle cleansing', 'Strengthens roots', 'Adds volume'],
        image: '/images/products/shampoo.jpg'
    },
    {
        id: 'p5',
        name: 'Natural Mosquito Repellent',
        slug: 'natural-mosquito-repellent',
        price: 299,
        category: 'Body Care',
        description: '100% natural protection for the whole family.',
        benefits: ['Chemical-free', 'Safe for kids', 'Moisturizing'],
        image: '/images/products/mosquito.jpg'
    }
];

async function populateProducts() {
    console.log('Starting product population...');

    for (const product of products) {
        console.log(`\nProcessing: ${product.name}`);

        // Check if product already exists
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('slug', product.slug)
            .single();

        if (existing) {
            console.log(`  ✓ Already exists, updating...`);
            const { error } = await supabase
                .from('products')
                .update({
                    name: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice || null,
                    category: product.category,
                    description: product.description,
                    benefits: product.benefits,
                    image: product.image
                })
                .eq('slug', product.slug);

            if (error) {
                console.error(`  ✗ Update failed:`, error.message);
            } else {
                console.log(`  ✓ Updated successfully`);
            }
        } else {
            console.log(`  + Inserting new product...`);
            const { error } = await supabase
                .from('products')
                .insert({
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    originalPrice: product.originalPrice || null,
                    category: product.category,
                    description: product.description,
                    benefits: product.benefits,
                    image: product.image
                });

            if (error) {
                console.error(`  ✗ Insert failed:`, error.message);
            } else {
                console.log(`  ✓ Inserted successfully`);
            }
        }
    }

    console.log('\n✅ Product population complete!');

    // Verify
    const { data: allProducts, error } = await supabase
        .from('products')
        .select('name, slug');

    if (!error) {
        console.log('\nProducts in database:');
        allProducts.forEach(p => console.log(`  - ${p.name} (${p.slug})`));
    }
}

populateProducts().catch(console.error);
