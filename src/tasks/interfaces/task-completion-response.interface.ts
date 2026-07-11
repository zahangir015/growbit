export interface TaskCompletionResponse {
    message: string;
    goalProgress: {
        progressPercentage: number;
        completedTasks: number;
        totalTasks: number;
    } | null;
}
