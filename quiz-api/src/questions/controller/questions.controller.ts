import { Body, Controller, Get, Post } from "@nestjs/common";
import { QuestionsService } from "../services/questions.service";
import { Question } from "../entities/question.entity";
import { CreateEssayQuestionDto } from "../dto/create-essay-question.dto";
import { EssayQuestion } from "../entities/essay-question.entity";
import { CreateNumericQuestionDto } from "../dto/create-numeric-question.dto";
import { NumericQuestion } from "../entities/numeric-question.entity";
import { CreateMultipleChoiceQuestionDto } from "../dto/create-multiple-choice-question.dto";
import { MultipleChoiceQuestion } from "../entities/multiple-choice-question.entity";
import { ApiOperation } from "@nestjs/swagger";
import { CreateTrueFalseQuestionDto } from "../dto/create-true-false-question.dto";
import { TrueFalseQuestion } from "../entities/true-false-question.entity";

@Controller('questions')
export class QuestionsController {

    constructor(private readonly questionsService: QuestionsService){}

    @ApiOperation({ summary: 'Lista as questões' })
    @Get()
    list(): Promise<Question[]> {
        return this.questionsService.list();
    }

    @ApiOperation({ summary: 'Cadastra uma questão dissertativa' })
    @Post('essay')
    createEssay(@Body() dtoEssay: CreateEssayQuestionDto): Promise<EssayQuestion> {
        return this.questionsService.createEssay(dtoEssay);
    }

    @ApiOperation({ summary: 'Cadastra uma questão numérica' })
    @Post('numeric')
    createNumeric(@Body() dtoNumeric: CreateNumericQuestionDto): Promise<NumericQuestion> {
        return this.questionsService.createNumeric(dtoNumeric); 
    }
    
    @ApiOperation({ summary: 'Cadastra uma questão múltipla escolha' })
    @Post('multiple-choice')
    createMultipleChoice(@Body() dtoMultipleChoice: CreateMultipleChoiceQuestionDto): Promise<MultipleChoiceQuestion> {
        return this.questionsService.createMultipleChoice(dtoMultipleChoice);
    }

    @ApiOperation({ summary: 'Cadastra uma questão de verdadeiro ou falso'})
    @Post('true-false')
    createTrueFalse(@Body() dtoTrueFalse: CreateTrueFalseQuestionDto): Promise<TrueFalseQuestion> {
        return this.questionsService.createTrueFalse(dtoTrueFalse);
    }

        
}