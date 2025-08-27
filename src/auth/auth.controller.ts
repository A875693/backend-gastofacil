import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario (Firebase)' })
  @ApiResponse({ status: 201, description: 'Usuario registrado correctamente' })
  async register(@Body() registerDto: RegisterDto) {
    const { email, password, name } = registerDto;
    return this.authService.register(email, password, name);
  }

  @Post('verify')
  @ApiOperation({
    summary:
      'Verificar un ID Token de Firebase (lo envía el cliente tras login)',
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido, devuelve información del usuario',
  })
  async verify(@Body('idToken') idToken: string) {
    return this.authService.verifyToken(idToken);
  }
}
