import { InjectRepository } from "@nestjs/typeorm";
import { Attempt } from "../entities/attempt.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { StartAttemptDto } from "../dto/start-attempt.dto";
import { QuestionsService } from "../../questions/services/questions.service";
import { SaveAnswerDto } from "../dto/save-answer.dto";
import { Answer } from "../entities/answer.entity";
import { GradeAnswerDto } from "../dto/grade-answer.dto";
import { ScoreCalculator } from "../../grading/score-calculator";
import { GradingService } from "../../grading/grading.service";

@Injectable()
export class AttemptsService {

    constructor(
        @InjectRepository(Attempt)
        private readonly repositoryAttempt: Repository<Attempt>,

        @InjectRepository(Answer)
        private readonly repositoryAnswer: Repository<Answer>,

        private readonly questionsService: QuestionsService,

        private readonly scoreCalculator: ScoreCalculator,

        private readonly gradingService: GradingService,
    ) {}

    start(dto: StartAttemptDto): Promise<Attempt> {
        const attempt = this.repositoryAttempt.create(dto);
        return this.repositoryAttempt.save(attempt);
    }

    list(): Promise<Attempt[]> {
        return this.repositoryAttempt.find();
    }

    async listById(id: string): Promise<Attempt> {
        const attempt = await this.repositoryAttempt.findOne({
            where: { id: id},
            relations: { answers: {question: true }},
        });
        
        if(attempt === null) {
            throw new NotFoundException('Tentativa não encontrada');
        }
        return attempt;
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

    async submit(attemptId: string): Promise<Attempt> {
        const attempt = await this.repositoryAttempt.findOne({
            where: { id: attemptId},
            relations: { answers: { question: true }},
        });
        if(attempt === null) {
            throw new NotFoundException('Tentativa não encontrada');
        }
        if(!attempt.canAcceptAnswers()) {
           throw new BadRequestException('Esta tentativa já foi enviada!'); 
        }

        const now = new Date();
        attempt.submit(now);

       const results = this.gradingService.autoGrade(attempt.answers)

         // a tentativa preenche os pontos e a data em cada resposta auto corrigida 
        attempt.applyAutoGrade(results, now);

         // a tentativa soma os pontos e preenche usando a calculadora
        attempt.recalculateScore(this.scoreCalculator);

        //grava todas as respostas de uma vez fazendo um UPDATE para cada uma, e espera terminar
        await this.repositoryAnswer.save(attempt.answers);

        //grava a tentativa um UPDATE com o submitted_at e o score_points, e devolve ela
        return this.repositoryAttempt.save(attempt);
    }

    async gradeAnswer(answerId: string, dto: GradeAnswerDto): Promise<Attempt> {
        const answer = await this.repositoryAnswer.findOne({
            where: { id : answerId },
            relations: { attempt: true, question: true },
        });

        if(answer === null ) {
            throw new NotFoundException('Resposta não encontrada');
        }

        if(answer.attempt.canAcceptAnswers()) {
            throw new BadRequestException('Tentativa ainda não foi enviada, só dá para corrigir depois do envio!');
        }

        if(answer.question.question_type !== 'essay' ) {
            throw new BadRequestException('Somente respostas dissertativas são corrigidas manualmente!');
        }

        if(dto.points > answer.question.weightPoints) {
            throw new BadRequestException('A pontuação não pode ser maior do que o peso da questão!');
        }
        
        answer.awardedPoints = dto.points;
        answer.gradedAt = new Date();
        await this.repositoryAnswer.save(answer);

        // busca a tentativa de novo já com a resposta corrigida
        const attempt = await this.repositoryAttempt.findOneOrFail({
            where: { id: answer.attempt.id},
            relations: { answers: { question: true} },
        });

        //recalcula a nota da tentativa usando a calculadora
        attempt.recalculateScore(this.scoreCalculator);

        //salva no banco a tentativa com a nota nova
        return this.repositoryAttempt.save(attempt);
        
    }
    
    


}