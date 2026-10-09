import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsModule } from '../questions/questions.module';
import { Attempt } from './entities/attempt.entity';
import { Answer } from './entities/answer.entity';
import { AttemptsController } from './controller/attempts.controller';
import { AttemptsService } from './services/attempts.service';
import { AnswersController } from './controller/answers.controller';
import { GradingModule } from '../grading/grading.module';
import { TypeOrmAttemptRepository } from './repositories/typeorm-attempt.repository';
import { ATTEMPT_READER_REPOSITORY } from './repositories/attempt-reader.repository';
import { AttemptQueryService } from './services/attempt-query.service';
import { ATTEMPT_WRITER_REPOSITORY } from './repositories/attempt-writer.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, Answer]),
    QuestionsModule, GradingModule,
  ],
  controllers: [AttemptsController, AnswersController],
  providers: [AttemptsService, AttemptQueryService,
    { provide: ATTEMPT_READER_REPOSITORY, useClass: TypeOrmAttemptRepository },
    { provide: ATTEMPT_WRITER_REPOSITORY, useClass: TypeOrmAttemptRepository }
  ],
})
export class AttemptsModule {}
