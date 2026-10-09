import { Attempt } from "../entities/attempt.entity";
import { BadRequestException, Injectable, NotFoundException, Inject } from "@nestjs/common";
import { StartAttemptDto } from "../dto/start-attempt.dto";
import { QuestionsService } from "../../questions/services/questions.service";
import { SaveAnswerDto } from "../dto/save-answer.dto";
import { Answer } from "../entities/answer.entity";
import { GradeAnswerDto } from "../dto/grade-answer.dto";
import { ScoreCalculator } from "../../grading/score-calculator";
import { GradingService } from "../../grading/grading.service";
import { isAutoGradable } from "../../questions/auto-gradable";
import { ATTEMPT_REPOSITORY, AttemptRepository } from "../repositories/attempt.repository";

@Injectable()
export class AttemptsService {

    constructor(
        @Inject(ATTEMPT_REPOSITORY)
        private readonly attemptRepository: AttemptRepository,

        private readonly questionsService: QuestionsService,

        private readonly scoreCalculator: ScoreCalculator,

        private readonly gradingService: GradingService,
    ) {}

    start(dto: StartAttemptDto): Promise<Attempt> {
        const attempt = new Attempt();
        attempt.studentName = dto.studentName;
        attempt.answers = [];
        return this.attemptRepository.save(attempt);
    }

    list(): Promise<Attempt[]> {
        return this.attemptRepository.findAll();
    }

    async listById(id: string): Promise<Attempt> {
        const attempt = await this.attemptRepository.findById(id);
        
        if(attempt === null) {
            throw new NotFoundException('Tentativa não encontrada');
        }
        return attempt;
    }

    async saveAnswer(attemptId: string, dto: SaveAnswerDto): Promise<Attempt> {
        const attempt = await this.attemptRepository.findById(attemptId);

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
        } else {
            const newAnswer = new Answer();
            newAnswer.rawValue = dto.rawValue;
            newAnswer.question = question;
            attempt.answers.push(newAnswer);
        }
        return this.attemptRepository.save(attempt);
    }

    async submit(attemptId: string): Promise<Attempt> {
        const attempt = await this.attemptRepository.findById(attemptId);
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

        return this.attemptRepository.save(attempt);
    }

    //aqui é para o professor corrigir a dissertativa
    async gradeAnswer(answerId: string, dto: GradeAnswerDto): Promise<Attempt> {
        const attempt = await this.attemptRepository.findByAnswerId(answerId);
        
        if(attempt === null ) {
            throw new NotFoundException('Resposta não encontrada');
        }

        const answer = attempt.answers.find((item) => item.id === answerId);

        if(answer === undefined) {
            throw new NotFoundException('Resposta não encontrada');
        }

        if(attempt.canAcceptAnswers()) {
            throw new BadRequestException('Tentativa ainda não foi enviada, só dá para corrigir depois do envio!');
        }

        if(isAutoGradable(answer.question) ) {
            throw new BadRequestException('Essa questão é corrigida automaticamente. Só as questões que não se corrigem sozinhas vão para a correção manual!');
        }

        if(dto.points > answer.question.weightPoints) {
            throw new BadRequestException('A pontuação não pode ser maior do que o peso da questão!');
        }
        
        answer.awardedPoints = dto.points;
        answer.gradedAt = new Date();

        //recalcula a nota usando a calculadora
        attempt.recalculateScore(this.scoreCalculator);

        //salva no banco com a nota nova
        return this.attemptRepository.save(attempt);
    }
    
    


}