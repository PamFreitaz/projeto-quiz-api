import { ChildEntity } from "typeorm";
import { Question } from "./question.entity";

@ChildEntity('essay')
export class EssayQuestion extends Question {

    //adicionado aqui para testar a implementação do método grade na classe mãe
    grade(rawValue: string): number {
        throw new Error('A dissertativa não se corrige automaticamente!');
    }

}