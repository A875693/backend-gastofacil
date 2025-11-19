import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

interface ExchangeRateResponse {
  rate: number;
  timestamp: Date;
  source: 'cache' | 'api' | 'fallback';
}

interface ExchangeRateCache {
  [key: string]: {
    rate: number;
    timestamp: Date;
    ttl: Date;
  };
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly cache: ExchangeRateCache = {};
  private readonly CACHE_TTL_HOURS = 1;
  private readonly API_TIMEOUT_MS = 5000;
  
  private readonly fallbackRates: { [key: string]: number } = {
    'USD_EUR': 0.85,
    'EUR_USD': 1.18,
    'GBP_EUR': 1.15,
    'EUR_GBP': 0.87,
  };

  constructor() {}

  /**
   * Obtiene el tipo de cambio entre dos monedas con caché inteligente
   * Intenta API primero, luego usa caché o valores de respaldo
   * 
   * @param fromCurrency - Moneda origen
   * @param toCurrency - Moneda destino
   * @returns Tipo de cambio con metadata de fuente
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateResponse> {
    if (fromCurrency === toCurrency) {
      return { rate: 1, timestamp: new Date(), source: 'cache' };
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return { rate: cached.rate, timestamp: cached.timestamp, source: 'cache' };
    }

    try {
      const rate = await this.fetchFromExchangeRateAPI(fromCurrency, toCurrency);
      this.setCacheRate(cacheKey, rate);
      
      this.logger.log(`Fetched fresh rate ${fromCurrency}→${toCurrency}: ${rate}`);
      return { rate, timestamp: new Date(), source: 'api' };
      
    } catch (error) {
      this.logger.warn(`API failed for ${fromCurrency}→${toCurrency}, using fallback`);
      
      const fallbackRate = this.getFallbackRate(cacheKey);
      if (fallbackRate) {
        return { rate: fallbackRate, timestamp: new Date(), source: 'fallback' };
      }
      
      throw new HttpException(
        `Unable to get exchange rate for ${fromCurrency} to ${toCurrency}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Obtiene múltiples tipos de cambio en paralelo
   */
  async getBatchExchangeRates(pairs: Array<{from: string, to: string}>): Promise<ExchangeRateResponse[]> {
    const promises = pairs.map(pair => this.getExchangeRate(pair.from, pair.to));
    return Promise.all(promises);
  }

  /**
   * Consulta el tipo de cambio desde ExchangeRate-API
   */
  private async fetchFromExchangeRateAPI(fromCurrency: string, toCurrency: string): Promise<number> {
    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const rate = data?.rates?.[toCurrency];
      
      if (!rate || typeof rate !== 'number') {
        throw new Error(`Rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return rate;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`ExchangeRate API error: ${error.message}`);
    }
  }

  /**
   * Verifica si el tipo de cambio está en caché y sigue siendo válido
   */
  private getCachedRate(cacheKey: string): { rate: number; timestamp: Date } | null {
    const cached = this.cache[cacheKey];
    if (!cached) return null;
    
    if (new Date() > cached.ttl) {
      delete this.cache[cacheKey];
      return null;
    }
    
    return { rate: cached.rate, timestamp: cached.timestamp };
  }

  /**
   * Almacena el tipo de cambio en caché con TTL
   */
  private setCacheRate(cacheKey: string, rate: number): void {
    const now = new Date();
    const ttl = new Date(now.getTime() + this.CACHE_TTL_HOURS * 60 * 60 * 1000);
    
    this.cache[cacheKey] = {
      rate,
      timestamp: now,
      ttl
    };
  }

  /**
   * Obtiene tipo de cambio de respaldo cuando las APIs fallan
   * Intenta calcular el inverso si no existe el par directo
   */
  private getFallbackRate(cacheKey: string): number | null {
    const rate = this.fallbackRates[cacheKey];
    if (rate) return rate;
    
    const [from, to] = cacheKey.split('_');
    const reverseKey = `${to}_${from}`;
    const reverseRate = this.fallbackRates[reverseKey];
    
    return reverseRate ? 1 / reverseRate : null;
  }

  /**
   * Limpia el caché de tipos de cambio
   */
  clearCache(): void {
    Object.keys(this.cache).forEach(key => delete this.cache[key]);
    this.logger.log('Exchange rate cache cleared');
  }

  /**
   * Obtiene estadísticas del caché
   */
  getCacheStats(): { entries: number; oldestEntry: Date | null } {
    const entries = Object.keys(this.cache).length;
    const timestamps = Object.values(this.cache).map(entry => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
    
    return { entries, oldestEntry };
  }
}