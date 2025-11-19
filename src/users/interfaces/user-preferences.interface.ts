export interface UserPreferences {
  // Core Currency Settings
  preferredCurrency: string; // User's base currency (USD, EUR, GBP, etc.)
  displayCurrency?: string; // Currency for UI display (can differ from base)
  
  // Currency Display & Behavior
  currencyDisplayFormat: 'symbol' | 'code' | 'both'; // $100, 100 USD, $100 USD
  decimalPlaces: number; // Number of decimal places to show
  autoConversion: boolean; // Auto-convert or ask user
  
  // Exchange Rate Settings
  exchangeRateProvider: 'ecb' | 'xe' | 'currencyapi' | 'fixer'; // Preferred rate provider
  rateUpdateFrequency: 'realtime' | 'hourly' | 'daily'; // How often to fetch rates
  
  // Notification Preferences
  notifications: {
    newExpense: boolean;
    budgetAlerts: boolean;
    currencyRateChanges: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    unusualSpending: boolean;
  };
  
  // UI/UX Preferences
  theme: 'light' | 'dark' | 'auto';
  language: string; // ISO 639-1 code
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  firstDayOfWeek: 0 | 1 | 6; // Sunday=0, Monday=1, Saturday=6
  
  // Privacy & Security
  biometricAuth: boolean;
  sessionTimeout: number; // Minutes
  dataRetention: number; // Months
  
  // Feature Flags
  betaFeatures: boolean;
  analytics: boolean;
  crashReporting: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  // Basic Info
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  
  // Profile Details
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  
  // Location & Timezone
  country?: string;
  timezone: string;
  locale: string; // en-US, es-ES, etc.
  
  // Financial Profile
  defaultPaymentMethod?: string;
  preferredCurrency: string; // Duplicate for quick access
  monthlyIncome?: number;
  
  // App Metadata
  onboardingCompleted: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  
  // Feature Usage
  totalExpenses: number;
  totalBudgets: number;
  appVersion: string;
}

export interface UserCurrencySettings {
  baseCurrency: string;
  supportedCurrencies: string[];
  recentCurrencies: string[]; // Last 5 used currencies
  favoriteCurrencies: string[]; // User-starred currencies
  autoDetectCurrency: boolean; // Based on location/payment method
  conversionTolerancePercent: number; // For rate validation (default 0.5%)
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  push: {
    enabled: boolean;
    quietHours: {
      start: string; // HH:MM
      end: string; // HH:MM
    };
    types: string[];
  };
  inApp: {
    enabled: boolean;
    types: string[];
  };
}