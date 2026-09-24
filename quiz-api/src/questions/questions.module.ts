import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Question } from './entities/question.entity';
import { EssayQuestion } from './entities/essay-question.entity';
import { NumericQuestion } from './entities/numeric-question.entity';

import { QuestionsService } from './services/questions.service';
import { QuestionsController } from './controller/questions.controller';
import { Choice } from './entities/choice.entity';
import { MultipleChoiceQuestion } from './entities/multiple-choice-question.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Question, EssayQuestion, NumericQuestion, MultipleChoiceQuestion, Choice]),
    ],
    controllers: [QuestionsController],
    providers: [QuestionsService],
})
export class QuestionsModule {}
