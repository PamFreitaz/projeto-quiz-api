import { Attempt } from "../entities/attempt.entity";

export const ATTEMPT_WRITER_REPOSITORY = Symbol('AttemptWriterRepository');

export abstract class AttemptWriterRepository {

    abstract save(attempt: Attempt): Promise<Attempt>;
}