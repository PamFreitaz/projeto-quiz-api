import { Module } from "@nestjs/common";
import { ScoreCalculator } from "./score-calculator";
import { GradingService } from "./grading.service";

@Module({
    providers: [ScoreCalculator, GradingService],
    exports: [ScoreCalculator, GradingService],
})

export class GradingModule {}
