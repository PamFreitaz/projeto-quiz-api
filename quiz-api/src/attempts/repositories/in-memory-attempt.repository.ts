import { Attempt } from "../entities/attempt.entity";
import { AttemptReaderRepository } from "./attempt-reader.repository";
import { AttemptWriterRepository } from "./attempt-writer.repository";

export class InMemoryAttemptRepository implements AttemptReaderRepository, AttemptWriterRepository {

    private readonly items: Attempt[] = [];
    private nextId = 1;

    async findAll(): Promise<Attempt[]> {
        return this.items;
    }

    async findById(id: string): Promise<Attempt | null> {
        const found = this.items.find((attempt) => attempt.id === id);
        if (found === undefined) {
            return null;
        }
        return found;
    }

    async findByAnswerId(answerId: string): Promise<Attempt | null> {
        const found = this.items.find((attempt) => attempt.answers.some((answer) => answer.id === answerId));
        if (found === undefined) {
            return null;
        }
        return found;
    }

    async save(attempt: Attempt): Promise<Attempt> {
        // imita o banco gerando o id de uma tentativa nova
        if (attempt.id === undefined) {
            attempt.id = 'attempt-' + this.nextId++;
        }
        // imita o banco gerando o id de cada resposta nova
        for (const answer of attempt.answers) {
            if (answer.id === undefined) {
                answer.id = 'answer-' + this.nextId++;
            }
        }
        // imita o INSERT: só acrescenta se ainda não estiver na lista
        if (!this.items.includes(attempt)) {
            this.items.push(attempt);
        }
        return attempt;
    }
}
