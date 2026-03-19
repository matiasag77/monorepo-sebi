import { Controller, Post, Get, Body, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiResponse({
    status: 200,
    description: 'AI response to the message',
    schema: {
      properties: {
        response: { type: 'string' },
        conversationId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    this.logger.log(`POST /api/chat/send - content length=${sendMessageDto.content?.length}, conversationId=${sendMessageDto.conversationId || 'none'}`);
    try {
      const result = await this.chatService.sendMessage(
        sendMessageDto.content,
      );
      this.logger.log(`POST /api/chat/send - response received, hasStructured=${!!result.structured}`);
      return {
        response: result.response,
        conversationId: sendMessageDto.conversationId || null,
        ...(result.structured
          ? {
              table: result.structured.table,
              chart: result.structured.chart,
              proactivo: result.structured.proactivo,
              context: result.structured.context,
              intermediateSteps: result.structured.intermediateSteps,
            }
          : {}),
      };
    } catch (error) {
      this.logger.error(`POST /api/chat/send - UNHANDLED ERROR: ${error instanceof Error ? error.message : error}`);
      this.logger.error(`Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      throw error;
    }
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get suggested messages (deprecated - use /suggestions endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'List of suggested messages',
    schema: {
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getSuggestions() {
    // Mantenido por compatibilidad - el nuevo endpoint es /suggestions
    return { suggestions: this.chatService.getSuggestedMessages() };
  }
}
