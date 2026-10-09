import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Attempt } from "../entities/attempt.entity";
import { Answer } from "../entities/answer.entity";
import { Repository } from "typeorm";
import { AttemptReaderRepository } from "./attempt-reader.repository";
import { AttemptWriterRepository } from "./attempt-writer.repository";

@Injectable()
export class TypeOrmAttemptRepository implements AttemptReaderRepository, AttemptWriterRepository {

    constructor(

        @InjectRepository(Attempt)
        private readonly attempts: Repository<Attempt>,
        

        @InjectRepository(Answer)
        private readonly answers: Repository<Answer>,
        
    ) { }

    findAll(): Promise<Attempt[]> {
        return this.attempts.find();
    }

    findById(id: string): Promise<Attempt | null> {
        return this.attempts.findOne({
            where: { id: id },
            relations: { answers: { question: true }},
        });
    }

    async findByAnswerId(answerId: string): Promise<Attempt | null> {
        const answer = await this.answers.findOne({
            where: { id: answerId },
            relations: { attempt: true },
        });
        if (answer === null) {
            return null;
        }
        return this.findById(answer.attempt.id);
    }

    async save(attempt: Attempt): Promise<Attempt> {
        const savedAttempt = await this.attempts.save(attempt);

        for(const answer of attempt.answers) {
            answer.attempt = savedAttempt;
        }
        await this.answers.save(attempt.answers);

        return this.attempts.findOneOrFail({
            where: { id: savedAttempt.id },
            relations: { answers: { question: true }},
        });
    }
}