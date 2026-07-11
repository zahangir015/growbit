import { IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { GoalPriority } from '../goal-priority.enum';
import { GoalStatus } from '../goal-status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGoalDto {
    @IsOptional()
    @ApiPropertyOptional({ example: 'Learn NestJS Advanced' })
    @IsString()
    title?: string;

    @IsOptional()
    @ApiPropertyOptional({ example: 'Complete advanced modules and build an API.' })
    @IsString()
    description?: string;

    @IsOptional()
    @ApiPropertyOptional({ example: '2026-07-01', format: 'date' })
    @IsDate()
    start_date?: Date;

    @IsOptional()
    @ApiPropertyOptional({ example: '2026-07-31', format: 'date' })
    @IsDate()
    end_date?: Date;

    @IsOptional()
    @ApiPropertyOptional({ example: 1200, minimum: 0 })
    @IsInt()
    @Min(0)
    target_minutes?: number;

    @IsOptional()
    @ApiPropertyOptional({ example: 25, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    progress_percentage?: number;

    @IsOptional()
    @ApiPropertyOptional({ enum: GoalStatus, example: GoalStatus.IN_PROGRESS })
    @IsEnum(GoalStatus)
    status?: GoalStatus;

    @IsOptional()
    @ApiPropertyOptional({ enum: GoalPriority, example: GoalPriority.HIGH })
    @IsEnum(GoalPriority)
    priority?: GoalPriority;
}
