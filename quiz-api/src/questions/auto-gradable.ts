import { Question } from "./entities/question.entity";

export interface AutoGradable {
    grade(rawValue: string): number;
}

export const isAutoGradable = (question: Question): question is Question & AutoGradable => {
    return 'grade' in question;
};