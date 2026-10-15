import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { EssayQuestion } from '../questions/entities/essay-question.entity';
import { NumericQuestion } from '../questions/entities/numeric-question.entity';
import { MultipleChoiceQuestion } from '../questions/entities/multiple-choice-question.entity';
import { TrueFalseQuestion } from '../questions/entities/true-false-question.entity';
import { Choice } from '../questions/entities/choice.entity';
import { Attempt } from './entities/attempt.entity';
import { Answer } from './entities/answer.entity';

/**
 * Etapa 5: as consultas de SQL, reescritas no QueryBuilder do TypeORM.
 * Precisa do banco ligado (por isso é .int-spec.ts e roda no npm run test:int).
 * Os valores esperados são os que apareceram no SQL puro, no DBeaver.
 */
describe('Etapa 5: consultas no QueryBuilder', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'mssql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      options: { encrypt: false, trustServerCertificate: true, useUTC: true },
      entities: [
        Question,
        EssayQuestion,
        NumericQuestion,
        MultipleChoiceQuestion,
        TrueFalseQuestion,
        Choice,
        Attempt,
        Answer,
      ],
    });
    await dataSource.initialize();
  }, 30000);

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('consulta 1: a nota da Eva, e o NULL na soma', async () => {
    const query = dataSource
      .getRepository(Attempt)
      .createQueryBuilder('a')
      .innerJoin('a.answers', 'an')
      .select('SUM(an.awardedPoints)', 'nota')
      .addSelect('COUNT(*)', 'total_de_respostas')
      .addSelect('COUNT(an.awardedPoints)', 'respostas_corrigidas')
      .where('a.studentName = :name', { name: 'Eva' });

    console.log(query.getSql());
    const result = await query.getRawOne();

    expect(result.nota).toBe(2); // o SUM pulou o NULL da dissertativa
    expect(result.total_de_respostas).toBe(2); // todas as respostas
    expect(result.respostas_corrigidas).toBe(1); // só as corrigidas
  });

  it('consulta 2: o percentual de acerto de cada questão', async () => {
    // começa pela resposta, porque é ela que tem a relação com a questão
    const query = dataSource
      .getRepository(Answer)
      .createQueryBuilder('an')
      .innerJoin('an.question', 'q')
      .select('q.statement', 'statement')
      .addSelect('COUNT(*)', 'total_de_respostas')
      // as pendentes viram NULL, e o AVG ignora: a média é sóF das corrigidas
      .addSelect(
        'AVG(CASE WHEN an.gradedAt IS NULL THEN NULL WHEN an.awardedPoints > 0 THEN 1.0 ELSE 0.0 END)',
        'percentual_de_acerto',
      )
      .groupBy('q.id')
      .addGroupBy('q.statement')
      .orderBy('percentual_de_acerto', 'ASC');

    console.log(query.getSql());
    const rows = await query.getRawMany();

    // a pior questão aparece primeiro
    expect(rows[0].statement).toBe('Quanto é 10 dividido por 3?');
    expect(rows[0].percentual_de_acerto).toBe(0);

    // a capital: 75%, porque as pendentes não entram na média
    const capital = rows.find(
      (row) => row.statement === 'Qual é a capital do Brasil?',
    );
    expect(capital.percentual_de_acerto).toBe(0.75);
  });

  it('consulta 3: o ranking, com RANK, DENSE_RANK e ROW_NUMBER', async () => {
    const query = dataSource
      .getRepository(Attempt)
      .createQueryBuilder('a')
      .select('a.studentName', 'student_name')
      .addSelect('a.scorePoints', 'score_points')
      .addSelect(
        'ROW_NUMBER() OVER (ORDER BY a.scorePoints DESC)',
        'posicao_row_number',
      )
      .addSelect('RANK() OVER (ORDER BY a.scorePoints DESC)', 'posicao_rank')
      .addSelect(
        'DENSE_RANK() OVER (ORDER BY a.scorePoints DESC)',
        'posicao_dense_rank',
      )
      .where('a.scorePoints IS NOT NULL')
      .orderBy('a.scorePoints', 'DESC');

    console.log(query.getSql());
    const rows = await query.getRawMany();

    // a Marta vem logo depois do empate dos três setes
    const marta = rows.find((row) => row.student_name === 'Marta Cristina');

    // as posições chegam como texto (BIGINT), então converte com Number, igual ao DECIMAL da Etapa 1
    expect(Number(marta.posicao_row_number)).toBe(4); // a 4ª pessoa da fila
    expect(Number(marta.posicao_rank)).toBe(4); // 3 pessoas na frente dela
    expect(Number(marta.posicao_dense_rank)).toBe(2); // a 2ª maior nota que existe
  });

  it('consulta 4: as tentativas sem nenhuma resposta (LEFT JOIN ... IS NULL)', async () => {
    const query = dataSource
      .getRepository(Attempt)
      .createQueryBuilder('a')
      .leftJoin('a.answers', 'an') // mantém as tentativas mesmo sem resposta
      .select('a.studentName', 'student_name')
      .addSelect('a.submittedAt', 'submitted_at')
      .where('an.id IS NULL'); // o id da resposta nunca é NULL de verdade

    console.log(query.getSql());
    const rows = await query.getRawMany();

    // sem ORDER BY, a ordem não é garantida: ordena os nomes antes de comparar
    const nomes = rows.map((row) => row.student_name).sort();
    expect(nomes).toEqual(['Ana', 'Helena', 'Pâmela']);
  });
});
