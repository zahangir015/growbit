import { IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskProgressDto {
    @IsNumber()
    @ApiProperty({ example: 40, minimum: 0, maximum: 100 })
    @Min(0)
    @Max(100)
    progress_percentage!: number;
}
