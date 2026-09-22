import { ChildEntity, Column } from "typeorm";
import { Question } from "./question.entity";
import { AutoGradable } from "../auto-gradable";

@ChildEntity('numeric')
export class NumericQuestion extends Question implements AutoGradable {
   
    // valor correto que o aluno deve informar
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
    
     // margem de erro aceita para cima e para baixo
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

    grade(rawValue: string): number {
        //parsedValue é a resposta do aluno já convertida de string para number
        const parsedValue = Number(rawValue); 
        //Math.abs transforma qualquer número em número positivo
        const distance = Math.abs(parsedValue - this.numericAnswer);

        if (distance <= this.tolerance) {
            return 1;
        }
        return 0;
    }
}