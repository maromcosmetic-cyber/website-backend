import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WoocommerceSupabaseService } from './woocommerce-supabase.service';

@Injectable()
export class WoocommerceAuthGuard implements CanActivate {
    constructor(private readonly supabaseService: WoocommerceSupabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            console.log('Auth Guard: Missing header');
            throw new UnauthorizedException('Missing Authorization header');
        }

        const [type, token] = authHeader.split(' ');
        if (type !== 'Basic' || !token) {
            console.log('Auth Guard: Invalid format', authHeader);
            throw new UnauthorizedException('Invalid Authorization header format');
        }

        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [consumerKey, consumerSecret] = decoded.split(':');
        console.log(`Auth Guard: Attempting login with Key: ${consumerKey}`);

        if (!consumerKey || !consumerSecret) {
            console.log('Auth Guard: Missing decoded credentials');
            throw new UnauthorizedException('Invalid Basic Auth credentials');
        }

        const supabase = this.supabaseService.getAdminClient();

        // Check credentials in api_keys table
        const { data: apiKey, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('consumer_key', consumerKey)
            .single();

        if (error || !apiKey) {
            console.log('Auth Guard: Key not found in DB', error);
            throw new UnauthorizedException('Invalid Consumer Key');
        }

        // In a real production app, you should hash the secret. 
        // For this implementation, we are comparing directly as requested for simplicity/compatibility.
        if (apiKey.consumer_secret !== consumerSecret) {
            console.log(`Auth Guard: Secret mismatch. Expected: ${apiKey.consumer_secret}, Got: ${consumerSecret}`);
            throw new UnauthorizedException('Invalid Consumer Secret');
        }

        // Update last access
        await supabase.from('api_keys').update({ last_access: new Date() }).eq('id', apiKey.id);

        return true;
    }
}
