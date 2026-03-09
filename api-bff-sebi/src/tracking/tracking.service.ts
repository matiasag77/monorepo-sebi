import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TrackingEvent,
  TrackingEventDocument,
} from './schemas/tracking-event.schema';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(TrackingEvent.name)
    private trackingEventModel: Model<TrackingEventDocument>,
  ) {}

  async logEvent(data: {
    userId: string;
    action: string;
    metadata?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }): Promise<TrackingEventDocument> {
    const event = new this.trackingEventModel(data);
    return event.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    events: TrackingEventDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.trackingEventModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .exec(),
      this.trackingEventModel.countDocuments().exec(),
    ]);
    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    events: TrackingEventDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.trackingEventModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.trackingEventModel.countDocuments({ userId }).exec(),
    ]);
    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
