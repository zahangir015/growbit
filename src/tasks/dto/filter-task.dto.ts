import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '../task-status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTaskDto {
    @IsOptional()
    @ApiPropertyOptional({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @ApiPropertyOptional({ example: 'authentication' })
    @IsString()
    search?: string;
}
