jest.doMock('@nestjs/typeorm', () => ({
    InjectRepository: () => () => undefined,
}));

jest.doMock('typeorm', () => ({
    Repository: class Repository {},
    Entity: () => () => undefined,
    Column: () => () => undefined,
    PrimaryGeneratedColumn: () => () => undefined,
    ManyToOne: () => () => undefined,
    OneToMany: () => () => undefined,
    JoinColumn: () => () => undefined,
    RelationId: () => () => undefined,
    CreateDateColumn: () => () => undefined,
    UpdateDateColumn: () => () => undefined,
}));

import type { User } from '../auth/user.entity';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { FilterTaskDto } from './dto/filter-task.dto';
import type { UpdateTaskProgressDto } from './dto/update-task-progress.dto';
import type { Task } from './task.entity';
import { TaskStatus } from './task-status.enum';
import type { TasksService } from './tasks.service';

const { TasksController } = require('./tasks.controller') as typeof import('./tasks.controller');

describe('TasksController', () => {
    let controller: InstanceType<typeof TasksController>;
    let mockTasksService: {
        getTasks: jest.Mock;
        getTaskById: jest.Mock;
        createTask: jest.Mock;
        updateTaskStatus: jest.Mock;
        completeTask: jest.Mock;
        updateTaskProgress: jest.Mock;
        deleteTask: jest.Mock;
    };
    const user = { id: 'user-id', username: 'testuser' } as User;

    beforeEach(() => {
        mockTasksService = {
            getTasks: jest.fn(),
            getTaskById: jest.fn(),
            createTask: jest.fn(),
            updateTaskStatus: jest.fn(),
            completeTask: jest.fn(),
            updateTaskProgress: jest.fn(),
            deleteTask: jest.fn(),
        };

        controller = new TasksController(mockTasksService as unknown as TasksService);
    });

    it('gets tasks through GET /tasks', async () => {
        const filterDto: FilterTaskDto = { status: TaskStatus.IN_PROGRESS, search: 'auth' };
        const tasks = [{ id: 'task-id', title: 'Build auth' } as Task];

        mockTasksService.getTasks.mockResolvedValue(tasks);

        await expect(controller.getTasks(filterDto, user)).resolves.toBe(tasks);
        expect(mockTasksService.getTasks).toHaveBeenCalledWith(filterDto, user);
    });

    it('gets one task through GET /tasks/:id', async () => {
        const task = { id: 'task-id', title: 'Build auth' } as Task;

        mockTasksService.getTaskById.mockResolvedValue(task);

        await expect(controller.getTaskById(task.id, user)).resolves.toBe(task);
        expect(mockTasksService.getTaskById).toHaveBeenCalledWith(task.id, user);
    });

    it('creates a task through POST /tasks', async () => {
        const dto: CreateTaskDto = { title: 'Build auth', description: 'Implement login' };
        const task = { id: 'task-id', ...dto } as Task;

        mockTasksService.createTask.mockResolvedValue(task);

        await expect(controller.createTask(dto, user)).resolves.toBe(task);
        expect(mockTasksService.createTask).toHaveBeenCalledWith(dto, user);
    });

    it('updates a task status through PATCH /tasks/:id/status', async () => {
        const task = { id: 'task-id', status: TaskStatus.DONE } as Task;

        mockTasksService.updateTaskStatus.mockResolvedValue(task);

        await expect(controller.updateTaskStatus(task.id, TaskStatus.DONE, user)).resolves.toBe(task);
        expect(mockTasksService.updateTaskStatus).toHaveBeenCalledWith(task.id, TaskStatus.DONE, user);
    });

    it('completes a task through PATCH /tasks/:taskId/complete', async () => {
        const response = {
            message: 'Task completed successfully',
            goalProgress: { progressPercentage: 50, completedTasks: 1, totalTasks: 2 },
        };

        mockTasksService.completeTask.mockResolvedValue(response);

        await expect(controller.completeTask('task-id', user)).resolves.toBe(response);
        expect(mockTasksService.completeTask).toHaveBeenCalledWith('task-id', user);
    });

    it('updates partial progress through PATCH /tasks/:taskId/progress', async () => {
        const dto: UpdateTaskProgressDto = { progress_percentage: 40 };
        const task = { id: 'task-id', progress_percentage: 40 } as Task;

        mockTasksService.updateTaskProgress.mockResolvedValue(task);

        await expect(controller.updateTaskProgress(task.id, dto, user)).resolves.toBe(task);
        expect(mockTasksService.updateTaskProgress).toHaveBeenCalledWith(task.id, dto, user);
    });

    it('deletes a task through DELETE /tasks/:id', async () => {
        mockTasksService.deleteTask.mockResolvedValue(undefined);

        await expect(controller.deleteTask('task-id', user)).resolves.toBeUndefined();
        expect(mockTasksService.deleteTask).toHaveBeenCalledWith('task-id', user);
    });
});
