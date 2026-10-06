import { Injectable } from "@nestjs/common";

@Injectable()
export class ScoreCalculator {

    // os pontos de uma resposta são a fração de acerto * o peso da questão
    pointsFor(fraction: number, weight: number): number {
        return this.round(fraction * weight);
    }

    total(points: number[]): number {
        let sum = 0;
        for(const point of points) {
            sum = sum + point;
        }
        return this.round(sum);
    }

    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }

}