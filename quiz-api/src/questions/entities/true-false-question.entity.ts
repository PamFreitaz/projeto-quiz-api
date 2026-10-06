import { ChildEntity } from "typeorm";
import { MultipleChoiceQuestion } from "./multiple-choice-question.entity";

@ChildEntity('true_false')
export class TrueFalseQuestion extends MultipleChoiceQuestion {

}