import { Injectable } from '@nestjs/common';
import { Task } from '../tasks/task.entity';
import { TaskStatus } from '../tasks/task-status.enum';
import { GoalStatus } from './goal-status.enum';
import { Goal } from './goal.entity';
import { GoalProgressSummary } from './interfaces/goal-progress-summary.interface';
import { DEFAULT_ESTIMATED_MINUTES } from '../tasks/task.constants';

@Injectable()
export class GoalProgressService {
    buildSummary(goal: Goal, tasks: Task[]): GoalProgressSummary {
        const now = new Date();
        const completedTasks = tasks.filter((task) => task.status === TaskStatus.DONE);
        const pendingTasks = tasks.filter((task) => task.status !== TaskStatus.DONE);
        const totalEstimatedMinutes = this.sumEstimatedMinutes(tasks);
        const completedEstimatedMinutes = this.sumCompletedWeightedMinutes(tasks);
        const remainingEstimatedMinutes = Number((totalEstimatedMinutes - completedEstimatedMinutes).toFixed(2));
        const progressPercentage = tasks.length > 0 && completedTasks.length === tasks.length
            ? 100
            : this.calculateProgressPercentage(totalEstimatedMinutes, completedEstimatedMinutes);
        const remainingMinutes = Math.max(
            0,
            Math.ceil((new Date(goal.end_date).getTime() - now.getTime()) / (1000 * 60)),
        );

        return {
            goalId: goal.id,
            goalTitle: goal.title,
            status: goal.status,
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            pendingTasks: pendingTasks.length,
            totalEstimatedMinutes,
            completedEstimatedMinutes,
            remainingEstimatedMinutes,
            progressPercentage,
            remainingDays: Math.ceil(remainingMinutes / (60 * 24)),
            isOverdue: remainingMinutes === 0 && goal.status !== GoalStatus.COMPLETED,
        };
    }

    calculateProgressPercentage(totalEstimatedMinutes: number, completedEstimatedMinutes: number): number {
        if (totalEstimatedMinutes <= 0) {
            return 0;
        }

        const progressPercentage = (completedEstimatedMinutes / totalEstimatedMinutes) * 100;
        return Number(Math.min(100, Math.max(0, progressPercentage)).toFixed(2));
    }

    calculateGoalStatus(goal: Goal, progressPercentage: number): GoalStatus {
        const goalEndDate = new Date(goal.end_date);

        if (goalEndDate.getTime() < Date.now() && progressPercentage < 100) {
            return GoalStatus.FAILED;
        }

        if (progressPercentage === 0) {
            return GoalStatus.NOT_STARTED;
        }

        if (progressPercentage === 100) {
            return GoalStatus.COMPLETED;
        }

        return GoalStatus.IN_PROGRESS;
    }

    private sumEstimatedMinutes(tasks: Task[]): number {
        return tasks.reduce(
            (total, task) => total + (task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES),
            0,
        );
    }

    private sumCompletedWeightedMinutes(tasks: Task[]): number {
        const completedWeightedMinutes = tasks.reduce((total, task) => {
            const estimatedMinutes = task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES;
            const taskProgressPercentage = task.status === TaskStatus.DONE
                ? 100
                : task.status === TaskStatus.IN_PROGRESS
                    ? Math.min(100, Math.max(0, task.progress_percentage ?? 0))
                    : 0;

            return total + (estimatedMinutes * taskProgressPercentage) / 100;
        }, 0);

        return Number(completedWeightedMinutes.toFixed(2));
    }
}
