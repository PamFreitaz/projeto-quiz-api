//testes feito para fazer o teste de encapsulamento pedido no guia etapa 2


import { Attempt } from './attempts/entities/attempt.entity';

const tentativa = new Attempt();
tentativa.studentName = 'Pamela';

// esta tentativa ainda foi enviada tem q barrar de corrigir
tentativa.applyAutoGrade([], new Date());

console.log('ATENÇÃO: se esta linha apareceu, o encapsulamento FALHOOOOOU');
