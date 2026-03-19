import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Suggestion, SuggestionDocument } from './schemas/suggestion.schema';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectModel(Suggestion.name)
    private suggestionModel: Model<SuggestionDocument>,
  ) {}

  /**
   * Obtiene sugerencias para un usuario: combina las por defecto del sistema
   * con las consultas recientes del usuario (últimas 8).
   */
  async getForUser(userId: string): Promise<SuggestionDocument[]> {
    const [defaults, userSuggestions] = await Promise.all([
      this.suggestionModel
        .find({ isDefault: true, isActive: true })
        .sort({ order: 1 })
        .limit(8)
        .lean()
        .exec(),
      this.suggestionModel
        .find({ userId, isDefault: false, isActive: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
        .exec(),
    ]);

    // Las del usuario van primero, luego las por defecto (sin duplicados)
    const userTexts = new Set(userSuggestions.map((s) => s.text.toLowerCase()));
    const filteredDefaults = defaults.filter(
      (d) => !userTexts.has(d.text.toLowerCase()),
    );

    return [...userSuggestions, ...filteredDefaults].slice(0, 8) as SuggestionDocument[];
  }

  /**
   * Registra una consulta del usuario como sugerencia reciente.
   */
  async addUserQuery(userId: string, text: string): Promise<SuggestionDocument> {
    // Evitar duplicados: si ya existe la misma consulta del usuario, actualiza el timestamp
    const existing = await this.suggestionModel.findOne({
      userId,
      text: { $regex: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isDefault: false,
    });

    if (existing) {
      existing.set('updatedAt', new Date());
      return existing.save();
    }

    return this.suggestionModel.create({
      text,
      userId,
      isDefault: false,
      category: 'reciente',
    });
  }

  /**
   * Elimina una sugerencia del usuario (soft delete).
   */
  async removeUserSuggestion(
    id: string,
    userId: string,
  ): Promise<SuggestionDocument> {
    const suggestion = await this.suggestionModel
      .findOneAndUpdate(
        { _id: id, userId, isDefault: false },
        { isActive: false },
        { new: true },
      )
      .exec();

    if (!suggestion) {
      throw new NotFoundException('Sugerencia no encontrada');
    }
    return suggestion;
  }

  // --- Admin: CRUD de sugerencias por defecto ---

  async findAllDefaults(): Promise<SuggestionDocument[]> {
    return this.suggestionModel
      .find({ isDefault: true })
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async createDefault(dto: CreateSuggestionDto): Promise<SuggestionDocument> {
    return this.suggestionModel.create({
      ...dto,
      isDefault: true,
      isActive: true,
    });
  }

  async updateDefault(
    id: string,
    dto: UpdateSuggestionDto,
  ): Promise<SuggestionDocument> {
    const updated = await this.suggestionModel
      .findOneAndUpdate({ _id: id, isDefault: true }, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Sugerencia por defecto no encontrada');
    }
    return updated;
  }

  async removeDefault(id: string): Promise<SuggestionDocument> {
    const deleted = await this.suggestionModel
      .findOneAndDelete({ _id: id, isDefault: true })
      .exec();
    if (!deleted) {
      throw new NotFoundException('Sugerencia por defecto no encontrada');
    }
    return deleted;
  }

  /**
   * Seed: inserta sugerencias por defecto si la colección está vacía.
   */
  async seedDefaults(): Promise<void> {
    const count = await this.suggestionModel.countDocuments({ isDefault: true });
    if (count > 0) return;

    const defaults = [
      '¿Cómo estuvieron las ventas del último trimestre?',
      'Muéstrame los KPIs del equipo comercial',
      '¿Hay alguna anomalía en los datos recientes?',
      'Genera un reporte de churn mensual',
      '¿Cuál es el forecast de revenue?',
      'Analiza el pipeline de datos',
      '¿Cómo va el rendimiento del equipo?',
      'Muéstrame un resumen de la base de clientes',
    ];

    await this.suggestionModel.insertMany(
      defaults.map((text, i) => ({
        text,
        category: 'general',
        isDefault: true,
        isActive: true,
        order: i,
      })),
    );
  }
}
