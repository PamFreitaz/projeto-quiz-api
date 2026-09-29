import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class StartAttemptDto {

    @ApiProperty({ example: 'Pâmela'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    studentName: string;
}