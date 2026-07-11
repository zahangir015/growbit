import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-payload.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { createHash, randomBytes } from 'crypto';
import { SignUpDto } from './dto/sign-up.dto';

const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) {}

    async createUser(signUpDto: SignUpDto): Promise<void> {
        const { username, email, password } = signUpDto;

        const salt = await bcrypt.genSalt();

        const user = this.userRepository.create({
            username,
            email,
            password: await bcrypt.hash(password, salt), // In a real application, you should hash the password before saving it
        });

        try {
            await this.userRepository.save(user);
        } catch (error: unknown) {
            if (isPostgresError(error) && error.code === '23505') {
                throw new ConflictException('Username or email already exists');
            }

            throw new InternalServerErrorException('Failed to create user');
        }
    }

    async login(authCredentialsDto: AuthCredentialsDto): Promise<{ accessToken: string }> {
        const { username, password } = authCredentialsDto;

        const user = await this.userRepository.findOne({ where: { username } });

        if (user && await bcrypt.compare(password, user.password)) {
            const payload : JwtPayload = { username };

            const accessToken = this.jwtService.sign(payload);

            return { accessToken };
        } else {
            throw new InternalServerErrorException('Invalid credentials');
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; resetToken?: string }> {
        const { email } = forgotPasswordDto;
        const user = await this.userRepository.findOne({ where: { email } });
        const message = 'If that user exists, a password reset token has been generated';

        if (!user) {
            return { message };
        }

        const resetToken = randomBytes(32).toString('hex');
        user.password_reset_token = this.hashResetToken(resetToken);
        user.password_reset_expires_at = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

        try {
            await this.userRepository.save(user);
        } catch {
            throw new InternalServerErrorException('Failed to create password reset token');
        }

        return { message, resetToken };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const { token, password } = resetPasswordDto;
        const passwordResetToken = this.hashResetToken(token);
        const user = await this.userRepository.findOne({ where: { password_reset_token: passwordResetToken } });

        if (!user || !user.password_reset_expires_at || user.password_reset_expires_at.getTime() < Date.now()) {
            throw new BadRequestException('Invalid or expired password reset token');
        }

        user.password = await bcrypt.hash(password, await bcrypt.genSalt());
        user.password_reset_token = null;
        user.password_reset_expires_at = null;

        try {
            await this.userRepository.save(user);
        } catch {
            throw new InternalServerErrorException('Failed to reset password');
        }

        return { message: 'Password reset successfully' };
    }

    private hashResetToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}

function isPostgresError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}
