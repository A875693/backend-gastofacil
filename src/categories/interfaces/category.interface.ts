// Categoría base del sistema (hardcoded)
export interface BaseCategory {
  id: string;
  name: string; // Same as id for i18n translation
  icon: string;
  color: string;
  gradient: string;
  isCustom: false;
}

// Categoría personalizada del usuario
export interface CustomCategory {
  id?: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  isCustom: true;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Metadata de categorías
export interface CategoriesMetadata {
  customCount: number;
  maxCustom: number;
  canCreateMore: boolean;
}

// Response combinado
export interface CategoriesResponse {
  base: BaseCategory[];
  custom: CustomCategory[];
  metadata: CategoriesMetadata;
}

// Response de validación de uso
export interface CategoryUsageResponse {
  count: number;
  canDelete: boolean;
  message?: string;
}

// Response de validación de nombre
export interface CategoryValidationResponse {
  available: boolean;
  existingId?: string;
  message?: string;
}
