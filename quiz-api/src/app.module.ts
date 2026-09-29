import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/database.module';
import { ConfigModule } from '@nestjs/config';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, QuestionsModule, AttemptsModule ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
