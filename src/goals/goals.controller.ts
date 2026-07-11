import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/user.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { Goal } from './goal.entity';
import { GoalProgressSummary } from './interfaces/goal-progress-summary.interface';
import { GoalsService } from './goals.service';
import { GoalProgressHistoryEntry } from './interfaces/goal-progress-history-entry.interface';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@Controller('goals')
@UseGuards(AuthGuard())
@Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
@ApiTags('Goals')
@ApiBearerAuth('access-token')
export class GoalsController {
    private logger = new Logger('GoalsController');

    constructor(private readonly goalsService: GoalsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a goal' })
    createGoal(
        @Body() createGoalDto: CreateGoalDto,
        @GetUser() user: User,
    ): Promise<Goal> {
        this.logger.verbose(`User ${user.username} is creating a goal.`);
        return this.goalsService.createGoal(createGoalDto, user);
    }

    @Get()
    @ApiOperation({ summary: 'List the current user\'s goals' })
    getGoals(@GetUser() user: User): Promise<Goal[]> {
        return this.goalsService.getGoals(user);
    }

    @Get(':goalId/progress')
    @ApiOperation({ summary: 'Get a goal progress summary' })
    getGoalProgress(
        @Param('goalId') goalId: string,
        @GetUser() user: User,
    ): Promise<GoalProgressSummary> {
        return this.goalsService.getGoalProgress(goalId, user);
    }

    @Get(':goalId/progress/history')
    @ApiOperation({ summary: 'Get daily goal progress history' })
    getGoalProgressHistory(
        @Param('goalId') goalId: string,
        @GetUser() user: User,
    ): Promise<GoalProgressHistoryEntry[]> {
        return this.goalsService.getGoalProgressHistory(goalId, user);
    }

    @Post(':goalId/progress/recalculate')
    @ApiOperation({ summary: 'Manually recalculate goal progress' })
    recalculateGoalProgress(
        @Param('goalId') goalId: string,
        @GetUser() user: User,
    ): Promise<GoalProgressSummary> {
        return this.goalsService.recalculateGoalProgress(goalId, user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one goal' })
    getGoalById(@Param('id') id: string, @GetUser() user: User): Promise<Goal> {
        return this.goalsService.getGoalById(id, user);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Partially update a goal' })
    updateGoal(
        @Param('id') id: string,
        @Body() updateGoalDto: UpdateGoalDto,
        @GetUser() user: User,
    ): Promise<Goal> {
        return this.goalsService.updateGoal(id, updateGoalDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a goal' })
    deleteGoal(@Param('id') id: string, @GetUser() user: User): Promise<void> {
        return this.goalsService.deleteGoal(id, user);
    }
}
