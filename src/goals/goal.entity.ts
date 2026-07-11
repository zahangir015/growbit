import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Exclude } from 'class-transformer';
import { GoalStatus } from './goal-status.enum';
import { GoalPriority } from './goal-priority.enum';
import { Task } from '../tasks/task.entity';
import { GoalProgressLog } from './goal-progress-log.entity';

@Entity()
export class Goal {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'date' })
    start_date!: Date;

    @Column({ type: 'date' })
    end_date!: Date;

    @Column({ type: 'int' })
    target_minutes!: number;

    @Column({ type: 'float', default: 0 })
    progress_percentage!: number;

    @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.NOT_STARTED })
    status!: GoalStatus;

    @Column({ type: 'enum', enum: GoalPriority, default: GoalPriority.MEDIUM })
    priority!: GoalPriority;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @ManyToOne(() => User, (user) => user.goals, { eager: false })
    @Exclude({ toPlainOnly: true })
    user!: User;

    @OneToMany(() => Task, (task) => task.goal, { eager: false })
    tasks!: Task[];

    @OneToMany(() => GoalProgressLog, (progressLog) => progressLog.goal, { eager: false })
    progress_logs!: GoalProgressLog[];
}
