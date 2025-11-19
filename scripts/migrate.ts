#!/usr/bin/env node

/**
 * Script CLI para ejecutar migración de normalización
 * 
 * Uso:
 *   npm run migrate:dry-run          # Simulación
 *   npm run migrate:execute          # Ejecución real
 *   npm run migrate:status           # Ver reportes
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = {
  log: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.log(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
};

interface CLIArgs {
  dryRun: boolean;
  execute: boolean;
  rollback: string | null;
  status: boolean;
  help: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    dryRun: false,
    execute: false,
    rollback: null,
    status: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '--execute':
        parsed.execute = true;
        break;
      case '--rollback':
        parsed.rollback = args[i + 1] || null;
        i++; // Saltar el siguiente argumento
        break;
      case '--status':
        parsed.status = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
🔧 Script de Migración de Normalización - GastoFácil

DESCRIPCIÓN:
  Migra categorías y métodos de pago de español a claves inglesas normalizadas.

USO:
  npm run migrate:dry-run          Ejecutar en modo simulación
  npm run migrate:execute          Ejecutar migración real
  npm run migrate:status           Mostrar estado y reportes
  npm run migrate:help             Mostrar esta ayuda

MAPEOS:
  Categorías:  alimentacion→food, transporte→transport, ocio→entertainment
  Métodos:     efectivo→cash, tarjeta→card, transferencia→transfer

⚠️  IMPORTANTE:
  - Siempre ejecuta migrate:dry-run primero
  - Asegúrate de tener backup de tu base de datos
  - El script crea backups automáticos antes de ejecutar

💡 TIP: Para usar la migración, inicia el servidor y usa los endpoints:
  POST /migration/normalize-data?dryRun=true   (simulación)
  POST /migration/normalize-data               (ejecución real)
  GET /migration/mappings                      (ver mapeos)
  `);
}

async function showStatus() {
  logger.log('� Para ver el estado actual:');
  console.log('1. Inicia el servidor: npm run start:dev');
  console.log('2. Ve a: http://localhost:3000/migration/mappings');
  console.log('3. O usa la documentación Swagger en: http://localhost:3000/api');
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  if (!args.dryRun && !args.execute && !args.rollback && !args.status) {
    logger.error('❌ Debes especificar una acción');
    console.log('💡 Opciones disponibles:');
    console.log('  npm run migrate:dry-run    - Simulación');
    console.log('  npm run migrate:execute    - Ejecución real');
    console.log('  npm run migrate:status     - Ver estado');
    console.log('  npm run migrate:help       - Ver ayuda');
    process.exit(1);
  }

  try {
    if (args.status) {
      await showStatus();
    } else if (args.rollback) {
      logger.log(`🔄 Para rollback de migración ${args.rollback}:`);
      console.log('1. Inicia el servidor: npm run start:dev');
      console.log('2. Usa el endpoint de rollback en la API');
    } else {
      // Instrucciones para migración
      const isDryRun = args.dryRun;
      
      if (isDryRun) {
        logger.log('🧪 MODO SIMULACIÓN');
        console.log('Para ejecutar la simulación:');
        console.log('1. Inicia el servidor: npm run start:dev');
        console.log('2. Haz petición a: POST /migration/normalize-data?dryRun=true');
        console.log('3. O usa Swagger: http://localhost:3000/api');
      } else {
        logger.warn('⚠️  MODO EJECUCIÓN REAL');
        logger.log('💾 Se creará backup automático antes de proceder');
        console.log('Para ejecutar la migración real:');
        console.log('1. Inicia el servidor: npm run start:dev');
        console.log('2. Haz petición a: POST /migration/normalize-data');
        console.log('3. O usa Swagger: http://localhost:3000/api');
      }
      
      console.log('\n📋 MAPEOS QUE SE APLICARÁN:');
      console.log('Categorías:');
      console.log('  alimentacion → food');
      console.log('  transporte → transport');
      console.log('  ocio → entertainment');
      console.log('  salud → health');
      console.log('  compras → shopping');
      console.log('  otros → other');
      console.log('\nMétodos de pago:');
      console.log('  efectivo → cash');
      console.log('  tarjeta → card');
      console.log('  transferencia → transfer');
    }
    
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  logger.log('🛑 Proceso interrumpido por usuario');
  process.exit(130);
});

process.on('SIGTERM', () => {
  logger.log('🛑 Proceso terminado');
  process.exit(143);
});

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    logger.error(`❌ Error no manejado: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}