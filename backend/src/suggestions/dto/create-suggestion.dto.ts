import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength, MinLength } from 'class-validator';

export class CreateSuggestionDto {
  @ApiProperty({ description: 'Texto de la sugerencia', example: '¿Cómo estuvieron las ventas del último trimestre?' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  text: string;

  @ApiProperty({ description: 'Categoría', example: 'general', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ description: 'Si es sugerencia por defecto del sistema', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ description: 'Orden de prioridad', required: false })
  @IsOptional()
  @IsNumber()
  order?: number;
}
