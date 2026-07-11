import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from './task-status.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { Task } from './task.entity';
import { User } from '../auth/user.entity';
import { Logger } from '@nestjs/common';
import { Goal } from '../goals/goal.entity';
import { TaskPriority } from './task-priority.enum';
import { GoalsService } from '../goals/goals.service';
import { TaskCompletionResponse } from './interfaces/task-completion-response.interface';
import { UpdateTaskProgressDto } from './dto/update-task-progress.dto';
import { DEFAULT_ESTIMATED_MINUTES } from './task.constants';

@Injectable()
export class TasksService {
    private logger = new Logger('TaskService');
    constructor(
        @InjectRepository(Task)
        private tasksRepository: Repository<Task>,
        @InjectRepository(Goal)
        private goalsRepository: Repository<Goal>,
        private goalsService: GoalsService,
    ) { }

    async getTasks(filterDto: FilterTaskDto, user: User): Promise<Task[]> {
        const { status, search } = filterDto;
        const query = this.tasksRepository.createQueryBuilder('task');

        query.where({ user });

        if (status) {
            query.andWhere('task.status = :status', { status });
        }

        if (search) {
            query.andWhere(
                '(task.title LIKE :search OR task.description LIKE :search)',
                { search: `%${search}%` },
            )
        }

        try {
            return await query.getMany();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to get tasks for user ${user.username}. Filters: ${JSON.stringify(
                    filterDto,
                )}`,
                message,
            );
            throw new InternalServerErrorException();
        }
    }

    async getTaskById(id: string, user: User): Promise<Task> {
        try {
            const task = await this.tasksRepository.findOne({
                where: { id, user },
                relations: { goal: true },
            });

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            return task;

        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to get tasks by ID for user ${user.username}.`,
                message,
            );
            throw new InternalServerErrorException();
        }
    }

    async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {

        try {
            const {
                title,
                description,
                goal_id,
                start_datetime,
                due_datetime,
                estimated_minutes,
                actual_minutes,
                progress_percentage,
                priority,
                completed_at,
            } = createTaskDto;
            const goal = goal_id ? await this.getGoalForUser(goal_id, user) : undefined;
            const taskProgressPercentage = progress_percentage ?? 0;

            const task = this.tasksRepository.create({
                title,
                description,
                status: this.getStatusForProgress(taskProgressPercentage),
                start_datetime,
                due_datetime,
                estimated_minutes: estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES,
                actual_minutes: actual_minutes ?? 0,
                progress_percentage: taskProgressPercentage,
                priority: priority ?? TaskPriority.MEDIUM,
                completed_at: taskProgressPercentage === 100 ? completed_at ?? new Date() : null,
                user,
                goal,
            });

            await this.tasksRepository.save(task);

            if (goal) {
                await this.goalsService.recalculateGoalProgress(goal.id, user);
            }

            return task;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to create task by user ${user.username}.`,
                message,
            );
            throw new InternalServerErrorException();
        }
    }

    async deleteTask(id: string, user: User): Promise<void> {
        try {
            const task = await this.getTaskById(id, user);
            const result = await this.tasksRepository.delete({ id: task.id });
            if (result.affected === 0) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            if (task.goal) {
                await this.goalsService.recalculateGoalProgress(task.goal.id, user);
            }
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to delete task with ID ${id} - by user ${user.username}. `,
                message,
            );
            throw new InternalServerErrorException();
        }

    }

    async updateTaskStatus(id: string, status: TaskStatus, user: User): Promise<Task> {
        try {
            const task = await this.getTaskById(id, user);
            if (!this.isValidStatus(status)) {
                throw new BadRequestException(`Invalid status: ${status}`);
            }
            task.status = status;
            if (status === TaskStatus.DONE) {
                task.progress_percentage = 100;
                task.completed_at = new Date();
            } else {
                task.completed_at = null;
                if (status === TaskStatus.OPEN || status === TaskStatus.SKIPPED) {
                    task.progress_percentage = 0;
                } else if (task.progress_percentage >= 100) {
                    task.progress_percentage = 0;
                }
            }
            const updatedTask = await this.tasksRepository.save(task);

            if (task.goal) {
                await this.goalsService.recalculateGoalProgress(task.goal.id, user);
            }

            return updatedTask;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to update task status with ID ${id} - by user ${user.username}. `,
                message,
            );
            throw new InternalServerErrorException();
        }
        
    }

    async completeTask(id: string, user: User): Promise<TaskCompletionResponse> {
        try {
            const task = await this.getTaskById(id, user);
            task.status = TaskStatus.DONE;
            task.progress_percentage = 100;
            task.completed_at = new Date();

            await this.tasksRepository.save(task);

            if (!task.goal) {
                return {
                    message: 'Task completed successfully',
                    goalProgress: null,
                };
            }

            const progress = await this.goalsService.recalculateGoalProgress(task.goal.id, user);

            return {
                message: 'Task completed successfully',
                goalProgress: {
                    progressPercentage: progress.progressPercentage,
                    completedTasks: progress.completedTasks,
                    totalTasks: progress.totalTasks,
                },
            };
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to complete task with ID ${id} - by user ${user.username}.`,
                message,
            );
            throw new InternalServerErrorException();
        }
    }

    async updateTaskProgress(
        id: string,
        updateTaskProgressDto: UpdateTaskProgressDto,
        user: User,
    ): Promise<Task> {
        try {
            const task = await this.getTaskById(id, user);
            const { progress_percentage } = updateTaskProgressDto;

            task.progress_percentage = progress_percentage;
            if (progress_percentage === 100) {
                task.status = TaskStatus.DONE;
                task.completed_at = new Date();
            } else if (progress_percentage > 0) {
                task.status = TaskStatus.IN_PROGRESS;
                task.completed_at = null;
            } else {
                task.status = TaskStatus.OPEN;
                task.completed_at = null;
            }

            const updatedTask = await this.tasksRepository.save(task);

            if (task.goal) {
                await this.goalsService.recalculateGoalProgress(task.goal.id, user);
            }

            return updatedTask;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to update task progress with ID ${id} - by user ${user.username}.`,
                message,
            );
            throw new InternalServerErrorException();
        }
    }

    private isValidStatus(status: unknown): status is TaskStatus {
        return Object.values(TaskStatus).includes(status as TaskStatus);
    }

    private getStatusForProgress(progressPercentage: number): TaskStatus {
        if (progressPercentage === 100) {
            return TaskStatus.DONE;
        }

        if (progressPercentage > 0) {
            return TaskStatus.IN_PROGRESS;
        }

        return TaskStatus.OPEN;
    }

    private async getGoalForUser(goalId: string, user: User): Promise<Goal> {
        const goal = await this.goalsRepository
            .createQueryBuilder('goal')
            .where('goal.id = :goalId', { goalId })
            .andWhere('goal.userId = :userId', { userId: user.id })
            .getOne();

        if (!goal) {
            throw new NotFoundException(`Goal with ID ${goalId} not found`);
        }

        return goal;
    }
}
