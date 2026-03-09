import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
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
  sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const result = this.chatService.sendMessage(sendMessageDto.message);
    return {
      response: result.response,
      conversationId: sendMessageDto.conversationId || null,
    };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get suggested messages for the chatbot' })
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
    return { suggestions: this.chatService.getSuggestedMessages() };
  }
}
