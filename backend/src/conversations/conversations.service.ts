import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { TrackingService } from '../tracking/tracking.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private trackingService: TrackingService,
  ) {}

  async create(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    const conversation = new this.conversationModel({
      title: createConversationDto.title,
      userId,
      messages: [],
    });
    const saved = await conversation.save();
    await this.trackingService.logEvent({ userId, action: 'create_conversation', metadata: { conversationId: String(saved._id) } });
    return saved;
  }

  async findAllByUser(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ userId })
      .select('-messages')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
  }

  async findById(id: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findOne({ _id: id, userId }).lean().exec();
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return conversation;
  }

  async update(
    id: string,
    userId: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const updated = await this.conversationModel
      .findOneAndUpdate({ _id: id, userId }, updateConversationDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string, userId: string): Promise<ConversationDocument> {
    const deleted = await this.conversationModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!deleted) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    await this.trackingService.logEvent({ userId: String(deleted.userId), action: 'delete_conversation', metadata: { conversationId: id } });
    return deleted;
  }

  async addMessage(
    id: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    structured?: {
      table?: Record<string, unknown>[];
      chart?: Record<string, unknown>;
      proactivo?: string;
      context?: string;
      intermediateSteps?: string[];
      fallbackUsed?: boolean;
      adkError?: string;
      confidence?: number;
      sources?: string[];
      followUpQuestions?: string[];
    },
  ): Promise<ConversationDocument> {
    const message: Record<string, unknown> = {
      role,
      content,
      timestamp: new Date(),
    };

    if (structured) {
      if (structured.table) message.table = structured.table;
      if (structured.chart) message.chart = structured.chart;
      if (structured.proactivo) message.proactivo = structured.proactivo;
      if (structured.context) message.context = structured.context;
      if (structured.intermediateSteps) message.intermediateSteps = structured.intermediateSteps;
      if (structured.fallbackUsed) message.fallbackUsed = structured.fallbackUsed;
      if (structured.adkError) message.adkError = structured.adkError;
      if (structured.confidence != null) message.confidence = structured.confidence;
      if (structured.sources?.length) message.sources = structured.sources;
      if (structured.followUpQuestions?.length) message.followUpQuestions = structured.followUpQuestions;
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { _id: id, userId },
        {
          $push: { messages: message },
          $set: { lastMessage: content },
        },
        { new: true },
      )
      .exec();
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return conversation;
  }
}
