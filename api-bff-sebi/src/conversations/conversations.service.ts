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
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(id).exec();
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return conversation;
  }

  async update(
    id: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const updated = await this.conversationModel
      .findByIdAndUpdate(id, updateConversationDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<ConversationDocument> {
    const deleted = await this.conversationModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    await this.trackingService.logEvent({ userId: String(deleted.userId), action: 'delete_conversation', metadata: { conversationId: id } });
    return deleted;
  }

  async addMessage(
    id: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(id).exec();
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
    });
    conversation.lastMessage = content;
    return conversation.save();
  }
}
