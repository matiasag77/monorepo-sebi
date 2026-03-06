import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('ai/history')
  getHistory() {
    return this.appService.getConversationHistory();
  }

  @Get('ai/history/:conversationId/messages')
  getMessages(@Param('conversationId') conversationId: string) {
    return this.appService.getMessagesByConversation(conversationId);
  }

  @Post('ai/reply')
  getMockReply(@Body('prompt') prompt = '') {
    return this.appService.buildMockAiReply(prompt);
  }
}
