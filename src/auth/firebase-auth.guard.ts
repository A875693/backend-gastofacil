import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AuthUser } from './types/auth-user.type';

export interface RequestWithUser extends Request {
  user?: AuthUser;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();

    const authHeader = req.headers['authorization'] as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta cabecera Authorization');
    }

    const idToken = authHeader.substring('Bearer '.length).trim();
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      // Lo que expones como "usuario autenticado" al resto de la app
      req.user = {
        firebaseUid: decoded.uid,
        email: decoded.email,
      };
      return true;
    } catch (e: any) {
      throw new UnauthorizedException('Token inválido: ', e);
    }
  }
}
