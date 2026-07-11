import { GoalStatus } from '../goal-status.enum';

export interface GoalProgressSummary {
    goalId: string;
    goalTitle: string;
    status: GoalStatus;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalEstimatedMinutes: number;
    completedEstimatedMinutes: number;
    remainingEstimatedMinutes: number;
    progressPercentage: number;
    remainingDays: number;
    isOverdue: boolean;
}
