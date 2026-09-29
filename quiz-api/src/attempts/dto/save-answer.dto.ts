import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class SaveAnswerDto {

    @ApiProperty({ example: 'E534A286-23BC-F111-AEB1-48E1505106C0'})
    @IsUUID('loose')     // 'loose' porque os ids gerados pelo SQL Server não seguem a regra rígida de UUID
    questionId: string;

    @ApiProperty({ example: '40'})
    @IsString()
    @IsNotEmpty()
    rawValue: string;
}