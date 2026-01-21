import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateAffiliateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  business_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  social_media?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };

  @IsOptional()
  tax_information?: {
    tax_id?: string;
    business_type?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };

  @IsOptional()
  payment_details?: {
    method: 'bank_transfer' | 'paypal' | 'stripe';
    account_details: any;
  };
}