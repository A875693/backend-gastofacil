import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCustomCategoryDto } from './dto/create-custom-category.dto';
import { UpdateCustomCategoryDto } from './dto/update-custom-category.dto';
import { CategoriesResponse, CustomCategory, CategoryUsageResponse, CategoryValidationResponse } from './interfaces/category.interface';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(FirebaseAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todas las categorías',
    description: 'Devuelve las categorías base (hardcoded) y las categorías personalizadas del usuario con metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías obtenida exitosamente',
    schema: {
      example: {
        base: [
          { id: 'food', name: 'food', icon: 'fast-food-outline', color: '#EF4444', gradient: '#F26A6A', isCustom: false },
          { id: 'transport', name: 'transport', icon: 'car-outline', color: '#3B82F6', gradient: '#629BF8', isCustom: false },
        ],
        custom: [
          { 
            id: 'abc123', 
            name: 'Gimnasio', 
            icon: 'barbell-outline', 
            color: '#059669', 
            gradient: '#37AE87',
            userId: 'user123',
            isCustom: true,
            createdAt: '2025-01-15T10:30:00.000Z',
            updatedAt: '2025-01-15T10:30:00.000Z',
          },
        ],
        metadata: {
          customCount: 1,
          maxCustom: 50,
          canCreateMore: true,
        },
      },
    },
  })
  async findAll(@Request() req): Promise<CategoriesResponse> {
    const userId = req.user.uid;
    return this.categoriesService.findAll(userId);
  }

  @Post()
  @ApiOperation({ 
    summary: 'Crear categoría personalizada',
    description: 'Crea una nueva categoría personalizada para el usuario. Límite: 50 categorías por usuario.',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada exitosamente',
    schema: {
      example: {
        id: 'abc123',
        name: 'Gimnasio',
        icon: 'barbell-outline',
        color: '#059669',
        userId: 'user123',
        isCustom: true,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una categoría con ese nombre o se alcanzó el límite de 50 categorías',
  })
  async create(
    @Request() req,
    @Body() createDto: CreateCustomCategoryDto,
  ): Promise<CustomCategory> {
    const userId = req.user.uid;
    return this.categoriesService.create(userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Actualizar categoría personalizada',
    description: 'Actualiza una categoría personalizada del usuario. Solo se actualizan los campos enviados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría personalizada',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada exitosamente',
    schema: {
      example: {
        id: 'abc123',
        name: 'Gimnasio Premium',
        icon: 'barbell-outline',
        color: '#059669',
        userId: 'user123',
        isCustom: true,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para modificar esta categoría',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una categoría con ese nombre',
  })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomCategoryDto,
  ): Promise<CustomCategory> {
    const userId = req.user.uid;
    return this.categoriesService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar categoría personalizada',
    description: 'Elimina una categoría personalizada del usuario. Los gastos que usen esta categoría se actualizan automáticamente a "others".',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría personalizada',
    example: 'abc123',
  })
  @ApiResponse({
    status: 204,
    description: 'Categoría eliminada exitosamente. Los gastos asociados se cambiaron a "others".',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para eliminar esta categoría',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  async delete(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.uid;
    return this.categoriesService.delete(userId, id);
  }

  @Get(':id/usage')
  @ApiOperation({ 
    summary: 'Verificar uso de categoría',
    description: 'Verifica cuántos gastos están usando esta categoría antes de eliminarla',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría (base o personalizada)',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de uso obtenida exitosamente',
    schema: {
      example: {
        count: 5,
        canDelete: true,
        message: 'Esta categoría está siendo usada en 5 gastos. Al eliminarla, se cambiarán a "Otros".',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para acceder a esta categoría',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  async getCategoryUsage(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CategoryUsageResponse> {
    const userId = req.user.uid;
    return this.categoriesService.getCategoryUsage(userId, id);
  }

  @Get('validate/name')
  @ApiOperation({ 
    summary: 'Validar disponibilidad de nombre',
    description: 'Verifica si un nombre de categoría está disponible antes de crear/editar',
  })
  @ApiQuery({
    name: 'name',
    description: 'Nombre a validar',
    example: 'Gimnasio',
  })
  @ApiResponse({
    status: 200,
    description: 'Validación completada exitosamente',
    schema: {
      examples: {
        available: {
          value: {
            available: true,
            message: 'El nombre está disponible',
          },
        },
        unavailable: {
          value: {
            available: false,
            existingId: 'abc123',
            message: 'Ya tienes una categoría personalizada con ese nombre',
          },
        },
      },
    },
  })
  async validateName(
    @Request() req,
    @Query('name') name: string,
  ): Promise<CategoryValidationResponse> {
    const userId = req.user.uid;
    return this.categoriesService.validateCategoryName(userId, name);
  }
}
