/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service';
import { OcrService } from '../ocr/ocr.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ScanReceiptResponseDto } from './dto/scan-receipt.dto';
import { UniversalExpensesQueryDto, UniversalStatsQueryDto } from './dto/expenses-filter-query.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { DecodedIdToken } from 'firebase-admin/auth';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly ocrService: OcrService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create new expense with multi-currency support',
    description: 'Creates a new expense with flexible multi-currency support. Amount and currency represent the value in user base currency. If expense was paid in different currency, provide originalAmount, originalCurrency, and exchangeRate for complete tracking.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Expense created successfully',
    schema: {
      example: {
        id: "abc123",
        userId: "user123",
        amount: 47.01,
        currency: "EUR",
        originalAmount: 55.00,
        originalCurrency: "USD", 
        exchangeRate: 1.17,
        date: "2025-09-29T10:30:00.000Z",
        category: "food",
        paymentMethod: "credit_card",
        note: "Lunch at restaurant (paid 55 USD)",
        tags: ["business", "meal"]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - invalid currency data or missing required fields' })
  create(@GetUser() user: DecodedIdToken, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.uid, dto);
  }

  @Post('scan')
  @ApiOperation({ summary: 'Escanear recibo y extraer datos con OCR' })
  @ApiResponse({
    status: 200,
    description: 'Recibo escaneado correctamente',
    type: ScanReceiptResponseDto,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Imagen del recibo a escanear',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('Solo se permiten imágenes'), false);
        }
        callback(null, true);
      },
    }),
  )
  async scanReceipt(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: DecodedIdToken,
  ): Promise<ScanReceiptResponseDto> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    return this.ocrService.scanReceipt(file.buffer);
  }

  /**
   * ENDPOINTS UNIVERSALES
   * API empresarial con filtros avanzados y expansiones opcionales
   */

  @Get()
  @ApiOperation({ 
    summary: 'Universal expenses endpoint with advanced filtering',
    description: 'Single optimized endpoint for all expense queries. Supports advanced filtering, pagination, sorting, and optional field expansion via include parameter.'
  })
  @ApiResponse({
    status: 200,
    description: 'Expenses with universal filters and optional expansions',
    schema: {
      example: {
        data: [
          {
            id: "abc123",
            userId: "user123",
            amount: 25.50,
            date: "2025-09-15T10:30:00.000Z",
            category: "food",
            paymentMethod: "credit_card",
            note: "Lunch at restaurant",
            tags: ["business", "meal"]
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 157,
          totalPages: 8,
          hasNext: true,
          hasPrev: false
        },
        summary: {
          totalAmount: 450.20,
          totalCount: 20,
          averageAmount: 22.51,
          dateRange: {
            from: "2025-09-01T00:00:00.000Z",
            to: "2025-09-30T23:59:59.999Z"
          }
        },
        categoryBreakdown: [
          { 
            category: "food", 
            total: 250.30, 
            count: 12, 
            percentage: 55.6 
          },
          { 
            category: "custom-cat-id-123", 
            categoryDetails: {
              id: "custom-cat-id-123",
              name: "Gimnasio Premium",
              icon: "barbell-outline",
              color: "#059669",
              gradient: "#37AE87",
              isCustom: true
            },
            total: 100.00, 
            count: 4, 
            percentage: 22.2 
          }
        ],
        trends: {
          dailyTotals: { "2025-09-01": 50.20, "2025-09-02": 75.30 }
        }
      }
    }
  })
  findExpenses(@GetUser() user: DecodedIdToken, @Query() query: UniversalExpensesQueryDto) {
    return this.expensesService.findExpenses(user.uid, query);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Universal statistics endpoint',
    description: 'Universal statistics with multiple periods and optional expansions. Supports daily, weekly, monthly, yearly periods with advanced filtering.'
  })
  @ApiResponse({
    status: 200,
    description: 'Universal statistics with optional expansions',
    schema: {
      example: {
        period: "monthly",
        dateRange: {
          from: "2025-09-01T00:00:00.000Z",
          to: "2025-09-30T23:59:59.999Z"
        },
        totalAmount: 1250.50,
        totalCount: 45,
        average: 27.79,
        breakdown: {
          byCategory: [
            { 
              category: "food", 
              total: 450.20, 
              count: 12, 
              percentage: 36.02 
            },
            { 
              category: "custom-cat-id-456", 
              categoryDetails: {
                id: "custom-cat-id-456",
                name: "Suscripción Spotify",
                icon: "musical-notes-outline",
                color: "#1DB954",
                gradient: "#44C374",
                isCustom: true
              },
              total: 200.00, 
              count: 8, 
              percentage: 16.00 
            }
          ]
        },
        trends: {
          data: {
            dailyTotals: {},
            labels: [],
            values: []
          },
          growth: {
            rate: 15.5,
            direction: "up"
          }
        }
      }
    }
  })
  getStats(@GetUser() user: DecodedIdToken, @Query() query: UniversalStatsQueryDto) {
    return this.expensesService.getUniversalStats(user.uid, query);
  }

  /**
   * OPERACIONES CRUD
   * Crear, leer, actualizar y eliminar gastos individuales
   */

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense found successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findOne(@GetUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.expensesService.findOne(user.uid, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  update(@GetUser() user: DecodedIdToken, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(user.uid, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(@GetUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.expensesService.remove(user.uid, id);
  }
}
