import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import {
  TrackingEvent,
  TrackingEventSchema,
} from './schemas/tracking-event.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrackingEvent.name, schema: TrackingEventSchema },
    ]),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
