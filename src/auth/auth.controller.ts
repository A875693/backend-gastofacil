import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('verify-token')
  @ApiOperation({
    summary: 'Verificar ID Token de Firebase',
    description: 'Valida token de Firebase y retorna información del usuario'
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido - usuario autenticado',
    schema: {
      example: {
        uid: 'firebase_uid_here',
        email: 'usuario@example.com',
        emailVerified: true
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado'
  })
  async verifyToken(@Body('idToken') idToken: string) {
    return this.authService.verifyToken(idToken);
  }
}
