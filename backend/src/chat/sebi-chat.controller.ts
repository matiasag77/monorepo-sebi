import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatSebiDto } from './dto/chat-sebi.dto';

/**
 * Endpoint público /api/v1/chat_sebi consumido por el componente WebRunSebi.tsx.
 * No requiere autenticación JWT — el contexto de usuario se pasa via body (email, user_id).
 */
@ApiTags('SEBI Chat v1')
@Controller('v1')
export class SebiChatController {
  private readonly logger = new Logger(SebiChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post('chat_sebi')
  @ApiOperation({ summary: 'Enviar mensaje al agente SEBI (endpoint público)' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta estructurada del agente SEBI',
    schema: {
      properties: {
        answer: { type: 'string' },
        context: { type: 'string', nullable: true },
        tables: { type: 'array', items: { type: 'object' } },
        intermediate_steps: { type: 'array', items: { type: 'string' } },
        session_id: { type: 'string' },
        confidence: { type: 'number' },
        sources: { type: 'array', items: { type: 'string' } },
        follow_up_questions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async chatSebi(@Body() dto: ChatSebiDto) {
    this.logger.log(
      `POST /api/v1/chat_sebi — user=${dto.user_id ?? 'anon'}, email=${dto.email ?? 'N/A'}, session=${dto.session_id ?? 'new'}, msgLen=${dto.message?.length}`,
    );

    try {
      const result = await this.chatService.sendMessageSebi(
        dto.message,
        dto.user_id,
        dto.session_id,
        dto.email,
      );
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`POST /api/v1/chat_sebi UNHANDLED ERROR: ${errMsg}`);
      throw new HttpException(
        { message: errMsg },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
