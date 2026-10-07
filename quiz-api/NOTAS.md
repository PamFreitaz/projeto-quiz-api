# Notas da Etapa 2

## Onde a soma da nota deve ficar - Etapa 2

- Preciso de um arquivo que só faz as contas da nota separado da entidade, pois se mudar a regra de negócio da soma vai mudar somente em um arquivo depois

Vou rever depois da Etapa 4.1.

# Notas da Etapa 3

## Responsabilidades misturadas no `AttemptsService`

- o AttemptsService faz 9 trabalhos diferentes. Ele fala com o banco, confere a situação da tentativa, busca as questões no módulo de questões, decide entre criar e trocar a resposta, decide como corrigir cada tipo, faz contas, confere a correção do professor, escolhe o erro HTTP, e organiza a ordem dos passos.

## O que eu teria que editar para criar um tipo novo de questão

- Além do módulo de questões, eu teria que mexer no switch do submit, no módulo de tentativas. Isso é ruim porque o módulo de tentativas não deveria precisar conhecer os tipos de questão, e se alguém esquecer, as respostas ficam sem nota e sem nenhum aviso.

# Notas da Etapa 3

## Etapa 4.3 — Por que a solução do LSP passou pelo ISP?

- Quando o grade estava na classe mãe (question) toda classe que herdava era obrigada a ter o método grade. Então a essay (dissertativa) teve que criar o método só para lançar um erro, e o GradingService teve que fazer o try catch para não travar o sistema. Mas o try catch não resolve o problema pq não dá erro no sistema mas tbm não diz onde está tendo um erro, então assim não aparecem os pontos e não quando foi enviada a questão. Então o correto foi mudar no contrato, na interface, fazendo assim com que só quem sabe se corrigir automático assina. Separar uma promessa grande em promessas menores é o ISP. Por isso a solução do LSP passou pelo ISP, pq o problema era a mãe prometer coisa demais.