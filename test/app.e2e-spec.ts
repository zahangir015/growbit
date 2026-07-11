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

jest.doMock('@nestjs/passport', () => ({
  AuthGuard: () => class {
    canActivate(): boolean {
      return true;
    }
  },
}));

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';

const { AuthController } = require('../src/auth/auth.controller') as typeof import('../src/auth/auth.controller');
const { AuthService } = require('../src/auth/auth.service') as typeof import('../src/auth/auth.service');
const { TasksController } = require('../src/tasks/tasks.controller') as typeof import('../src/tasks/tasks.controller');
const { TasksService } = require('../src/tasks/tasks.service') as typeof import('../src/tasks/tasks.service');
const { GoalsController } = require('../src/goals/goals.controller') as typeof import('../src/goals/goals.controller');
const { GoalsService } = require('../src/goals/goals.service') as typeof import('../src/goals/goals.service');
const { TaskStatus } = require('../src/tasks/task-status.enum') as typeof import('../src/tasks/task-status.enum');
const { ExpressAdapter } = require('../node_modules/@nestjs/platform-express/adapters/express-adapter');

describe('API endpoints (e2e)', () => {
  let app: INestApplication;
  const user = { id: 'user-id', username: 'testuser' };
  const authService = {
    createUser: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const tasksService = {
    getTasks: jest.fn(),
    getTaskById: jest.fn(),
    createTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    completeTask: jest.fn(),
    updateTaskProgress: jest.fn(),
    deleteTask: jest.fn(),
  };
  const goalsService = {
    createGoal: jest.fn(),
    getGoals: jest.fn(),
    getGoalById: jest.fn(),
    getGoalProgress: jest.fn(),
    getGoalProgressHistory: jest.fn(),
    recalculateGoalProgress: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, TasksController, GoalsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TasksService, useValue: tasksService },
        { provide: GoalsService, useValue: goalsService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication(new ExpressAdapter());
    app.use((req: Request & { user?: typeof user }, _res: Response, next: NextFunction) => {
      req.user = user;
      next();
    });
    await app.init();
  });

  beforeEach(() => {
    Object.values(authService).forEach((method) => method.mockReset());
    Object.values(tasksService).forEach((method) => method.mockReset());
    Object.values(goalsService).forEach((method) => method.mockReset());
  });

  afterAll(async () => {
    await app.close();
  });

  it('handles every auth endpoint', async () => {
    authService.createUser.mockResolvedValue(undefined);
    authService.login.mockResolvedValue({ accessToken: 'jwt-token' });
    authService.forgotPassword.mockResolvedValue({ message: 'Reset started' });
    authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'testuser', email: 'test@example.com', password: 'Password1!' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'Password1!' })
      .expect(201)
      .expect({ accessToken: 'jwt-token' });
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'test@example.com' })
      .expect(201)
      .expect({ message: 'Reset started' });
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'reset-token',
        password: 'NewPassword1!',
        passwordConfirmation: 'NewPassword1!',
      })
      .expect(201)
      .expect({ message: 'Password reset successfully' });

    expect(authService.createUser).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('handles every task endpoint', async () => {
    const task = { id: 'task-id', title: 'Build auth', status: TaskStatus.IN_PROGRESS };
    tasksService.getTasks.mockResolvedValue([task]);
    tasksService.getTaskById.mockResolvedValue(task);
    tasksService.createTask.mockResolvedValue(task);
    tasksService.updateTaskStatus.mockResolvedValue({ ...task, status: TaskStatus.DONE });
    tasksService.completeTask.mockResolvedValue({
      message: 'Task completed successfully',
      goalProgress: { progressPercentage: 50, completedTasks: 1, totalTasks: 2 },
    });
    tasksService.updateTaskProgress.mockResolvedValue({ ...task, progress_percentage: 40 });
    tasksService.deleteTask.mockResolvedValue(undefined);

    await request(app.getHttpServer()).get('/tasks?status=IN_PROGRESS&search=auth').expect(200).expect([task]);
    await request(app.getHttpServer()).get('/tasks/task-id').expect(200).expect(task);
    await request(app.getHttpServer()).post('/tasks').send({ title: 'Build auth', description: 'Implement login' }).expect(201);
    await request(app.getHttpServer()).patch('/tasks/task-id/status').send({ status: 'DONE' }).expect(200);
    await request(app.getHttpServer()).patch('/tasks/task-id/complete').expect(200);
    await request(app.getHttpServer()).patch('/tasks/task-id/progress').send({ progress_percentage: 40 }).expect(200);
    await request(app.getHttpServer()).delete('/tasks/task-id').expect(200);

    expect(tasksService.getTasks).toHaveBeenCalledWith({ status: 'IN_PROGRESS', search: 'auth' }, user);
    expect(tasksService.getTaskById).toHaveBeenCalledWith('task-id', user);
    expect(tasksService.createTask).toHaveBeenCalledWith({ title: 'Build auth', description: 'Implement login' }, user);
    expect(tasksService.updateTaskStatus).toHaveBeenCalledWith('task-id', 'DONE', user);
    expect(tasksService.completeTask).toHaveBeenCalledWith('task-id', user);
    expect(tasksService.updateTaskProgress).toHaveBeenCalledWith('task-id', { progress_percentage: 40 }, user);
    expect(tasksService.deleteTask).toHaveBeenCalledWith('task-id', user);
  });

  it('handles every goal endpoint', async () => {
    const goal = { id: 'goal-id', title: 'Learn NestJS' };
    const progress = { goalId: 'goal-id', progressPercentage: 50 };
    const history = [{ date: '2026-07-01', progressPercentage: 50 }];
    goalsService.createGoal.mockResolvedValue(goal);
    goalsService.getGoals.mockResolvedValue([goal]);
    goalsService.getGoalById.mockResolvedValue(goal);
    goalsService.getGoalProgress.mockResolvedValue(progress);
    goalsService.getGoalProgressHistory.mockResolvedValue(history);
    goalsService.recalculateGoalProgress.mockResolvedValue(progress);
    goalsService.updateGoal.mockResolvedValue({ ...goal, title: 'Updated goal' });
    goalsService.deleteGoal.mockResolvedValue(undefined);

    await request(app.getHttpServer()).post('/goals').send({ title: 'Learn NestJS' }).expect(201);
    await request(app.getHttpServer()).get('/goals').expect(200).expect([goal]);
    await request(app.getHttpServer()).get('/goals/goal-id/progress').expect(200).expect(progress);
    await request(app.getHttpServer()).get('/goals/goal-id/progress/history').expect(200).expect(history);
    await request(app.getHttpServer()).post('/goals/goal-id/progress/recalculate').expect(201).expect(progress);
    await request(app.getHttpServer()).get('/goals/goal-id').expect(200).expect(goal);
    await request(app.getHttpServer()).patch('/goals/goal-id').send({ title: 'Updated goal' }).expect(200);
    await request(app.getHttpServer()).delete('/goals/goal-id').expect(200);

    expect(goalsService.createGoal).toHaveBeenCalledWith({ title: 'Learn NestJS' }, user);
    expect(goalsService.getGoals).toHaveBeenCalledWith(user);
    expect(goalsService.getGoalById).toHaveBeenCalledWith('goal-id', user);
    expect(goalsService.getGoalProgress).toHaveBeenCalledWith('goal-id', user);
    expect(goalsService.getGoalProgressHistory).toHaveBeenCalledWith('goal-id', user);
    expect(goalsService.recalculateGoalProgress).toHaveBeenCalledWith('goal-id', user);
    expect(goalsService.updateGoal).toHaveBeenCalledWith('goal-id', { title: 'Updated goal' }, user);
    expect(goalsService.deleteGoal).toHaveBeenCalledWith('goal-id', user);
  });
});
