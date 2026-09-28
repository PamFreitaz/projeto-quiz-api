# Miniprojeto de Estudo: Sistema de Quiz com Correção Automática

**Stack:** NestJS + TypeScript + SQL Server (instância local) + TypeORM
**Duração estimada:** 5 horas
**Formato:** projeto guiado, com refatoração intencional no meio do caminho

---

## 1. Objetivo do projeto

Construir uma API pequena onde um aluno responde um quiz e recebe nota, sendo que **cada tipo de questão se corrige de uma forma diferente**. O domínio é simples de propósito: ele existe para dar sustentação a quatro eixos de estudo.

| Eixo | Onde aparece no projeto |
|---|---|
| **POO** | Hierarquia de questões (classe abstrata, filhas, interface) e o agregado `Attempt` |
| **SOLID** | Refatoração guiada de um serviço propositalmente mal escrito |
| **Arquitetura NestJS** | Três módulos com fronteiras reais, DTOs, DI com token |
| **Modelagem e SQL** | 4 tabelas, colunas `NULL` com significado, índice único filtrado, window functions |

> **Regra de ouro do projeto:** a etapa 3 é escrita **de forma ruim de propósito**. A etapa 4 conserta. Não pule a etapa 3 tentando acertar de primeira, porque o aprendizado está em ver o código ruim virando bom e entender o motivo.

---

## 2. Requisitos

### 2.1 Requisitos funcionais

| ID | Requisito |
|---|---|
| **RF01** | Cadastrar uma questão, informando tipo, enunciado e peso em pontos |
| **RF02** | Suportar quatro tipos de questão: múltipla escolha, numérica, verdadeiro ou falso, e dissertativa |
| **RF03** | Cadastrar as alternativas de uma questão de múltipla escolha, marcando qual é a correta |
| **RF04** | Listar todas as questões cadastradas |
| **RF05** | Iniciar uma tentativa de quiz, informando o nome do aluno |
| **RF06** | Registrar ou atualizar a resposta do aluno para uma questão de uma tentativa |
| **RF07** | Enviar a tentativa, disparando a correção automática das questões que suportam correção automática |
| **RF08** | Calcular e persistir a nota da tentativa a partir das respostas já corrigidas |
| **RF09** | Corrigir manualmente uma resposta dissertativa, atribuindo pontuação |
| **RF10** | Recalcular a nota da tentativa após uma correção manual |

### 2.2 Regras de negócio

| ID | Regra |
|---|---|
| **RN01** | Uma tentativa só aceita respostas enquanto não foi enviada |
| **RN02** | Uma tentativa não pode ser enviada duas vezes |
| **RN03** | Um aluno não pode ter duas tentativas em andamento ao mesmo tempo |
| **RN04** | Cada tentativa tem no máximo uma resposta por questão; responder de novo sobrescreve a anterior |
| **RN05** | Questões de múltipla escolha e verdadeiro ou falso são corrigidas comparando com a alternativa correta |
| **RN06** | Questões numéricas são corrigidas por proximidade, respeitando uma tolerância configurada |
| **RN07** | Questões dissertativas **não** são corrigidas automaticamente e ficam pendentes de correção manual |
| **RN08** | A correção devolve uma fração de acerto entre 0 e 1; a pontuação final é essa fração multiplicada pelo peso da questão |
| **RN09** | A nota da tentativa soma apenas as respostas já corrigidas, ignorando as pendentes |
| **RN10** | Uma resposta não pode receber pontuação sem estar marcada como corrigida, e vice-versa |

### 2.3 Requisitos de dados

Quatro tabelas. As colunas nulas carregam **significado de estado**, e é daí que vem a maior parte do exercício de SQL.

```sql
CREATE TABLE questions (
  id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_questions PRIMARY KEY
                   CONSTRAINT DF_questions_id DEFAULT NEWSEQUENTIALID(),
  question_type  NVARCHAR(30)  NOT NULL,        -- coluna discriminadora (STI)
  statement      NVARCHAR(MAX) NOT NULL,
  weight_points  DECIMAL(6,2)  NOT NULL,
  numeric_answer DECIMAL(18,6) NULL,            -- só para 'numeric'
  tolerance      DECIMAL(18,6) NULL,            -- só para 'numeric'
  created_at     DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE choices (
  id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_choices PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  question_id UNIQUEIDENTIFIER NOT NULL
                CONSTRAINT FK_choices_question REFERENCES questions (id) ON DELETE CASCADE,
  text        NVARCHAR(MAX) NOT NULL,
  is_correct  BIT NOT NULL
);

CREATE TABLE attempts (
  id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_attempts PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  student_name NVARCHAR(120) NOT NULL,
  started_at   DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
  submitted_at DATETIME2(3)  NULL,              -- NULL = em andamento
  score_points DECIMAL(6,2)  NULL               -- NULL = ainda não calculada
);

CREATE TABLE answers (
  id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_answers PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  attempt_id     UNIQUEIDENTIFIER NOT NULL
                   CONSTRAINT FK_answers_attempt REFERENCES attempts (id) ON DELETE CASCADE,
  question_id    UNIQUEIDENTIFIER NOT NULL
                   CONSTRAINT FK_answers_question REFERENCES questions (id),
  raw_value      NVARCHAR(MAX) NOT NULL,
  awarded_points DECIMAL(6,2) NULL,
  graded_at      DATETIME2(3) NULL,             -- NULL = aguardando correção manual
  CONSTRAINT UQ_answers_attempt_question UNIQUE (attempt_id, question_id),
  CONSTRAINT CK_answers_grade_coherent CHECK (
    (graded_at IS NULL     AND awarded_points IS NULL) OR
    (graded_at IS NOT NULL AND awarded_points IS NOT NULL)
  )
);

-- RD03: um aluno não pode ter duas tentativas em andamento
CREATE UNIQUE INDEX UX_attempts_open_per_student
  ON attempts (student_name)
  WHERE submitted_at IS NULL;
```

**Notas de tipo específicas do SQL Server**

| Decisão | Motivo |
|---|---|
| `UNIQUEIDENTIFIER` com `NEWSEQUENTIALID()` | Compatível com `@PrimaryGeneratedColumn('uuid')` do TypeORM. Sequencial em vez de `NEWID()` porque GUID aleatório em chave primária clusterizada causa fragmentação de página, e vale saber disso |
| `DECIMAL` em vez de `FLOAT` | Nota não admite erro binário de arredondamento. Atenção: o driver devolve `DECIMAL` como **string** em JavaScript, então converta explicitamente no `ScoreCalculator` |
| `BIT` em vez de `BOOLEAN` | SQL Server não tem tipo booleano; o TypeORM mapeia `boolean` para `BIT` automaticamente |
| `DATETIME2(3)` em vez de `DATETIME` | `DATETIME` tem precisão de 3,33 ms e faixa limitada. `DATETIME2` é o tipo recomendado desde 2008 |
| `SYSUTCDATETIME()` em vez de `GETDATE()` | Grava em UTC, evitando o problema clássico de fuso ao comparar `submitted_at` |
| `ON DELETE CASCADE` só em dois FKs | `answers` tem dois caminhos de cascata possíveis; o SQL Server recusa múltiplos caminhos, então a FK para `questions` fica sem cascata. Esse erro vai aparecer se você tentar, e entender a mensagem é parte do exercício |
| Constraints nomeadas | Sem nome explícito, o SQL Server gera algo como `PK__attempts__3213E83F...`, o que torna a migration de `down` impossível de escrever com segurança |

**Índice filtrado:** o `WHERE` no `CREATE UNIQUE INDEX` é o equivalente no SQL Server ao índice parcial do Postgres, e funciona igual para este caso. Uma pegadinha para conhecer: conexões que gravam em tabela com índice filtrado precisam de `SET ANSI_NULLS ON` e `SET QUOTED_IDENTIFIER ON`, o que o driver `tedious` já faz por padrão.

**Constraints e índices exigidos:**

| ID | Item |
|---|---|
| **RD01** | `UNIQUE (attempt_id, question_id)` em `answers`, garantindo RN04 |
| **RD02** | `CHECK` em `answers` impedindo `awarded_points` e `graded_at` em estados incoerentes, garantindo RN10 |
| **RD03** | Índice único **filtrado** em `attempts (student_name) WHERE submitted_at IS NULL`, garantindo RN03 |
| **RD04** | Migrations escritas em T-SQL na mão, com `synchronize: false` |

### 2.4 Requisitos técnicos

| ID | Requisito |
|---|---|
| **RT01** | SQL Server rodando localmente (Express, Developer ou LocalDB), com credenciais em `.env` e nenhuma configuração de conexão no código |
| **RT02** | `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted` |
| **RT03** | DTOs de entrada validados com `class-validator`, variando conforme o tipo de questão |
| **RT04** | Três módulos de domínio com fronteiras respeitadas: um módulo nunca injeta o repositório de outro, só o serviço exportado |
| **RT05** | Injeção de dependência por token (`Symbol`) para a abstração de repositório |
| **RT06** | Logging de SQL do TypeORM habilitado durante o estudo |
| **RT07** | Um commit por passo de refatoração, com mensagem nomeando o princípio aplicado |

### 2.5 Requisitos de aprendizado

Estes são os requisitos que realmente importam. O projeto só está "pronto" quando cada linha abaixo pode ser marcada.

**POO**

- [ ] **AP01** — Existe uma classe **abstrata** `Question` que não pode ser instanciada
- [ ] **AP02** — Existem quatro subclasses via **herança**, usando Single Table Inheritance
- [ ] **AP03** — O cálculo de acerto é **polimórfico**: o serviço de correção não tem nenhum `if` ou `switch` sobre o tipo da questão
- [ ] **AP04** — Existe uma **interface** `AutoGradable`, e `EssayQuestion` deliberadamente não a implementa
- [ ] **AP05** — `Attempt` está **encapsulado**: `submittedAt` e `scorePoints` não são atribuídos de fora da entidade, apenas por métodos que validam o estado

**SOLID**

- [ ] **AP06** — **SRP**: o cálculo de nota vive em `ScoreCalculator`, fora do serviço de tentativas
- [ ] **AP07** — **OCP**: foi possível adicionar um novo tipo de questão sem editar nenhum arquivo de `attempts/` ou `grading/`
- [ ] **AP08** — **LSP**: nenhuma subclasse lança exceção de "não suportado" em método herdado; a capacidade opcional foi separada em interface
- [ ] **AP09** — **DIP**: o serviço de correção depende de uma abstração de repositório, não de `Repository<Attempt>` do TypeORM
- [ ] **AP10** — Existe um `InMemoryAttemptRepository` e a suíte de testes de correção roda com o **serviço do SQL Server parado**

**Arquitetura NestJS**

- [ ] **AP11** — Sei explicar por que uma interface de TypeScript precisa de token `Symbol` para ser injetada
- [ ] **AP12** — Sei explicar a diferença entre `providers`, `exports` e `imports` a partir do próprio código do projeto
- [ ] **AP13** — Nenhum controller contém regra de negócio; eles apenas traduzem HTTP para chamada de serviço

**Banco de dados**

- [ ] **AP14** — As cinco queries do bloco 6 foram escritas em SQL puro **e** em QueryBuilder, com os resultados comparados
- [ ] **AP15** — Sei explicar por que `NOT IN` com subquery que retorna `NULL` devolve resultado vazio
- [ ] **AP16** — Sei explicar a diferença entre `RANK()`, `DENSE_RANK()` e `ROW_NUMBER()` a partir de um caso de empate real no meu banco
- [ ] **AP17** — Comparei o plano de execução real e o `STATISTICS IO` antes e depois de criar um índice, e sei ler a diferença

---

## 3. Mapa dos princípios SOLID no roteiro

Cada princípio aparece **três vezes** no projeto: onde o terreno é preparado, onde ele é violado de propósito, e onde é corrigido. Use esta tabela para se localizar; as etapas trazem a marcação repetida no lugar exato.

| Princípio | Preparado em | Violado de propósito em | Corrigido em | Evidência objetiva |
|---|---|---|---|---|
| **SRP** — Responsabilidade única | Etapa 2, ao dar comportamento próprio a `Attempt` | Etapa 3 — `AttemptsService` valida, corrige, calcula e persiste | **Etapa 4.1** | `AttemptsService` sem nenhuma conta aritmética |
| **OCP** — Aberto/fechado | Etapa 1, na hierarquia com STI | Etapa 3 — `switch (question.type)` dentro do serviço | **Etapa 4.2** | `git diff` do tipo novo toca só `questions/` |
| **LSP** — Substituição de Liskov | Etapa 1, ao criar `AutoGradable` e deixar `EssayQuestion` fora dela | Etapa 4.3, primeira metade, com a exceção "não suportado" | **Etapa 4.3**, segunda metade | Nenhuma subclasse lança "não suportado" em método herdado |
| **ISP** — Segregação de interface | Etapa 1, na própria existência de `AutoGradable` | Etapa 4.4, se a abstração de repositório nascer gorda | **Etapa 4.5** (opcional) e Etapa 5 | Endpoint de consulta depende só do reader |
| **DIP** — Inversão de dependência | Etapa 0, no `database.module.ts` | Etapa 3 — `Repository<Attempt>` injetado direto no serviço | **Etapa 4.4** | `npm test` passa com o serviço do SQL Server parado |

Dois princípios merecem observação sobre o próprio mapa. **ISP** já aparece resolvido na etapa 1 sem que você perceba: separar `AutoGradable` da classe base é segregação de interface, e é por isso que o LSP da etapa 4.3 tem solução. **LSP** é o único que não pode ser violado na etapa 3, porque a violação só existe depois que você tenta unificar a correção num método da classe base — por isso ele vive inteiro dentro da etapa 4.3, com erro e conserto no mesmo bloco.

---

## 4. Passo a passo de implementação

Sete etapas. Cada uma tem objetivo, tarefas e critério de pronto. Não avance sem bater o critério de pronto, porque as etapas seguintes dependem dele.

Nas etapas 0 a 3, as linhas marcadas com **`SOLID →`** indicam onde o princípio está sendo semeado ou quebrado. Elas não pedem ação imediata; servem para você reconhecer o ponto quando a etapa 4 voltar nele.

### Etapa 0 — Infraestrutura (30 min)

**Objetivo:** projeto rodando, banco conectado, schema criado por migration escrita à mão.

**Pré-requisito, se ainda não tiver o banco instalado**

1. Instalar **SQL Server Express** ou **Developer Edition**, ou usar o **LocalDB** que vem com o Visual Studio
2. Instalar o **SSMS** (SQL Server Management Studio) ou o **Azure Data Studio** para rodar T-SQL à mão
3. No SQL Server Configuration Manager, habilitar **TCP/IP** no protocolo da instância e reiniciar o serviço. Sem isso o driver não conecta, e é o erro número um de quem começa
4. Habilitar autenticação mista (SQL Server e Windows) e criar um login para o projeto, ou usar o `sa`
5. Criar o banco: `CREATE DATABASE quiz_db;`

**Tarefas**

1. `nest new quiz-api`, escolhendo npm ou pnpm
2. Instalar dependências: `@nestjs/typeorm`, `typeorm`, `mssql`, `class-validator`, `class-transformer`, `@nestjs/config`
3. Criar `.env` com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, e adicionar `.env` ao `.gitignore`
4. Criar `shared/database.module.ts` com `TypeOrmModule.forRootAsync`, lendo do `ConfigService`:

```ts
{
  type: 'mssql',
  host: cfg.get('DB_HOST'),        // 'localhost'
  port: Number(cfg.get('DB_PORT')), // 1433
  username: cfg.get('DB_USER'),
  password: cfg.get('DB_PASS'),
  database: cfg.get('DB_NAME'),
  options: {
    encrypt: false,                 // instância local, sem TLS
    trustServerCertificate: true,
  },
  synchronize: false,
  logging: true,
  migrations: ['dist/migrations/*.js'],
}
```

5. Escrever a primeira migration **em T-SQL puro**, dentro dos métodos `up` e `down`, usando o DDL da seção 2.3 — as quatro tabelas, o `UNIQUE`, o `CHECK` e o índice filtrado
6. Rodar a migration e conferir o schema no SSMS

**Se estiver usando instância nomeada** (o caso mais comum de quem instalou o Express), o host não é só `localhost`. Use `options.instanceName: 'SQLEXPRESS'` e omita a porta, ou descubra a porta dinâmica no Configuration Manager e fixe ela. Vale fixar a porta em 1433: instância nomeada com porta dinâmica depende do SQL Browser e falha de forma difícil de diagnosticar.

**Critério de pronto:** `nest start` sobe sem erro e as quatro tabelas existem no banco, com as constraints aplicadas e visíveis no SSMS.

> **`SOLID → DIP`, passo 1 de 2.** Isolar a configuração do banco em `shared/database.module.ts` é a primeira inversão do projeto, e a mais barata: nenhum módulo de domínio conhece host, senha ou dialeto. Guarde a distinção, porque ela reaparece na etapa 4.4 num nível mais difícil — aqui você inverteu a **configuração** da persistência; lá você vai inverter o **acesso** a ela.

**Por que assim:** escrever a migration à mão parece mais lento que deixar o TypeORM gerar, mas com Single Table Inheritance o schema gerado costuma surpreender. Depurar aquilo depois custa mais que escrever o `CREATE TABLE` agora.

---

### Etapa 1 — Módulo de questões, com a herança (60 min)

**Objetivo:** hierarquia polimórfica funcionando e persistindo.

**Tarefas**

1. Criar `questions/entities/question.entity.ts` com a classe **abstrata**, decorada com `@Entity` e `@TableInheritance`, apontando `question_type` como coluna discriminadora
2. Criar as subclasses com `@ChildEntity`:
   - `MultipleChoiceQuestion` — relação `@OneToMany` com `Choice`, carregada com `eager: true`
   - `NumericQuestion` — colunas `numericAnswer` e `tolerance`, ambas `@Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })`
   - `EssayQuestion` — nenhuma coluna adicional
3. Declarar a interface `AutoGradable`, com um método que recebe o valor bruto e devolve fração entre 0 e 1
4. Implementar `AutoGradable` em `MultipleChoiceQuestion` e `NumericQuestion`. **Não** implementar em `EssayQuestion`
5. Criar os DTOs de entrada, um por tipo, validados com `class-validator`
6. Habilitar `ValidationPipe` global no `main.ts` com `whitelist: true` e `forbidNonWhitelisted: true`
7. Implementar `QuestionsService` e `QuestionsController` com POST e GET
8. Exportar `QuestionsService` no módulo

**Critério de pronto:** um POST de cada tipo cria a questão com o `question_type` correto na tabela, e o GET devolve todas. Chamar o método de correção de uma múltipla escolha diretamente no console devolve 0 ou 1 corretamente.

**Armadilha do driver, resolva agora:** colunas `DECIMAL` chegam em JavaScript como **string**, não como número. Se você escrever `Math.abs(raw - this.numericAnswer)` numa questão numérica, vai receber `NaN` ou uma comparação errada. Converta na fronteira, com `Number(...)`, e escreva um teste que prove a conversão. Achar isso agora custa dois minutos; achar na etapa 4 durante uma refatoração custa meia hora, porque você vai suspeitar do desenho e não do tipo.

**Ponto de atenção:** o método de correção devolve **fração**, não pontos. Quem multiplica pelo peso é outro objeto, na etapa 4. A questão sabe se a resposta está certa; quanto isso vale é problema da prova.

> **`SOLID → OCP`, semeadura.** A hierarquia com coluna discriminadora é o que vai permitir, na etapa 4.2, acrescentar um tipo de questão sem editar o módulo de correção. Neste momento a extensibilidade existe na modelagem mas ainda não no código que consome, e é exatamente esse descompasso que a etapa 3 vai expor.

> **`SOLID → ISP` + `LSP`, semeadura.** Colocar a correção em `AutoGradable` em vez de na classe base é, ao mesmo tempo, segregação de interface e a solução antecipada do problema de Liskov. `EssayQuestion` herda tudo o que faz sentido para uma questão — enunciado, peso, persistência — e **não** herda uma capacidade que não possui. Se você tivesse posto o método na base, `EssayQuestion` seria obrigada a mentir. Não é coincidência que os dois princípios se resolvam no mesmo lugar: interface gorda é a causa mais comum de violação de LSP.

> **`SOLID → SRP`, semeadura.** O método de correção responde "está certo?" e nada mais. Ele não sabe pesos, não arredonda, não formata nota. Essa fronteira é o que torna o `ScoreCalculator` da etapa 4.1 possível de extrair sem tocar nas entidades.

---

### Etapa 2 — Encapsulamento do agregado (30 min)

**Objetivo:** tornar estado inválido impossível de representar.

**Tarefas**

1. Criar a entidade `Attempt` com `studentName`, `startedAt`, `submittedAt` e `scorePoints`
2. Criar a entidade `Answer` com `rawValue`, `awardedPoints` e `gradedAt`
3. Expor em `Attempt` apenas métodos de comportamento, sem setters públicos:

| Método | Responsabilidade |
|---|---|
| `submit(at)` | Marca como enviada. Lança se já estiver enviada (RN02) |
| `applyAutoGrade(results)` | Recebe os resultados da correção automática e preenche as respostas |
| `recalculateScore()` | Soma apenas as respostas com `gradedAt` preenchido (RN09) |
| `canAcceptAnswers()` | Responde se ainda aceita resposta (RN01) |

**Critério de pronto:** não existe nenhum ponto do código fora de `Attempt` que atribua valor a `submittedAt` ou `scorePoints`. Chamar `submit` duas vezes lança exceção.

**Teste do encapsulamento:** tente, de propósito, corrigir uma tentativa que nunca foi enviada. A entidade deve barrar sozinha, sem precisar de validação no controller.

> **`SOLID → SRP`, semeadura e tensão.** A responsabilidade única de `Attempt` é **guardar consistência do próprio estado**: se está aberta, se já foi enviada, quais respostas possui. Repare que `recalculateScore()` mora na entidade mas não faz a conta — ele percorre as respostas corrigidas e delega a soma ponderada. Essa é a fronteira mais sutil do projeto e vale demorar nela: a entidade decide **o que entra** no cálculo (RN09, ignorar pendentes), e o `ScoreCalculator` da etapa 4.1 decide **como calcular**. Se você juntar as duas coisas, o teste do calculador passa a precisar montar uma tentativa inteira.

> **`SOLID → SRP`, contraponto para pensar.** Um argumento razoável diz que a soma deveria ficar dentro da entidade, porque é regra de negócio e entidade anêmica é um problema real. O argumento a favor de extrair, neste projeto, é que a política de pontuação tende a mudar por motivos diferentes do ciclo de vida da tentativa: arredondamento, nota máxima, penalidade por atraso. Responsabilidade única se define por **quem pede a mudança**, não por tamanho de arquivo. Anote sua posição no `NOTAS.md` antes da etapa 4.1 e reveja depois de implementar.

---

### Etapa 3 — Fluxo completo, escrito de forma ruim (75 min)

**Objetivo:** ter o sistema funcionando ponta a ponta, com toda a lógica concentrada num único serviço inflado.

Nesta etapa, escreva **tudo** dentro de `AttemptsService`: validação de estado, laço sobre as questões, `switch` sobre o tipo de questão, cálculo da soma ponderada, arredondamento e persistência. Injete `Repository<Attempt>` do TypeORM diretamente. Se der vontade de extrair uma classe, resista.

As violações abaixo são **intencionais e obrigatórias**. Escreva-as de forma reconhecível, porque cada uma tem endereço marcado na etapa 4.

| Violação a cometer | Como ela aparece no código | Consertada em |
|---|---|---|
| **SRP** | Um único método de `submit` que valida estado, itera questões, corrige, soma, arredonda e chama `save` | 4.1 |
| **OCP** | `switch (question.question_type)` decidindo como corrigir, dentro do serviço | 4.2 |
| **DIP** | `@InjectRepository(Attempt) private repo: Repository<Attempt>` no construtor, com `repo.findOne` e `repo.save` espalhados pelo método | 4.4 |
| **ISP** *(leve)* | O serviço enxerga a API inteira do `Repository` do TypeORM — dezenas de métodos — quando usa três | 4.5 |

> **`SOLID → LSP`, ausência proposital.** Este é o único princípio que você **não** viola aqui, porque a etapa 1 já resolveu o problema ao criar `AutoGradable`. Para senti-lo, o `switch` desta etapa deve incluir um `case 'essay'` que simplesmente deixa a resposta pendente. Guarde essa sensação: na etapa 4.3 você vai tentar substituir o `switch` por um método na classe base e descobrir que a dissertativa não tem o que devolver.

**Enquanto escreve, faça uma coisa só de disciplina:** ao terminar o método de `submit`, conte quantos motivos diferentes de mudança futura passam por ele. Preço de arredondamento mudou? Novo tipo de questão? Trocou o ORM? Se três respostas distintas caem no mesmo método, você acabou de medir a violação de SRP em unidades concretas.

**Tarefas**

1. Criar `AttemptsModule` importando `QuestionsModule`
2. Implementar os endpoints:
   - `POST /attempts` — inicia tentativa
   - `PUT /attempts/:id/answers` — registra ou sobrescreve resposta
   - `POST /attempts/:id/submit` — envia e corrige
   - `PATCH /answers/:id/grade` — correção manual
3. Colocar toda a lógica de correção e de cálculo de nota dentro de `AttemptsService`
4. Testar o fluxo inteiro via HTTP: criar questões, iniciar, responder tudo, enviar, corrigir a dissertativa à mão, conferir a nota

**Critério de pronto:** o fluxo completo funciona via HTTP e `AttemptsService` está visivelmente ruim — longo, com `switch` sobre tipo, misturando decisão de negócio com acesso a banco.

**Antes de avançar, anote em um arquivo `NOTAS.md`:** quais responsabilidades diferentes você consegue enumerar dentro desse serviço, e o que você teria que editar para adicionar um novo tipo de questão. Essa lista é o roteiro da etapa 4.

---

### Etapa 4 — As refatorações SOLID (75 min)

**Objetivo:** transformar o serviço da etapa 3, um princípio por commit.

Faça **um commit por passo**, com a mensagem nomeando o princípio. Reler esses diffs depois é metade do valor do projeto.

Cada subseção segue a mesma estrutura: enunciado do princípio, o sintoma que ficou na etapa 3, o que fazer, quais arquivos podem ser tocados e o critério objetivo.

#### 4.1 `SOLID → SRP` — extrair o cálculo de nota (~15 min)

**Enunciado:** uma classe deve ter um único motivo para mudar. Não "fazer uma coisa só", e sim responder a um único interessado.

**Sintoma na etapa 3:** o método de `submit` muda se o arredondamento mudar, se surgir um tipo de questão e se o ORM for trocado. Três motivos, um arquivo.

**O que fazer:** criar `grading/score-calculator.ts` recebendo pares de fração e peso, devolvendo a nota. Tirar de `AttemptsService` a soma ponderada e o arredondamento. O serviço passa a orquestrar: pede a correção, pede o cálculo, manda salvar.

**Arquivos tocados:** `attempts/attempts.service.ts`, `grading/score-calculator.ts` (novo), mais o registro no módulo.

*Pronto quando:* `AttemptsService` não faz mais nenhuma conta aritmética, e existe um teste de `ScoreCalculator` que não constrói nenhuma entidade.

#### 4.2 `SOLID → OCP` — novo tipo sem tocar no que já existe (~15 min)

**Enunciado:** aberto para extensão, fechado para modificação. Comportamento novo entra por código novo, não por edição de código existente.

**Sintoma na etapa 3:** o `switch (question.question_type)` no serviço. Todo tipo novo exige editar um arquivo que não tem nada a ver com o tipo novo.

**O que fazer:** primeiro apagar o `switch`, substituindo pela chamada polimórfica ao método de `AutoGradable`. Só depois adicionar `TrueFalseQuestion` como `@ChildEntity`, implementando a interface, mais o DTO correspondente.

**Arquivos tocados:** na remoção do `switch`, `grading/`; no tipo novo, **exclusivamente** `questions/`.

*Pronto quando:* o `git diff` do commit que adiciona `TrueFalseQuestion` mostra alterações apenas em `questions/`. Se precisou editar `attempts/` ou `grading/`, o `switch` sobreviveu disfarçado em algum lugar — procure por `if`, mapa de tipo para função, ou cadeia de `instanceof` sobre classes concretas.

**Relação com OCP e polimorfismo:** repare que OCP não é conquistado por um padrão de projeto elaborado. Aqui ele sai de graça da herança da etapa 1, desde que o consumidor pergunte "corrija-se" em vez de "que tipo você é?".

#### 4.3 `SOLID → LSP` — a dissertativa que não se corrige (~40 min)

**Enunciado:** um subtipo tem que poder substituir o supertipo sem que quem chama precise saber a diferença. Se o chamador precisa de um `try/catch` para certos filhos, o contrato foi rompido.

**Sintoma:** este princípio não tem sintoma na etapa 3, porque a violação só nasce quando você tenta unificar. Então **crie a violação de propósito agora**, e depois conserte. É o passo mais valioso dos cinco.

**Primeira metade, errando:** mova o método de correção para a classe base `Question` e, em `EssayQuestion`, lance `NotSupportedException`. Rode o fluxo. Observe o que acontece com o `GradingService`: ele volta a precisar saber quem é quem, agora por meio de tratamento de exceção. Você trocou um `switch` explícito por um controle de fluxo por exceção, que é pior, porque o compilador não avisa.

**Segunda metade, corrigindo:** o método de correção **não pertence** à classe base. Ele pertence a `AutoGradable`. Quem implementa entra no fluxo automático; quem não implementa vai para a fila manual, ficando com `gradedAt` nulo. O `GradingService` decide com um type guard que pergunta sobre **capacidade**, não sobre identidade — e esse é o único teste de tipo aceitável no projeto.

```ts
function isAutoGradable(q: Question): q is Question & AutoGradable {
  return typeof (q as any).grade === 'function';
}
```

**Arquivos tocados:** `questions/entities/`, `grading/grading.service.ts`.

*Pronto quando:* nenhuma subclasse lança "não suportado" em método herdado, e enviar uma tentativa com dissertativa deixa aquela resposta pendente sem quebrar o cálculo da nota.

**Para o `NOTAS.md`:** por que a solução do LSP passou por ISP? Porque a violação de Liskov quase nunca se resolve mexendo no filho. Ela se resolve percebendo que o pai prometia coisa demais.

#### 4.4 `SOLID → DIP` — inverter a dependência de persistência (~40 min)

**Enunciado:** módulos de política não dependem de módulos de detalhe; ambos dependem de abstração. E quem **define** a abstração é a política, não o detalhe.

**Sintoma na etapa 3:** `@InjectRepository(Attempt) private repo: Repository<Attempt>` no construtor. A regra de negócio conhece o TypeORM, então nenhum teste de regra roda sem banco.

**O que fazer**

1. Declarar `AttemptRepository` como classe abstrata no domínio, com só os métodos que o caso de uso usa. Repare que **este passo também é ISP**: você está definindo uma interface magra sob medida, no lugar da API gigante do ORM
2. Criar o token: `export const ATTEMPT_REPOSITORY = Symbol('AttemptRepository')`
3. Implementar `TypeOrmAttemptRepository`, que adapta o `Repository<Attempt>`
4. Registrar com `{ provide: ATTEMPT_REPOSITORY, useClass: TypeOrmAttemptRepository }`
5. Injetar no serviço com `@Inject(ATTEMPT_REPOSITORY)`
6. Escrever `InMemoryAttemptRepository`, um array em memória
7. Escrever testes de correção usando o repositório em memória

**Arquivos tocados:** `attempts/` (abstração, adaptador, serviço, módulo), mais os testes.

*Pronto quando:* `npm test` passa com o **serviço do SQL Server parado** (`net stop MSSQL$SQLEXPRESS` ou pelo Services do Windows). Esse é o critério objetivo do DIP; se precisa de banco no ar, a dependência não foi invertida.

**Para o `NOTAS.md`:** por que o token `Symbol` foi necessário? Interfaces de TypeScript desaparecem na compilação, então não sobra nada em runtime para o container usar como chave de injeção. Compare com o caso em que a abstração é uma **classe abstrata**: aí o token é dispensável, porque a classe existe em runtime. Entender essa diferença é entender DI no NestJS.

#### 4.5 `SOLID → ISP` — segregar leitura e escrita (opcional)

**Enunciado:** ninguém deve depender de métodos que não usa.

**Sintoma:** a abstração criada em 4.4 provavelmente ficou com métodos de leitura e de escrita juntos, e o endpoint de consulta carrega a capacidade de gravar sem precisar dela.

**O que fazer:** quebrar em `AttemptReader` e `AttemptWriter`, com o adaptador do TypeORM implementando as duas. Fazer o caso de uso de consulta depender só do reader.

*Pronto quando:* o construtor do caso de uso de consulta declara apenas `AttemptReader`.

Com uma entidade só, o exercício fica um pouco artificial, então é o primeiro candidato a corte. Se cortar, você não sai sem ISP: ele já apareceu duas vezes, na criação de `AutoGradable` (etapa 1) e no passo 1 da etapa 4.4.

---

### Etapa 5 — Bloco de SQL (60 min)

**Objetivo:** entender o schema pelas perguntas que ele responde.

Método para cada query: escreva primeiro em **T-SQL puro** no SSMS ou no Azure Data Studio, confira o resultado, depois reescreva no **QueryBuilder** do TypeORM e compare o SQL gerado no log com o que você escreveu à mão.

Popule antes uns 5 alunos e 6 questões, deixando empates de nota de propósito e ao menos uma tentativa sem nenhuma resposta.

| # | Query | Conceito |
|---|---|---|
| 1 | Nota de uma tentativa, somando `awarded_points * weight_points` | JOIN e comportamento de `NULL` em agregação |
| 2 | Percentual de acerto por questão, para achar as questões ruins | `GROUP BY` com agregação condicional via `CASE` |
| 3 | Ranking dos alunos, comparando `RANK()`, `DENSE_RANK()` e `ROW_NUMBER()` na mesma consulta | window functions e tratamento de empate |
| 4 | Tentativas sem nenhuma resposta, resolvida de três formas: `NOT IN`, `NOT EXISTS` e `LEFT JOIN ... IS NULL` | lógica de três valores do SQL |
| 5 | Índice único filtrado contra duas tentativas abertas do mesmo aluno (RD03) | constraint declarativa versus validação em código |

**Detalhes de T-SQL que valem conhecer no caminho**

| Situação | No SQL Server |
|---|---|
| Limitar linhas | `SELECT TOP 5` ou `ORDER BY ... OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY`. Não existe `LIMIT` |
| Agregação condicional na query 2 | `AVG(CASE WHEN a.awarded_points > 0 THEN 1.0 ELSE 0.0 END)`. Use `1.0` e não `1`, senão a divisão inteira devolve zero |
| Divisão inteira | `3 / 2` devolve `1`. Faça `CAST` para `DECIMAL` antes de dividir contagens |
| Concatenar texto | `+` entre strings, mas `NULL + 'x'` resulta em `NULL`; use `CONCAT()` que ignora nulos |
| Coalescer | `ISNULL(x, 0)` é específico do SQL Server; `COALESCE(x, 0)` é padrão e aceita mais argumentos. Prefira o segundo |
| Data atual em UTC | `SYSUTCDATETIME()` |

**Sobre a query 1:** `SUM` ignora `NULL` silenciosamente, o que aqui é justamente o comportamento desejado (RN09, somar só o corrigido). Mas rode também um `COUNT(*)` e um `COUNT(awarded_points)` na mesma consulta e compare os números. A diferença entre os dois é a fila de correção pendente, e entender por que eles divergem é entender agregação com nulos.

**Sobre a query 4:** rode a versão com `NOT IN` num cenário em que a subquery retorna alguma linha com `NULL`. O resultado vem vazio, e entender por que é um dos aprendizados mais úteis do bloco.

**Sobre a query 5:** depois de criar o índice, tente iniciar duas tentativas para o mesmo aluno via API. O banco recusa. Discuta consigo mesmo: vale manter a validação equivalente no código também, ou confiar na constraint e tratar o erro?

**Extra, se sobrar tempo:** ligue `SET STATISTICS IO, TIME ON` e o plano de execução real (`Ctrl+M` no SSMS), rode a query 3, depois crie `CREATE INDEX IX_attempts_score ON attempts (score_points DESC)` e rode de novo. Compare leituras lógicas e o operador de ordenação: com o índice, o `Sort` tende a desaparecer do plano.

> **`SOLID → SRP` no banco.** A pergunta da query 5 é uma questão de responsabilidade, não de SQL: quem é o dono da regra "um aluno não pode ter duas tentativas abertas"? O índice único filtrado garante de forma absoluta e não dá mensagem de erro decente. A validação no serviço dá boa mensagem e não garante nada sob concorrência. A resposta usual é manter as duas, com papéis distintos — o código para a experiência do usuário, o banco como última linha de defesa — e isso não é duplicação de responsabilidade, porque os motivos de existir são diferentes.

> **`SOLID → ISP` no acesso a dados.** As queries de relatório não têm por que passar pela abstração de repositório que você criou na etapa 4.4. Elas precisam de leitura otimizada, não do agregado inteiro. Se você fez o 4.5, o caso de uso de relatório depende apenas do `AttemptReader`, e é aqui que aquele exercício deixa de parecer artificial.

---

### Etapa 6 — Fechamento (15 min)

**Tarefas**

1. Percorrer o checklist da seção 2.5 e marcar o que foi cumprido
2. Para cada item **não** marcado, escrever no `NOTAS.md` o que faltou
3. Escrever, em três ou quatro frases, qual das refatorações mudou mais o desenho do sistema e por quê

Esse último exercício é o que consolida. Se você conseguir explicar por escrito por que separar `AutoGradable` da classe base mudou a arquitetura do módulo de correção, o projeto cumpriu a função.

---

## 5. Cronograma consolidado

| Tempo | Etapa | Entrega | SOLID em jogo |
|---|---|---|---|
| 0:00–0:30 | 0 — Infra | Conexão com SQL Server local, TypeORM, migration em T-SQL | DIP (configuração) |
| 0:30–1:30 | 1 — Questões | Herança STI, DTOs, POST e GET | OCP, ISP, LSP, SRP — semeados |
| 1:30–2:00 | 2 — Agregado | `Attempt` encapsulado | SRP — fronteira definida |
| 2:00–3:15 | 3 — Fluxo ruim | Sistema funcionando ponta a ponta | SRP, OCP, DIP, ISP — violados |
| 3:15–4:30 | 4 — SOLID | Um commit por princípio | os cinco, corrigidos |
| 4:30–5:30 | 5 — SQL | Cinco queries e o índice filtrado | SRP, ISP — na camada de dados |
| 5:30–5:45 | 6 — Fechamento | Checklist e notas | revisão |

**Se estourar o tempo,** corte pelo fim: a etapa 5 vira uma sessão separada sem prejuízo. O que não vale cortar é a etapa 4, porque é o único momento em que o código ruim vira bom com você olhando.

---

## 6. Erros comuns e como reconhecê-los

| Sintoma | Princípio ferido | Volte para |
|---|---|---|
| `switch (question.type)` no `GradingService` | OCP — polimorfismo vazou da entidade para o serviço (AP03) | 4.2 |
| Ter que editar `attempts/` para somar um tipo novo | OCP não atingido (AP07) | 4.2 |
| `EssayQuestion` lançando "não suportado" | LSP — o pai promete o que o filho não cumpre (AP08) | 4.3 |
| `try/catch` no `GradingService` para tratar tipo de questão | LSP — controle de fluxo por exceção substituiu o `switch` | 4.3 |
| Testes precisando do SQL Server no ar | DIP não concluído (AP10) | 4.4 |
| `Repository<Attempt>` no construtor do serviço | DIP — a política conhece o detalhe | 4.4 |
| O serviço faz a soma ponderada e arredonda | SRP — cálculo misturado com orquestração (AP06) | 4.1 |
| Controller com `if` de regra de negócio | SRP — responsabilidade na camada errada (AP13) | 4.1 |
| Caso de uso de leitura com métodos de escrita à disposição | ISP — dependência de método não usado | 4.5 |
| `attempt.submittedAt = new Date()` em um serviço | Encapsulamento furado (AP05) | Etapa 2 |
| Injetar `Repository<Question>` dentro de `AttemptsModule` | Fronteira de módulo rompida (RT04) | Etapa 3 |

---

## 7. Resumo de uma linha por princípio

Se você conseguir preencher esta tabela com suas próprias palavras no fim do projeto, citando o arquivo onde cada coisa aconteceu, o eixo de SOLID está cumprido.

| Princípio | O que o projeto ensinou | Arquivo-testemunha |
|---|---|---|
| **SRP** | Separei _______ de _______ porque mudam por motivos diferentes | `score-calculator.ts` |
| **OCP** | Adicionei um tipo novo editando só _______ | `questions/entities/` |
| **LSP** | A dissertativa não podia _______, então movi o método para _______ | `auto-gradable.ts` |
| **ISP** | O consumidor de leitura passou a depender só de _______ | `attempt-reader.ts` |
| **DIP** | Meus testes rodam sem banco porque o serviço depende de _______ | `in-memory-attempt.repository.ts` |
