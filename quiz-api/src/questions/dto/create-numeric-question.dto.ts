import { IsNumber } from "class-validator";
import { CreateQuestionDto } from "./create-question.dto";

export class CreateNumericQuestionDto extends CreateQuestionDto {

    @IsNumber()
    numericAnswer: number;

    @IsNumber()
    tolerance: number;
}