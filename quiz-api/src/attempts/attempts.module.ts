import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsModule } from '../questions/questions.module';
import { Attempt } from './entities/attempt.entity';
import { Answer } from './entities/answer.entity';
import { AttemptsController } from './controller/attempts.controller';
import { AttemptsService } from './services/attempts.service';
import { AnswersController } from './controller/answers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, Answer]),
    QuestionsModule,
  ],
  controllers: [AttemptsController, AnswersController],
  providers: [AttemptsService],
  //exports: []
})
export class AttemptsModule {}
