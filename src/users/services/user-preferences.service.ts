import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UpdateUserPreferencesDto } from '../dto/update-user-preferences.dto';

// Interfaces simplificadas
export interface UserPreferences {
  preferredCurrency: string;
  showOriginalAmounts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: string;
  language: string;
  preferredPaymentMethod?: string; // Nueva propiedad
}

@Injectable()
export class UserPreferencesService {
  private readonly usersCollection = admin.firestore().collection('users');

  /**
   * Obtiene las preferencias del usuario desde su documento
   */
  async getUserPreferences(uid: string): Promise<UserPreferences> {
    if (!uid || uid.trim() === '') {
      throw new BadRequestException('User ID is required and cannot be empty');
    }

    const doc = await this.usersCollection.doc(uid).get();
    
    if (!doc.exists) {
      const defaultPreferences = {
        preferredCurrency: 'EUR',
        showOriginalAmounts: false,
        emailNotifications: true,
        pushNotifications: true,
        theme: 'auto',
        language: 'en',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await this.usersCollection.doc(uid).set(defaultPreferences);
      
      return {
        preferredCurrency: 'EUR',
        showOriginalAmounts: false,
        emailNotifications: true,
        pushNotifications: true,
        theme: 'auto',
        language: 'en',
      };
    }

    const userData = doc.data();
    
    const needsMigration = userData && (
      userData.autoConvert !== undefined || 
      userData.showOriginalAmounts === undefined
    );
    
    if (needsMigration) {
      const migrationData: any = {};
      
      if (userData.autoConvert !== undefined) {
        migrationData.autoConvert = admin.firestore.FieldValue.delete();
      }
      
      if (userData.showOriginalAmounts === undefined) {
        migrationData.showOriginalAmounts = false;
      }
      
      migrationData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      await this.usersCollection.doc(uid).update(migrationData);
    }
    
    return {
      preferredCurrency: userData?.preferredCurrency || 'EUR',
      showOriginalAmounts: userData?.showOriginalAmounts ?? false,
      emailNotifications: userData?.emailNotifications ?? true,
      pushNotifications: userData?.pushNotifications ?? true,
      theme: userData?.theme || 'auto',
      language: userData?.language || 'en',
      preferredPaymentMethod: userData?.preferredPaymentMethod,
    };
  }

  /**
   * Actualiza las preferencias del usuario
   */
  async updatePreferences(uid: string, updates: UpdateUserPreferencesDto): Promise<UserPreferences> {
    if (!uid || uid.trim() === '') {
      throw new BadRequestException('User ID is required and cannot be empty');
    }

    const preferredCurrency = updates.currency?.preferredCurrency;
    const showOriginalAmounts = updates.currency?.showOriginalAmounts;
    const emailNotifications = updates.notifications?.emailNotifications || updates.emailNotifications;
    const pushNotifications = updates.notifications?.pushNotifications || updates.pushNotifications;
    const theme = updates.ui?.theme;
    const language = updates.ui?.language;
    const preferredPaymentMethod = updates.preferredPaymentMethod;

    if (preferredCurrency) {
      this.validateCurrency(preferredCurrency);
    }

    if (preferredPaymentMethod) {
      this.validatePaymentMethod(preferredPaymentMethod);
    }
    
    const updateData: any = {};
    
    if (preferredCurrency !== undefined) {
      updateData.preferredCurrency = preferredCurrency;
    }
    
    if (showOriginalAmounts !== undefined) {
      updateData.showOriginalAmounts = showOriginalAmounts;
    }
    
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }
    
    if (pushNotifications !== undefined) {
      updateData.pushNotifications = pushNotifications;
    }
    
    if (theme !== undefined) {
      updateData.theme = theme;
    }
    
    if (language !== undefined) {
      updateData.language = language;
    }

    if (preferredPaymentMethod !== undefined) {
      updateData.preferredPaymentMethod = preferredPaymentMethod;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await this.usersCollection.doc(uid).set(updateData, { merge: true });
    
    return this.getUserPreferences(uid);
  }

  /**
   * Valida que el código de moneda sea soportado
   */
  private validateCurrency(currency: string): void {
    const supportedCurrencies = [
      'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
      'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'INR',
      'BRL', 'ZAR', 'RUB', 'TRY'
    ];
    
    if (!supportedCurrencies.includes(currency)) {
      throw new BadRequestException(`Currency ${currency} is not supported`);
    }
  }

  /**
   * Valida que el método de pago sea soportado
   */
  private validatePaymentMethod(paymentMethod: string): void {
    const supportedPaymentMethods = ['CARD', 'CASH', 'TRANSFER', 'BIZUM', 'PAYPAL'];
    
    if (!supportedPaymentMethods.includes(paymentMethod)) {
      throw new BadRequestException(`Payment method ${paymentMethod} is not supported`);
    }
  }
}