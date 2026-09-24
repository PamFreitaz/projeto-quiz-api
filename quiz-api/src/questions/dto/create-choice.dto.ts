import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class CreateChoiceDto {

    @IsString()
    @IsNotEmpty()
    text: string;

    @IsBoolean()
    isCorrect: boolean;
}