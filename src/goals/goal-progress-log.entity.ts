import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';
import { User } from '../auth/user.entity';
import { Goal } from './goal.entity';

@Entity('goal_progress_logs')
export class GoalProgressLog {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id!: string;

    @ManyToOne(() => Goal, (goal) => goal.progress_logs, { eager: false, nullable: false })
    @JoinColumn({ name: 'goal_id' })
    @Exclude({ toPlainOnly: true })
    goal!: Goal;

    @RelationId((progressLog: GoalProgressLog) => progressLog.goal)
    goal_id!: string;

    @ManyToOne(() => User, (user) => user.goal_progress_logs, { eager: false, nullable: false })
    @JoinColumn({ name: 'user_id' })
    @Exclude({ toPlainOnly: true })
    user!: User;

    @RelationId((progressLog: GoalProgressLog) => progressLog.user)
    user_id!: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    progress_percentage!: number;

    @Column({ type: 'int', default: 0 })
    total_tasks!: number;

    @Column({ type: 'int', default: 0 })
    completed_tasks!: number;

    @Column({ type: 'int', default: 0 })
    total_estimated_minutes!: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    completed_estimated_minutes!: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    logged_at!: Date;
}
