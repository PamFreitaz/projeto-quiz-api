/**
 * Verificação do critério de pronto da Etapa 1 do roteiro:
 * "Chamar o método de correção de uma múltipla escolha diretamente
 *  no console devolve 0 ou 1 corretamente."
 *
 * Como rodar:
 *   npx ts-node src/teste-console.ts
 *
 * Saída esperada:
 *   Você escolheu São Paulo (incorreta):  0
 *   Você escolheu Brasília (correta):  1
 */

import { Choice } from "./questions/entities/choice.entity";
import { MultipleChoiceQuestion } from "./questions/entities/multiple-choice-question.entity";

const question = new MultipleChoiceQuestion();
question.statement = 'Qual a capital do Brasil?'
question.weightPoints = 2;
question.choices = [
    {id: '123', text: 'São Paulo', isCorrect: false} as Choice,
    {id: '456', text: 'Brasília', isCorrect: true} as Choice,
];

console.log('Você escolheu São Paulo (incorreta): ', question.grade('123'));
console.log('Você escolheu Brasília (correta): ', question.grade('456'));
