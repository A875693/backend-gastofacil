#!/usr/bin/env node

/**
 * Script CLI para ejecutar migración de normalización DIRECTAMENTE
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

// Cargar variables de entorno desde directorio padre
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const logger = new Logger('MigrationCLI');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  try {
    logger.log('🚀 Inicializando aplicación...');
    
    // Importar módulos usando require para evitar problemas de tipos
    const AppModule = require('../src/app.module').AppModule;
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
    
    const MigrationService = require('../src/migration/migration.service').MigrationService;
    const migrationService = app.get(MigrationService);

    if (isDryRun) {
      logger.log('🧪 EJECUTANDO SIMULACIÓN...');
    } else {
      logger.log('⚡ EJECUTANDO MIGRACIÓN REAL...');
    }

    // Ejecutar migración
    const report = await migrationService.runMigration({ dryRun: isDryRun });

    // Mostrar resultados
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESULTADO DE MIGRACIÓN`);
    console.log('='.repeat(60));
    console.log(`Estado: ${report.status}`);
    console.log(`Documentos procesados: ${report.totalDocumentsProcessed}`);
    console.log(`Documentos actualizados: ${report.totalDocumentsUpdated}`);
    console.log(`Duración: ${new Date(report.startTime).toLocaleTimeString()} → ${new Date(report.endTime).toLocaleTimeString()}`);

    if (report.warnings.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      report.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (report.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      report.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (report.status === 'success') {
      if (isDryRun) {
        console.log('\n✅ SIMULACIÓN COMPLETADA');
        console.log('💡 Para ejecutar en serio: npx ts-node scripts/migrate.ts --execute');
      } else {
        console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('✅ Datos normalizados correctamente');
      }
    } else {
      console.log('\n❌ MIGRACIÓN FALLÓ');
      process.exit(1);
    }

    console.log('='.repeat(60));
    
    await app.close();
    
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n🛑 Migración cancelada por usuario');
  process.exit(130);
});

// Ejecutar
main().catch(error => {
  console.error(`❌ Error fatal: ${error.message}`);
  process.exit(1);
});