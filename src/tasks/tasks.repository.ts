import { Repository } from 'typeorm';
import { Task } from './task.entity';

export class TasksRepository extends Repository<Task> {

    async getTasks(filterDto: any): Promise<Task[]> {
        const { status, search } = filterDto;

        const query = this.createQueryBuilder('task');

        if (status) {
            query.andWhere('task.status = :status', { status });
        }

        if (search) {
            query.andWhere(
                '(task.title LIKE :search OR task.description LIKE :search)',
                { search: `%${search}%` },
            );
        }

        const tasks = await query.getMany();
        return tasks;
    }

}