# Notas da Etapa 2

## Onde a soma da nota deve ficar - Etapa 2

- Preciso de um arquivo que só faz as contas da nota separado da entidade, pois se mudar a regra de negócio da soma vai mudar somente em um arquivo depois

Vou rever depois da Etapa 4.1.

# Notas da Etapa 3

## Responsabilidades misturadas no `AttemptsService`

- o AttemptsService faz 9 trabalhos diferentes. Ele fala com o banco, confere a situação da tentativa, busca as questões no módulo de questões, decide entre criar e trocar a resposta, decide como corrigir cada tipo, faz contas, confere a correção do professor, escolhe o erro HTTP, e organiza a ordem dos passos.

## O que eu teria que editar para criar um tipo novo de questão

- Além do módulo de questões, eu teria que mexer no switch do submit, no módulo de tentativas. Isso é ruim porque o módulo de tentativas não deveria precisar conhecer os tipos de questão, e se alguém esquecer, as respostas ficam sem nota e sem nenhum aviso.

# Notas da Etapa 4

## Etapa 4.3 — Por que a solução do LSP passou pelo ISP?

- Quando o grade estava na classe mãe (question) toda classe que herdava era obrigada a ter o método grade. Então a essay (dissertativa) teve que criar o método só para lançar um erro, e o GradingService teve que fazer o try catch para não travar o sistema. Mas o try catch não resolve o problema pq não dá erro no sistema mas tbm não diz onde está tendo um erro, então assim não aparecem os pontos e não quando foi enviada a questão. Então o correto foi mudar no contrato, na interface, fazendo assim com que só quem sabe se corrigir automático assina. Separar uma promessa grande em promessas menores é o ISP. Por isso a solução do LSP passou pelo ISP, pq o problema era a mãe prometer coisa demais.

## Etapa 4.4 — Por que o token `Symbol` foi necessário?

Comparando o pq usar o token Symbol com classe abstrata. O computador não roda typescript, ele só roda javascript, sendo assim quando o typescript vira javascript, a interface some. E o Nest faz a injeção no javascript com o aplicativo rodando, então se a abstração tivesse sido escrita como interface ele não teria nada para usar na hora de entregar. Usando o token Symbol eu tenho um "nome" na hora da entrega, que continua existindo no javascript. A classe abstrata não desaparece, ela continua aparecendo no DIST, então poderia usar ela ao invés de usar o Symbol. Mas o guia pede pra usar Symbol e por isso usei.

# Etapa 6 fechamento

- [X] **AP01** — Existe uma classe **abstrata** `Question` que não pode ser instanciada
- [X] **AP02** — Existem quatro subclasses via **herança**, usando Single Table Inheritance
- [X] **AP03** — O cálculo de acerto é **polimórfico**: o serviço de correção não tem nenhum `if` ou `switch` sobre o tipo da questão
- [X] **AP04** — Existe uma **interface** `AutoGradable`, e `EssayQuestion` deliberadamente não a implementa
- [X] **AP05** — `Attempt` está **encapsulado**: `submittedAt` e `scorePoints` não são atribuídos de fora da entidade, apenas por métodos que validam o estado

**SOLID**

- [X] **AP06** — **SRP**: o cálculo de nota vive em `ScoreCalculator`, fora do serviço de tentativas
- [X] **AP07** — **OCP**: foi possível adicionar um novo tipo de questão sem editar nenhum arquivo de `attempts/` ou `grading/`
- [X] **AP08** — **LSP**: nenhuma subclasse lança exceção de "não suportado" em método herdado; a capacidade opcional foi separada em interface
- [X] **AP09** — **DIP**: o serviço de correção depende de uma abstração de repositório, não de `Repository<Attempt>` do TypeORM
- [X] **AP10** — Existe um `InMemoryAttemptRepository` e a suíte de testes de correção roda com o **serviço do SQL Server parado**

**Arquitetura NestJS**

- [X] **AP11** — Sei explicar por que uma interface de TypeScript precisa de token `Symbol` para ser injetada
- [X] **AP12** — Sei explicar a diferença entre `providers`, `exports` e `imports` a partir do próprio código do projeto
- [X] **AP13** — Nenhum controller contém regra de negócio; eles apenas traduzem HTTP para chamada de serviço

**Banco de dados**

- [X] **AP14** — As cinco queries do bloco 6 foram escritas em SQL puro **e** em QueryBuilder, com os resultados comparados
- [X] **AP15** — Sei explicar por que `NOT IN` com subquery que retorna `NULL` devolve resultado vazio
- [X] **AP16** — Sei explicar a diferença entre `RANK()`, `DENSE_RANK()` e `ROW_NUMBER()` a partir de um caso de empate real no meu banco
- [ ] **AP17** — Comparei o plano de execução real e o `STATISTICS IO` antes e depois de criar um índice, e sei ler a diferença


**AP12** — Sei explicar a diferença entre `providers`, `exports` e `imports` a partir do próprio código do projeto

- Resposta:
Consegue receber pq ele está no questionModule em providers e deixa os outros módulos usarem se forem exportados. E por outro lado o AttemptModule acrescenta o QuestionModule no imports

**AP15** — Sei explicar por que `NOT IN` com subquery que retorna `NULL` devolve resultado vazio

- Resposta:
Comparar com NULL dá "não sei" para o SQL e aí ele retorna vazio porque nenhuma linha passa no filtro. O NOT IN vira várias comparações com <> ligadas por AND, e um único "não sei" num AND impede a linha de passar.

**AP16** — Sei explicar a diferença entre `RANK()`, `DENSE_RANK()` e `ROW_NUMBER()` a partir de um caso de empate real no meu banco

- Resposta:
O ROW_NUMBER só conta a fila e ignora se tiver empate.
O RANK dá a mesma posição para os empatados e pula as posições ocupadas.
O DENSE_RANK dá a mesma posição para os empatados mas não pula as posições ocupadas.
Fiz o teste com a aluna Marta. Depois do empate no 7, ela ficou em 4º no ROW_NUMBER, 4º no RANK e 2º no DENSE_RANK.

## Escrever, em três ou quatro frases, qual das refatorações mudou mais o desenho do sistema e por quê.

- A que mais mudou foi a refatoração do AutoGradable. Antes precisava ter no service um método para precisar saber qual era o tipo de questão. Com a refatoração, cada questão sabe se corrigir e o service só pergunta se a questão sabe se corrigir (quem é AutoGradable). Com essa refatoração eu implementei mais um tipo de questão para verdadeiro e falso e só mexi em questions. 

- Antes da refatoração quem precisava reconhecer os tipos da questão era a service, que tinha um switch dentro do método submit que reconhecia todos os tipos de questões. Depois da refatoração cada questão sabe se corrigir sozinha através do método grade.

