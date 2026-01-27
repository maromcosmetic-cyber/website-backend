import { Injectable } from '@nestjs/common';
import { WoocommerceSupabaseService } from './woocommerce-supabase.service';

@Injectable()
export class WoocommerceService {
    constructor(private readonly supabaseService: WoocommerceSupabaseService) { }

    private get supabase() {
        return this.supabaseService.getAdminClient();
    }

    // Map Supabase Product to WooCommerce Format
    private mapToWooCommerce(product: any) {
        return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            permalink: `https://maromcosmetic.com/shop/${product.slug}`,
            type: 'simple',
            status: 'publish',
            featured: false,
            description: product.description || '',
            short_description: product.short_description || '',
            sku: product.sku || '',
            price: product.sale_price || product.regular_price,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            stock_quantity: product.stock_quantity,
            stock_status: product.stock_status,
            images: product.images || [],
            categories: product.categories || [],
            // Standard dummy fields to satisfy strict clients
            date_created: product.created_at,
            date_modified: product.updated_at || product.created_at,
        };
    }

    async findAll(page = 1, perPage = 10) {
        const start = (page - 1) * perPage;
        const end = start + perPage - 1;

        const { data, count, error } = await this.supabase
            .from('products')
            .select('*', { count: 'exact' })
            .range(start, end);

        if (error) throw new Error(error.message);

        return data.map(this.mapToWooCommerce);
    }

    async findOne(id: string) {
        // Determine if id is UUID or numeric. If numeric, this might fail if DB is UUID. 
        // WooCommerce IDs are usually numeric, but we use UUID. 
        // We expect the client to use our UUIDs if they created them, 
        // OR we might need to support slug lookup if they pass that?
        // For now, assume ID is passed correctly.

        // Workaround: If the external software passes '123' (numeric), we can't find UUID.
        // However, existing products have UUIDs.

        const { data, error } = await this.supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToWooCommerce(data);
    }

    async create(createProductDto: any) {
        // Map WooCommerce Body to Supabase
        // Generate valid slug from name if not provided
        const slug = createProductDto.slug || createProductDto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Extract meta_data for custom fields (Hebrew support)
        let price_ils = null;
        let name_he = null;
        let description_he = null;

        if (Array.isArray(createProductDto.meta_data)) {
            const meta = createProductDto.meta_data;
            const priceMeta = meta.find((m: any) => m.key === 'price_ils');
            if (priceMeta) price_ils = parseFloat(priceMeta.value);

            const nameMeta = meta.find((m: any) => m.key === 'name_he');
            if (nameMeta) name_he = nameMeta.value;

            const descMeta = meta.find((m: any) => m.key === 'description_he');
            if (descMeta) description_he = descMeta.value;
        }

        const dbPayload: any = {
            name: createProductDto.name,
            slug: slug,
            description: createProductDto.description,
            short_description: createProductDto.short_description,
            regular_price: createProductDto.regular_price,
            sale_price: createProductDto.sale_price,
            stock_quantity: createProductDto.stock_quantity,
            stock_status: createProductDto.stock_status,
            images: createProductDto.images, // JSONB
            categories: createProductDto.categories, // JSONB
            sku: createProductDto.sku
        };

        if (price_ils !== null) dbPayload.price_ils = price_ils;
        // We assume name_he/description_he columns might exist or we store them in a JSONB 'translations' or distinct columns?
        // Based on previous analysis, we only saw price_ils usage. 
        // If the columns don''t exist, this insert might fail if we include them. 
        // Let's stick to price_ils for now which is critical.

        const { data, error } = await this.supabase
            .from('products')
            .insert(dbPayload)
            .select()
            .single();

        if (error) {
            console.error('Create Error', error);
            throw new Error(error.message);
        }
        return this.mapToWooCommerce(data);
    }

    async update(id: string, updateProductDto: any) {
        const dbPayload: any = {};
        if (updateProductDto.name) dbPayload.name = updateProductDto.name;
        if (updateProductDto.description) dbPayload.description = updateProductDto.description;
        if (updateProductDto.short_description) dbPayload.short_description = updateProductDto.short_description;
        if (updateProductDto.regular_price) dbPayload.regular_price = updateProductDto.regular_price;
        if (updateProductDto.sale_price) dbPayload.sale_price = updateProductDto.sale_price;
        if (updateProductDto.stock_quantity !== undefined) dbPayload.stock_quantity = updateProductDto.stock_quantity;
        if (updateProductDto.stock_status) dbPayload.stock_status = updateProductDto.stock_status;
        if (updateProductDto.images) dbPayload.images = updateProductDto.images;
        if (updateProductDto.categories) dbPayload.categories = updateProductDto.categories;
        if (updateProductDto.sku) dbPayload.sku = updateProductDto.sku;

        // Handle meta_data updates
        if (Array.isArray(updateProductDto.meta_data)) {
            const meta = updateProductDto.meta_data;
            const priceMeta = meta.find((m: any) => m.key === 'price_ils');
            if (priceMeta) dbPayload.price_ils = parseFloat(priceMeta.value);
        }

        const { data, error } = await this.supabase
            .from('products')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.mapToWooCommerce(data);
    }

    async remove(id: string) {
        const { error } = await this.supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return {
            id: id,
            status: "trash",
            message: "Product deleted"
        };
    }
}
