import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

export abstract class CreateQuestionDto {

    @IsString()
    @IsNotEmpty()
    statement: string;

    @IsNumber()
    @IsPositive()
    weightPoints: number;
}