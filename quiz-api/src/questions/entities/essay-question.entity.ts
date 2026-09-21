import { ChildEntity } from "typeorm";
import { Question } from "./question.entity";

@ChildEntity('essay')
export class EssayQuestion extends Question {


}