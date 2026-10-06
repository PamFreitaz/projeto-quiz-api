import { Injectable } from "@nestjs/common";
import { ScoreCalculator } from "./score-calculator";
import { AutoGradeResults } from "../attempts/auto-grade-results";
import { Answer } from "../attempts/entities/answer.entity";
import { isAutoGradable } from "../questions/auto-gradable";

@Injectable()
export class GradingService {

    constructor( private readonly scoreCalculator: ScoreCalculator) {}

    autoGrade(answers: Answer[]): AutoGradeResults[] {
        const results: AutoGradeResults[] = [];

        for(const answer of answers) {
            const question = answer.question;

            if(isAutoGradable(question)) {
                const fraction = question.grade(answer.rawValue);
                const points = this.scoreCalculator.pointsFor(fraction, question.weightPoints);
                results.push({answerId: answer.id, points: points});
            }
        }
        return results;
    }
    


}