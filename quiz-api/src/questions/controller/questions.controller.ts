import { Body, Controller, Get, Post } from "@nestjs/common";
import { QuestionsService } from "../services/questions.service";
import { Question } from "../entities/question.entity";
import { CreateEssayQuestionDto } from "../dto/create-essay-question.dto";
import { EssayQuestion } from "../entities/essay-question.entity";
import { CreateNumericQuestionDto } from "../dto/create-numeric-question.dto";
import { NumericQuestion } from "../entities/numeric-question.entity";
import { CreateMultipleChoiceQuestionDto } from "../dto/create-multiple-choice-question.dto";
import { MultipleChoiceQuestion } from "../entities/multiple-choice-question.entity";

@Controller('questions')
export class QuestionsController {

    constructor(private readonly questionsService: QuestionsService){}

    @Get()
    list(): Promise<Question[]> {
        return this.questionsService.list();
    }

    @Post('essay')
    createEssay(@Body() dtoEssay: CreateEssayQuestionDto): Promise<EssayQuestion> {
        return this.questionsService.createEssay(dtoEssay);
    }

    @Post('numeric')
    createNumeric(@Body() dtoNumeric: CreateNumericQuestionDto): Promise<NumericQuestion> {
        return this.questionsService.createNumeric(dtoNumeric); 
    }
    
    @Post('multiple-choice')
    createMultipleChoice(@Body() dtoMultipleChoice: CreateMultipleChoiceQuestionDto): Promise<MultipleChoiceQuestion> {
        return this.questionsService.createMultipleChoice(dtoMultipleChoice);
    }



        
}