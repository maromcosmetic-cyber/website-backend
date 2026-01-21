import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { GenerateLinkDto } from './dto/generate-link.dto';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Post('register')
  async register(@Body() createAffiliateDto: CreateAffiliateDto) {
    return this.affiliatesService.registerAffiliate(createAffiliateDto);
  }

  @Get('dashboard/:affiliateId')
  async getDashboard(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.affiliatesService.getAffiliateStats(affiliateId, startDate, endDate);
  }

  @Get(':affiliateId')
  async getAffiliate(@Param('affiliateId') affiliateId: string) {
    return this.affiliatesService.getAffiliateById(affiliateId);
  }

  @Post(':affiliateId/links')
  async generateLink(
    @Param('affiliateId') affiliateId: string,
    @Body() generateLinkDto: GenerateLinkDto,
  ) {
    return this.affiliatesService.generateAffiliateLink(affiliateId, generateLinkDto);
  }

  @Get(':affiliateId/links')
  async getLinks(@Param('affiliateId') affiliateId: string) {
    return this.affiliatesService.getAffiliateLinks(affiliateId);
  }

  @Get(':affiliateId/stats')
  async getStats(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.affiliatesService.getAffiliateStats(affiliateId, startDate, endDate);
  }
}

// Admin controller for affiliate management
@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get()
  async getAllAffiliates(@Query('status') status?: string) {
    return this.affiliatesService.getAllAffiliates(status);
  }

  @Get(':affiliateId')
  async getAffiliateDetails(@Param('affiliateId') affiliateId: string) {
    return this.affiliatesService.getAffiliateById(affiliateId);
  }

  @Put(':affiliateId/approve')
  async approveAffiliate(
    @Param('affiliateId') affiliateId: string,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!adminUserId) {
      throw new BadRequestException('Admin user ID is required');
    }
    await this.affiliatesService.approveAffiliate(affiliateId, adminUserId);
    return { message: 'Affiliate approved successfully' };
  }

  @Put(':affiliateId/suspend')
  async suspendAffiliate(
    @Param('affiliateId') affiliateId: string,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!adminUserId) {
      throw new BadRequestException('Admin user ID is required');
    }
    await this.affiliatesService.suspendAffiliate(affiliateId, adminUserId);
    return { message: 'Affiliate suspended successfully' };
  }

  @Put(':affiliateId/commission-rate')
  async updateCommissionRate(
    @Param('affiliateId') affiliateId: string,
    @Body('commissionRate') commissionRate: number,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!adminUserId) {
      throw new BadRequestException('Admin user ID is required');
    }
    if (typeof commissionRate !== 'number') {
      throw new BadRequestException('Commission rate must be a number');
    }
    await this.affiliatesService.updateCommissionRate(affiliateId, commissionRate, adminUserId);
    return { message: 'Commission rate updated successfully' };
  }

  @Get('stats')
  async getProgramStats() {
    return this.affiliatesService.getProgramStats();
  }

  @Get(':affiliateId/stats')
  async getAffiliateStats(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.affiliatesService.getAffiliateStats(affiliateId, startDate, endDate);
  }
}