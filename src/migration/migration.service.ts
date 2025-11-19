import { Injectable, Logger, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  MigrationMapping,
  MigrationBackup,
  MigrationReport,
  ValidationResult,
} from './interfaces/migration.interface';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(@Inject('FIREBASE_ADMIN') private admin: admin.app.App) {}

  private get firestore() {
    return this.admin.firestore();
  }

  /**
   * Mapeos bidireccionales para normalización (case-insensitive)
   */
  private readonly CATEGORY_MAPPING: Record<string, string> = {
    // Mapeos originales requeridos
    'alimentacion': 'food',
    'transporte': 'transport', 
    'ocio': 'entertainment',
    'salud': 'health',
    'compras': 'shopping',
    'otros': 'other',
    // Mapeos adicionales encontrados en la BD
    'tecnologia': 'technology',
    'hogar': 'home',
    // Variaciones con mayúsculas y acentos
    'Alimentacion': 'food',
    'Alimentación': 'food',
    'Transporte': 'transport',
    'Ocio': 'entertainment', 
    'Salud': 'health',
    'Compras': 'shopping',
    'Otros': 'other',
    'Tecnología': 'technology',
    'Hogar': 'home',
    // Variaciones adicionales comunes
    'comida': 'food',
    'entretenimiento': 'entertainment',
    'casa': 'home',
    'educacion': 'education',
    'educación': 'education',
    'Educacion': 'education',
    'Educación': 'education',
    'vestimenta': 'clothing',
    'ropa': 'clothing',
    'Vestimenta': 'clothing',
    'Ropa': 'clothing',
    'viajes': 'travel',
    'Viajes': 'travel',
    'servicios': 'services',
    'Servicios': 'services',
    'seguros': 'insurance',
    'Seguros': 'insurance',
    'gasolina': 'fuel',
    'Gasolina': 'fuel',
    'combustible': 'fuel',
    'Combustible': 'fuel',
    'medico': 'health',
    'médico': 'health',
    'Medico': 'health',
    'Médico': 'health',
    'farmacia': 'health',
    'Farmacia': 'health',
    'supermercado': 'food',
    'Supermercado': 'food',
    'restaurante': 'food',
    'Restaurante': 'food',
  };

  private readonly PAYMENT_METHOD_MAPPING: Record<string, string> = {
    // Mapeos originales requeridos
    'efectivo': 'cash',
    'tarjeta': 'card',
    'transferencia': 'transfer',
    // Mapeos adicionales encontrados en la BD
    'paypal': 'paypal',
    // Variaciones con mayúsculas
    'Efectivo': 'cash',
    'Tarjeta': 'card', 
    'Transferencia': 'transfer',
    'PayPal': 'paypal',
    'Paypal': 'paypal',
    'PAYPAL': 'paypal',
    // Variaciones adicionales comunes
    'tarjeta de crédito': 'card',
    'tarjeta de credito': 'card',
    'Tarjeta de Crédito': 'card',
    'Tarjeta de Credito': 'card',
    'credito': 'card',
    'crédito': 'card',
    'Credito': 'card',
    'Crédito': 'card',
    'débito': 'card',
    'debito': 'card',
    'Débito': 'card',
    'Debito': 'card',
    'bizum': 'bizum',
    'Bizum': 'bizum',
    'BIZUM': 'bizum',
    'banco': 'transfer',
    'Banco': 'transfer',
    'cuenta': 'transfer',
    'Cuenta': 'transfer',
    'online': 'transfer',
    'Online': 'transfer',
  };

  private readonly REVERSE_CATEGORY_MAPPING: Record<string, string> = Object.fromEntries(
    Object.entries(this.CATEGORY_MAPPING).map(([k, v]) => [v, k])
  );

  private readonly REVERSE_PAYMENT_METHOD_MAPPING: Record<string, string> = Object.fromEntries(
    Object.entries(this.PAYMENT_METHOD_MAPPING).map(([k, v]) => [v, k])
  );

  /**
   * Ejecuta migración completa con validación y backup
   */
  async runMigration(options: { dryRun?: boolean } = {}): Promise<MigrationReport> {
    const migrationId = `migration_${Date.now()}`;
    const startTime = new Date().toISOString();
    
    this.logger.log(`🚀 Iniciando migración ${migrationId} - DryRun: ${options.dryRun || false}`);

    const report: MigrationReport = {
      migrationId,
      startTime,
      endTime: '',
      status: 'failed',
      totalDocumentsProcessed: 0,
      totalDocumentsUpdated: 0,
      errors: [],
      warnings: [],
      mapping: {
        categories: this.CATEGORY_MAPPING,
        paymentMethods: this.PAYMENT_METHOD_MAPPING,
      },
    };

    try {
      // 1. Validación pre-migración
      this.logger.log('📋 Ejecutando validación pre-migración...');
      const validation = await this.validateBeforeMigration();
      
      if (!validation.isValid) {
        report.errors.push('Validación pre-migración falló');
        report.errors.push(...validation.errors);
        return report;
      }

      report.warnings.push(...validation.warnings);

      // 2. Crear backup (solo si no es dry-run)
      let backup: MigrationBackup | null = null;
      if (!options.dryRun) {
        this.logger.log('💾 Creando backup automático...');
        backup = await this.createBackup(migrationId);
        this.logger.log(`Backup creado: ${backup.documentBackups.length} documentos`);
      }

      // 3. Ejecutar migración
      this.logger.log('🔄 Ejecutando migración de documentos...');
      const migrationResult = await this.migrateDocuments(options.dryRun || false);
      
      report.totalDocumentsProcessed = migrationResult.processed;
      report.totalDocumentsUpdated = migrationResult.updated;

      // 4. Validación post-migración
      if (!options.dryRun) {
        this.logger.log('✅ Ejecutando validación post-migración...');
        const postValidation = await this.validateAfterMigration();
        
        if (!postValidation.isValid) {
          this.logger.error('❌ Validación post-migración falló, ejecutando rollback...');
          if (backup) {
            await this.rollback(backup);
          }
          report.errors.push('Validación post-migración falló, rollback ejecutado');
          report.errors.push(...postValidation.errors);
          return report;
        }
      }

      report.status = 'success';
      this.logger.log(`✅ Migración ${migrationId} completada exitosamente`);

    } catch (error) {
      this.logger.error(`❌ Error durante migración: ${error.message}`);
      report.errors.push(`Error durante migración: ${error.message}`);
      
      // Intentar rollback si hay error
      if (!options.dryRun) {
        try {
          const backup = await this.getLatestBackup(migrationId);
          if (backup) {
            await this.rollback(backup);
            report.status = 'rollback';
            this.logger.log('🔄 Rollback ejecutado exitosamente');
          }
        } catch (rollbackError) {
          this.logger.error(`❌ Error durante rollback: ${rollbackError.message}`);
          report.errors.push(`Error durante rollback: ${rollbackError.message}`);
        }
      }
    }

    report.endTime = new Date().toISOString();
    
    // Guardar reporte
    if (!options.dryRun) {
      await this.saveReport(report);
    }

    return report;
  }

  /**
   * Validación antes de la migración
   */
  private async validateBeforeMigration(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        totalDocuments: 0,
        invalidCategories: [],
        invalidPaymentMethods: [],
      },
    };

    try {
      const expensesSnapshot = await this.firestore.collection('expenses').get();
      result.stats.totalDocuments = expensesSnapshot.size;

      const categoriesFound = new Set<string>();
      const paymentMethodsFound = new Set<string>();

      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.category) {
          categoriesFound.add(data.category);
          if (!this.CATEGORY_MAPPING[data.category] && !this.REVERSE_CATEGORY_MAPPING[data.category]) {
            result.stats.invalidCategories.push(data.category);
          }
        }

        if (data.paymentMethod) {
          paymentMethodsFound.add(data.paymentMethod);
          if (!this.PAYMENT_METHOD_MAPPING[data.paymentMethod] && !this.REVERSE_PAYMENT_METHOD_MAPPING[data.paymentMethod]) {
            result.stats.invalidPaymentMethods.push(data.paymentMethod);
          }
        }
      });

      // Eliminar duplicados
      result.stats.invalidCategories = [...new Set(result.stats.invalidCategories)];
      result.stats.invalidPaymentMethods = [...new Set(result.stats.invalidPaymentMethods)];

      if (result.stats.invalidCategories.length > 0) {
        result.warnings.push(`Categorías no reconocidas: ${result.stats.invalidCategories.join(', ')}`);
      }

      if (result.stats.invalidPaymentMethods.length > 0) {
        result.warnings.push(`Métodos de pago no reconocidos: ${result.stats.invalidPaymentMethods.join(', ')}`);
      }

      this.logger.log(`Validación: ${result.stats.totalDocuments} documentos, ${categoriesFound.size} categorías únicas, ${paymentMethodsFound.size} métodos de pago únicos`);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Error durante validación: ${error.message}`);
    }

    return result;
  }

  /**
   * Migra todos los documentos aplicando normalización robusta
   */
  private async migrateDocuments(executeChanges: boolean): Promise<{ processed: number; updated: number }> {
    let processed = 0;
    let updated = 0;

    const batch = this.firestore.batch();
    const expensesSnapshot = await this.firestore.collection('expenses').get();

    for (const doc of expensesSnapshot.docs) {
      processed++;
      const data = doc.data();
      let hasChanges = false;
      const updatedData: any = {};

      // Migrar categoría con normalización case-insensitive
      if (data.category) {
        const normalizedCategory = this.normalizeCategory(data.category);
        if (normalizedCategory && normalizedCategory !== data.category) {
          updatedData.category = normalizedCategory;
          hasChanges = true;
          this.logger.debug(`Doc ${doc.id}: category ${data.category} → ${normalizedCategory}`);
        }
      }

      // Migrar método de pago con normalización case-insensitive
      if (data.paymentMethod) {
        const normalizedPaymentMethod = this.normalizePaymentMethod(data.paymentMethod);
        if (normalizedPaymentMethod && normalizedPaymentMethod !== data.paymentMethod) {
          updatedData.paymentMethod = normalizedPaymentMethod;
          hasChanges = true;
          this.logger.debug(`Doc ${doc.id}: paymentMethod ${data.paymentMethod} → ${normalizedPaymentMethod}`);
        }
      }

      // Agregar metadata de migración
      if (hasChanges) {
        updatedData.migratedAt = admin.firestore.FieldValue.serverTimestamp();
        updatedData.migrationVersion = '1.0.0';
        
        // Solo agregar campos originales si existen
        if (data.category) {
          updatedData.originalCategory = data.category;
        }
        if (data.paymentMethod) {
          updatedData.originalPaymentMethod = data.paymentMethod;
        }
        
        if (executeChanges) {
          batch.update(doc.ref, updatedData);
        }
        updated++;
      }
    }

    if (executeChanges && updated > 0) {
      await batch.commit();
      this.logger.log(`📝 Batch commit realizado: ${updated} documentos actualizados`);
    } else if (executeChanges) {
      this.logger.log(`ℹ️ No hay documentos que requieran actualización`);
    }

    return { processed, updated };
  }

  /**
   * Normaliza categoría aplicando mapeo case-insensitive
   */
  private normalizeCategory(category: string): string | null {
    if (!category) return null;
    
    // Buscar coincidencia exacta primero
    if (this.CATEGORY_MAPPING[category]) {
      return this.CATEGORY_MAPPING[category];
    }
    
    // Buscar coincidencia case-insensitive
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(this.CATEGORY_MAPPING)) {
      if (key.toLowerCase() === lowerCategory) {
        return value;
      }
    }
    
    // Si ya está en inglés normalizado, mantenerlo
    const normalizedValues = Object.values(this.CATEGORY_MAPPING);
    if (normalizedValues.includes(category.toLowerCase())) {
      return category.toLowerCase();
    }
    
    return null;
  }

  /**
   * Normaliza método de pago aplicando mapeo case-insensitive
   */
  private normalizePaymentMethod(paymentMethod: string): string | null {
    if (!paymentMethod) return null;
    
    // Buscar coincidencia exacta primero
    if (this.PAYMENT_METHOD_MAPPING[paymentMethod]) {
      return this.PAYMENT_METHOD_MAPPING[paymentMethod];
    }
    
    // Buscar coincidencia case-insensitive
    const lowerPaymentMethod = paymentMethod.toLowerCase();
    for (const [key, value] of Object.entries(this.PAYMENT_METHOD_MAPPING)) {
      if (key.toLowerCase() === lowerPaymentMethod) {
        return value;
      }
    }
    
    // Si ya está en inglés normalizado, mantenerlo
    const normalizedValues = Object.values(this.PAYMENT_METHOD_MAPPING);
    if (normalizedValues.includes(paymentMethod.toLowerCase())) {
      return paymentMethod.toLowerCase();
    }
    
    return null;
  }

  /**
   * Crear backup completo
   */
  private async createBackup(migrationId: string): Promise<MigrationBackup> {
    const backup: MigrationBackup = {
      timestamp: new Date().toISOString(),
      migrationId,
      affectedCollections: ['expenses'],
      documentBackups: [],
    };

    const expensesSnapshot = await this.firestore.collection('expenses').get();
    
    expensesSnapshot.forEach(doc => {
      backup.documentBackups.push({
        collection: 'expenses',
        docId: doc.id,
        originalData: doc.data(),
      });
    });

    // Guardar backup en Firestore
    await this.firestore.collection('migration_backups').doc(migrationId).set(backup);
    
    return backup;
  }

  /**
   * Ejecutar rollback completo
   */
  async rollback(backup: MigrationBackup): Promise<void> {
    this.logger.log(`🔄 Iniciando rollback desde backup ${backup.migrationId}...`);

    const batch = this.firestore.batch();
    
    for (const docBackup of backup.documentBackups) {
      const docRef = this.firestore.collection(docBackup.collection).doc(docBackup.docId);
      batch.set(docRef, docBackup.originalData);
    }

    await batch.commit();
    this.logger.log(`✅ Rollback completado: ${backup.documentBackups.length} documentos restaurados`);
  }

  /**
   * Validación después de la migración
   */
  private async validateAfterMigration(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        totalDocuments: 0,
        invalidCategories: [],
        invalidPaymentMethods: [],
      },
    };

    try {
      const expensesSnapshot = await this.firestore.collection('expenses').get();
      result.stats.totalDocuments = expensesSnapshot.size;

      let migratedCount = 0;

      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.migratedAt) {
          migratedCount++;
        }

        // Verificar que solo existan valores en inglés (usar valores válidos finales)
        const validCategories = new Set([
          ...Object.values(this.CATEGORY_MAPPING),
          'food', 'transport', 'entertainment', 'health', 'shopping', 'other', 'technology', 'home', 
          'education', 'clothing', 'travel', 'services', 'insurance', 'fuel'
        ]);

        const validPaymentMethods = new Set([
          ...Object.values(this.PAYMENT_METHOD_MAPPING),
          'cash', 'card', 'transfer', 'paypal', 'bizum'
        ]);

        if (data.category && !validCategories.has(data.category)) {
          result.errors.push(`Documento ${doc.id} aún tiene categoría en español: ${data.category}`);
        }

        if (data.paymentMethod && !validPaymentMethods.has(data.paymentMethod)) {
          result.errors.push(`Documento ${doc.id} aún tiene método de pago en español: ${data.paymentMethod}`);
        }
      });

      this.logger.log(`Post-validación: ${migratedCount} documentos marcados como migrados`);

      if (result.errors.length > 0) {
        result.isValid = false;
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Error durante validación post-migración: ${error.message}`);
    }

    return result;
  }

  /**
   * Obtener el último backup para un migrationId
   */
  private async getLatestBackup(migrationId: string): Promise<MigrationBackup | null> {
    try {
      const doc = await this.firestore.collection('migration_backups').doc(migrationId).get();
      return doc.exists ? doc.data() as MigrationBackup : null;
    } catch (error) {
      this.logger.error(`Error obteniendo backup: ${error.message}`);
      return null;
    }
  }

  /**
   * Guardar reporte de migración
   */
  private async saveReport(report: MigrationReport): Promise<void> {
    await this.firestore.collection('migration_reports').doc(report.migrationId).set(report);
    this.logger.log(`📊 Reporte guardado: migration_reports/${report.migrationId}`);
  }

  /**
   * Obtener mapeos para referencia externa
   */
  getMappings(): MigrationMapping {
    return {
      categories: this.CATEGORY_MAPPING,
      paymentMethods: this.PAYMENT_METHOD_MAPPING,
    };
  }

  /**
   * Obtener mapeos inversos para rollback
   */
  getReverseMappings(): MigrationMapping {
    return {
      categories: this.REVERSE_CATEGORY_MAPPING,
      paymentMethods: this.REVERSE_PAYMENT_METHOD_MAPPING,
    };
  }
}