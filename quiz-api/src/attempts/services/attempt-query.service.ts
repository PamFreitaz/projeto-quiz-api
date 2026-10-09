import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ATTEMPT_READER_REPOSITORY,
  AttemptReaderRepository,
} from '../repositories/attempt-reader.repository';
import { Attempt } from '../entities/attempt.entity';

@Injectable()
export class AttemptQueryService {

  constructor(
    
    @Inject(ATTEMPT_READER_REPOSITORY)
    private readonly attemptReader: AttemptReaderRepository,

  ) {}

  list(): Promise<Attempt[]> {
    return this.attemptReader.findAll();
  }

  async listById(id: string): Promise<Attempt> {
    const attempt = await this.attemptReader.findById(id);

    if (attempt === null) {
      throw new NotFoundException('Tentativa não encontrada');
    }
    return attempt;
  }
}
