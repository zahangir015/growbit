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

import type { User } from '../auth/user.entity';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import type { Goal } from './goal.entity';
import type { GoalsService } from './goals.service';
import type { GoalProgressSummary } from './interfaces/goal-progress-summary.interface';
import type { GoalProgressHistoryEntry } from './interfaces/goal-progress-history-entry.interface';
import { GoalStatus } from './goal-status.enum';

const { GoalsController } = require('./goals.controller') as typeof import('./goals.controller');

describe('GoalsController', () => {
    let controller: InstanceType<typeof GoalsController>;
    let mockGoalsService: {
        createGoal: jest.Mock;
        getGoals: jest.Mock;
        getGoalById: jest.Mock;
        getGoalProgress: jest.Mock;
        getGoalProgressHistory: jest.Mock;
        recalculateGoalProgress: jest.Mock;
        updateGoal: jest.Mock;
        deleteGoal: jest.Mock;
    };
    const user = { id: 'user-id', username: 'testuser' } as User;

    beforeEach(() => {
        mockGoalsService = {
            createGoal: jest.fn(),
            getGoals: jest.fn(),
            getGoalById: jest.fn(),
            getGoalProgress: jest.fn(),
            getGoalProgressHistory: jest.fn(),
            recalculateGoalProgress: jest.fn(),
            updateGoal: jest.fn(),
            deleteGoal: jest.fn(),
        };

        controller = new GoalsController(mockGoalsService as unknown as GoalsService);
    });

    it('limits the goals module to 60 requests per minute', () => {
        expect(Reflect.getMetadata('THROTTLER:LIMITdefault', GoalsController)).toBe(60);
        expect(Reflect.getMetadata('THROTTLER:TTLdefault', GoalsController)).toBe(60 * 1000);
    });

    it('creates a goal through the service', async () => {
        const createGoalDto: CreateGoalDto = {
            title: 'Learn NestJS',
            start_date: new Date('2026-07-10'),
            end_date: new Date('2026-07-20'),
            target_minutes: 600,
        };
        const goal = { id: 'goal-id', ...createGoalDto } as Goal;

        mockGoalsService.createGoal.mockResolvedValue(goal);

        const result = await controller.createGoal(createGoalDto, user);

        expect(mockGoalsService.createGoal).toHaveBeenCalledWith(createGoalDto, user);
        expect(result).toBe(goal);
    });

    it('gets all goals for the current user through the service', async () => {
        const goals = [{ id: 'goal-id', title: 'Goal' } as Goal];

        mockGoalsService.getGoals.mockResolvedValue(goals);

        const result = await controller.getGoals(user);

        expect(mockGoalsService.getGoals).toHaveBeenCalledWith(user);
        expect(result).toBe(goals);
    });

    it('gets a goal by id through the service', async () => {
        const goal = { id: 'goal-id', title: 'Goal' } as Goal;

        mockGoalsService.getGoalById.mockResolvedValue(goal);

        const result = await controller.getGoalById('goal-id', user);

        expect(mockGoalsService.getGoalById).toHaveBeenCalledWith('goal-id', user);
        expect(result).toBe(goal);
    });

    it('gets goal progress through the service', async () => {
        const progress = {
            goalId: 'goal-id',
            goalTitle: 'Goal',
            status: GoalStatus.IN_PROGRESS,
            totalTasks: 2,
            completedTasks: 1,
            pendingTasks: 1,
            totalEstimatedMinutes: 120,
            completedEstimatedMinutes: 60,
            remainingEstimatedMinutes: 60,
            progressPercentage: 50,
            remainingDays: 1,
            isOverdue: false,
        } as GoalProgressSummary;

        mockGoalsService.getGoalProgress.mockResolvedValue(progress);

        const result = await controller.getGoalProgress('goal-id', user);

        expect(mockGoalsService.getGoalProgress).toHaveBeenCalledWith('goal-id', user);
        expect(result).toBe(progress);
    });

    it('gets goal progress history through the service', async () => {
        const history: GoalProgressHistoryEntry[] = [
            { date: '2026-07-01', progressPercentage: 10 },
            { date: '2026-07-02', progressPercentage: 25 },
        ];

        mockGoalsService.getGoalProgressHistory.mockResolvedValue(history);

        const result = await controller.getGoalProgressHistory('goal-id', user);

        expect(mockGoalsService.getGoalProgressHistory).toHaveBeenCalledWith('goal-id', user);
        expect(result).toBe(history);
    });

    it('recalculates goal progress through the service', async () => {
        const progress = {
            goalId: 'goal-id',
            goalTitle: 'Goal',
            status: GoalStatus.COMPLETED,
            totalTasks: 2,
            completedTasks: 2,
            pendingTasks: 0,
            totalEstimatedMinutes: 120,
            completedEstimatedMinutes: 120,
            remainingEstimatedMinutes: 0,
            progressPercentage: 100,
            remainingDays: 1,
            isOverdue: false,
        } as GoalProgressSummary;

        mockGoalsService.recalculateGoalProgress.mockResolvedValue(progress);

        const result = await controller.recalculateGoalProgress('goal-id', user);

        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith('goal-id', user);
        expect(result).toBe(progress);
    });

    it('updates a goal through the service', async () => {
        const updateGoalDto: UpdateGoalDto = { title: 'Updated goal' };
        const goal = { id: 'goal-id', title: 'Updated goal' } as Goal;

        mockGoalsService.updateGoal.mockResolvedValue(goal);

        const result = await controller.updateGoal('goal-id', updateGoalDto, user);

        expect(mockGoalsService.updateGoal).toHaveBeenCalledWith('goal-id', updateGoalDto, user);
        expect(result).toBe(goal);
    });

    it('deletes a goal through the service', async () => {
        mockGoalsService.deleteGoal.mockResolvedValue(undefined);

        await expect(controller.deleteGoal('goal-id', user)).resolves.toBeUndefined();

        expect(mockGoalsService.deleteGoal).toHaveBeenCalledWith('goal-id', user);
    });
});
