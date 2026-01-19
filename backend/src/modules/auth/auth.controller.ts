import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import type {
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CompleteOnboardingInput,
} from './auth.validators';

export class AuthController {
  private authService = new AuthService();

  /**
   * POST /v1/auth/login
   * Authenticate user and return tokens
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: LoginInput = req.body;
      const result = await this.authService.login(input.email, input.password);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/auth/logout
   * Logout user and revoke refresh tokens
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.user!.id);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/auth/refresh
   * Refresh access token using refresh token
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: RefreshTokenInput = req.body;
      const result = await this.authService.refreshToken(input.refreshToken);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/auth/forgot-password
   * Request password reset email
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: ForgotPasswordInput = req.body;
      await this.authService.forgotPassword(input.email);

      // Always return success for security (don't reveal if email exists)
      res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
      // Still return success even if an error occurred (security)
      res.json({ message: 'Password reset instructions sent to email' });
    }
  };

  /**
   * POST /v1/auth/reset-password
   * Reset password using token from email
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: ResetPasswordInput = req.body;
      await this.authService.resetPassword(input.token, input.password);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/auth/complete-onboarding
   * Complete first-time user setup
   */
  completeOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: CompleteOnboardingInput = req.body;
      const result = await this.authService.completeOnboarding(req.user!.id, input);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/user/me
   * Get current authenticated user
   */
  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getUserById(req.user!.id);

      res.json(user);
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton instance for convenience
export const authController = new AuthController();
