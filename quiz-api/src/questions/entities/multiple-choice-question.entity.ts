import { ChildEntity, OneToMany } from "typeorm";
import { Question } from "./question.entity";
import { Choice } from "./choice.entity";

@ChildEntity('multiple_choice')
export class MultipleChoiceQuestion extends Question {

    //eager true é para já trazer a reposta junto na busca de MultipleChoiceQuestion
    @OneToMany(() => Choice, (choice) => choice.question, { eager: true}) 
    choices: Choice[];
    
}