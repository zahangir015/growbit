import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthCredentialsDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'zahangir' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
    username!: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'Password1!', format: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
    password!: string;
}
