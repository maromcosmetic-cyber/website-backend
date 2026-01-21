import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';

@Controller('affiliates/:affiliateId/commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async getCommissions(
    @Param('affiliateId') affiliateId: string,
    @Query('status') status?: string,
  ) {
    return this.commissionsService.getCommissionsByAffiliate(affiliateId, status);
  }

  @Get('stats')
  async getCommissionStats(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionsService.getCommissionStats(affiliateId, startDate, endDate);
  }

  @Get('payouts')
  async getPayouts(@Param('affiliateId') affiliateId: string) {
    return this.commissionsService.getPayoutsByAffiliate(affiliateId);
  }
}

// Admin controller for commission management
@Controller('admin/commissions')
export class AdminCommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async getAllCommissions(
    @Query('status') status?: string,
    @Query('affiliateId') affiliateId?: string,
  ) {
    return this.commissionsService.getAllCommissions(status, affiliateId);
  }

  @Get('pending')
  async getPendingCommissions(@Query('affiliateId') affiliateId?: string) {
    return this.commissionsService.getPendingCommissions(affiliateId);
  }

  @Get('stats')
  async getCommissionStats(
    @Query('affiliateId') affiliateId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionsService.getCommissionStats(affiliateId, startDate, endDate);
  }

  @Get(':commissionId')
  async getCommission(@Param('commissionId') commissionId: string) {
    return this.commissionsService.getCommissionById(commissionId);
  }

  @Put(':commissionId/approve')
  async approveCommission(
    @Param('commissionId') commissionId: string,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!adminUserId) {
      throw new BadRequestException('Admin user ID is required');
    }
    await this.commissionsService.approveCommission(commissionId, adminUserId);
    return { message: 'Commission approved successfully' };
  }

  @Put(':commissionId/pay')
  async markAsPaid(
    @Param('commissionId') commissionId: string,
    @Body('paymentMethod') paymentMethod: string,
    @Body('paymentReference') paymentReference: string,
    @Body('adminUserId') adminUserId: string,
    @Body('notes') notes?: string,
  ) {
    if (!adminUserId || !paymentMethod || !paymentReference) {
      throw new BadRequestException('Admin user ID, payment method, and payment reference are required');
    }
    await this.commissionsService.markCommissionAsPaid(
      commissionId,
      paymentMethod,
      paymentReference,
      adminUserId,
      notes,
    );
    return { message: 'Commission marked as paid successfully' };
  }

  @Post('payouts')
  async createPayout(
    @Body('affiliateId') affiliateId: string,
    @Body('commissionIds') commissionIds: string[],
    @Body('payoutMethod') payoutMethod: string,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!affiliateId || !commissionIds || !payoutMethod || !adminUserId) {
      throw new BadRequestException('All fields are required');
    }
    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      throw new BadRequestException('Commission IDs must be a non-empty array');
    }
    return this.commissionsService.createPayout(affiliateId, commissionIds, payoutMethod, adminUserId);
  }

  @Get('payouts')
  async getAllPayouts() {
    return this.commissionsService.getAllPayouts();
  }

  @Get('payouts/stats')
  async getPayoutStats() {
    return this.commissionsService.getPayoutStats();
  }

  @Put('payouts/:payoutId/process')
  async processPayout(
    @Param('payoutId') payoutId: string,
    @Body('paymentReference') paymentReference: string,
    @Body('adminUserId') adminUserId: string,
    @Body('notes') notes?: string,
  ) {
    if (!paymentReference || !adminUserId) {
      throw new BadRequestException('Payment reference and admin user ID are required');
    }
    await this.commissionsService.processPayout(payoutId, paymentReference, adminUserId, notes);
    return { message: 'Payout processed successfully' };
  }

  @Post('handle-refund')
  async handleRefund(
    @Body('orderId') orderId: string,
    @Body('refundAmount') refundAmount: number,
    @Body('adminUserId') adminUserId: string,
  ) {
    if (!orderId || typeof refundAmount !== 'number' || !adminUserId) {
      throw new BadRequestException('Order ID, refund amount, and admin user ID are required');
    }
    await this.commissionsService.handleRefund(orderId, refundAmount, adminUserId);
    return { message: 'Refund processed and commission adjusted successfully' };
  }
}