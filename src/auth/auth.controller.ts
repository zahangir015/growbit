import { Body, Controller, Post } from '@nestjs/common';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('/signup')
    @ApiOperation({ summary: 'Create an account' })
    signUp(@Body() signUpDto: SignUpDto): Promise<void> {
        return this.authService.createUser(signUpDto);
    }

    @Post('/login')
    @ApiOperation({ summary: 'Log in and receive a JWT access token' })
    login(@Body() authCredentialsDto: AuthCredentialsDto): Promise<{ accessToken: string }> {
        return this.authService.login(authCredentialsDto);
    }

    @Post('/forgot-password')
    @ApiOperation({ summary: 'Generate a password reset token' })
    forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; resetToken?: string }> {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Post('/reset-password')
    @ApiOperation({ summary: 'Reset a password using a reset token' })
    resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        return this.authService.resetPassword(resetPasswordDto);
    }
}
