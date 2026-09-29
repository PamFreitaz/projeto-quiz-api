import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsModule } from '../questions/questions.module';
import { Attempt } from './entities/attempt.entity';
import { Answer } from './entities/answer.entity';
import { AttemptsController } from './controller/attempts.controller';
import { AttemptsService } from './services/attempts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, Answer]),
    QuestionsModule,
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  //exports: []
})
export class AttemptsModule {}
