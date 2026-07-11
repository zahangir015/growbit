import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from './goal.entity';
import { GoalProgressLog } from './goal-progress-log.entity';
import { AuthModule } from '../auth/auth.module';
import { Task } from '../tasks/task.entity';
import { GoalProgressService } from './goal-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal, GoalProgressLog, Task]),
    AuthModule,
  ],
  providers: [GoalsService, GoalProgressService],
  controllers: [GoalsController],
  exports: [GoalsService],
})
export class GoalsModule {}
