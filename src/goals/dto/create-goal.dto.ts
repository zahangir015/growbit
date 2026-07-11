import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { GoalPriority } from '../goal-priority.enum';
import { GoalStatus } from '../goal-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoalDto {
    @IsNotEmpty()
    @ApiProperty({ example: 'Learn NestJS Advanced' })
    @IsString()
    title!: string;

    @IsOptional()
    @ApiPropertyOptional({ example: 'Complete advanced modules and build an API.' })
    @IsString()
    description?: string;

    @IsNotEmpty()
    @ApiProperty({ example: '2026-07-01', format: 'date' })
    @IsDate()
    start_date!: Date;

    @IsNotEmpty()
    @ApiProperty({ example: '2026-07-31', format: 'date' })
    @IsDate()
    end_date!: Date;

    @IsNotEmpty()
    @ApiProperty({ example: 1200, minimum: 0 })
    @IsInt()
    @Min(0)
    target_minutes!: number;

    @IsOptional()
    @ApiPropertyOptional({ example: 25, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    progress_percentage?: number;

    @IsOptional()
    @ApiPropertyOptional({ enum: GoalStatus, example: GoalStatus.NOT_STARTED })
    @IsEnum(GoalStatus)
    status?: GoalStatus;

    @IsOptional()
    @ApiPropertyOptional({ enum: GoalPriority, example: GoalPriority.MEDIUM })
    @IsEnum(GoalPriority)
    priority?: GoalPriority;
}
