import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { AuthModule } from '../auth/auth.module';
import { Goal } from '../goals/goal.entity';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Goal]), 
    AuthModule,
    GoalsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService]
})
export class TasksModule {}
