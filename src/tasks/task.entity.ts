import { Column, PrimaryGeneratedColumn, Entity, ManyToOne } from 'typeorm';
import { TaskStatus } from "./task-status.enum";
import { TaskPriority } from './task-priority.enum';
import { User } from '../auth/user.entity';
import { Exclude } from 'class-transformer';
import { Goal } from '../goals/goal.entity';
import { DEFAULT_ESTIMATED_MINUTES } from './task.constants';

@Entity()
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @Column()
    description!: string;

    @Column()
    status!: TaskStatus;

    @Column({ type: 'timestamp', nullable: true })
    start_datetime?: Date;

    @Column({ type: 'timestamp', nullable: true })
    due_datetime?: Date;

    @Column({ type: 'int', nullable: true, default: DEFAULT_ESTIMATED_MINUTES })
    estimated_minutes?: number;

    @Column({ type: 'int', default: 0 })
    actual_minutes!: number;

    @Column({ type: 'float', default: 0 })
    progress_percentage!: number;

    @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority!: TaskPriority;

    @Column({ type: 'timestamp', nullable: true })
    completed_at?: Date | null;

    @ManyToOne( (_type) => User, (user) => user.tasks, { eager: false})
    @Exclude({ toPlainOnly: true })
    user!: User;

    @ManyToOne(() => Goal, (goal) => goal.tasks, { eager: false, nullable: true })
    @Exclude({ toPlainOnly: true })
    goal?: Goal;
}
