import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });
  }

  /**
   * Escanea un recibo usando Google Cloud Vision API y extrae campos clave
   * MODO DEMO: Simula OCR sin Google Cloud (para testing sin facturación)
   */
  async scanReceipt(imageBuffer: Buffer): Promise<{
    total: string | null;
    fecha: string | null;
    proveedor: string | null;
    moneda: string | null;
    textoCompleto: string | null;
  }> {
    this.logger.log('MODO DEMO: Simulando escaneo de recibo (sin Google Vision API)');

    // Simular datos extraídos para testing
    const mockData = {
      total: '25.99',
      fecha: new Date().toLocaleDateString('es-ES'),
      proveedor: 'Supermercado Demo',
      moneda: 'EUR',
      textoCompleto: 'SUPERMERCADO DEMO\nFecha: ' + new Date().toLocaleDateString('es-ES') + '\nTotal: 25.99 EUR\nGracias por su compra',
    };

    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.logger.log('MODO DEMO: Datos extraídos simulados', mockData);
    return mockData;

    /* CÓDIGO REAL (descomentar cuando habilites facturación):
    try {
      this.logger.log('Iniciando escaneo de recibo con Google Vision API');

      const [result] = await this.client.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        throw new BadRequestException('No se detectó texto en el recibo');
      }

      const fullText = detections[0].description || '';
      this.logger.log(`Texto extraído correctamente`);

      const extractedData = this.extractReceiptFields(fullText);

      return {
        ...extractedData,
        textoCompleto: fullText,
      };
    } catch (error) {
      this.logger.error(`Error procesando recibo: ${error.message}`);
      throw new BadRequestException(`Error procesando recibo: ${error.message}`);
    }
    */
  }

  /**
   * Extrae campos específicos del texto usando patrones regex
   */
  private extractReceiptFields(text: string): {
    total: string | null;
    fecha: string | null;
    proveedor: string | null;
    moneda: string | null;
  } {
    const lines = text.split('\n').filter(line => line.trim());

    // Extraer total con patrones mejorados
    const totalPatterns = [
      /total[:\s]*(\d+[.,]\d{2})\s?(EUR|€|USD|\$)?/i,
      /suma[:\s]*(\d+[.,]\d{2})\s?(EUR|€|USD|\$)?/i,
      /importe[:\s]*(\d+[.,]\d{2})\s?(EUR|€|USD|\$)?/i,
      /(\d+[.,]\d{2})\s?(EUR|€|USD|\$)?\s*$/m, // Número al final de línea
    ];

    let total: string | null = null;
    let moneda: string | null = null;

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        total = match[1]?.replace(',', '.') || null;
        moneda = match[2] || 'EUR';
        break;
      }
    }

    // Extraer fecha con múltiples formatos
    const datePatterns = [
      /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/,
      /\b(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,
      /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i, // "15 de enero de 2025"
    ];

    let fecha: string | null = null;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        fecha = match[1];
        break;
      }
    }

    // Extraer proveedor (primeras líneas que no sean números)
    let proveedor: string | null = null;
    for (const line of lines.slice(0, 3)) {
      if (line.length > 3 && !/^\d+/.test(line) && !/fecha|total|suma/i.test(line)) {
        proveedor = line.trim();
        break;
      }
    }

    return {
      total,
      fecha,
      proveedor,
      moneda: moneda || 'EUR',
    };
  }
}