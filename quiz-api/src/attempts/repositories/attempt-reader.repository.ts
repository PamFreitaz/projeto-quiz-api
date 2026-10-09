import { Attempt } from "../entities/attempt.entity";

export const ATTEMPT_READER_REPOSITORY = Symbol('AttemptReaderRepository');

export abstract class AttemptReaderRepository {
    
  abstract findAll(): Promise<Attempt[]>;

  abstract findById(id: string): Promise<Attempt | null>;

  abstract findByAnswerId(answerId: string): Promise<Attempt | null>;
}
