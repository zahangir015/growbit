import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'zahangir@example.com' })
  @IsEmail()
    email!: string;
}
