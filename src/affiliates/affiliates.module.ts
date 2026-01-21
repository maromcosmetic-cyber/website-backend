import { Module } from '@nestjs/common';
import { AffiliatesController, AdminAffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';
import { TrackingController, AdminTrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { CommissionsController, AdminCommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { SupabaseService } from './supabase.service';

@Module({
  controllers: [
    AffiliatesController,
    AdminAffiliatesController,
    TrackingController,
    AdminTrackingController,
    CommissionsController,
    AdminCommissionsController,
  ],
  providers: [AffiliatesService, TrackingService, CommissionsService, SupabaseService],
  exports: [AffiliatesService, TrackingService, CommissionsService, SupabaseService],
})
export class AffiliatesModule {}