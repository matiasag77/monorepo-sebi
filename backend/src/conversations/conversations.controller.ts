import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ChatService } from '../chat/chat.service';
import { BigQueryService } from '../bigquery/bigquery.service';
import { TrackingService } from '../tracking/tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { SendMessageDto } from '../chat/dto/send-message.dto';
import { SuggestionsService } from '../suggestions/suggestions.service';

@ApiTags('Conversations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly chatService: ChatService,
    private readonly bigQueryService: BigQueryService,
    private readonly trackingService: TrackingService,
    private readonly suggestionsService: SuggestionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Request() req, @Body() createConversationDto: CreateConversationDto) {
    return this.conversationsService.create(
      req.user.userId,
      createConversationDto,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all conversations for the current user" })
  @ApiResponse({ status: 200, description: "List of user's conversations" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req) {
    return this.conversationsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation found' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.conversationsService.findById(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a conversation (rename)' })
  @ApiResponse({ status: 200, description: 'Conversation updated successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, req.user.userId, updateConversationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  remove(@Request() req, @Param('id') id: string) {
    return this.conversationsService.remove(id, req.user.userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add a message to a conversation and get AI response' })
  @ApiResponse({
    status: 201,
    description: 'Message added and AI response returned',
    schema: {
      properties: {
        userMessage: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            content: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
        assistantMessage: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            content: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
        conversation: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(`POST /api/conversations/${id}/messages - userId=${req.user.userId}, contentLength=${sendMessageDto.content?.length}`);

    try {
      // Add user message (also verifies ownership via userId filter)
      this.logger.log(`Step 1: Adding user message to conversation...`);
      await this.conversationsService.addMessage(id, req.user.userId, 'user', sendMessageDto.content);
      this.logger.log(`Step 1: User message added`);

      // Get AI response (pass userId and conversationId as sessionId for ADK)
      this.logger.log(`Step 2: Calling ChatService.sendMessage...`);
      const aiStartTime = Date.now();
      const aiResult = await this.chatService.sendMessage(
        sendMessageDto.content,
        req.user.userId,
        id, // use conversationId as ADK sessionId for continuity
      );
      const aiDuration = Date.now() - aiStartTime;
      this.logger.log(`Step 2: AI response received in ${aiDuration}ms - responseLength=${aiResult.response?.length}, hasStructured=${!!aiResult.structured}`);

      // Add assistant message (include structured data for persistence)
      this.logger.log(`Step 3: Adding assistant message to conversation...`);
      const structuredData = aiResult.structured
        ? {
            table: aiResult.structured.table,
            chart: aiResult.structured.chart,
            proactivo: aiResult.structured.proactivo,
            context: aiResult.structured.context,
            intermediateSteps: aiResult.structured.intermediateSteps,
            confidence: aiResult.structured.confidence,
            sources: aiResult.structured.sources,
            followUpQuestions: aiResult.structured.followUpQuestions,
          }
        : undefined;

      const conversation = await this.conversationsService.addMessage(
        id,
        req.user.userId,
        'assistant',
        aiResult.response,
        {
          ...structuredData,
          ...(aiResult.fallbackUsed ? { fallbackUsed: true, adkError: aiResult.adkError } : {}),
        },
      );
      this.logger.log(`Step 3: Assistant message added`);

      // Save user query as suggestion (fire and forget)
      this.suggestionsService
        .addUserQuery(req.user.userId, sendMessageDto.content)
        .catch((err) => this.logger.warn(`Suggestion save failed: ${err}`));

      // Log chat_message event (fire and forget)
      this.trackingService
        .logEvent({ userId: req.user.userId, action: 'chat_message', metadata: { conversationId: id } })
        .catch((err) => this.logger.warn(`Tracking logEvent failed: ${err}`));

      // Log trace to BigQuery (fire and forget)
      this.bigQueryService
        .insertConversationTrace({
          user_id: req.user.userId,
          user_email: req.user.email,
          user_name: req.user.name,
          conversation_id: id,
          question: sendMessageDto.content,
          answer: aiResult.response,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => this.logger.warn(`BigQuery trace failed: ${err}`));

      const totalDuration = Date.now() - startTime;
      this.logger.log(`POST /api/conversations/${id}/messages completed in ${totalDuration}ms`);

      const messages = conversation.messages;
      return {
        userMessage: messages[messages.length - 2],
        assistantMessage: messages[messages.length - 1],
        conversation,
        // Structured ADK data for rich frontend rendering
        ...(aiResult.structured
          ? {
              table: aiResult.structured.table,
              chart: aiResult.structured.chart,
              proactivo: aiResult.structured.proactivo,
              context: aiResult.structured.context,
              intermediateSteps: aiResult.structured.intermediateSteps,
              confidence: aiResult.structured.confidence,
              sources: aiResult.structured.sources,
              followUpQuestions: aiResult.structured.followUpQuestions,
            }
          : {}),
        // Fallback API info when ADK failed
        ...(aiResult.fallbackUsed
          ? {
              fallbackUsed: true,
              adkError: aiResult.adkError,
            }
          : {}),
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(`POST /api/conversations/${id}/messages FAILED after ${totalDuration}ms`);
      this.logger.error(`Error: ${error instanceof Error ? error.message : error}`);
      this.logger.error(`Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      throw error;
    }
  }
}
