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
import { SuggestionsService } from './suggestions.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Suggestions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  // --- Endpoints de usuario ---

  @Get()
  @ApiOperation({ summary: 'Obtener sugerencias para el usuario actual' })
  @ApiResponse({ status: 200, description: 'Lista de sugerencias' })
  async getForUser(@Request() req) {
    const suggestions = await this.suggestionsService.getForUser(req.user.userId);
    return {
      suggestions: suggestions.map((s) => ({
        id: String(s._id),
        text: s.text,
        category: s.category,
        isDefault: s.isDefault,
      })),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una sugerencia del usuario' })
  @ApiResponse({ status: 200, description: 'Sugerencia eliminada' })
  @ApiResponse({ status: 404, description: 'Sugerencia no encontrada' })
  async removeUserSuggestion(@Request() req, @Param('id') id: string) {
    await this.suggestionsService.removeUserSuggestion(id, req.user.userId);
    return { message: 'Sugerencia eliminada correctamente' };
  }

  // --- Endpoints admin: mantenedor de sugerencias por defecto ---

  @Get('admin/defaults')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todas las sugerencias por defecto (admin)' })
  @ApiResponse({ status: 200, description: 'Lista de sugerencias por defecto' })
  async findAllDefaults() {
    const suggestions = await this.suggestionsService.findAllDefaults();
    return {
      suggestions: suggestions.map((s) => ({
        id: String(s._id),
        text: s.text,
        category: s.category,
        isDefault: s.isDefault,
        isActive: s.isActive,
        order: s.order,
      })),
    };
  }

  @Post('admin/defaults')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Crear sugerencia por defecto (admin)' })
  @ApiResponse({ status: 201, description: 'Sugerencia creada' })
  async createDefault(@Body() dto: CreateSuggestionDto) {
    const suggestion = await this.suggestionsService.createDefault(dto);
    return {
      id: String(suggestion._id),
      text: suggestion.text,
      category: suggestion.category,
      order: suggestion.order,
    };
  }

  @Put('admin/defaults/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar sugerencia por defecto (admin)' })
  @ApiResponse({ status: 200, description: 'Sugerencia actualizada' })
  @ApiResponse({ status: 404, description: 'Sugerencia no encontrada' })
  async updateDefault(
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionDto,
  ) {
    const suggestion = await this.suggestionsService.updateDefault(id, dto);
    return {
      id: String(suggestion._id),
      text: suggestion.text,
      category: suggestion.category,
      order: suggestion.order,
      isActive: suggestion.isActive,
    };
  }

  @Delete('admin/defaults/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar sugerencia por defecto (admin)' })
  @ApiResponse({ status: 200, description: 'Sugerencia eliminada' })
  @ApiResponse({ status: 404, description: 'Sugerencia no encontrada' })
  async removeDefault(@Param('id') id: string) {
    await this.suggestionsService.removeDefault(id);
    return { message: 'Sugerencia por defecto eliminada correctamente' };
  }
}
