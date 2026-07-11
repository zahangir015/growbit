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

import { TaskStatus } from './task-status.enum';
import type { Task } from './task.entity';
import type { User } from '../auth/user.entity';
import type { FilterTaskDto } from './dto/filter-task.dto';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { Goal } from '../goals/goal.entity';
import { NotFoundException } from '@nestjs/common';
import { TaskPriority } from './task-priority.enum';
import type { GoalsService } from '../goals/goals.service';

const { TasksService } = require('./tasks.service') as typeof import('./tasks.service');

describe('TasksService', () => {
    let tasksService: InstanceType<typeof TasksService>;
    let mockTaskRepository: {
        createQueryBuilder: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
        delete: jest.Mock;
    };
    let mockGoalRepository: {
        createQueryBuilder: jest.Mock;
    };
    let mockQueryBuilder: {
        where: jest.Mock;
        andWhere: jest.Mock;
        getMany: jest.Mock;
        getOne: jest.Mock;
    };
    let mockGoalsService: {
        recalculateGoalProgress: jest.Mock;
    };

    beforeEach(() => {
        mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getOne: jest.fn(),
        };

        mockTaskRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
        };

        mockGoalRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        mockGoalsService = {
            recalculateGoalProgress: jest.fn(),
        };

        tasksService = new TasksService(
            mockTaskRepository as never,
            mockGoalRepository as never,
            mockGoalsService as unknown as GoalsService,
        );
    });

    it('gets tasks applying the user, status, and search filters', async () => {
        const user = { username: 'testuser' } as User;
        const filterDto: FilterTaskDto = {
            status: TaskStatus.IN_PROGRESS,
            search: 'build',
        };
        const expectedTasks = [{ id: '1', title: 'Build feature' } as Task];

        mockQueryBuilder.getMany.mockResolvedValue(expectedTasks);

        const result = await tasksService.getTasks(filterDto, user);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user });
        expect(mockQueryBuilder.andWhere).toHaveBeenNthCalledWith(
            1,
            'task.status = :status',
            { status: TaskStatus.IN_PROGRESS },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenNthCalledWith(
            2,
            '(task.title LIKE :search OR task.description LIKE :search)',
            { search: '%build%' },
        );
        expect(mockQueryBuilder.getMany).toHaveBeenCalled();
        expect(result).toEqual(expectedTasks);
    });

    it('creates a task without a goal when goal_id is not provided', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const createTaskDto: CreateTaskDto = {
            title: 'Write docs',
            description: 'Document the goals API',
        };
        const createdTask = {
            id: 'task-id',
            ...createTaskDto,
            status: TaskStatus.OPEN,
            user,
        } as Task;

        mockTaskRepository.create.mockReturnValue(createdTask);
        mockTaskRepository.save.mockResolvedValue(createdTask);

        const result = await tasksService.createTask(createTaskDto, user);

        expect(mockGoalRepository.createQueryBuilder).not.toHaveBeenCalled();
        expect(mockTaskRepository.create).toHaveBeenCalledWith({
            title: createTaskDto.title,
            description: createTaskDto.description,
            status: TaskStatus.OPEN,
            start_datetime: undefined,
            due_datetime: undefined,
            estimated_minutes: 30,
            actual_minutes: 0,
            progress_percentage: 0,
            priority: TaskPriority.MEDIUM,
            completed_at: null,
            user,
            goal: undefined,
        });
        expect(mockTaskRepository.save).toHaveBeenCalledWith(createdTask);
        expect(result).toBe(createdTask);
    });

    it('creates a task linked to a goal owned by the user', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id', title: 'Learn NestJS' } as Goal;
        const createTaskDto: CreateTaskDto = {
            title: 'Build endpoint',
            description: 'Create task with goal id',
            goal_id: goal.id,
            start_datetime: new Date('2026-07-10T09:00:00.000Z'),
            due_datetime: new Date('2026-07-10T11:00:00.000Z'),
            estimated_minutes: 120,
            actual_minutes: 30,
            progress_percentage: 25,
            priority: TaskPriority.HIGH,
            completed_at: new Date('2026-07-10T10:00:00.000Z'),
        };
        const createdTask = {
            id: 'task-id',
            title: createTaskDto.title,
            description: createTaskDto.description,
            status: TaskStatus.IN_PROGRESS,
            start_datetime: createTaskDto.start_datetime,
            due_datetime: createTaskDto.due_datetime,
            estimated_minutes: createTaskDto.estimated_minutes,
            actual_minutes: createTaskDto.actual_minutes,
            progress_percentage: createTaskDto.progress_percentage,
            priority: createTaskDto.priority,
            completed_at: null,
            user,
            goal,
        } as Task;

        mockQueryBuilder.getOne.mockResolvedValue(goal);
        mockTaskRepository.create.mockReturnValue(createdTask);
        mockTaskRepository.save.mockResolvedValue(createdTask);

        const result = await tasksService.createTask(createTaskDto, user);

        expect(mockGoalRepository.createQueryBuilder).toHaveBeenCalledWith('goal');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('goal.id = :goalId', { goalId: goal.id });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('goal.userId = :userId', { userId: user.id });
        expect(mockTaskRepository.create).toHaveBeenCalledWith({
            title: createTaskDto.title,
            description: createTaskDto.description,
            status: TaskStatus.IN_PROGRESS,
            start_datetime: createTaskDto.start_datetime,
            due_datetime: createTaskDto.due_datetime,
            estimated_minutes: createTaskDto.estimated_minutes,
            actual_minutes: createTaskDto.actual_minutes,
            progress_percentage: createTaskDto.progress_percentage,
            priority: createTaskDto.priority,
            completed_at: null,
            user,
            goal,
        });
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
        expect(result).toBe(createdTask);
    });

    it('throws not found when goal_id does not belong to the user', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const createTaskDto: CreateTaskDto = {
            title: 'Build endpoint',
            description: 'Create task with goal id',
            goal_id: 'missing-goal-id',
        };

        mockQueryBuilder.getOne.mockResolvedValue(null);

        await expect(tasksService.createTask(createTaskDto, user)).rejects.toThrow(NotFoundException);
        expect(mockTaskRepository.create).not.toHaveBeenCalled();
        expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('completes a task and recalculates its goal progress', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id' } as Goal;
        const task = {
            id: 'task-id',
            status: TaskStatus.IN_PROGRESS,
            goal,
        } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue(task);
        mockGoalsService.recalculateGoalProgress.mockResolvedValue({
            progressPercentage: 55,
            completedTasks: 4,
            totalTasks: 8,
        });

        const result = await tasksService.completeTask(task.id, user);

        expect(task.status).toBe(TaskStatus.DONE);
        expect(task.completed_at).toBeInstanceOf(Date);
        expect(mockTaskRepository.save).toHaveBeenCalledWith(task);
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
        expect(result).toEqual({
            message: 'Task completed successfully',
            goalProgress: {
                progressPercentage: 55,
                completedTasks: 4,
                totalTasks: 8,
            },
        });
    });

    it('completes a standalone task without recalculating goal progress', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const task = { id: 'task-id', status: TaskStatus.OPEN } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue(task);

        const result = await tasksService.completeTask(task.id, user);

        expect(task.status).toBe(TaskStatus.DONE);
        expect(mockGoalsService.recalculateGoalProgress).not.toHaveBeenCalled();
        expect(result).toEqual({
            message: 'Task completed successfully',
            goalProgress: null,
        });
    });

    it('updates partial task progress and recalculates the linked goal', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id' } as Goal;
        const task = {
            id: 'task-id',
            status: TaskStatus.OPEN,
            progress_percentage: 0,
            completed_at: null,
            goal,
        } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue(task);

        const result = await tasksService.updateTaskProgress(
            task.id,
            { progress_percentage: 40 },
            user,
        );

        expect(task.progress_percentage).toBe(40);
        expect(task.status).toBe(TaskStatus.IN_PROGRESS);
        expect(task.completed_at).toBeNull();
        expect(mockTaskRepository.save).toHaveBeenCalledWith(task);
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
        expect(result).toBe(task);
    });

    it('recalculates a linked goal after a task status update', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id' } as Goal;
        const task = {
            id: 'task-id',
            status: TaskStatus.IN_PROGRESS,
            progress_percentage: 40,
            goal,
        } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue(task);

        const result = await tasksService.updateTaskStatus(task.id, TaskStatus.DONE, user);

        expect(result).toBe(task);
        expect(task.progress_percentage).toBe(100);
        expect(task.completed_at).toBeInstanceOf(Date);
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
    });

    it('skips a task without retaining partial progress and recalculates its goal', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id' } as Goal;
        const task = {
            id: 'task-id',
            status: TaskStatus.IN_PROGRESS,
            progress_percentage: 40,
            completed_at: null,
            goal,
        } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue(task);

        await tasksService.updateTaskStatus(task.id, TaskStatus.SKIPPED, user);

        expect(task.status).toBe(TaskStatus.SKIPPED);
        expect(task.progress_percentage).toBe(0);
        expect(task.completed_at).toBeNull();
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
    });

    it('recalculates a linked goal after deleting its task', async () => {
        const user = { id: 'user-id', username: 'testuser' } as User;
        const goal = { id: 'goal-id' } as Goal;
        const task = { id: 'task-id', goal } as Task;

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.delete.mockResolvedValue({ affected: 1 });

        await expect(tasksService.deleteTask(task.id, user)).resolves.toBeUndefined();

        expect(mockTaskRepository.delete).toHaveBeenCalledWith({ id: task.id });
        expect(mockGoalsService.recalculateGoalProgress).toHaveBeenCalledWith(goal.id, user);
    });
});
