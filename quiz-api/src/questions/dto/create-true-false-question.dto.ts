import { IsBoolean } from "class-validator";
import { CreateQuestionDto } from "./create-question.dto";

export class CreateTrueFalseQuestionDto extends CreateQuestionDto {

    @IsBoolean()
    correctAnswer: boolean;
}