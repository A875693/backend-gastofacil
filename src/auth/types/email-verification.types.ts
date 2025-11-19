export interface AuthResponse {
  uid: string;
  email: string;
  displayName?: string;
  isEmailVerified: boolean;
  customToken?: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface VerificationStatusResponse {
  uid: string;
  email: string;
  isEmailVerified: boolean;
  lastVerificationSent?: Date;
}

export enum AuthErrorCodes {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED'
}

export class EmailNotVerifiedException extends Error {
  public readonly code = AuthErrorCodes.EMAIL_NOT_VERIFIED;
  
  constructor(email: string) {
    super(`Email ${email} no está verificado. Por favor verifica tu email antes de continuar.`);
    this.name = 'EmailNotVerifiedException';
  }
}