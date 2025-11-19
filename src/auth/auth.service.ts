/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Verifica el ID token enviado por el cliente
   * Usado por FirebaseAuthGuard para autenticar requests
   */
  async verifyToken(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Calcular tiempo restante del token
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = decodedToken.exp;
      const timeRemaining = expiresAt - now;
      const minutesRemaining = Math.floor(timeRemaining / 60);
      
      // Log con color morado cuando detectamos un token recién refrescado
      // (menos de 5 minutos de antigüedad indica que acaba de ser renovado)
      const tokenAge = now - (decodedToken.iat || now);
      if (tokenAge < 300) { // Menos de 5 minutos de antigüedad
        this.logger.log(`\x1b[35m🔄 Token refrescado detectado - Usuario: ${decodedToken.email} (Válido por ${minutesRemaining}min)\x1b[0m`);
      }
      
      // Advertencia si el token está próximo a expirar (menos de 5 minutos)
      if (minutesRemaining < 5) {
        this.logger.warn(`⚠️  Token próximo a expirar en ${minutesRemaining}min - Usuario: ${decodedToken.email}`);
      }
      
      return decodedToken; // contiene uid, email, etc.
    } catch (error) {
      this.logger.error(`❌ Error verificando token: ${error.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
