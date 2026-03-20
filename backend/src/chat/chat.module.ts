import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SebiChatController } from './sebi-chat.controller';

@Module({
  controllers: [ChatController, SebiChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
