import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard'; // 👈 cambiamos a Firebase
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser } from '../auth/types/auth-user.type'; // 👈 para tipar req.user

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(FirebaseAuthGuard) // 👈 usamos el guard de Firebase
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de usuario obtenido correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @Get('me')
  getProfile(@Req() req: { user: AuthUser }) {
    // 👈 tipado fuerte de req.user
    return this.usersService.findById(req.user.firebaseUid);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar el perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de usuario actualizado correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @Patch('me')
  updateProfile(@Req() req: { user: AuthUser }, @Body() body: UpdateUserDto) {
    return this.usersService.update(req.user.firebaseUid, body);
  }
}
