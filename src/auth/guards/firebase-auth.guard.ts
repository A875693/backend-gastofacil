import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token format invalid');
    }

    try {
      const decodedToken = await this.authService.verifyToken(token);
      request.user = decodedToken;
      
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = decodedToken.exp - now;
      const minutesRemaining = Math.floor(timeRemaining / 60);
      
      response.setHeader('X-Token-Expires-In', minutesRemaining.toString());
      
      if (minutesRemaining < 10) {
        response.setHeader('X-Token-Refresh-Suggested', 'true');
      }
      if (decodedToken.email) {
        this.usersService
          .syncEmailFromAuth(decodedToken.uid, decodedToken.email)
          .catch((error) => {
            this.logger.warn(
              `Failed to sync email for user ${decodedToken.uid}: ${error.message}`,
            );
          });
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
