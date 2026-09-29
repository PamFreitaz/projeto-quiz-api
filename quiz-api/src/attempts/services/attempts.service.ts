import { InjectRepository } from "@nestjs/typeorm";
import { Attempt } from "../entities/attempt.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { StartAttemptDto } from "../dto/start-attempt.dto";
import { QuestionsService } from "../../questions/services/questions.service";
import { SaveAnswerDto } from "../dto/save-answer.dto";
import { Answer } from "../entities/answer.entity";

@Injectable()
export class AttemptsService {

    constructor(
        @InjectRepository(Attempt)
        private readonly repositoryAttempt: Repository<Attempt>,

        @InjectRepository(Answer)
        private readonly repositoryAnswer: Repository<Answer>,

        private readonly questionsService: QuestionsService,
    ) {}

    start(dto: StartAttemptDto): Promise<Attempt> {
        const attempt = this.repositoryAttempt.create(dto);
        return this.repositoryAttempt.save(attempt);
    }

    list(): Promise<Attempt[]> {
        return this.repositoryAttempt.find();
    }

    async saveAnswer(attemptId: string, dto: SaveAnswerDto): Promise<Attempt> {
        const attempt = await this.repositoryAttempt.findOne({
            where: { id: attemptId},
            relations: { answers: { question: true }},
        });

        if (attempt === null) {
            throw new NotFoundException('Tentativa não encontrada!');
        }

        if(!attempt.canAcceptAnswers()) {
            throw new BadRequestException('Essa tentativa já foi enviada e não aceita mais respostas!');
        }

        const question = await this.questionsService.findById(dto.questionId);

        if(question === null) {
            throw new NotFoundException('Questão não encontrada!');
        }

        const existingAnswer = attempt.answers.find((foundAnswer) => foundAnswer.question.id === question.id);

        if(existingAnswer) {
            existingAnswer.rawValue = dto.rawValue;
            await this.repositoryAnswer.save(existingAnswer);
        } else {
            const newAnswer = this.repositoryAnswer.create({ 
                rawValue: dto.rawValue,
                attempt: attempt,
                question: question,
            });
            await this.repositoryAnswer.save(newAnswer);
        }

        //findOneOrFail para dar erro se devolver null
        return this.repositoryAttempt.findOneOrFail({
            where: { id: attemptId},
            relations: { answers: { question: true}},
        });
    }


}