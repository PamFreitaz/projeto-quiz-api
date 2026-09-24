import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Question } from "../entities/question.entity";
import { Repository } from "typeorm";
import { EssayQuestion } from "../entities/essay-question.entity";
import { NumericQuestion } from "../entities/numeric-question.entity";
import { CreateEssayQuestionDto } from "../dto/create-essay-question.dto";
import { CreateQuestionDto } from "../dto/create-question.dto";
import { CreateNumericQuestionDto } from "../dto/create-numeric-question.dto";
import { CreateMultipleChoiceQuestionDto } from "../dto/create-multiple-choice-question.dto";
import { MultipleChoiceQuestion } from "../entities/multiple-choice-question.entity";

@Injectable()
export class QuestionsService {

    constructor(
        @InjectRepository(Question)
        private readonly questionsRepository: Repository<Question>,

        @InjectRepository(EssayQuestion)
        private readonly essayRepository: Repository<EssayQuestion>,

        @InjectRepository(NumericQuestion)
        private readonly numericRepository: Repository<NumericQuestion>,

        @InjectRepository(MultipleChoiceQuestion)
        private readonly multipleChoiceRepository: Repository<MultipleChoiceQuestion>,
    ) {}

    list(): Promise<Question[]> {
        return this.questionsRepository.find();
    }

    createEssay(dto: CreateEssayQuestionDto): Promise<EssayQuestion> {
        const question = this.essayRepository.create(dto);
        return this.essayRepository.save(question);
    }

    createNumeric(dto: CreateNumericQuestionDto): Promise<NumericQuestion> {
        const question = this.numericRepository.create(dto);
        return this.numericRepository.save(question);
    }

    createMultipleChoice(dto: CreateMultipleChoiceQuestionDto): Promise<MultipleChoiceQuestion> {
        const question = this.multipleChoiceRepository.create(dto);
        return this.multipleChoiceRepository.save(question);
    }
}