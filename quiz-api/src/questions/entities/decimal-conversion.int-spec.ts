import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Question } from './question.entity';
import { EssayQuestion } from './essay-question.entity';
import { NumericQuestion } from './numeric-question.entity';
import { MultipleChoiceQuestion } from './multiple-choice-question.entity';
import { Choice } from './choice.entity';

/**
 * Prova a armadilha do driver descrita na Etapa 1 do roteiro:
 * colunas DECIMAL chegam do SQL Server como string. O transformer
 * declarado nas entidades converte para number na leitura.
 *
 * Se alguém remover o transformer, estes testes falham.
 */
describe('Conversão de DECIMAL vinda do banco', () => {

    let dataSource: DataSource;

    // roda uma vez antes de todos os testes: abre a conexão com o banco
    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'mssql',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            options: { encrypt: false, trustServerCertificate: true },
            // fora do NestJS não existe autoLoadEntities, então a lista é manual
            entities: [Question, EssayQuestion, NumericQuestion, MultipleChoiceQuestion, Choice],
        });

        await dataSource.initialize();
    }, 30000);

    // roda uma vez depois de todos os testes: fecha a conexão
    afterAll(async () => {
        await dataSource.destroy();
    });

    it('numericAnswer volta do banco como number, não como string', async () => {
        const questions = await dataSource.getRepository(NumericQuestion).find();
        const question = questions[0];

        expect(typeof question.numericAnswer).toBe('number');
    });

    it('tolerance volta do banco como number, não como string', async () => {
        const questions = await dataSource.getRepository(NumericQuestion).find();
        const question = questions[0];

        expect(typeof question.tolerance).toBe('number');
    });

    it('weightPoints volta do banco como number, não como string', async () => {
        const questions = await dataSource.getRepository(NumericQuestion).find();
        const question = questions[0];

        expect(typeof question.weightPoints).toBe('number');
    });
});
