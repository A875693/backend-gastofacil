import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, AuthModule, UsersModule],
  providers: [MigrationService],
  controllers: [MigrationController],
  exports: [MigrationService],
})
export class MigrationModule {}