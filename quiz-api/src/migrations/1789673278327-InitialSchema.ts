import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789673278327 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE questions (
                id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_questions PRIMARY KEY
                                CONSTRAINT DF_questions_id DEFAULT NEWSEQUENTIALID(),
                question_type  NVARCHAR(30)  NOT NULL,
                statement      NVARCHAR(MAX) NOT NULL,
                weight_points  DECIMAL(6,2)  NOT NULL,
                numeric_answer DECIMAL(18,6) NULL,
                tolerance      DECIMAL(18,6) NULL,
                created_at     DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
            )
        `);

    await queryRunner.query(`
            CREATE TABLE choices (
                id          UNIQUEIDENTIFIER NOT NULL
                            CONSTRAINT PK_choices PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                question_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_choices_question REFERENCES questions (id) ON DELETE CASCADE,
                text        NVARCHAR(MAX) NOT NULL,
                is_correct  BIT NOT NULL
            )
        `);

    await queryRunner.query(`
            CREATE TABLE attempts (
                id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_attempts PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                student_name NVARCHAR(120) NOT NULL,
                started_at   DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
                submitted_at DATETIME2(3)  NULL,              -- NULL = em andamento
                score_points DECIMAL(6,2)  NULL               -- NULL = ainda não calculada
            )
        `);

    await queryRunner.query(`
            CREATE TABLE answers (
                id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_answers PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                attempt_id     UNIQUEIDENTIFIER NOT NULL
                               CONSTRAINT FK_answers_attempt REFERENCES attempts (id) ON DELETE CASCADE,
                question_id    UNIQUEIDENTIFIER NOT NULL
                               CONSTRAINT FK_answers_question REFERENCES questions (id),
                raw_value      NVARCHAR(MAX) NOT NULL,
                awarded_points DECIMAL(6,2) NULL,
                graded_at      DATETIME2(3) NULL,             -- NULL = aguardando correção manual
                CONSTRAINT UQ_answers_attempt_question UNIQUE (attempt_id, question_id),
                CONSTRAINT CK_answers_grade_coherent CHECK (
                    (graded_at IS NULL     AND awarded_points IS NULL) OR
                    (graded_at IS NOT NULL AND awarded_points IS NOT NULL)
                )
            )
        `);

    await queryRunner.query(`
            CREATE UNIQUE INDEX UX_attempts_open_per_student ON attempts (student_name)
            WHERE submitted_at IS NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {


    await queryRunner.query(`DROP INDEX UX_attempts_open_per_student ON attempts`);

    await queryRunner.query(`DROP TABLE answers`);

    await queryRunner.query(`DROP TABLE attempts`);

    await queryRunner.query(`DROP TABLE choices`);
    
    await queryRunner.query(`DROP TABLE questions`);

    

  }
}
