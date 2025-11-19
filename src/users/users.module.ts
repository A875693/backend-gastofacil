import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserPreferencesService } from './services/user-preferences.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    UsersService,
    UserPreferencesService,
  ],
  controllers: [UsersController],
  exports: [UsersService, UserPreferencesService], // Export for use in other modules
})
export class UsersModule {}
