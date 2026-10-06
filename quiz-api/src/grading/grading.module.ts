import { Module } from "@nestjs/common";
import { ScoreCalculator } from "./score-calculator";

@Module({
    providers: [ScoreCalculator],
    exports: [ScoreCalculator],
})

export class GradingModule {}
