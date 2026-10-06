import { ScoreCalculator } from "./score-calculator";

describe('ScoreCalculator', () => {

    const calculator = new ScoreCalculator();

    it('dá o peso inteiro quando a resposta está certa', () => {
        expect(calculator.pointsFor(1, 3)).toBe(3);
    });

    it('dá zero quando a resposta está errada', () => {
        expect(calculator.pointsFor(0, 2)).toBe(0);
    });

    it('dá metade do peso quando acerta metade', () => {
        expect(calculator.pointsFor(0.5, 3)).toBe(1.5);
    });

    it('arredonda os pontos em 2 casas decimais', () => {
        expect(calculator.pointsFor(1 / 3, 2)).toBe(0.67);
    });

    it('soma os pontos das respostas corrigidas', () => {
        expect(calculator.total([3, 0, 2])).toBe(5);
    });

    it('dá zero quando não tem nenhuma resposta corrigida', () => {
        expect(calculator.total([])).toBe(0);
    });

    it('arredonda a soma, evitando o restinho do 0.1 + 0.2', () => {
        expect(calculator.total([0.1, 0.2])).toBe(0.3);
    });
});
