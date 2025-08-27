/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  /**
   * Registra un nuevo usuario en Firebase Authentication
   */
  async register(email: string, password: string, name?: string) {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Error registrando usuario: ${error.message}`,
      );
    }
  }

  /**
   * Verifica el ID token enviado por el cliente
   * (lo genera Firebase en el login desde el móvil/web)
   */
  async verifyToken(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken; // contiene uid, email, etc.
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado: ', error);
    }
  }
}
