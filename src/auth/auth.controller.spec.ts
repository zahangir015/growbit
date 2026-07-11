jest.doMock('@nestjs/typeorm', () => ({
    InjectRepository: () => () => undefined,
}));

jest.doMock('typeorm', () => ({
    Repository: class Repository {},
    Entity: () => () => undefined,
    Column: () => () => undefined,
    PrimaryGeneratedColumn: () => () => undefined,
    OneToMany: () => () => undefined,
    ManyToOne: () => () => undefined,
    JoinColumn: () => () => undefined,
    RelationId: () => () => undefined,
    CreateDateColumn: () => () => undefined,
    UpdateDateColumn: () => () => undefined,
}));

import type { AuthService } from './auth.service';
import type { AuthCredentialsDto } from './dto/auth-credentials.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SignUpDto } from './dto/sign-up.dto';

const { AuthController } = require('./auth.controller') as typeof import('./auth.controller');

describe('AuthController', () => {
    let controller: InstanceType<typeof AuthController>;
    let mockAuthService: {
        createUser: jest.Mock;
        login: jest.Mock;
        forgotPassword: jest.Mock;
        resetPassword: jest.Mock;
    };

    beforeEach(() => {
        mockAuthService = {
            createUser: jest.fn(),
            login: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
        };

        controller = new AuthController(mockAuthService as unknown as AuthService);
    });

    it('creates a user through POST /auth/signup', async () => {
        const dto: SignUpDto = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'Password1!',
        };

        mockAuthService.createUser.mockResolvedValue(undefined);

        await expect(controller.signUp(dto)).resolves.toBeUndefined();
        expect(mockAuthService.createUser).toHaveBeenCalledWith(dto);
    });

    it('logs in through POST /auth/login', async () => {
        const dto: AuthCredentialsDto = { username: 'testuser', password: 'Password1!' };
        const response = { accessToken: 'jwt-token' };

        mockAuthService.login.mockResolvedValue(response);

        await expect(controller.login(dto)).resolves.toBe(response);
        expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });

    it('starts password reset through POST /auth/forgot-password', async () => {
        const dto: ForgotPasswordDto = { email: 'test@example.com' };
        const response = { message: 'Reset token generated', resetToken: 'reset-token' };

        mockAuthService.forgotPassword.mockResolvedValue(response);

        await expect(controller.forgotPassword(dto)).resolves.toBe(response);
        expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
    });

    it('resets a password through POST /auth/reset-password', async () => {
        const dto: ResetPasswordDto = { token: 'reset-token', password: 'NewPassword1!' };
        const response = { message: 'Password reset successfully' };

        mockAuthService.resetPassword.mockResolvedValue(response);

        await expect(controller.resetPassword(dto)).resolves.toBe(response);
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
    });
});
