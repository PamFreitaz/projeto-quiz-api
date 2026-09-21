import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { MultipleChoiceQuestion } from "./multiple-choice-question.entity";

@Entity('choices')
export class Choice {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'nvarchar', length: 'MAX'})
    text: string;

    @Column({ type: 'bit', name: 'is_correct' })
    isCorrect: boolean;

    @ManyToOne(
        () => MultipleChoiceQuestion,     // com quem vai se relacionar
        (question) => question.choices,   // qual o outro lado da relação
        { onDelete: 'CASCADE'})           // o que fazer se o outro lado for apagado
    @JoinColumn({ name: 'question_id' })
    question: MultipleChoiceQuestion;

}