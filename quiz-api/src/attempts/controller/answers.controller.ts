import { Body, Controller, Param, Patch } from "@nestjs/common";
import { Attempt } from "../entities/attempt.entity";
import { AttemptsService } from "../services/attempts.service";
import { ApiOperation } from "@nestjs/swagger";
import { GradeAnswerDto } from "../dto/grade-answer.dto";

@Controller('answers')
export class AnswersController {

    constructor ( private readonly attemptsService: AttemptsService) {}

    @ApiOperation({ summary: 'Corrige manualmente uma resposta dissertativa e recalcula a nota'})
    @Patch(':id/grade')
    gradeAnswer(@Param('id') id: string, @Body() dto: GradeAnswerDto): Promise<Attempt> {
        return this.attemptsService.gradeAnswer(id, dto);
    }

}