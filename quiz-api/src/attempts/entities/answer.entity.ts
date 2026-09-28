import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Attempt } from './attempt.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 'MAX', name: 'raw_value' })
  rawValue: string;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'awarded_points',
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  awardedPoints: number | null = null;

  @Column({ type: 'datetime2', name: 'graded_at', nullable: true })
  gradedAt: Date | null = null;

  @ManyToOne(() => Attempt, (attempt) => attempt.answers, { onDelete: 'CASCADE', })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Attempt;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' }) 
  question: Question;
}
