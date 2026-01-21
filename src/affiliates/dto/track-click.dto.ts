import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class TrackClickDto {
  @IsString()
  @MaxLength(50)
  affiliateCode: string;

  @IsOptional()
  @IsUrl()
  referrer?: string;

  @IsOptional()
  @IsUrl()
  landingPage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  campaign?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}