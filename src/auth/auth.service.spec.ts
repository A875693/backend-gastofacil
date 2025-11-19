import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let authMock: jest.Mock;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    authMock = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: authMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    
    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', async () => {
      const mockToken = 'valid-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 600, // Issued 10 minutes ago
        exp: now + 3000, // Expires in 50 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyToken(mockToken);

      expect(result).toEqual(mockDecodedToken);
      expect(authMock).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid-token';
      authMock.mockRejectedValue(new Error('Token verification failed'));

      await expect(service.verifyToken(mockToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyToken(mockToken)).rejects.toThrow('Token inválido o expirado');
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const mockToken = 'expired-token';
      authMock.mockRejectedValue(new Error('Firebase ID token has expired'));

      await expect(service.verifyToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should log purple message when token is recently refreshed (< 5 min old)', async () => {
      const mockToken = 'fresh-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 60, // Issued 1 minute ago (recently refreshed)
        exp: now + 3540, // Expires in 59 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);

      await service.verifyToken(mockToken);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token refrescado detectado'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
      );
    });

    it('should NOT log purple message for old tokens (> 5 min old)', async () => {
      const mockToken = 'old-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 600, // Issued 10 minutes ago
        exp: now + 3000, // Expires in 50 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);

      await service.verifyToken(mockToken);

      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Token refrescado detectado'),
      );
    });

    it('should warn when token expires in less than 5 minutes', async () => {
      const mockToken = 'expiring-soon-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 3300, // Issued 55 minutes ago
        exp: now + 240, // Expires in 4 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.verifyToken(mockToken);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token próximo a expirar'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
      );
    });

    it('should NOT warn when token has more than 5 minutes remaining', async () => {
      const mockToken = 'valid-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 600,
        exp: now + 3000, // Expires in 50 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.verifyToken(mockToken);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should calculate time remaining correctly', async () => {
      const mockToken = 'valid-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 600,
        exp: now + 1800, // Expires in 30 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyToken(mockToken);

      expect(result).toEqual(mockDecodedToken);
      // Time calculations happen internally - verify no warnings for 30min expiry
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should handle token without iat field gracefully', async () => {
      const mockToken = 'token-without-iat';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        exp: now + 3600,
        // No iat field
      };

      authMock.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyToken(mockToken);

      expect(result).toEqual(mockDecodedToken);
      // Should not crash, should handle missing iat
    });

    it('should log error message when verification fails', async () => {
      const mockToken = 'invalid-token';
      const errorMessage = 'Invalid signature';
      authMock.mockRejectedValue(new Error(errorMessage));

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(service.verifyToken(mockToken)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });

    it('should handle different error types from Firebase', async () => {
      const mockToken = 'malformed-token';
      authMock.mockRejectedValue(new Error('Malformed JWT'));

      await expect(service.verifyToken(mockToken)).rejects.toThrow(UnauthorizedException);
      
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should return decoded token with uid and email', async () => {
      const mockToken = 'valid-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-456',
        email: 'another@example.com',
        iat: now - 300,
        exp: now + 3300,
      };

      authMock.mockResolvedValue(mockDecodedToken);

      const result = await service.verifyToken(mockToken);

      expect(result.uid).toBe('user-456');
      expect(result.email).toBe('another@example.com');
      expect(result.exp).toBe(now + 3300);
      expect(result.iat).toBe(now - 300);
    });

    it('should warn with exact minutes remaining when token expires soon', async () => {
      const mockToken = 'expiring-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 3420, // Issued 57 minutes ago
        exp: now + 180, // Expires in 3 minutes exactly
      };

      authMock.mockResolvedValue(mockDecodedToken);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.verifyToken(mockToken);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('3min'),
      );
    });

    it('should handle token expiring in exactly 5 minutes (boundary case)', async () => {
      const mockToken = 'boundary-token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 3300,
        exp: now + 300, // Exactly 5 minutes
      };

      authMock.mockResolvedValue(mockDecodedToken);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.verifyToken(mockToken);

      // Should NOT warn at exactly 5 minutes (< 5 check)
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should handle token expiring in 4 minutes 59 seconds (boundary case)', async () => {
      const mockToken = 'boundary-token-2';
      const now = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        iat: now - 3301,
        exp: now + 299, // 4 minutes 59 seconds
      };

      authMock.mockResolvedValue(mockDecodedToken);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.verifyToken(mockToken);

      // Should warn (< 5 minutes)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token próximo a expirar'),
      );
    });
  });
});
