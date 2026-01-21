import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { TrackingService } from './tracking.service';
import { TrackClickDto } from './dto/track-click.dto';

@Controller('affiliate')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('track-click')
  async trackClick(@Body() trackClickDto: TrackClickDto, @Req() request: Request) {
    // Extract IP address and user agent from request
    const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    const trackingData = {
      ...trackClickDto,
      ipAddress,
      userAgent,
    };

    return this.trackingService.trackClick(trackingData);
  }

  @Post('track-conversion')
  async trackConversion(
    @Body('sessionId') sessionId: string,
    @Body('orderId') orderId: string,
  ) {
    if (!sessionId || !orderId) {
      throw new BadRequestException('Session ID and Order ID are required');
    }

    await this.trackingService.trackConversion(sessionId, orderId);
    return { message: 'Conversion tracked successfully' };
  }

  @Get('attribution/:sessionId')
  async getAttributionData(@Param('sessionId') sessionId: string) {
    return this.trackingService.getAttributionData(sessionId);
  }
}

// Admin controller for tracking analytics
@Controller('admin/tracking')
export class AdminTrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('clicks')
  async getAllClicks(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trackingService.getAllClicks(startDate, endDate);
  }

  @Get('stats')
  async getTrackingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trackingService.getTrackingStats(startDate, endDate);
  }

  @Get('affiliate/:affiliateId/clicks')
  async getClicksByAffiliate(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trackingService.getClicksByAffiliate(affiliateId, startDate, endDate);
  }

  @Get('affiliate/:affiliateId/conversions')
  async getConversionsByAffiliate(
    @Param('affiliateId') affiliateId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trackingService.getConversionsByAffiliate(affiliateId, startDate, endDate);
  }
}