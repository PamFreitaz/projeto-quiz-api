//testes feito para fazer o teste de encapsulamento pedido no guia etapa 2


import { Attempt } from './attempts/entities/attempt.entity';

const tentativa = new Attempt();
tentativa.studentName = 'Pamela';

// 1º envio tem q funcionar
tentativa.submit(new Date());
console.log('1º envio: funcionou. submittedAt =', tentativa.submittedAt);

// 2º envio tem q dar erro aqui
tentativa.submit(new Date());

console.log('ATENÇÃO: se esta linha apareceu, o encapsulamento FALHOU');
