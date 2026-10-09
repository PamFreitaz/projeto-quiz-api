import { NotFoundException } from "@nestjs/common";
import { AttemptQueryService } from "./attempt-query.service";
import { InMemoryAttemptRepository } from "../repositories/in-memory-attempt.repository";
import { Attempt } from "../entities/attempt.entity";

// ISP o service de consulta só precisa do leitor, então o teste só entrega ele
describe('AttemptQueryService (sem banco)', () => {

    let repository: InMemoryAttemptRepository;
    let service: AttemptQueryService;

    beforeEach(() => {
        repository = new InMemoryAttemptRepository();
        service = new AttemptQueryService(repository);
    });

    it('busca uma tentativa pelo id', async () => {
        const attempt = new Attempt();
        attempt.studentName = 'Teste';
        attempt.answers = [];
        await repository.save(attempt);

        const result = await service.listById(attempt.id);

        expect(result.studentName).toBe('Teste');
    });

    it('dá 404 quando a tentativa não existe', async () => {
        await expect(service.listById('nao-existe')).rejects.toThrow(NotFoundException);
    });
});
