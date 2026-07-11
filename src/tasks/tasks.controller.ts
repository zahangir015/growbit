import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { TaskStatus } from './task-status.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/user.entity';
import { Logger } from '@nestjs/common';
import { TaskCompletionResponse } from './interfaces/task-completion-response.interface';
import { UpdateTaskProgressDto } from './dto/update-task-progress.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@Controller('tasks')
@UseGuards(AuthGuard())
@Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
@ApiTags('Tasks')
@ApiBearerAuth('access-token')
export class TasksController {
    private logger = new Logger('TasksController');
    constructor(
        private tasksService: TasksService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List the current user\'s tasks' })
    getTasks(
        @Query() filterDto: FilterTaskDto,
        @GetUser() user: User
    ): Promise<Task[]> {
        this.logger.verbose(`User ${user.username} retriving all tasks`);
        return this.tasksService.getTasks(filterDto, user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one task' })
    getTaskById(@Param('id') id: string, @GetUser() user: User): Promise<Task> {
        return this.tasksService.getTaskById(id, user);
    }

    @Post()
    @ApiOperation({ summary: 'Create a task' })
    createTask(
        @Body() createTaskDto: CreateTaskDto,
        @GetUser() user: User
    ): Promise<Task> {
        this.logger.verbose(`User ${user.username} creating a new task. Data: ${JSON.stringify(createTaskDto)}`);
        return this.tasksService.createTask(createTaskDto, user);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update a task status' })
    updateTaskStatus(@Param('id') id: string, @Body('status') status: TaskStatus, @GetUser() user: User): Promise<Task> {
        return this.tasksService.updateTaskStatus(id, status, user);
    }

    @Patch(':taskId/complete')
    @ApiOperation({ summary: 'Mark a task as completed' })
    completeTask(
        @Param('taskId') taskId: string,
        @GetUser() user: User,
    ): Promise<TaskCompletionResponse> {
        return this.tasksService.completeTask(taskId, user);
    }

    @Patch(':taskId/progress')
    @ApiOperation({ summary: 'Update partial task progress' })
    updateTaskProgress(
        @Param('taskId') taskId: string,
        @Body() updateTaskProgressDto: UpdateTaskProgressDto,
        @GetUser() user: User,
    ): Promise<Task> {
        return this.tasksService.updateTaskProgress(taskId, updateTaskProgressDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a task' })
    deleteTask(@Param('id') id: string, @GetUser() user: User): Promise<void> {
        return this.tasksService.deleteTask(id, user);
    }
}
