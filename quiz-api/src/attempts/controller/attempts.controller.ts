import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { AttemptsService } from "../services/attempts.service";
import { StartAttemptDto } from "../dto/start-attempt.dto";
import { Attempt } from "../entities/attempt.entity";
import { SaveAnswerDto } from "../dto/save-answer.dto";
import { ApiOperation } from "@nestjs/swagger";

@Controller('attempts')
export class AttemptsController {

    constructor(private readonly attemptsService: AttemptsService) {}

    @ApiOperation({ summary: 'Lista as tentativas' })
    @Get()
    list(): Promise<Attempt[]> {
        return this.attemptsService.list();
    }

    @ApiOperation({ summary: 'Lista as tentativas por id'})
    @Get(':id')
    listById(@Param('id') id: string): Promise<Attempt> {
        return this.attemptsService.listById(id);
    }
    
    @ApiOperation({ summary: 'Inicia uma tentativa' })
    @Post()
    start(@Body() dto: StartAttemptDto): Promise<Attempt> {
        return this.attemptsService.start(dto);
    }

    @ApiOperation({ summary: 'Registra ou sobrescreve resposta' })
    @Put(':id/answers')
    saveAnswer(@Param('id') id: string, @Body() dto: SaveAnswerDto): Promise<Attempt> {
        return this.attemptsService.saveAnswer(id, dto);
    }

    @ApiOperation({ summary: 'Envia a tentativa e corrige as respostas automaticamente' })
    @Post(':id/submit')
    submit(@Param('id') id: string): Promise<Attempt> {
        return this.attemptsService.submit(id);
    }


}