jest.doMock('@nestjs/typeorm', () => ({
    InjectRepository: () => () => undefined,
}));

jest.doMock('typeorm', () => ({
    Repository: class Repository {},
    Entity: () => () => undefined,
    Column: () => () => undefined,
    CreateDateColumn: () => () => undefined,
    UpdateDateColumn: () => () => undefined,
    PrimaryGeneratedColumn: () => () => undefined,
    ManyToOne: () => () => undefined,
    OneToMany: () => () => undefined,
    JoinColumn: () => () => undefined,
    RelationId: () => () => undefined,
}));

import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { User } from '../auth/user.entity';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalPriority } from './goal-priority.enum';
import { GoalStatus } from './goal-status.enum';
import type { Goal } from './goal.entity';
import type { Task } from '../tasks/task.entity';
import { TaskStatus } from '../tasks/task-status.enum';
import type { GoalProgressLog } from './goal-progress-log.entity';

const { GoalsService } = require('./goals.service') as typeof import('./goals.service');
const { GoalProgressService } = require('./goal-progress.service') as typeof import('./goal-progress.service');

describe('GoalsService', () => {
    let service: InstanceType<typeof GoalsService>;
    let mockRepository: {
        create: jest.Mock;
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        delete: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockTasksRepository: {
        createQueryBuilder: jest.Mock;
    };
    let mockProgressLogsRepository: {
        create: jest.Mock;
        save: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        getMany: jest.Mock;
        getOne: jest.Mock;
    };
    let mockTasksQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        getMany: jest.Mock;
    };
    let mockProgressLogsQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        orderBy: jest.Mock;
        getMany: jest.Mock;
    };
    const user = { id: 'user-id', username: 'testuser' } as User;

    beforeEach(() => {
        mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getOne: jest.fn(),
        };
        mockTasksQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        };
        mockProgressLogsQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        };

        mockRepository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };
        mockTasksRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockTasksQueryBuilder),
        };
        mockProgressLogsRepository = {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockProgressLogsQueryBuilder),
        };

        service = new GoalsService(
            mockRepository as never,
            mockTasksRepository as never,
            mockProgressLogsRepository as never,
            new GoalProgressService(),
        );
    });

    describe('createGoal', () => {
        it('creates a goal with default status, priority, and progress', async () => {
            const createGoalDto: CreateGoalDto = {
                title: 'Learn NestJS',
                start_date: new Date('2026-07-10'),
                end_date: new Date('2026-07-20'),
                target_minutes: 600,
            };
            const createdGoal = { id: 'goal-id', ...createGoalDto } as Goal;

            mockRepository.create.mockReturnValue(createdGoal);
            mockRepository.save.mockResolvedValue(createdGoal);

            const result = await service.createGoal(createGoalDto, user);

            expect(mockRepository.create).toHaveBeenCalledWith({
                ...createGoalDto,
                status: GoalStatus.NOT_STARTED,
                priority: GoalPriority.MEDIUM,
                progress_percentage: 0,
                user,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(createdGoal);
            expect(result).toBe(createdGoal);
        });

        it('keeps provided status, priority, and progress values', async () => {
            const createGoalDto: CreateGoalDto = {
                title: 'Ship API',
                start_date: new Date('2026-07-10'),
                end_date: new Date('2026-07-20'),
                target_minutes: 300,
                status: GoalStatus.IN_PROGRESS,
                priority: GoalPriority.HIGH,
                progress_percentage: 25,
            };
            const createdGoal = { id: 'goal-id', ...createGoalDto } as Goal;

            mockRepository.create.mockReturnValue(createdGoal);
            mockRepository.save.mockResolvedValue(createdGoal);

            await service.createGoal(createGoalDto, user);

            expect(mockRepository.create).toHaveBeenCalledWith({
                ...createGoalDto,
                status: GoalStatus.IN_PROGRESS,
                priority: GoalPriority.HIGH,
                progress_percentage: 25,
                user,
            });
        });

        it('rejects an invalid status', async () => {
            const createGoalDto = {
                title: 'Bad status',
                start_date: new Date('2026-07-10'),
                end_date: new Date('2026-07-20'),
                target_minutes: 300,
                status: 'invalid',
            } as unknown as CreateGoalDto;

            await expect(service.createGoal(createGoalDto, user)).rejects.toThrow(BadRequestException);
            expect(mockRepository.create).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('throws an internal server error when save fails', async () => {
            const createGoalDto: CreateGoalDto = {
                title: 'Save failure',
                start_date: new Date('2026-07-10'),
                end_date: new Date('2026-07-20'),
                target_minutes: 300,
            };
            const createdGoal = { id: 'goal-id', ...createGoalDto } as Goal;

            mockRepository.create.mockReturnValue(createdGoal);
            mockRepository.save.mockRejectedValue(new Error('database down'));

            await expect(service.createGoal(createGoalDto, user)).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('getGoals', () => {
        it('returns goals scoped to the user', async () => {
            const goals = [{ id: 'goal-id', title: 'Goal' } as Goal];

            mockQueryBuilder.getMany.mockResolvedValue(goals);

            const result = await service.getGoals(user);

            expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('goal');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
            expect(mockQueryBuilder.getMany).toHaveBeenCalled();
            expect(result).toBe(goals);
        });
    });

    describe('getGoalById', () => {
        it('returns a goal when it belongs to the user', async () => {
            const goal = { id: 'goal-id', title: 'Goal' } as Goal;

            mockQueryBuilder.getOne.mockResolvedValue(goal);

            const result = await service.getGoalById('goal-id', user);

            expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('goal');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.id = :id', { id: 'goal-id' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
            expect(mockQueryBuilder.getOne).toHaveBeenCalled();
            expect(result).toBe(goal);
        });

        it('throws not found when the goal does not exist for the user', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.getGoalById('missing-id', user)).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateGoal', () => {
        it('updates an existing goal', async () => {
            const existingGoal = {
                id: 'goal-id',
                title: 'Old title',
                priority: GoalPriority.MEDIUM,
            } as Goal;
            const updateGoalDto: UpdateGoalDto = {
                title: 'New title',
                status: GoalStatus.IN_PROGRESS,
                priority: GoalPriority.CRITICAL,
            };

            mockQueryBuilder.getOne.mockResolvedValue(existingGoal);
            mockRepository.save.mockImplementation(async (goal: Goal) => goal);

            const result = await service.updateGoal('goal-id', updateGoalDto, user);

            expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.id = :id', { id: 'goal-id' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
            expect(mockRepository.save).toHaveBeenCalledWith({
                ...existingGoal,
                ...updateGoalDto,
            });
            expect(result.title).toBe('New title');
            expect(result.status).toBe(GoalStatus.IN_PROGRESS);
            expect(result.priority).toBe(GoalPriority.CRITICAL);
        });

        it('rejects an invalid priority', async () => {
            const updateGoalDto = { priority: 'urgent' } as unknown as UpdateGoalDto;

            await expect(service.updateGoal('goal-id', updateGoalDto, user)).rejects.toThrow(BadRequestException);
            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('deleteGoal', () => {
        it('deletes a goal scoped to the user', async () => {
            const goal = { id: 'goal-id', title: 'Goal' } as Goal;

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockRepository.delete.mockResolvedValue({ affected: 1 });

            await expect(service.deleteGoal('goal-id', user)).resolves.toBeUndefined();

            expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.id = :id', { id: 'goal-id' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
            expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'goal-id' });
        });

        it('throws not found when no goal is deleted', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.deleteGoal('missing-id', user)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getGoalProgress', () => {
        it('returns a progress summary for a user-owned goal', async () => {
            const goal = {
                id: 'goal-id',
                title: 'Goal',
                status: GoalStatus.IN_PROGRESS,
                end_date: new Date('2100-01-01'),
            } as Goal;
            const tasks = [
                {
                    id: 'task-1',
                    status: TaskStatus.DONE,
                    estimated_minutes: 60,
                },
                {
                    id: 'task-2',
                    status: TaskStatus.IN_PROGRESS,
                    estimated_minutes: 90,
                    progress_percentage: 50,
                    due_datetime: new Date('2000-01-01'),
                },
                {
                    id: 'task-3',
                    status: TaskStatus.OPEN,
                    estimated_minutes: undefined,
                    due_datetime: new Date('2100-01-01'),
                },
            ] as Task[];

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockTasksQueryBuilder.getMany.mockResolvedValue(tasks);

            const result = await service.getGoalProgress('goal-id', user);

            expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('goal');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.id = :id', { id: 'goal-id' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
            expect(mockTasksRepository.createQueryBuilder).toHaveBeenCalledWith('task');
            expect(mockTasksQueryBuilder.where).toHaveBeenCalledWith('task.goalId = :goalId', { goalId: goal.id });
            expect(mockTasksQueryBuilder.andWhere).toHaveBeenCalledWith('task.userId = :userId', { userId: user.id });
            expect(result).toMatchObject({
                goalId: goal.id,
                goalTitle: goal.title,
                status: GoalStatus.IN_PROGRESS,
                progressPercentage: 58.33,
                totalTasks: 3,
                completedTasks: 1,
                pendingTasks: 2,
                totalEstimatedMinutes: 180,
                completedEstimatedMinutes: 105,
                remainingEstimatedMinutes: 75,
                isOverdue: false,
            });
            expect(result.remainingDays).toBeGreaterThan(0);
        });

        it('throws not found when the goal does not belong to the user', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.getGoalProgress('missing-goal-id', user)).rejects.toThrow(NotFoundException);
            expect(mockTasksRepository.createQueryBuilder).not.toHaveBeenCalled();
        });
    });

    describe('progress calculation rules', () => {
        const goal = {
            id: 'goal-id',
            title: 'Goal',
            status: GoalStatus.IN_PROGRESS,
            end_date: new Date('2100-01-01'),
        } as Goal;

        it('counts only in-progress partial work and caps percentages at 100', () => {
            const progressService = new GoalProgressService();
            const tasks = [
                {
                    status: TaskStatus.OPEN,
                    estimated_minutes: 30,
                    progress_percentage: 80,
                },
                {
                    status: TaskStatus.SKIPPED,
                    estimated_minutes: 30,
                    progress_percentage: 70,
                },
                {
                    status: TaskStatus.IN_PROGRESS,
                    estimated_minutes: 30,
                    progress_percentage: 150,
                },
            ] as Task[];

            const summary = progressService.buildSummary(goal, tasks);

            expect(summary.completedEstimatedMinutes).toBe(30);
            expect(summary.progressPercentage).toBe(33.33);
            expect(progressService.calculateProgressPercentage(10, 1000)).toBe(100);
        });

        it('uses the default estimate and completes a goal when all tasks are done', () => {
            const progressService = new GoalProgressService();
            const tasks = [{ status: TaskStatus.DONE, estimated_minutes: undefined }] as unknown as Task[];

            const summary = progressService.buildSummary(goal, tasks);

            expect(summary.totalEstimatedMinutes).toBe(30);
            expect(summary.completedEstimatedMinutes).toBe(30);
            expect(summary.progressPercentage).toBe(100);
            expect(progressService.calculateGoalStatus(goal, summary.progressPercentage)).toBe(GoalStatus.COMPLETED);
        });
    });

    describe('recalculateGoalProgress', () => {
        it('updates goal progress and marks the goal as completed at 100%', async () => {
            const goal = {
                id: 'goal-id',
                title: 'Goal',
                status: GoalStatus.IN_PROGRESS,
                progress_percentage: 50,
                end_date: new Date('2100-01-01'),
            } as Goal;
            const updatedGoal = {
                ...goal,
                status: GoalStatus.COMPLETED,
                progress_percentage: 100,
            } as Goal;
            const tasks = [
                {
                    id: 'task-1',
                    status: TaskStatus.DONE,
                    estimated_minutes: 60,
                },
                {
                    id: 'task-2',
                    status: TaskStatus.DONE,
                    estimated_minutes: 60,
                },
            ] as Task[];

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockTasksQueryBuilder.getMany.mockResolvedValue(tasks);
            mockRepository.save.mockResolvedValue(updatedGoal);
            const progressLog = {} as GoalProgressLog;
            mockProgressLogsRepository.create.mockReturnValue(progressLog);

            const result = await service.recalculateGoalProgress('goal-id', user);

            expect(mockRepository.save).toHaveBeenCalledWith({
                ...goal,
                progress_percentage: 100,
                status: GoalStatus.COMPLETED,
            });
            expect(mockProgressLogsRepository.create).toHaveBeenCalledWith({
                goal: updatedGoal,
                user,
                progress_percentage: 100,
                total_tasks: 2,
                completed_tasks: 2,
                total_estimated_minutes: 120,
                completed_estimated_minutes: 120,
            });
            expect(mockProgressLogsRepository.save).toHaveBeenCalledWith(progressLog);
            expect(result).toMatchObject({
                goalId: goal.id,
                status: GoalStatus.COMPLETED,
                progressPercentage: 100,
                totalTasks: 2,
                completedTasks: 2,
                pendingTasks: 0,
                totalEstimatedMinutes: 120,
                completedEstimatedMinutes: 120,
                remainingEstimatedMinutes: 0,
            });
        });

        it('marks an overdue incomplete goal as failed', async () => {
            const goal = {
                id: 'goal-id',
                title: 'Goal',
                status: GoalStatus.IN_PROGRESS,
                progress_percentage: 20,
                end_date: new Date('2000-01-01'),
            } as Goal;
            const updatedGoal = {
                ...goal,
                status: GoalStatus.FAILED,
                progress_percentage: 50,
            } as Goal;
            const tasks = [
                {
                    id: 'task-1',
                    status: TaskStatus.DONE,
                    estimated_minutes: 60,
                },
                {
                    id: 'task-2',
                    status: TaskStatus.OPEN,
                    estimated_minutes: 60,
                },
            ] as Task[];

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockTasksQueryBuilder.getMany.mockResolvedValue(tasks);
            mockRepository.save.mockResolvedValue(updatedGoal);

            const result = await service.recalculateGoalProgress('goal-id', user);

            expect(mockRepository.save).toHaveBeenCalledWith({
                ...goal,
                progress_percentage: 50,
                status: GoalStatus.FAILED,
            });
            expect(result.status).toBe(GoalStatus.FAILED);
            expect(result.progressPercentage).toBe(50);
            expect(result.isOverdue).toBe(true);
        });

        it('stores weighted estimated minutes in the progress log', async () => {
            const goal = {
                id: 'goal-id',
                title: 'Goal',
                status: GoalStatus.IN_PROGRESS,
                progress_percentage: 0,
                end_date: new Date('2100-01-01'),
            } as Goal;
            const updatedGoal = {
                ...goal,
                status: GoalStatus.IN_PROGRESS,
                progress_percentage: 25,
            } as Goal;
            const tasks = [
                {
                    id: 'task-1',
                    status: TaskStatus.IN_PROGRESS,
                    estimated_minutes: 90,
                    progress_percentage: 25,
                },
            ] as Task[];
            const progressLog = {} as GoalProgressLog;

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockTasksQueryBuilder.getMany.mockResolvedValue(tasks);
            mockRepository.save.mockResolvedValue(updatedGoal);
            mockProgressLogsRepository.create.mockReturnValue(progressLog);

            await service.recalculateGoalProgress(goal.id, user);

            expect(mockProgressLogsRepository.create).toHaveBeenCalledWith({
                goal: updatedGoal,
                user,
                progress_percentage: 25,
                total_tasks: 1,
                completed_tasks: 0,
                total_estimated_minutes: 90,
                completed_estimated_minutes: 22.5,
            });
            expect(mockProgressLogsRepository.save).toHaveBeenCalledWith(progressLog);
        });

        it('throws not found when recalculating a goal that does not belong to the user', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.recalculateGoalProgress('missing-goal-id', user)).rejects.toThrow(NotFoundException);
            expect(mockTasksRepository.createQueryBuilder).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getGoalProgressHistory', () => {
        it('returns the latest progress snapshot for each day', async () => {
            const goal = { id: 'goal-id', title: 'Goal' } as Goal;
            const logs = [
                {
                    logged_at: new Date('2026-07-01T08:00:00.000Z'),
                    progress_percentage: 10,
                },
                {
                    logged_at: new Date('2026-07-02T08:00:00.000Z'),
                    progress_percentage: 20,
                },
                {
                    logged_at: new Date('2026-07-02T17:00:00.000Z'),
                    progress_percentage: 25,
                },
            ] as GoalProgressLog[];

            mockQueryBuilder.getOne.mockResolvedValue(goal);
            mockProgressLogsQueryBuilder.getMany.mockResolvedValue(logs);

            const result = await service.getGoalProgressHistory(goal.id, user);

            expect(mockProgressLogsRepository.createQueryBuilder).toHaveBeenCalledWith('progressLog');
            expect(mockProgressLogsQueryBuilder.where).toHaveBeenCalledWith(
                'progressLog.goal_id = :goalId',
                { goalId: goal.id },
            );
            expect(mockProgressLogsQueryBuilder.andWhere).toHaveBeenCalledWith(
                'progressLog.user_id = :userId',
                { userId: user.id },
            );
            expect(mockProgressLogsQueryBuilder.orderBy).toHaveBeenCalledWith('progressLog.logged_at', 'ASC');
            expect(result).toEqual([
                { date: '2026-07-01', progressPercentage: 10 },
                { date: '2026-07-02', progressPercentage: 25 },
            ]);
        });
    });
});
