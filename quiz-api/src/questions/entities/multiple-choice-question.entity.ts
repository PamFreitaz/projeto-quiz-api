import { ChildEntity, OneToMany } from "typeorm";
import { Question } from "./question.entity";
import { Choice } from "./choice.entity";
import { AutoGradable } from "../auto-gradable";

@ChildEntity('multiple_choice')
export class MultipleChoiceQuestion extends Question implements AutoGradable {
   
    //eager true é para já trazer as alternativas junto quando busca a questão no banco
    @OneToMany(() => Choice, (choice) => choice.question, { eager: true}) 
    choices: Choice[];
    
    grade(rawValue: string): number {
        const selectedOption = this.choices.find((option) => option.id === rawValue);

        if(selectedOption && selectedOption.isCorrect){
            return 1;
        }
        return 0;
    }
}