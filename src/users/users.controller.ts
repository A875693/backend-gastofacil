import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateDisplayNameDto } from './dto/update-display-name.dto';
import type { DecodedIdToken } from 'firebase-admin/auth';

@ApiTags('users')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly preferencesService: UserPreferencesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@GetUser() user: DecodedIdToken) {
    return this.usersService.findById(user.uid);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(@GetUser() user: DecodedIdToken, @Body() body: UpdateUserDto) {
    return this.usersService.update(user.uid, body);
  }

  @Patch('me/display-name')
  @ApiOperation({ summary: 'Update user display name' })
  @ApiResponse({ status: 200, description: 'Display name updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateDisplayName(@GetUser() user: DecodedIdToken, @Body() body: UpdateDisplayNameDto) {
    return this.usersService.updateDisplayName(user.uid, body.displayName);
  }

  @Get('me/preferences')
  @ApiOperation({ 
    summary: 'Get user preferences',
    description: 'Get user currency and notification preferences'
  })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully' })
  getUserPreferences(@GetUser() user: DecodedIdToken) {
    if (!user || !user.uid) {
      throw new BadRequestException('Invalid user token - no UID found');
    }
    
    return this.preferencesService.getUserPreferences(user.uid);
  }

  @Patch('me/preferences')
  @ApiOperation({ 
    summary: 'Update user preferences',
    description: 'Update user currency and notification preferences'
  })
  @ApiResponse({ status: 200, description: 'User preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid preference data' })
  updatePreferences(@GetUser() user: DecodedIdToken, @Body() body: UpdateUserPreferencesDto) {
    return this.preferencesService.updatePreferences(user.uid, body);
  }
}
