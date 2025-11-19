import { ApiProperty } from '@nestjs/swagger';

export class ScanReceiptResponseDto {
  @ApiProperty({ example: '25.99', description: 'Total del recibo' })
  total: string | null;

  @ApiProperty({ example: '27/08/2025', description: 'Fecha del recibo' })
  fecha: string | null;

  @ApiProperty({ example: 'Mercadona', description: 'Nombre del proveedor' })
  proveedor: string | null;

  @ApiProperty({ example: 'EUR', description: 'Moneda del recibo' })
  moneda: string | null;

  @ApiProperty({ description: 'Texto completo extraído del recibo' })
  textoCompleto: string | null;
}