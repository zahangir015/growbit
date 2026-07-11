import { BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalPriority } from './goal-priority.enum';
import { GoalStatus } from './goal-status.enum';
import { Goal } from './goal.entity';
import { Task } from '../tasks/task.entity';
import { GoalProgressSummary } from './interfaces/goal-progress-summary.interface';
import { GoalProgressService } from './goal-progress.service';
import { GoalProgressLog } from './goal-progress-log.entity';
import { GoalProgressHistoryEntry } from './interfaces/goal-progress-history-entry.interface';

@Injectable()
export class GoalsService {
    private logger = new Logger('GoalsService');

    constructor(
        @InjectRepository(Goal)
        private goalsRepository: Repository<Goal>,
        @InjectRepository(Task)
        private tasksRepository: Repository<Task>,
        @InjectRepository(GoalProgressLog)
        private goalProgressLogsRepository: Repository<GoalProgressLog>,
        private goalProgressService: GoalProgressService,
    ) {}

    async createGoal(createGoalDto: CreateGoalDto, user: User): Promise<Goal> {
        this.validateStatus(createGoalDto.status);
        this.validatePriority(createGoalDto.priority);

        const goal = this.goalsRepository.create({
            ...createGoalDto,
            status: createGoalDto.status ?? GoalStatus.NOT_STARTED,
            priority: createGoalDto.priority ?? GoalPriority.MEDIUM,
            progress_percentage: createGoalDto.progress_percentage ?? 0,
            user,
        });

        try {
            return await this.goalsRepository.save(goal);
        } catch (error: unknown) {
            this.logError(`Failed to create goal by user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async getGoals(user: User): Promise<Goal[]> {
        try {
            return await this.goalsRepository
                .createQueryBuilder('goal')
                .where('goal.userId = :userId', { userId: user.id })
                .getMany();
        } catch (error: unknown) {
            this.logError(`Failed to get goals for user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async getGoalById(id: string, user: User): Promise<Goal> {
        try {
            const goal = await this.goalsRepository
                .createQueryBuilder('goal')
                .where('goal.id = :id', { id })
                .andWhere('goal.userId = :userId', { userId: user.id })
                .getOne();

            if (!goal) {
                throw new NotFoundException(`Goal with ID ${id} not found`);
            }

            return goal;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logError(`Failed to get goal with ID ${id} for user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async updateGoal(id: string, updateGoalDto: UpdateGoalDto, user: User): Promise<Goal> {
        this.validateStatus(updateGoalDto.status);
        this.validatePriority(updateGoalDto.priority);

        const goal = await this.getGoalById(id, user);

        Object.assign(goal, updateGoalDto);

        try {
            return await this.goalsRepository.save(goal);
        } catch (error: unknown) {
            this.logError(`Failed to update goal with ID ${id} by user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async deleteGoal(id: string, user: User): Promise<void> {
        try {
            const goal = await this.getGoalById(id, user);
            const result = await this.goalsRepository.delete({ id: goal.id });

            if (result.affected === 0) {
                throw new NotFoundException(`Goal with ID ${id} not found`);
            }
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logError(`Failed to delete goal with ID ${id} by user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async getGoalProgress(goalId: string, user: User): Promise<GoalProgressSummary> {
        try {
            const goal = await this.getGoalById(goalId, user);
            const tasks = await this.getTasksForGoal(goal.id, user);

            return this.goalProgressService.buildSummary(goal, tasks);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logError(`Failed to get goal progress with ID ${goalId} for user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async recalculateGoalProgress(goalId: string, user: User): Promise<GoalProgressSummary> {
        try {
            const goal = await this.getGoalById(goalId, user);
            const tasks = await this.getTasksForGoal(goal.id, user);
            const summary = this.goalProgressService.buildSummary(goal, tasks);

            goal.progress_percentage = summary.progressPercentage;
            goal.status = this.goalProgressService.calculateGoalStatus(goal, summary.progressPercentage);

            const updatedGoal = await this.goalsRepository.save(goal);
            const updatedSummary = this.goalProgressService.buildSummary(updatedGoal, tasks);

            await this.saveProgressLog(updatedGoal, user, updatedSummary);

            return updatedSummary;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logError(`Failed to recalculate goal progress with ID ${goalId} for user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    async getGoalProgressHistory(
        goalId: string,
        user: User,
    ): Promise<GoalProgressHistoryEntry[]> {
        try {
            const goal = await this.getGoalById(goalId, user);
            const logs = await this.goalProgressLogsRepository
                .createQueryBuilder('progressLog')
                .where('progressLog.goal_id = :goalId', { goalId: goal.id })
                .andWhere('progressLog.user_id = :userId', { userId: user.id })
                .orderBy('progressLog.logged_at', 'ASC')
                .getMany();

            const historyByDate = new Map<string, GoalProgressHistoryEntry>();
            for (const log of logs) {
                const date = log.logged_at.toISOString().slice(0, 10);
                historyByDate.set(date, {
                    date,
                    progressPercentage: Number(log.progress_percentage),
                });
            }

            return Array.from(historyByDate.values());
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logError(`Failed to get goal progress history with ID ${goalId} for user ${user.username}.`, error);
            throw new InternalServerErrorException();
        }
    }

    private validateStatus(status?: GoalStatus): void {
        if (status && !Object.values(GoalStatus).includes(status)) {
            throw new BadRequestException(`Invalid status: ${status}`);
        }
    }

    private validatePriority(priority?: GoalPriority): void {
        if (priority && !Object.values(GoalPriority).includes(priority)) {
            throw new BadRequestException(`Invalid priority: ${priority}`);
        }
    }

    private logError(message: string, error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(message, errorMessage);
    }

    private async getTasksForGoal(goalId: string, user: User): Promise<Task[]> {
        return this.tasksRepository
            .createQueryBuilder('task')
            .where('task.goalId = :goalId', { goalId })
            .andWhere('task.userId = :userId', { userId: user.id })
            .getMany();
    }

    private async saveProgressLog(
        goal: Goal,
        user: User,
        summary: GoalProgressSummary,
    ): Promise<void> {
        const progressLog = this.goalProgressLogsRepository.create({
            goal,
            user,
            progress_percentage: summary.progressPercentage,
            total_tasks: summary.totalTasks,
            completed_tasks: summary.completedTasks,
            total_estimated_minutes: summary.totalEstimatedMinutes,
            completed_estimated_minutes: summary.completedEstimatedMinutes,
        });

        await this.goalProgressLogsRepository.save(progressLog);
    }
}
