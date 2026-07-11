import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { TaskPriority } from "../task-priority.enum";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
    @IsNotEmpty()
    @ApiProperty({ example: 'Build authentication module' })
    @IsString()
    title!: string;
    
    @IsNotEmpty()
    @ApiProperty({ example: 'Implement signup, login, and password reset.' })
    @IsString()
    description!: string;

    @IsOptional()
    @ApiPropertyOptional({ example: 'goal-uuid' })
    @IsString()
    goal_id?: string;

    @IsOptional()
    @ApiPropertyOptional({ example: '2026-07-10T09:00:00.000Z', format: 'date-time' })
    @IsDate()
    start_datetime?: Date;

    @IsOptional()
    @ApiPropertyOptional({ example: '2026-07-10T11:00:00.000Z', format: 'date-time' })
    @IsDate()
    due_datetime?: Date;

    @IsOptional()
    @ApiPropertyOptional({ example: 120, minimum: 0, default: 30 })
    @IsInt()
    @Min(0)
    estimated_minutes?: number;

    @IsOptional()
    @ApiPropertyOptional({ example: 30, minimum: 0 })
    @IsInt()
    @Min(0)
    actual_minutes?: number;

    @IsOptional()
    @ApiPropertyOptional({ example: 40, minimum: 0, maximum: 100 })
    @IsNumber()
    @Min(0)
    @Max(100)
    progress_percentage?: number;

    @IsOptional()
    @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.HIGH })
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @ApiPropertyOptional({ example: '2026-07-10T10:00:00.000Z', format: 'date-time' })
    @IsDate()
    completed_at?: Date;
}
