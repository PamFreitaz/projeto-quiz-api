import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { CreateChoiceDto } from "./create-choice.dto";
import { CreateQuestionDto } from "./create-question.dto";
import { Type } from "class-transformer";

export class CreateMultipleChoiceQuestionDto extends CreateQuestionDto {

    @IsArray()
    @ArrayMinSize(2)
    //ValidateNested + Type: para entrar em cada item da lista e validar
    @ValidateNested({ each: true })
    @Type(() => CreateChoiceDto)
    choices: CreateChoiceDto[];
    
}