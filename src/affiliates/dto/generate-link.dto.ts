import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class GenerateLinkDto {
  @IsIn(['general', 'product', 'category'])
  link_type: 'general' | 'product' | 'category';

  @IsUrl()
  target_url: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  campaign_name?: string;
}