import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MigrationService } from './migration.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { MigrationReport } from './interfaces/migration.interface';

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('normalize-data')
  @ApiOperation({ 
    summary: 'Ejecutar migración de normalización de categorías y métodos de pago',
    description: 'Migra categorías y métodos de pago de español a claves inglesas normalizadas'
  })
  @ApiQuery({ 
    name: 'dryRun', 
    required: false, 
    type: Boolean, 
    description: 'Ejecutar en modo simulación (no hace cambios reales)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Migración ejecutada exitosamente',
    schema: {
      type: 'object',
      properties: {
        migrationId: { type: 'string' },
        status: { type: 'string', enum: ['success', 'failed', 'rollback'] },
        totalDocumentsProcessed: { type: 'number' },
        totalDocumentsUpdated: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Error en la validación' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async runMigration(
    @Query('dryRun') dryRun?: string
  ): Promise<MigrationReport> {
    try {
      const isDryRun = dryRun === 'true';
      const report = await this.migrationService.runMigration({ dryRun: isDryRun });
      
      if (report.status === 'failed') {
        throw new HttpException(
          `Migración falló: ${report.errors.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      return report;
    } catch (error) {
      throw new HttpException(
        `Error ejecutando migración: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('mappings')
  @ApiOperation({ 
    summary: 'Obtener mapeos de normalización',
    description: 'Retorna los mapeos utilizados para categorías y métodos de pago'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Mapeos obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        categories: { 
          type: 'object',
          example: { 'alimentacion': 'food', 'transporte': 'transport' }
        },
        paymentMethods: { 
          type: 'object',
          example: { 'efectivo': 'cash', 'tarjeta': 'card' }
        }
      }
    }
  })
  getMappings() {
    return this.migrationService.getMappings();
  }

  @Get('reverse-mappings')
  @ApiOperation({ 
    summary: 'Obtener mapeos inversos',
    description: 'Retorna los mapeos inversos (inglés a español) para referencia'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Mapeos inversos obtenidos exitosamente' 
  })
  getReverseMappings() {
    return this.migrationService.getReverseMappings();
  }
}