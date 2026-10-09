import { BadRequestException } from "@nestjs/common";
import { AttemptsService } from "./attempts.service";
import { InMemoryAttemptRepository } from "../repositories/in-memory-attempt.repository";
import { QuestionsService } from "../../questions/services/questions.service";
import { ScoreCalculator } from "../../grading/score-calculator";
import { GradingService } from "../../grading/grading.service";
import { Attempt } from "../entities/attempt.entity";
import { Answer } from "../entities/answer.entity";
import { NumericQuestion } from "../../questions/entities/numeric-question.entity";
import { EssayQuestion } from "../../questions/entities/essay-question.entity";

// DIP o mesmo AttemptsService, ligado no "power bank" em vez do banco
describe('AttemptsService (sem banco)', () => {

    let repository: InMemoryAttemptRepository;
    let service: AttemptsService;

    // antes de CADA teste: um power bank novinho, para um teste não atrapalhar o outro
    beforeEach(() => {
        repository = new InMemoryAttemptRepository();
        const calculator = new ScoreCalculator();
        // o submit e o gradeAnswer não usam o QuestionsService, então vai uma caixa vazia
        service = new AttemptsService(repository, repository, {} as QuestionsService, calculator, new GradingService(calculator));
    });

    // função de ajuda: uma tentativa com uma numérica certa com o peso 2 e uma dissertativa peso 3
    async function createAttemptWithAnswers(): Promise<Attempt> {
        const numeric = new NumericQuestion();
        numeric.id = 'q-numeric';
        numeric.weightPoints = 2;
        numeric.numericAnswer = 56;
        numeric.tolerance = 0;

        const essay = new EssayQuestion();
        essay.id = 'q-essay';
        essay.weightPoints = 3;

        const numericAnswer = new Answer();
        numericAnswer.rawValue = '56';
        numericAnswer.question = numeric;

        const essayAnswer = new Answer();
        essayAnswer.rawValue = 'Por causa da luz do sol.';
        essayAnswer.question = essay;

        const attempt = new Attempt();
        attempt.studentName = 'Teste';
        attempt.answers = [numericAnswer, essayAnswer];
        return repository.save(attempt);
    }

    it('corrige sozinho o que sabe se corrigir, e deixa a dissertativa pendente', async () => {
        const attempt = await createAttemptWithAnswers();

        const result = await service.submit(attempt.id);

        expect(result.submittedAt).not.toBeNull();
        expect(result.scorePoints).toBe(2);
        expect(result.answers[0].awardedPoints).toBe(2);
        expect(result.answers[1].awardedPoints).toBeNull();
        expect(result.answers[1].gradedAt).toBeNull();
    });

    it('não deixa enviar a mesma tentativa duas vezes (RN02)', async () => {
        const attempt = await createAttemptWithAnswers();
        await service.submit(attempt.id);

        await expect(service.submit(attempt.id)).rejects.toThrow(BadRequestException);
    });

    it('recalcula a nota depois da correção manual da dissertativa (RF10)', async () => {
        const attempt = await createAttemptWithAnswers();
        await service.submit(attempt.id);
        const essayAnswerId = attempt.answers[1].id;

        const result = await service.gradeAnswer(essayAnswerId, { points: 3 });

        expect(result.scorePoints).toBe(5);
    });
});
