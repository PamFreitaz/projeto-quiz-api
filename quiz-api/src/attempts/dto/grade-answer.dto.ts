import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class GradeAnswerDto {

    @ApiProperty({ example: 4 })
    @IsNumber({ maxDecimalPlaces: 2})
    @Min(0)
    points: number;
}