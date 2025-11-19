export interface MigrationMapping {
  categories: Record<string, string>;
  paymentMethods: Record<string, string>;
}

export interface MigrationBackup {
  timestamp: string;
  migrationId: string;
  affectedCollections: string[];
  documentBackups: Array<{
    collection: string;
    docId: string;
    originalData: any;
  }>;
}

export interface MigrationReport {
  migrationId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'failed' | 'rollback';
  totalDocumentsProcessed: number;
  totalDocumentsUpdated: number;
  errors: string[];
  warnings: string[];
  mapping: MigrationMapping;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalDocuments: number;
    invalidCategories: string[];
    invalidPaymentMethods: string[];
  };
}