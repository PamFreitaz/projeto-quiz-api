import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { AttemptsService } from "../services/attempts.service";
import { StartAttemptDto } from "../dto/start-attempt.dto";
import { Attempt } from "../entities/attempt.entity";
import { SaveAnswerDto } from "../dto/save-answer.dto";

@Controller('attempts')
export class AttemptsController {

    constructor(private readonly attemptsService: AttemptsService) {}

    @Get()
    list(): Promise<Attempt[]> {
        return this.attemptsService.list();
    }
    
    @Post()
    start(@Body() dto: StartAttemptDto): Promise<Attempt> {
        return this.attemptsService.start(dto);
    }

    @Put(':id/answers')
    saveAnswer(@Param('id') id: string, @Body() dto: SaveAnswerDto): Promise<Attempt> {
        return this.attemptsService.saveAnswer(id, dto);
    }

}