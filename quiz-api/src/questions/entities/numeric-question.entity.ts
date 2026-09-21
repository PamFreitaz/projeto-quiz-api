import { ChildEntity, Column } from "typeorm";
import { Question } from "./question.entity";

@ChildEntity('numeric')
export class NumericQuestion extends Question {

    @Column({ 
        type: 'decimal', 
        precision: 18, 
        scale: 6, 
        nullable: true, 
        name: 'numeric_answer',
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number(value),
        },
    })
    numericAnswer: number;
    
    @Column({
        type: 'decimal',
        precision: 18,
        scale: 6,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number(value),
        },
    })
    tolerance: number;
}