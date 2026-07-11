import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-payload.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { createHash, randomBytes } from 'crypto';
import { SignUpDto } from './dto/sign-up.dto';
import { PasswordResetEmailService } from './password-reset-email.service';

const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private dataSource: DataSource,
        private passwordResetEmailService: PasswordResetEmailService,
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

        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.username = :username', { username })
            .getOne();

        if (user && await bcrypt.compare(password, user.password)) {
            const payload : JwtPayload = {
                sub: user.id,
                username: user.username,
                tokenVersion: user.token_version,
            };

            const accessToken = this.jwtService.sign(payload);

            return { accessToken };
        } else {
            throw new UnauthorizedException('Invalid username or password');
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        const { email } = forgotPasswordDto;
        const user = await this.userRepository.findOne({ where: { email } });
        const message = 'If an account exists for that email, password reset instructions have been sent';

        if (!user) {
            return { message };
        }

        const resetToken = randomBytes(32).toString('hex');
        user.password_reset_token = this.hashResetToken(resetToken);
        user.password_reset_expires_at = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

        try {
            await this.userRepository.save(user);
        } catch {
            this.logger.error('Failed to create password reset token');
            return { message };
        }

        try {
            await this.passwordResetEmailService.sendPasswordReset(email, resetToken);
        } catch {
            user.password_reset_token = null;
            user.password_reset_expires_at = null;
            try {
                await this.userRepository.save(user);
            } catch {
                this.logger.error('Failed to invalidate an undelivered password reset token');
            }
            this.logger.error('Password reset email delivery failed');
        }

        return { message };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const { token, password, passwordConfirmation } = resetPasswordDto;

        if (password !== passwordConfirmation) {
            throw new BadRequestException('Passwords do not match');
        }

        const passwordResetToken = this.hashResetToken(token);
        let email: string | null | undefined;

        await this.dataSource.transaction(async(manager) => {
            const user = await manager
                .getRepository(User)
                .createQueryBuilder('user')
                .addSelect('user.password_reset_token')
                .setLock('pessimistic_write')
                .where('user.password_reset_token = :passwordResetToken', { passwordResetToken })
                .andWhere('user.password_reset_expires_at > :now', { now: new Date() })
                .getOne();

            if (!user) {
                throw new BadRequestException('Invalid or expired password reset token');
            }

            user.password = await bcrypt.hash(password, await bcrypt.genSalt());
            user.password_reset_token = null;
            user.password_reset_expires_at = null;
            user.token_version += 1;
            email = user.email;

            await manager.save(user);
        });

        if (email) {
            this.passwordResetEmailService.sendPasswordChanged(email).catch(() => undefined);
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
