import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsModule } from '../questions/questions.module';
import { Attempt } from './entities/attempt.entity';
import { Answer } from './entities/answer.entity';
import { AttemptsController } from './controller/attempts.controller';
import { AttemptsService } from './services/attempts.service';
import { AnswersController } from './controller/answers.controller';
import { GradingModule } from '../grading/grading.module';
import { ATTEMPT_REPOSITORY } from './repositories/attempt.repository';
import { TypeOrmAttemptRepository } from './repositories/typeorm-attempt.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, Answer]),
    QuestionsModule, GradingModule,
  ],
  controllers: [AttemptsController, AnswersController],
  providers: [AttemptsService,
    //quem pedir o ATTEMPT_REPOSITORY recebe a classe do TypeOrmAttemptRepository
    { provide: ATTEMPT_REPOSITORY, useClass: TypeOrmAttemptRepository}],
  //exports: []
})
export class AttemptsModule {}
