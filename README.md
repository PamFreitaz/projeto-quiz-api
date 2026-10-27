# Projeto Quiz

Sistema de provas online. O professor cadastra questões e corrige as dissertativas. O aluno faz a prova e vê a nota.

O repositório tem duas partes:

| Pasta | O que é | Tecnologias |
|---|---|---|
| [quiz-api/](quiz-api/) | Backend (API REST) | NestJS, TypeScript, TypeORM, SQL Server |
| [quiz-web/](quiz-web/) | Frontend | HTML, CSS e JavaScript puro, sem framework |

A API tem quatro tipos de questão: múltipla escolha, verdadeiro ou falso, numérica (com tolerância) e dissertativa. As três primeiras são corrigidas automaticamente quando o aluno envia a prova. A dissertativa fica pendente até o professor dar a nota.

---

## Pré-requisitos

Instale antes de começar:

- **Git**
- **Node.js 20 ou mais novo**, que já vem com o npm. O projeto foi feito com o Node 24.
- **SQL Server** rodando na sua máquina. Serve o Express ou o Developer Edition, que são gratuitos.
- Uma ferramenta para rodar SQL no banco: **SSMS**, **Azure Data Studio** ou **DBeaver**.
- **VS Code** com a extensão **Live Server**, para abrir o frontend.

---

## 1. Clonar o repositório

```bash
git clone https://github.com/PamFreitaz/projeto-quiz-api.git
cd projeto-quiz-api
```

---

## 2. Preparar o SQL Server

A API se conecta ao banco por **host e porta** (TCP). Por isso, o SQL Server precisa aceitar conexões TCP numa porta fixa.

1. **Habilite o TCP/IP e fixe a porta 1433.**
   Abra o *SQL Server Configuration Manager* e vá em *SQL Server Network Configuration* → *Protocols for SQLEXPRESS* (ou o nome da sua instância). Depois:
   - deixe **TCP/IP** como *Enabled*;
   - em *TCP/IP* → *Properties* → aba *IP Addresses* → seção **IPAll**, apague o valor de *TCP Dynamic Ports* e coloque `1433` em *TCP Port*;
   - reinicie o serviço do SQL Server, em *SQL Server Services*.

   > Esse é o erro mais comum. Sem o TCP/IP habilitado, ou com a porta dinâmica, a API não conecta.

2. **Habilite o login por usuário e senha.**
   No SSMS, clique com o botão direito no servidor → *Properties* → *Security* e marque **SQL Server and Windows Authentication mode**. Reinicie o serviço.
   Depois crie um login para o projeto, ou use o `sa` com uma senha definida.

3. **Crie o banco vazio.**
   As tabelas serão criadas depois, pela migration. Agora só o banco:

   ```sql
   CREATE DATABASE quiz_db;
   ```

---

## 3. Rodar o backend

**Todos os comandos desta seção são rodados de dentro da pasta `quiz-api/`.** É ali que fica o arquivo `.env`.

### 3.1 Instalar as dependências

```bash
cd quiz-api
npm install
```

### 3.2 Criar o arquivo `.env`

O `.env` guarda os dados de conexão com o banco e **não vai para o Git**. Por isso ele não vem no clone. Crie o arquivo `quiz-api/.env` com este conteúdo e troque os valores pelos seus:

```env
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASS=sua_senha_aqui
DB_NAME=quiz_db
```

### 3.3 Criar as tabelas (migration)

```bash
npm run migration:run
```

A migration é escrita em T-SQL e cria as quatro tabelas: `questions`, `choices`, `attempts` e `answers`. Para conferir se ela rodou:

```bash
npm run migration:show
```

A migration `InitialSchema` deve aparecer marcada com `[X]`.

### 3.4 Subir a API

```bash
npm run start:dev
```

O `start:dev` reinicia a API sozinho sempre que você salva um arquivo. Quando aparecer `Nest application successfully started`, a API está no ar:

| Endereço | O que aparece |
|---|---|
| http://localhost:3000 | `Hello World!` (a API respondeu) |
| http://localhost:3000/docs | Swagger, a documentação interativa das rotas |

> O banco começa **vazio**. Para fazer uma prova, primeiro cadastre questões pelo Swagger (seção 5) ou pela área do professor no frontend.

---

## 4. Rodar o frontend

O frontend não precisa de instalação. Ele só precisa ser aberto por um servidor local, e **a API precisa estar rodando** (seção 3).

1. Abra a **pasta raiz do repositório** no VS Code.
2. Instale a extensão **Live Server**, se ainda não tiver.
3. Abra o arquivo `quiz-web/index.html` e clique em **Go Live**, na barra azul do rodapé do VS Code.
4. O navegador vai abrir em:

   ```
   http://127.0.0.1:5500/quiz-web/index.html
   ```

> **Importante: o endereço precisa ser exatamente `http://127.0.0.1:5500`.**
> A API só aceita pedidos dessa origem. É o que está liberado no CORS, em [quiz-api/src/main.ts](quiz-api/src/main.ts). Por isso **não funciona** abrir a página:
> - por `http://localhost:5500` (para o navegador, `localhost` e `127.0.0.1` são origens diferentes);
> - em outra porta, como `5501`, que o Live Server usa quando a 5500 está ocupada;
> - com dois cliques no arquivo (`file://...`).
>
> Se cair em um desses casos, a própria página mostra uma mensagem explicando.

No frontend há duas áreas:

- **Aluno:** entra só com o nome, começa ou continua uma prova, responde (cada resposta é salva na hora), envia e vê o resultado.
- **Professor:** cadastra questões, vê as tentativas e corrige as dissertativas.

No rodapé, o painel **Chamadas à API** mostra cada pedido HTTP que a página fez e a resposta da API.

---

## 5. Testar as rotas HTTP

O jeito mais fácil é pelo **Swagger**, em http://localhost:3000/docs. Clique na rota, depois em **Try it out**, preencha o corpo e clique em **Execute**. O Swagger mostra a resposta e o status HTTP.

Também dá para usar Postman, Insomnia ou a extensão REST Client do VS Code, com os mesmos endereços e corpos abaixo.

### 5.1 Rotas

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/questions` | Lista as questões, com as alternativas |
| `POST` | `/questions/multiple-choice` | Cadastra uma questão de múltipla escolha |
| `POST` | `/questions/true-false` | Cadastra uma questão de verdadeiro ou falso |
| `POST` | `/questions/numeric` | Cadastra uma questão numérica |
| `POST` | `/questions/essay` | Cadastra uma questão dissertativa |
| `POST` | `/attempts` | Inicia uma tentativa (prova) para um aluno |
| `GET` | `/attempts` | Lista todas as tentativas |
| `GET` | `/attempts/:id` | Busca uma tentativa, com as respostas |
| `PUT` | `/attempts/:id/answers` | Salva ou troca a resposta de uma questão |
| `POST` | `/attempts/:id/submit` | Envia a prova e corrige as questões automáticas |
| `PATCH` | `/answers/:id/grade` | Professor dá a nota de uma resposta dissertativa |

### 5.2 Roteiro de teste, do cadastro à nota final

Siga na ordem. Os ids são gerados pelo banco, então copie cada id da resposta de um passo para usar no próximo.

**1. Cadastrar questões**

`POST /questions/multiple-choice`
```json
{
  "statement": "Qual é a capital do Brasil?",
  "weightPoints": 2,
  "choices": [
    { "text": "São Paulo", "isCorrect": false },
    { "text": "Brasília", "isCorrect": true },
    { "text": "Rio de Janeiro", "isCorrect": false }
  ]
}
```

`POST /questions/true-false`
```json
{
  "statement": "O Sol é uma estrela.",
  "weightPoints": 1,
  "correctAnswer": true
}
```

`POST /questions/numeric` (com tolerância de 0.01, as respostas `3.33` e `3.335` contam como certas)
```json
{
  "statement": "Quanto é 10 dividido por 3?",
  "weightPoints": 2,
  "numericAnswer": 3.33,
  "tolerance": 0.01
}
```

`POST /questions/essay`
```json
{
  "statement": "Explique o que é encapsulamento.",
  "weightPoints": 5
}
```

**2. Ver as questões e os ids**

`GET /questions`: anote o `id` de cada questão e, nas de múltipla escolha e verdadeiro ou falso, o `id` de cada alternativa (`choices`).

**3. Iniciar uma tentativa**

`POST /attempts`
```json
{ "studentName": "Ana" }
```
Anote o `id` da tentativa que voltou na resposta.

**4. Responder as questões**

`PUT /attempts/{id da tentativa}/answers`, uma chamada por questão. O `rawValue` muda conforme o tipo:

| Tipo da questão | O que vai no `rawValue` |
|---|---|
| Múltipla escolha | o `id` da alternativa escolhida |
| Verdadeiro ou falso | o `id` da alternativa "Verdadeiro" ou "Falso" |
| Numérica | o número, como texto, com ponto, por exemplo `"3.33"` |
| Dissertativa | o texto da resposta |

```json
{
  "questionId": "id-da-questao",
  "rawValue": "id-da-alternativa-ou-o-valor"
}
```

Mandar de novo para a mesma questão **troca** a resposta anterior.

**5. Enviar a prova**

`POST /attempts/{id da tentativa}/submit`, sem corpo.

As questões automáticas recebem a nota na hora. A dissertativa fica **pendente**, com `awardedPoints` igual a `null`, e não entra na nota até ser corrigida.

**6. Corrigir a dissertativa**

`GET /attempts/{id da tentativa}`: dentro de `answers`, anote o `id` da resposta da dissertativa.

`PATCH /answers/{id da resposta}/grade`
```json
{ "points": 4 }
```
A nota da tentativa é recalculada e volta na resposta.

### 5.3 Regras que a API recusa (erros esperados)

Estes pedidos **devem** dar erro. Vale testar para ver as regras funcionando:

| Teste | Resposta |
|---|---|
| Cadastrar questão sem `statement`, ou com `weightPoints` zero ou negativo | `400` |
| Mandar um campo que não existe no corpo | `400` |
| Múltipla escolha com menos de 2 alternativas | `400` |
| Responder uma tentativa que já foi enviada | `400` |
| Enviar duas vezes a mesma tentativa | `400` |
| Corrigir a dissertativa antes de a prova ser enviada | `400` |
| Dar nota manual para uma questão automática | `400` |
| Dar nota maior que o peso da questão | `400` |
| Usar um id de tentativa, questão ou resposta que não existe | `404` |

### 5.4 Limitações conhecidas

- **Duas tentativas abertas para o mesmo aluno:** o banco impede, por causa de um índice único. Só que a API ainda devolve `500`, e não uma mensagem amigável. O frontend contorna isso retomando a tentativa que já está aberta.
- **Gabarito visível:** o `GET /questions` devolve o `isCorrect` das alternativas e o `numericAnswer`. A página não mostra o gabarito antes do envio, mas ele aparece no DevTools do navegador (F12). Ainda não há login nem separação entre professor e aluno.

---

## 6. Testes automatizados

Rode de dentro de `quiz-api/`:

| Comando | O que testa | Precisa do banco? |
|---|---|---|
| `npm test` | Testes de unidade: correção, cálculo da nota e regras da tentativa | **Não.** Usa um repositório em memória e roda com o SQL Server desligado |
| `npm run test:e2e` | Sobe a aplicação inteira e chama `GET /` | Sim |
| `npm run test:int` | Testes de integração com o banco | Sim, **e com dados** |

Sobre o `test:int`: esses testes foram escritos sobre os dados que a autora usou durante o estudo. Num banco recém-criado eles falham, e isso é esperado:

- `decimal-conversion.int-spec.ts` precisa de pelo menos uma questão numérica cadastrada;
- `reports.int-spec.ts` confere resultados de consultas SQL sobre alunos e notas específicos, como "Eva" e "Marta Cristina".

---

## Outros comandos úteis

Também rodados de dentro de `quiz-api/`:

| Comando | O que faz |
|---|---|
| `npm run migration:show` | Mostra quais migrations já rodaram |
| `npm run migration:revert` | Desfaz a última migration e **apaga as tabelas e os dados** |
| `npm run build` | Compila o TypeScript para a pasta `dist/` |
| `npm run start:prod` | Roda a versão compilada, depois do `build` |
| `npm run lint` | Confere o padrão do código |

---

## Problemas comuns

| Mensagem ou sintoma | Causa provável |
|---|---|
| `Failed to connect to localhost:1433` | TCP/IP desabilitado, porta diferente de 1433 ou serviço do SQL Server parado. Veja a seção 2, passo 1 |
| `Login failed for user` | Usuário ou senha errados no `.env`, ou login por senha desabilitado. Veja a seção 2, passo 2 |
| `Cannot open database "quiz_db"` | O banco não foi criado, ou o `DB_NAME` do `.env` está diferente |
| `Invalid object name 'questions'` | A migration não rodou. Rode `npm run migration:run` |
| A página diz *"A API só aceita pedidos vindos de http://127.0.0.1:5500"* | A página foi aberta por outro endereço. Veja a seção 4 |
| A página diz *"Não foi possível falar com a API"* | A API não está rodando. Rode `npm run start:dev` em `quiz-api/` |
| O comando não acha o `.env` ou o `package.json` | O comando foi rodado fora da pasta `quiz-api/` |

---

## Sobre o projeto

O projeto foi feito como estudo de **POO e SOLID** com NestJS, seguindo o roteiro em [guia-quiz-nestjs.md](guia-quiz-nestjs.md). As anotações de cada etapa estão em [quiz-api/NOTAS.md](quiz-api/NOTAS.md).
