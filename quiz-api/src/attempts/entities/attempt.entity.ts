import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Answer } from './answer.entity';
import { AutoGradeResults } from '../auto-grade-results';

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 120, name: 'student_name' })
  studentName: string;

  @Column({
    type: 'datetime2',
    insert: false,
    update: false,
    name: 'started_at',
  })
  startedAt: Date;

  @Column({ type: 'datetime2', name: 'submitted_at', nullable: true })
  submittedAt: Date | null = null;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'score_points',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  scorePoints: number | null = null;

  @OneToMany(() => Answer, (answer) => answer.attempt, { eager: true })
  answers: Answer[];

  //Marca como enviada. Lança se já estiver enviada
  submit(at: Date): void {
    if (this.submittedAt !== null) {
      throw new Error('Esta tentativa já foi enviada!');
    }
    this.submittedAt = at;
  }

  //applyAutoGrade(results) Recebe os resultados da correção automática e preenche as respostas
  applyAutoGrade(results: AutoGradeResults[], at: Date): void {
    if (this.submittedAt === null) {
      throw new Error('Não é possível corrigir uma tentativa que ainda não foi enviada.');
    }

    //para cada item dos resultados, encontra entre as respostas a que o id da resposta é igual ao answerId que a correção traz
    //se encontrou guarda os pontos e a data
    for (const correction of results) {
      const foundAnswer = this.answers.find((answer) => answer.id === correction.answerId);

      if (foundAnswer) {
        foundAnswer.awardedPoints = correction.points;
        foundAnswer.gradedAt = at;
      }
    }
  }

  //Soma apenas as respostas com `gradedAt` preenchido
  recalculateScore(): void {
    let total = 0;

    for (const answer of this.answers) {
      if(answer.gradedAt !== null && answer.awardedPoints !== null) {
        total = total + answer.awardedPoints;
      }
    }
    this.scorePoints = total
  }

  //Responde se ainda aceita resposta
  canAcceptAnswers(): boolean {
    if( this.submittedAt === null) {
      return true;
    } else {
      return false;
    }
  }

}
