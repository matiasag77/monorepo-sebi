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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ChatService } from '../chat/chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { SendMessageDto } from '../chat/dto/send-message.dto';

@ApiTags('Conversations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly chatService: ChatService,
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
  findOne(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a conversation (rename)' })
  @ApiResponse({ status: 200, description: 'Conversation updated successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, updateConversationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(id);
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
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    // Add user message
    await this.conversationsService.addMessage(id, 'user', sendMessageDto.content);

    // Get AI response
    const aiResult = await this.chatService.sendMessage(sendMessageDto.content);

    // Add assistant message
    const conversation = await this.conversationsService.addMessage(
      id,
      'assistant',
      aiResult.response,
    );

    const messages = conversation.messages;
    return {
      userMessage: messages[messages.length - 2],
      assistantMessage: messages[messages.length - 1],
      conversation,
    };
  }
}
