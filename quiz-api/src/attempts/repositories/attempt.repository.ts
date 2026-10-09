import { Attempt } from "../entities/attempt.entity";

export const ATTEMPT_REPOSITORY = Symbol('AttemptRepository');

export abstract class AttemptRepository {

    abstract findAll(): Promise<Attempt[]>;

    abstract findById(id: string): Promise<Attempt | null>;

    abstract findByAnswerId(answerId: string): Promise<Attempt | null>;

    abstract save(attempt: Attempt): Promise<Attempt>;
    
}