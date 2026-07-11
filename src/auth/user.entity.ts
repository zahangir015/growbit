import { Task } from "../tasks/task.entity";
import { Goal } from "../goals/goal.entity";
import { GoalProgressLog } from "../goals/goal-progress-log.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column({ type: 'varchar', unique: true, nullable: true })
    email?: string | null;

    @Column({ select: false })
    password!: string;

    @Column({ type: 'varchar', nullable: true, unique: true, select: false })
    password_reset_token?: string | null;

    @Column({ type: 'timestamp', nullable: true })
    password_reset_expires_at?: Date | null;

    @Column({ type: 'int', default: 0 })
    token_version!: number;

    @OneToMany((_type) => Task, (task) => task.user, { eager: true})
    tasks!: Task[];

    @OneToMany((_type) => Goal, (goal) => goal.user, { eager: true })
    goals!: Goal[];

    @OneToMany((_type) => GoalProgressLog, (progressLog) => progressLog.user, { eager: false })
    goal_progress_logs!: GoalProgressLog[];
}
