// Front do Quiz, em HTML, CSS e JavaScript puro.
// Nenhuma regra de negócio mora aqui: a página só chama os mesmos endpoints do Swagger e mostra o que a API responde.

const API_URL = 'http://localhost:3000';

const TYPE_LABELS = {
    multiple_choice: 'Múltipla escolha',
    true_false: 'Verdadeiro ou falso',
    numeric: 'Numérica',
    essay: 'Dissertativa',
};

// ---------- estado: o que a página precisa lembrar enquanto está aberta ----------

let questions = [];                  // todas as questões, vindas do GET /questions
let currentStudent = null;           // o nome de quem entrou na área do aluno
let myAttempts = [];                 // as tentativas desse aluno, da mais nova para a mais antiga
let currentAttempt = null;           // a tentativa que o aluno está fazendo ou vendo
let savedValues = {};                // questionId -> última resposta que a API confirmou
let queuedValues = {};               // questionId -> última resposta mandada para a fila
let saveQueue = Promise.resolve();   // fila de PUTs, um de cada vez
let studentScreen = 'login-screen';  // em qual tela o aluno estava, para voltar a ela pelo menu
let openedAttempt = null;            // a tentativa aberta na área do professor
let teacherTab = 'attempts';         // aba da área do professor: 'attempts' (correções) ou 'questions'
let lastAttempts = [];               // a última lista de tentativas que veio da API, para o filtro não precisar buscar de novo
let apiCalls = [];                   // as últimas chamadas feitas à API, mostradas no painel do rodapé

// ---------- elementos da página ----------

const apiStatus = document.getElementById('api-status');
const navStudent = document.getElementById('nav-student');
const navTeacher = document.getElementById('nav-teacher');
const navRules = document.getElementById('nav-rules');

const startInfo = document.getElementById('start-info');
const studentNameInput = document.getElementById('student-name');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');

const homeStudent = document.getElementById('home-student');
const homeInfo = document.getElementById('home-info');
const mainActionButton = document.getElementById('main-action-button');
const homeMessage = document.getElementById('home-message');
const logoutButton = document.getElementById('logout-button');
const myAttemptsList = document.getElementById('my-attempts');

const quizStudent = document.getElementById('quiz-student');
const quizInfo = document.getElementById('quiz-info');
const questionsList = document.getElementById('questions-list');
const quizProgress = document.getElementById('quiz-progress');
const quizMessage = document.getElementById('quiz-message');
const submitButton = document.getElementById('submit-button');

const resultStudent = document.getElementById('result-student');
const resultScore = document.getElementById('result-score');
const resultMax = document.getElementById('result-max');
const resultPending = document.getElementById('result-pending');
const resultList = document.getElementById('result-list');
const backButton = document.getElementById('back-button');

const tabAttempts = document.getElementById('tab-attempts');
const tabQuestions = document.getElementById('tab-questions');
const attemptsPanel = document.getElementById('attempts-panel');
const questionsPanel = document.getElementById('questions-panel');

const typePicker = document.getElementById('type-picker');
const newStatement = document.getElementById('new-statement');
const newWeight = document.getElementById('new-weight');
const typeFields = document.getElementById('type-fields');
const createQuestionButton = document.getElementById('create-question-button');
const questionFormMessage = document.getElementById('question-form-message');
const questionsTable = document.getElementById('questions-table');

const pendingCount = document.getElementById('pending-count');
const onlyPending = document.getElementById('only-pending');
const refreshButton = document.getElementById('refresh-button');
const attemptsTable = document.getElementById('attempts-table');
const teacherMessage = document.getElementById('teacher-message');
const attemptDetail = document.getElementById('attempt-detail');

const runAllRulesButton = document.getElementById('run-all-rules');
const rulesMessage = document.getElementById('rules-message');
const rulesList = document.getElementById('rules-list');

const apiLogToggle = document.getElementById('api-log-toggle');
const apiLogLast = document.getElementById('api-log-last');
const apiLogArrow = document.getElementById('api-log-arrow');
const apiLogList = document.getElementById('api-log-list');

// ---------- conversa com a API ----------

// faz o pedido e devolve { ok, status, data }, dando certo ou errado; também anota a chamada no painel do rodapé
async function request(method, path, body) {
    const options = { method: method, headers: {} };

    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const startedAt = performance.now();
    let response;
    try {
        response = await fetch(API_URL + path, options);
    } catch {
        logCall(method, path, null, performance.now() - startedAt);
        setApiStatus(false);
        // o enableCors do main.ts só libera esta origem; aberta por outro endereço, o navegador barra todos os pedidos
        if (window.location.origin !== 'http://127.0.0.1:5500') {
            throw new Error('A API só aceita pedidos vindos de http://127.0.0.1:5500 (é a origem liberada no enableCors). Abra a página por esse endereço.');
        }
        throw new Error(`Não foi possível falar com a API. Confira se ela está rodando em ${API_URL}.`);
    }
    setApiStatus(true);

    const data = await response.json().catch(() => null);
    logCall(method, path, response.status, performance.now() - startedAt);

    return { ok: response.ok, status: response.status, statusText: response.statusText, data: data };
}

// o Nest responde { statusCode, message, error }, e o message vira uma lista quando o ValidationPipe barra mais de um campo
function errorMessage(result) {
    return result.data && result.data.message ? [].concat(result.data.message).join(' • ') : result.statusText;
}

// para o uso normal das telas: devolve o JSON da resposta, ou lança um Error com a mensagem que a API mandou
async function api(method, path, body) {
    const result = await request(method, path, body);

    if (!result.ok) {
        throw new Error(`Erro ${result.status}: ${errorMessage(result)}`);
    }
    return result.data;
}

function setApiStatus(online) {
    apiStatus.textContent = online ? 'API conectada' : 'API desligada';
    apiStatus.className = online ? 'api-status online' : 'api-status offline';
}

async function loadQuestions() {
    questions = await api('GET', '/questions');
}

// ---------- utilitários ----------

// o texto digitado pelo usuário vai para dentro do HTML; sem isso, um "<b>" na resposta viraria negrito de verdade
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// o SQL Server devolve os ids em maiúsculas, então a comparação ignora maiúsculas e minúsculas
function sameId(a, b) {
    return String(a).toLowerCase() === String(b).toLowerCase();
}

function formatNumber(value, maxDigits = 2) {
    return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: maxDigits });
}

function formatPoints(value) {
    return `${formatNumber(value)} ${Number(value) === 1 ? 'ponto' : 'pontos'}`;
}

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// a nota máxima é a soma dos pesos de todas as questões (só para exibir; quem calcula a nota é a API)
function maxPoints() {
    const sum = questions.reduce((total, question) => total + question.weightPoints, 0);
    return Math.round(sum * 100) / 100;
}

function showMessage(element, text, kind = '') {
    element.textContent = text;
    element.className = `message ${kind}`;
}

// as telas ficam todas no mesmo HTML; mostrar uma é esconder as outras
function showScreen(screenId) {
    for (const screen of document.querySelectorAll('main > section')) {
        screen.hidden = screen.id !== screenId;
    }

    const isStudent = screenId !== 'teacher-screen' && screenId !== 'rules-screen';
    navStudent.classList.toggle('active', isStudent);
    navTeacher.classList.toggle('active', screenId === 'teacher-screen');
    navRules.classList.toggle('active', screenId === 'rules-screen');

    if (isStudent) {
        studentScreen = screenId;
    }
    window.scrollTo(0, 0);
}

function findAnswer(attempt, questionId) {
    return attempt.answers.find((answer) => answer.question && sameId(answer.question.id, questionId));
}

// nas alternativas o rawValue é o id da alternativa escolhida, então trocamos pelo texto dela
function answerText(question, rawValue) {
    if (Array.isArray(question.choices)) {
        const choice = question.choices.find((item) => sameId(item.id, rawValue));
        if (choice) {
            return choice.text;
        }
    }
    return rawValue;
}

// ---------- área do aluno: entrar ----------

// por enquanto o aluno é identificado só pelo nome; quando tiver login, o nome vem do usuário logado
async function login() {
    const name = studentNameInput.value.trim();

    if (name === '') {
        showMessage(loginMessage, 'Digite seu nome para entrar.', 'error');
        return;
    }

    loginButton.disabled = true;
    showMessage(loginMessage, 'Carregando...');

    try {
        currentStudent = name;
        await loadStudentHome();
        showMessage(loginMessage, '');
        showScreen('student-home-screen');
    } catch (error) {
        currentStudent = null;
        showMessage(loginMessage, error.message, 'error');
    } finally {
        loginButton.disabled = false;
    }
}

function logout() {
    currentStudent = null;
    currentAttempt = null;
    myAttempts = [];
    studentNameInput.value = '';
    showScreen('login-screen');
    studentNameInput.focus();
}

// ---------- área do aluno: minhas provas ----------

async function loadStudentHome() {
    await loadQuestions();
    myAttempts = await fetchMyAttempts();
    renderStudentHome();
}

// TEMPORÁRIO: o GET /attempts devolve as tentativas de todo mundo, e o front filtra pelo nome.
// Quando entrar o login com Guard e Roles, essa rota fica só para o professor, e aqui passa a ser chamado
// um endpoint do aluno (por exemplo GET /attempts/me), que devolve só as tentativas de quem está logado.
async function fetchMyAttempts() {
    const attempts = await api('GET', '/attempts');
    return attempts
        .filter((attempt) => attempt.studentName.trim().toLowerCase() === currentStudent.toLowerCase())
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

function findOpenAttempt() {
    return myAttempts.find((attempt) => attempt.submittedAt === null);
}

function renderStudentHome() {
    homeStudent.textContent = currentStudent;
    showMessage(homeMessage, '');

    // RN03: só uma tentativa aberta por aluno, então ou ele continua a aberta ou começa uma nova
    if (findOpenAttempt()) {
        homeInfo.textContent = 'Você tem uma prova em andamento. Só dá para ter uma aberta por vez, então envie esta antes de começar outra.';
        mainActionButton.textContent = 'Continuar prova em andamento';
    } else {
        homeInfo.textContent = `Uma prova nova tem ${questions.length} questões, valendo ${formatPoints(maxPoints())} no total.`;
        mainActionButton.textContent = 'Começar nova prova';
    }

    if (myAttempts.length === 0) {
        myAttemptsList.innerHTML = '<p class="hint">Você ainda não fez nenhuma prova.</p>';
        return;
    }

    myAttemptsList.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Início</th>
                        <th>Situação</th>
                        <th>Nota</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${myAttempts.map(renderMyAttemptRow).join('')}</tbody>
            </table>
        </div>`;
}

function renderMyAttemptRow(attempt) {
    const status = attemptStatus(attempt);
    const isOpen = attempt.submittedAt === null;

    return `
        <tr>
            <td>${formatDate(attempt.startedAt)}</td>
            <td><span class="status status-${status.kind}">${status.text}</span></td>
            <td>${attempt.scorePoints === null ? '—' : formatNumber(attempt.scorePoints)}</td>
            <td class="right">
                <button class="small ${isOpen ? 'primary' : ''}" data-attempt-id="${attempt.id}" data-open="${isOpen}">${isOpen ? 'Continuar' : 'Ver resultado'}</button>
            </td>
        </tr>`;
}

async function startOrContinue() {
    mainActionButton.disabled = true;
    showMessage(homeMessage, 'Carregando...');

    try {
        const openAttempt = findOpenAttempt();

        if (openAttempt) {
            await continueQuiz(openAttempt.id);
        } else {
            const attempt = await api('POST', '/attempts', { studentName: currentStudent });
            beginQuiz(attempt, false);
        }
    } catch (error) {
        showMessage(homeMessage, error.message, 'error');
    } finally {
        mainActionButton.disabled = false;
    }
}

async function continueQuiz(attemptId) {
    const attempt = await api('GET', `/attempts/${attemptId}`);
    beginQuiz(attempt, true);
}

// prepara a tela da prova com a tentativa que veio da API, seja ela nova ou continuada
function beginQuiz(attempt, resumed) {
    currentAttempt = attempt;

    // anota quais questões já têm resposta salva, para elas aparecerem marcadas
    savedValues = {};
    for (const answer of attempt.answers) {
        savedValues[answer.question.id] = answer.rawValue;
    }
    queuedValues = { ...savedValues };

    renderQuiz(resumed);
    showMessage(homeMessage, '');
    showScreen('quiz-screen');
}

async function viewResult(attemptId) {
    showMessage(homeMessage, 'Carregando...');

    try {
        currentAttempt = await api('GET', `/attempts/${attemptId}`);
        renderResult(currentAttempt);
        showMessage(homeMessage, '');
        showScreen('result-screen');
    } catch (error) {
        showMessage(homeMessage, error.message, 'error');
    }
}

async function openMyAttempt(button) {
    if (button.dataset.open !== 'true') {
        viewResult(button.dataset.attemptId);
        return;
    }

    try {
        await continueQuiz(button.dataset.attemptId);
    } catch (error) {
        showMessage(homeMessage, error.message, 'error');
    }
}

async function backToHome() {
    showScreen('student-home-screen');

    try {
        await loadStudentHome();
    } catch (error) {
        showMessage(homeMessage, error.message, 'error');
    }
}

// ao voltar para a área do aluno pelo menu, busca de novo o que pode ter mudado,
// como uma dissertativa que o professor acabou de corrigir
async function openStudentArea() {
    showScreen(studentScreen);

    try {
        if (studentScreen === 'student-home-screen') {
            await loadStudentHome();
        } else if (studentScreen === 'result-screen') {
            currentAttempt = await api('GET', `/attempts/${currentAttempt.id}`);
            renderResult(currentAttempt);
        }
    } catch (error) {
        showMessage(homeMessage, error.message, 'error');
    }
}

// ---------- tela 2: prova ----------

function renderQuiz(resumed) {
    quizStudent.textContent = currentAttempt.studentName;

    if (resumed) {
        quizInfo.textContent = `Continuando de onde você parou (${Object.keys(savedValues).length} resposta(s) já salva(s)).`;
        quizInfo.className = 'notice';
    } else {
        quizInfo.textContent = 'Suas respostas são salvas sozinhas, assim que você escolhe uma alternativa ou sai do campo.';
        quizInfo.className = 'hint';
    }

    questionsList.innerHTML = questions.map(renderQuestion).join('');
    showMessage(quizMessage, '');
    updateProgress();
}

function renderQuestion(question, index) {
    const isSaved = savedValues[question.id] !== undefined;

    return `
        <article class="card question" id="question-${question.id}">
            <div class="question-top">
                <span class="badge badge-${question.question_type}">${TYPE_LABELS[question.question_type] ?? question.question_type}</span>
                <span class="weight">${formatPoints(question.weightPoints)}</span>
            </div>
            <h3>${index + 1}. ${escapeHtml(question.statement)}</h3>
            ${renderAnswerField(question)}
            <p class="save-status ${isSaved ? 'saved' : ''}" id="status-${question.id}" aria-live="polite">${isSaved ? '✓ Resposta salva' : ''}</p>
        </article>`;
}

// múltipla escolha e verdadeiro/falso têm alternativas; numérica é um campo de número; dissertativa é texto livre
function renderAnswerField(question) {
    const saved = savedValues[question.id] ?? '';

    if (Array.isArray(question.choices)) {
        const options = question.choices.map((choice) => `
            <label class="choice">
                <input type="radio" name="answer-${question.id}" value="${escapeHtml(choice.id)}" data-question-id="${question.id}" ${sameId(saved, choice.id) ? 'checked' : ''}>
                <span>${escapeHtml(choice.text)}</span>
            </label>`);
        return `<div class="choices">${options.join('')}</div>`;
    }

    if (question.question_type === 'numeric') {
        return `<input class="answer-field" type="text" inputmode="decimal" placeholder="Digite um número (ex.: 3,14)" value="${escapeHtml(saved)}" data-question-id="${question.id}">`;
    }

    return `<textarea class="answer-field" rows="4" placeholder="Escreva sua resposta" data-question-id="${question.id}">${escapeHtml(saved)}</textarea>`;
}

function readAnswer(question) {
    const box = document.getElementById(`question-${question.id}`);

    if (Array.isArray(question.choices)) {
        const checked = box.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : '';
    }

    const value = box.querySelector('.answer-field').value.trim();
    // a API converte com Number(), que não entende vírgula, por isso 3,14 vira 3.14
    return question.question_type === 'numeric' ? value.replace(',', '.') : value;
}

function setSaveStatus(question, text, kind) {
    const status = document.getElementById(`status-${question.id}`);
    status.textContent = text;
    status.className = `save-status ${kind}`;
}

// a API carrega a tentativa, acrescenta a resposta e salva tudo; dois PUTs ao mesmo tempo poderiam atropelar um ao outro,
// então as respostas entram numa fila e vão uma de cada vez
function queueSave(question, rawValue) {
    queuedValues[question.id] = rawValue;
    setSaveStatus(question, 'Salvando...', 'saving');

    saveQueue = saveQueue.then(async () => {
        try {
            await api('PUT', `/attempts/${currentAttempt.id}/answers`, { questionId: question.id, rawValue: rawValue });
            savedValues[question.id] = rawValue;

            if (queuedValues[question.id] === rawValue) {
                setSaveStatus(question, '✓ Resposta salva', 'saved');
            }
        } catch (error) {
            if (queuedValues[question.id] === rawValue) {
                queuedValues[question.id] = savedValues[question.id];
            }
            setSaveStatus(question, error.message, 'error');
        }
        updateProgress();
    });
    return saveQueue;
}

function updateProgress() {
    const answered = questions.filter((question) => savedValues[question.id] !== undefined).length;
    quizProgress.textContent = `${answered} de ${questions.length} respondidas`;
}

async function submitQuiz() {
    submitButton.disabled = true;

    try {
        // garante que nada ficou para trás, como um texto digitado sem sair do campo
        for (const question of questions) {
            const value = readAnswer(question);
            if (value !== '' && value !== queuedValues[question.id]) {
                queueSave(question, value);
            }
        }

        showMessage(quizMessage, 'Salvando respostas...');
        await saveQueue;

        const unsaved = questions.filter((question) => {
            const value = readAnswer(question);
            return value !== '' && value !== savedValues[question.id];
        });
        if (unsaved.length > 0) {
            showMessage(quizMessage, 'Algumas respostas não foram salvas. Confira as mensagens em vermelho antes de enviar.', 'error');
            return;
        }

        const unanswered = questions.filter((question) => savedValues[question.id] === undefined).length;
        if (unanswered > 0 && !confirm(`Você deixou ${unanswered} questão(ões) sem resposta, e elas vão valer zero. Enviar mesmo assim?`)) {
            showMessage(quizMessage, '');
            return;
        }

        showMessage(quizMessage, 'Enviando...');
        currentAttempt = await api('POST', `/attempts/${currentAttempt.id}/submit`);

        renderResult(currentAttempt);
        showScreen('result-screen');
    } catch (error) {
        showMessage(quizMessage, error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
}

// ---------- tela 3: resultado ----------

function renderResult(attempt) {
    resultStudent.textContent = attempt.studentName;
    resultScore.textContent = formatNumber(attempt.scorePoints ?? 0);
    resultMax.textContent = `de ${formatPoints(maxPoints())}`;

    // RN09: respostas que esperam correção manual ainda não entram na nota
    const pending = attempt.answers.filter((answer) => answer.gradedAt === null).length;
    if (pending > 0) {
        resultPending.textContent = `⏳ ${pending} resposta(s) dissertativa(s) aguardando a correção do professor. Elas ainda não entram na nota, então ela pode subir.`;
        resultPending.className = 'notice';
    } else {
        resultPending.textContent = '✓ Todas as respostas já foram corrigidas.';
        resultPending.className = 'notice success';
    }

    resultList.innerHTML = questions
        .map((question, index) => renderResultItem(question, index, findAnswer(attempt, question.id)))
        .join('');
}

function renderResultItem(question, index, answer) {
    return `
        <article class="card result-item">
            <h3>${index + 1}. ${escapeHtml(question.statement)}</h3>
            <p class="your-answer">Sua resposta: <strong>${answer ? escapeHtml(answerText(question, answer.rawValue)) : '—'}</strong></p>
            ${renderCorrectAnswer(question, answer)}
            ${renderVerdict(question, answer)}
        </article>`;
}

// o gabarito de cada tipo: nas alternativas, o texto da correta; na numérica, o valor e a margem aceita.
// A dissertativa não tem gabarito, então devolve null
function correctAnswerText(question) {
    if (Array.isArray(question.choices)) {
        return question.choices
            .filter((choice) => choice.isCorrect)
            .map((choice) => choice.text)
            .join(' ou ');
    }

    if (question.question_type === 'numeric') {
        // 6 casas, porque o gabarito pode ser algo como 1,414214
        const value = formatNumber(question.numericAnswer, 6);
        if (question.tolerance > 0) {
            return `${value} (aceita uma diferença de até ${formatNumber(question.tolerance, 6)})`;
        }
        return value;
    }

    return null;
}

// mostra a resposta correta só quando o aluno errou ou deixou em branco
function renderCorrectAnswer(question, answer) {
    const correct = correctAnswerText(question);
    const missed = !answer || (answer.gradedAt !== null && answer.awardedPoints < question.weightPoints);

    if (!correct || !missed) {
        return '';
    }
    return `<p class="correct-answer">Resposta correta: <strong>${escapeHtml(correct)}</strong></p>`;
}

function renderVerdict(question, answer) {
    const weight = formatPoints(question.weightPoints);

    if (!answer) {
        return `<span class="verdict verdict-none">Não respondida · 0 de ${weight}</span>`;
    }
    if (answer.gradedAt === null) {
        return '<span class="verdict verdict-pending">⏳ Aguardando correção</span>';
    }
    if (answer.awardedPoints >= question.weightPoints) {
        return `<span class="verdict verdict-right">✓ ${formatNumber(answer.awardedPoints)} de ${weight}</span>`;
    }
    if (answer.awardedPoints > 0) {
        return `<span class="verdict verdict-partial">◐ ${formatNumber(answer.awardedPoints)} de ${weight}</span>`;
    }
    return `<span class="verdict verdict-wrong">✗ 0 de ${weight}</span>`;
}

// ---------- tela 4: área do professor ----------

function attemptStatus(attempt) {
    if (attempt.submittedAt === null) {
        return { kind: 'open', text: 'Em andamento' };
    }
    if (attempt.answers.some((answer) => answer.gradedAt === null)) {
        return { kind: 'pending', text: 'Aguardando correção' };
    }
    return { kind: 'done', text: 'Corrigida' };
}

async function loadAttempts() {
    showMessage(teacherMessage, 'Carregando...');

    try {
        await loadQuestions();
        const attempts = await api('GET', '/attempts');

        // as mais recentes primeiro
        attempts.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        lastAttempts = attempts;

        const pending = attempts.filter((attempt) => attemptStatus(attempt).kind === 'pending').length;
        pendingCount.textContent = pending;
        pendingCount.hidden = pending === 0;

        renderAttemptsTable();
    } catch (error) {
        showMessage(teacherMessage, error.message, 'error');
    }
}

// desenha a tabela com a última lista recebida, aplicando o filtro "só as que faltam corrigir"
function renderAttemptsTable() {
    const visible = onlyPending.checked
        ? lastAttempts.filter((attempt) => attemptStatus(attempt).kind === 'pending')
        : lastAttempts;

    attemptsTable.innerHTML = visible.map(renderAttemptRow).join('');
    highlightOpenedRow();

    if (visible.length > 0) {
        showMessage(teacherMessage, '');
    } else {
        showMessage(teacherMessage, onlyPending.checked ? 'Nenhuma prova esperando correção. 🎉' : 'Nenhuma tentativa ainda.');
    }
}

function renderAttemptRow(attempt) {
    const status = attemptStatus(attempt);

    return `
        <tr>
            <td>${escapeHtml(attempt.studentName)}</td>
            <td>${formatDate(attempt.startedAt)}</td>
            <td><span class="status status-${status.kind}">${status.text}</span></td>
            <td>${attempt.scorePoints === null ? '—' : formatNumber(attempt.scorePoints)}</td>
            <td class="right">
                <button class="small ${status.kind === 'pending' ? 'primary' : ''}" data-attempt-id="${attempt.id}">${status.kind === 'pending' ? 'Corrigir' : 'Ver'}</button>
            </td>
        </tr>`;
}

function highlightOpenedRow() {
    for (const button of attemptsTable.querySelectorAll('button[data-attempt-id]')) {
        const isOpened = openedAttempt !== null && sameId(button.dataset.attemptId, openedAttempt.id);
        button.closest('tr').classList.toggle('selected', isOpened);
    }
}

async function openAttempt(attemptId) {
    showMessage(teacherMessage, 'Carregando tentativa...');

    try {
        openedAttempt = await api('GET', `/attempts/${attemptId}`);
        renderAttemptDetail();
        highlightOpenedRow();
        showMessage(teacherMessage, '');
        attemptDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        showMessage(teacherMessage, error.message, 'error');
    }
}

function renderAttemptDetail(notice = '') {
    const attempt = openedAttempt;
    const status = attemptStatus(attempt);

    // mesma ordem da prova
    const position = (answer) => {
        const index = questions.findIndex((question) => sameId(question.id, answer.question.id));
        return index === -1 ? questions.length : index;
    };
    const answers = [...attempt.answers].sort((a, b) => position(a) - position(b));

    attemptDetail.hidden = false;
    attemptDetail.innerHTML = `
        <div class="card">
            <div class="detail-top">
                <div>
                    <h2>${escapeHtml(attempt.studentName)}</h2>
                    <span class="status status-${status.kind}">${status.text}</span>
                </div>
                <div class="detail-score">
                    <span class="detail-score-value">${attempt.scorePoints === null ? '—' : formatNumber(attempt.scorePoints)}</span>
                    <span class="score-max">de ${formatPoints(maxPoints())}</span>
                </div>
            </div>
            ${notice ? `<p class="notice success">${escapeHtml(notice)}</p>` : ''}
        </div>
        ${answers.length === 0
            ? '<div class="card"><p class="hint">Esta tentativa ainda não tem respostas.</p></div>'
            : answers.map(renderAnswerReview).join('')}`;
}

function renderAnswerReview(answer) {
    const question = answer.question;

    return `
        <article class="card review">
            <div class="question-top">
                <span class="badge badge-${question.question_type}">${TYPE_LABELS[question.question_type] ?? question.question_type}</span>
                <span class="weight">${formatPoints(question.weightPoints)}</span>
            </div>
            <h3>${escapeHtml(question.statement)}</h3>
            <p class="your-answer">Resposta do aluno: <strong>${escapeHtml(answerText(question, answer.rawValue))}</strong></p>
            ${renderCorrectAnswer(question, answer)}
            ${question.question_type === 'essay' ? renderGradeForm(answer) : renderAutoGrade(answer)}
        </article>`;
}

function renderAutoGrade(answer) {
    if (answer.gradedAt === null) {
        return '<span class="verdict verdict-none">Corrigida automaticamente quando a prova for enviada</span>';
    }
    return `<span class="verdict verdict-auto">Corrigida automaticamente: ${formatNumber(answer.awardedPoints)} de ${formatPoints(answer.question.weightPoints)}</span>`;
}

// a dissertativa é a única que o professor corrige; os limites (0 até o peso, só depois do envio) quem confere é a API
function renderGradeForm(answer) {
    const current = answer.gradedAt === null
        ? '<span class="verdict verdict-pending">⏳ Aguardando correção</span>'
        : `<span class="verdict verdict-right">Corrigida: ${formatNumber(answer.awardedPoints)} de ${formatPoints(answer.question.weightPoints)}</span>`;

    return `
        ${current}
        <div class="grade-form">
            <label for="points-${answer.id}">Nota (de 0 a ${formatNumber(answer.question.weightPoints)})</label>
            <input id="points-${answer.id}" type="text" inputmode="decimal" value="${answer.awardedPoints === null ? '' : String(answer.awardedPoints).replace('.', ',')}">
            <button class="primary small" data-answer-id="${answer.id}">${answer.gradedAt === null ? 'Salvar nota' : 'Alterar nota'}</button>
        </div>
        <p class="message" id="grade-status-${answer.id}" aria-live="polite"></p>`;
}

async function gradeAnswer(button) {
    const answerId = button.dataset.answerId;
    const input = document.getElementById(`points-${answerId}`);
    const status = document.getElementById(`grade-status-${answerId}`);
    const typed = input.value.trim().replace(',', '.');

    if (typed === '' || Number.isNaN(Number(typed))) {
        showMessage(status, 'Digite a nota em número, por exemplo 3 ou 2,5.', 'error');
        return;
    }

    button.disabled = true;
    showMessage(status, 'Salvando...');

    try {
        const scoreBefore = openedAttempt.scorePoints;
        openedAttempt = await api('PATCH', `/answers/${answerId}/grade`, { points: Number(typed) });

        const before = scoreBefore === null ? '—' : formatNumber(scoreBefore);
        renderAttemptDetail(`Nota recalculada pela API: ${before} → ${formatPoints(openedAttempt.scorePoints)}.`);
        loadAttempts();
    } catch (error) {
        showMessage(status, error.message, 'error');
        button.disabled = false;
    }
}

// ---------- área do professor: abas ----------

function showTeacherTab(tab) {
    teacherTab = tab;
    attemptsPanel.hidden = tab !== 'attempts';
    questionsPanel.hidden = tab !== 'questions';
    tabAttempts.classList.toggle('active', tab === 'attempts');
    tabQuestions.classList.toggle('active', tab === 'questions');

    if (tab === 'attempts') {
        loadAttempts();
    } else {
        loadQuestionsTable();
    }
}

// ---------- área do professor: questões ----------

// cada tipo tem o seu endpoint de cadastro, igual no Swagger
const CREATE_ENDPOINTS = {
    multiple_choice: '/questions/multiple-choice',
    true_false: '/questions/true-false',
    numeric: '/questions/numeric',
    essay: '/questions/essay',
};

async function loadQuestionsTable() {
    try {
        await loadQuestions();
        questionsTable.innerHTML = questions.map(renderQuestionRow).join('');
    } catch (error) {
        showMessage(questionFormMessage, error.message, 'error');
    }
}

function renderQuestionRow(question, index) {
    const correct = correctAnswerText(question);

    return `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(question.statement)}</td>
            <td><span class="badge badge-${question.question_type}">${TYPE_LABELS[question.question_type] ?? question.question_type}</span></td>
            <td>${formatNumber(question.weightPoints)}</td>
            <td>${correct ? escapeHtml(correct) : '<span class="hint">Correção manual</span>'}</td>
        </tr>`;
}

function selectedType() {
    return typePicker.querySelector('input[name="new-type"]:checked').value;
}

// desenha os campos que só existem em um tipo de questão
function renderTypeFields() {
    const type = selectedType();

    if (type === 'multiple_choice') {
        typeFields.innerHTML = `
            <label>Alternativas <span class="label-hint">(marque a bolinha da correta)</span></label>
            <div id="choice-rows" class="choice-rows">
                ${[1, 2, 3, 4].map(renderChoiceRow).join('')}
            </div>
            <button id="add-choice-button" class="small">+ Adicionar alternativa</button>`;
    } else if (type === 'true_false') {
        typeFields.innerHTML = `
            <label>Resposta correta</label>
            <div class="choices two-columns">
                <label class="choice"><input type="radio" name="new-true-false" value="true"> Verdadeiro</label>
                <label class="choice"><input type="radio" name="new-true-false" value="false"> Falso</label>
            </div>`;
    } else if (type === 'numeric') {
        typeFields.innerHTML = `
            <div class="field-row">
                <div>
                    <label for="new-numeric-answer">Resposta correta</label>
                    <input id="new-numeric-answer" type="text" inputmode="decimal" placeholder="Ex.: 3,14">
                </div>
                <div>
                    <label for="new-tolerance">Margem aceita, para mais ou para menos</label>
                    <input id="new-tolerance" type="text" inputmode="decimal" value="0">
                </div>
            </div>`;
    } else {
        typeFields.innerHTML = '<p class="hint">A dissertativa não tem resposta pronta: o professor corrige na aba Correções, depois que o aluno envia a prova.</p>';
    }
}

function renderChoiceRow(number) {
    return `
        <div class="choice-row">
            <input type="radio" name="new-correct" title="Marcar como a correta">
            <input type="text" class="choice-text" placeholder="Alternativa ${number}">
            <button class="small remove-choice" title="Remover alternativa">✕</button>
        </div>`;
}

// o usuário pode digitar 2,5 ou 2.5; vazio vira NaN para a conferência abaixo pegar
function parseDecimal(text) {
    const value = text.trim().replace(',', '.');
    return value === '' ? NaN : Number(value);
}

// monta o corpo do POST exatamente como os DTOs da API pedem
function buildQuestionBody(type) {
    const body = {
        statement: newStatement.value.trim(),
        weightPoints: parseDecimal(newWeight.value),
    };

    if (type === 'multiple_choice') {
        // linhas sem texto são ignoradas, para o professor não precisar apagar as que sobraram
        body.choices = [...typeFields.querySelectorAll('.choice-row')]
            .map((row) => ({
                text: row.querySelector('.choice-text').value.trim(),
                isCorrect: row.querySelector('input[type="radio"]').checked,
            }))
            .filter((choice) => choice.text !== '');
    } else if (type === 'true_false') {
        const checked = typeFields.querySelector('input[name="new-true-false"]:checked');
        body.correctAnswer = checked ? checked.value === 'true' : null;
    } else if (type === 'numeric') {
        body.numericAnswer = parseDecimal(document.getElementById('new-numeric-answer').value);
        body.tolerance = parseDecimal(document.getElementById('new-tolerance').value);
    }
    return body;
}

// conferências só para ajudar quem está preenchendo; as regras de verdade (peso positivo, mínimo de 2 alternativas...) quem garante é a API
function findFormProblem(type, body) {
    if (body.statement === '') {
        return 'Escreva o enunciado.';
    }
    if (Number.isNaN(body.weightPoints)) {
        return 'Digite o peso em número, por exemplo 2 ou 1,5.';
    }
    if (type === 'multiple_choice' && !body.choices.some((choice) => choice.isCorrect)) {
        return 'Marque qual alternativa é a correta (a bolinha ao lado dela).';
    }
    if (type === 'true_false' && body.correctAnswer === null) {
        return 'Escolha se a resposta correta é Verdadeiro ou Falso.';
    }
    if (type === 'numeric' && (Number.isNaN(body.numericAnswer) || Number.isNaN(body.tolerance))) {
        return 'Digite a resposta correta e a margem em número.';
    }
    return null;
}

async function createQuestion() {
    const type = selectedType();
    const body = buildQuestionBody(type);
    const problem = findFormProblem(type, body);

    if (problem) {
        showMessage(questionFormMessage, problem, 'error');
        return;
    }

    createQuestionButton.disabled = true;
    showMessage(questionFormMessage, 'Cadastrando...');

    try {
        const created = await api('POST', CREATE_ENDPOINTS[type], body);
        newStatement.value = '';
        newWeight.value = '';
        renderTypeFields();
        showMessage(questionFormMessage, `✓ Questão cadastrada: "${created.statement}". Ela já aparece para os alunos na próxima prova.`, 'success');
        await loadQuestionsTable();
    } catch (error) {
        showMessage(questionFormMessage, error.message, 'error');
    } finally {
        createQuestionButton.disabled = false;
    }
}

// ---------- regras da API ----------

// um id que tem formato de UUID mas não existe no banco, para os testes de 404
const MISSING_ID = '00000000-0000-0000-0000-000000000000';

const RULE_GROUPS = {
    business: 'Regras de negócio (services e entidades)',
    validation: 'Validação dos dados (DTOs + ValidationPipe)',
    notFound: 'Coisas que não existem (404)',
    known: 'Limitação conhecida (backlog)',
};

// cada regra diz: o pedido proibido que vamos mandar, a resposta esperada e onde ela está no código da API.
// "needs" é o dado do banco que o teste precisa (por exemplo, uma prova já enviada), e "uses" explica em português qual dado foi usado
const RULES = [
    {
        group: 'business',
        title: 'Responder uma prova que já foi enviada',
        where: 'Attempt.canAcceptAnswers() e AttemptsService.saveAnswer',
        expected: 400,
        needs: 'submittedAttempt',
        uses: (ctx) => `A prova de ${ctx.submittedAttempt.studentName}, que já foi enviada em ${formatDate(ctx.submittedAttempt.submittedAt)}. A página tenta mandar mais uma resposta para ela.`,
        build: (ctx) => ({
            method: 'PUT',
            path: `/attempts/${ctx.submittedAttempt.id}/answers`,
            body: { questionId: ctx.anyQuestion.id, rawValue: '1' },
        }),
    },
    {
        group: 'business',
        title: 'Enviar a mesma prova duas vezes',
        where: 'Attempt.submit() e AttemptsService.submit',
        expected: 400,
        needs: 'submittedAttempt',
        uses: (ctx) => `A prova de ${ctx.submittedAttempt.studentName}, que já foi enviada em ${formatDate(ctx.submittedAttempt.submittedAt)}. A página tenta enviar de novo.`,
        build: (ctx) => ({ method: 'POST', path: `/attempts/${ctx.submittedAttempt.id}/submit` }),
    },
    {
        group: 'business',
        title: 'Corrigir uma resposta antes de a prova ser enviada',
        where: 'AttemptsService.gradeAnswer',
        expected: 400,
        needs: 'openAnswer',
        uses: (ctx) => `Uma resposta da prova de ${ctx.openAnswer.attempt.studentName}, que ainda está em andamento (não foi enviada).`,
        build: (ctx) => ({ method: 'PATCH', path: `/answers/${ctx.openAnswer.id}/grade`, body: { points: 0 } }),
    },
    {
        group: 'business',
        title: 'Corrigir à mão uma questão que se corrige sozinha',
        where: 'AttemptsService.gradeAnswer, com o isAutoGradable()',
        expected: 400,
        needs: 'autoAnswer',
        uses: (ctx) => `A resposta de ${ctx.autoAnswer.attempt.studentName} para "${ctx.autoAnswer.question.statement}" (${TYPE_LABELS[ctx.autoAnswer.question.question_type]}), que a API já corrige sozinha.`,
        build: (ctx) => ({ method: 'PATCH', path: `/answers/${ctx.autoAnswer.id}/grade`, body: { points: 0 } }),
    },
    {
        group: 'business',
        title: 'Dar uma nota maior que o peso da questão',
        where: 'AttemptsService.gradeAnswer',
        expected: 400,
        needs: 'essayAnswer',
        uses: (ctx) => `A resposta de ${ctx.essayAnswer.attempt.studentName} para a dissertativa "${ctx.essayAnswer.question.statement}", que vale ${formatPoints(ctx.essayAnswer.question.weightPoints)}. A página tenta dar ${formatNumber(ctx.essayAnswer.question.weightPoints + 10)}.`,
        build: (ctx) => ({
            method: 'PATCH',
            path: `/answers/${ctx.essayAnswer.id}/grade`,
            body: { points: ctx.essayAnswer.question.weightPoints + 10 },
        }),
    },
    {
        group: 'validation',
        title: 'Começar uma prova sem nome',
        where: 'StartAttemptDto, @IsNotEmpty',
        expected: 400,
        uses: () => 'Nenhum dado do banco. A página tenta criar uma prova nova com o nome vazio.',
        build: () => ({ method: 'POST', path: '/attempts', body: { studentName: '' } }),
    },
    {
        group: 'validation',
        title: 'Nome com mais de 120 letras',
        where: 'StartAttemptDto, @MaxLength(120)',
        expected: 400,
        uses: () => 'Nenhum dado do banco. A página tenta criar uma prova nova com um nome de 121 letras "A".',
        build: () => ({ method: 'POST', path: '/attempts', body: { studentName: 'A'.repeat(121) } }),
    },
    {
        group: 'validation',
        title: 'O aluno tentando mandar a própria nota (campo que não existe no DTO)',
        where: 'main.ts, ValidationPipe com whitelist e forbidNonWhitelisted',
        expected: 400,
        uses: () => 'Nenhum dado do banco. A página tenta criar uma prova nova já mandando junto "scorePoints": 10.',
        build: () => ({ method: 'POST', path: '/attempts', body: { studentName: 'Aluno Esperto', scorePoints: 10 } }),
    },
    {
        group: 'validation',
        title: 'Responder com um id de questão que não é um UUID',
        where: 'SaveAnswerDto, @IsUUID',
        expected: 400,
        uses: () => 'Nenhum dado do banco. O id da questão enviado é "abc", que não tem o formato de um id.',
        build: () => ({ method: 'PUT', path: `/attempts/${MISSING_ID}/answers`, body: { questionId: 'abc', rawValue: '1' } }),
    },
    {
        group: 'validation',
        title: 'Dar nota negativa',
        where: 'GradeAnswerDto, @Min(0)',
        expected: 400,
        needs: 'essayAnswer',
        uses: (ctx) => `A resposta de ${ctx.essayAnswer.attempt.studentName} para a dissertativa "${ctx.essayAnswer.question.statement}". A página tenta dar nota -1.`,
        build: (ctx) => ({ method: 'PATCH', path: `/answers/${ctx.essayAnswer.id}/grade`, body: { points: -1 } }),
    },
    {
        group: 'validation',
        title: 'Cadastrar questão com peso negativo',
        where: 'CreateQuestionDto, @IsPositive',
        expected: 400,
        uses: () => 'Nenhum dado do banco. A página tenta cadastrar uma dissertativa com peso -1.',
        build: () => ({ method: 'POST', path: '/questions/essay', body: { statement: 'Teste', weightPoints: -1 } }),
    },
    {
        group: 'validation',
        title: 'Múltipla escolha com uma alternativa só',
        where: 'CreateMultipleChoiceQuestionDto, @ArrayMinSize(2)',
        expected: 400,
        uses: () => 'Nenhum dado do banco. A página tenta cadastrar uma múltipla escolha com uma única alternativa.',
        build: () => ({
            method: 'POST',
            path: '/questions/multiple-choice',
            body: { statement: 'Teste', weightPoints: 1, choices: [{ text: 'Única', isCorrect: true }] },
        }),
    },
    {
        group: 'notFound',
        title: 'Buscar uma tentativa que não existe',
        where: 'AttemptQueryService.listById',
        expected: 404,
        uses: () => `Um código de tentativa que não existe no banco (${MISSING_ID}).`,
        build: () => ({ method: 'GET', path: `/attempts/${MISSING_ID}` }),
    },
    {
        group: 'notFound',
        title: 'Responder uma questão que não existe',
        where: 'AttemptsService.saveAnswer',
        expected: 404,
        needs: 'openAttempt',
        uses: (ctx) => `A prova de ${ctx.openAttempt.studentName}, que está em andamento, e um código de questão que não existe no banco.`,
        build: (ctx) => ({
            method: 'PUT',
            path: `/attempts/${ctx.openAttempt.id}/answers`,
            body: { questionId: MISSING_ID, rawValue: '1' },
        }),
    },
    {
        group: 'notFound',
        title: 'Corrigir uma resposta que não existe',
        where: 'AttemptsService.gradeAnswer',
        expected: 404,
        uses: () => `Um código de resposta que não existe no banco (${MISSING_ID}).`,
        build: () => ({ method: 'PATCH', path: `/answers/${MISSING_ID}/grade`, body: { points: 1 } }),
    },
    {
        group: 'known',
        title: 'Começar uma segunda prova com outra ainda aberta (RN03)',
        where: 'índice UX_attempts_open_per_student, na migration',
        expected: 500,
        note: 'O banco recusa, então nada é gravado, mas a API ainda não traduz esse erro para 400. Está no backlog (extra da RN03).',
        needs: 'openAttempt',
        uses: (ctx) => `${ctx.openAttempt.studentName} já tem uma prova em andamento. A página tenta começar outra com o mesmo nome.`,
        build: (ctx) => ({ method: 'POST', path: '/attempts', body: { studentName: ctx.openAttempt.studentName } }),
    },
];

let rulesContext = null;

// procura no banco os dados que os testes precisam: uma prova enviada, uma aberta, uma resposta automática e uma dissertativa.
// Cada resposta guarda junto a tentativa de onde veio, para o cartão poder dizer de quem ela é
async function prepareRulesContext() {
    const allQuestions = await api('GET', '/questions');
    const attempts = await api('GET', '/attempts');
    const submitted = attempts.filter((attempt) => attempt.submittedAt !== null && attempt.answers.length > 0);
    const open = attempts.filter((attempt) => attempt.submittedAt === null);
    const openWithAnswer = open.find((attempt) => attempt.answers.length > 0);

    const ctx = {
        anyQuestion: allQuestions[0] ?? null,
        submittedAttempt: submitted[0] ?? null,
        openAttempt: open[0] ?? null,
        openAnswer: openWithAnswer ? { ...openWithAnswer.answers[0], attempt: openWithAnswer } : null,
        autoAnswer: null,
        essayAnswer: null,
    };

    // o GET /attempts não traz o tipo da questão de cada resposta, por isso abrimos as provas enviadas até achar as duas
    for (const attempt of submitted) {
        if (ctx.autoAnswer && ctx.essayAnswer) {
            break;
        }
        const detail = await api('GET', `/attempts/${attempt.id}`);
        const auto = detail.answers.find((answer) => answer.question.question_type !== 'essay');
        const essay = detail.answers.find((answer) => answer.question.question_type === 'essay');

        if (!ctx.autoAnswer && auto) {
            ctx.autoAnswer = { ...auto, attempt: detail };
        }
        if (!ctx.essayAnswer && essay) {
            ctx.essayAnswer = { ...essay, attempt: detail };
        }
    }
    return ctx;
}

async function openRulesScreen() {
    showScreen('rules-screen');
    showMessage(rulesMessage, 'Procurando no banco os dados para os testes...');

    try {
        rulesContext = await prepareRulesContext();
        renderRules();
        showMessage(rulesMessage, '');
    } catch (error) {
        showMessage(rulesMessage, error.message, 'error');
    }
}

function renderRules() {
    let html = '';

    for (const [group, groupTitle] of Object.entries(RULE_GROUPS)) {
        html += `<h3 class="rules-group">${groupTitle}</h3>`;

        RULES.forEach((rule, index) => {
            if (rule.group === group) {
                html += renderRuleCard(rule, index);
            }
        });
    }
    rulesList.innerHTML = html;
}

function renderRuleCard(rule, index) {
    const missingData = rule.needs && !rulesContext[rule.needs];
    const call = missingData ? null : rule.build(rulesContext);

    return `
        <article class="card rule">
            <div class="rule-top">
                <h3>${escapeHtml(rule.title)}</h3>
                <button class="small" data-rule="${index}" ${missingData ? 'disabled' : ''}>Testar</button>
            </div>
            ${missingData ? '' : `<p class="rule-uses"><strong>Dados usados:</strong> ${escapeHtml(rule.uses(rulesContext))}</p>`}
            <p class="rule-meta">
                ${call ? `<span class="method method-${call.method.toLowerCase()}">${call.method}</span> <code>${escapeHtml(shortenIds(call.path))}</code>` : ''}
                · espera <strong>${rule.expected}</strong> · regra em <code>${escapeHtml(rule.where)}</code>
            </p>
            ${call && call.body ? `<p class="rule-meta">Corpo enviado: <code>${escapeHtml(shortenIds(JSON.stringify(call.body)))}</code></p>` : ''}
            ${rule.note ? `<p class="rule-meta">${escapeHtml(rule.note)}</p>` : ''}
            <div class="rule-result" id="rule-result-${index}">
                ${missingData ? '<span class="hint">Não há dados no banco para este teste.</span>' : ''}
            </div>
        </article>`;
}

const ruleRuns = {};   // quantas vezes cada regra já foi testada

async function runRule(index) {
    const rule = RULES[index];
    const call = rule.build(rulesContext);
    const resultBox = document.getElementById(`rule-result-${index}`);
    const button = rulesList.querySelector(`button[data-rule="${index}"]`);

    button.disabled = true;
    button.textContent = 'Testando...';
    resultBox.innerHTML = '<span class="hint">Testando...</span>';

    try {
        // a API responde em poucos milissegundos e a resposta é sempre igual; a espera mínima dá tempo de ver que testou de novo
        const [result] = await Promise.all([
            request(call.method, call.path, call.body),
            new Promise((resolve) => setTimeout(resolve, 400)),
        ]);
        const asExpected = result.status === rule.expected;
        const verdict = asExpected
            ? (rule.group === 'known' ? '✓ Comportamento atual, já conhecido.' : '✓ A API barrou, como esperado.')
            : `⚠ Esperava ${rule.expected}, mas veio ${result.status}.`;

        ruleRuns[index] = (ruleRuns[index] ?? 0) + 1;
        const time = new Date().toLocaleTimeString('pt-BR');

        resultBox.innerHTML = `
            <span class="http-status ${statusClass(result.status)}">${result.status}</span>
            <span class="rule-answer">${escapeHtml(errorMessage(result))}</span>
            <p class="rule-verdict ${asExpected ? 'ok' : 'warn'}">${verdict}</p>
            <p class="rule-when">Testado às ${time} · ${ruleRuns[index]}ª vez</p>`;

        // tira e põe a classe de novo para a animação de destaque rodar a cada teste
        resultBox.classList.remove('flash');
        void resultBox.offsetWidth;
        resultBox.classList.add('flash');
    } catch (error) {
        resultBox.innerHTML = `<p class="rule-verdict warn">${escapeHtml(error.message)}</p>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Testar de novo';
    }
}

// uma de cada vez, para o painel de chamadas mostrar em ordem
async function runAllRules() {
    runAllRulesButton.disabled = true;

    for (const button of rulesList.querySelectorAll('button[data-rule]:not([disabled])')) {
        await runRule(Number(button.dataset.rule));
    }
    runAllRulesButton.disabled = false;
}

// ---------- painel de chamadas à API ----------

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// encurta os ids para caber na tela: E534A286-23BC-F111-... vira E534A286…
function shortenIds(text) {
    return text.replace(UUID_PATTERN, (id) => `${id.slice(0, 8)}…`);
}

function statusClass(status) {
    if (status === null || status >= 500) {
        return 's5xx';
    }
    return status >= 400 ? 's4xx' : 's2xx';
}

function logCall(method, path, status, milliseconds) {
    apiCalls.unshift({ method: method, path: path, status: status, milliseconds: Math.round(milliseconds) });
    apiCalls = apiCalls.slice(0, 30);
    renderApiLog();
}

function renderCall(call) {
    return `
        <span class="method method-${call.method.toLowerCase()}">${call.method}</span>
        <code class="api-log-path">${escapeHtml(shortenIds(call.path))}</code>
        <span class="http-status ${statusClass(call.status)}">${call.status ?? 'sem resposta'}</span>
        <span class="api-log-ms">${call.milliseconds} ms</span>`;
}

function renderApiLog() {
    apiLogLast.innerHTML = apiCalls.length > 0 ? renderCall(apiCalls[0]) : 'Nenhuma chamada ainda';
    apiLogList.innerHTML = apiCalls.map((call) => `<li>${renderCall(call)}</li>`).join('');
}

function toggleApiLog() {
    const opening = apiLogList.hidden;
    apiLogList.hidden = !opening;
    apiLogToggle.setAttribute('aria-expanded', String(opening));
    apiLogArrow.textContent = opening ? '▼' : '▲';
}

// ---------- ligando os botões ----------

navStudent.addEventListener('click', openStudentArea);
navTeacher.addEventListener('click', () => {
    showScreen('teacher-screen');
    showTeacherTab(teacherTab);
});
tabAttempts.addEventListener('click', () => showTeacherTab('attempts'));
tabQuestions.addEventListener('click', () => showTeacherTab('questions'));
onlyPending.addEventListener('change', renderAttemptsTable);

navRules.addEventListener('click', openRulesScreen);
runAllRulesButton.addEventListener('click', runAllRules);
rulesList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-rule]');
    if (button) {
        runRule(Number(button.dataset.rule));
    }
});

apiLogToggle.addEventListener('click', toggleApiLog);

typePicker.addEventListener('change', () => {
    renderTypeFields();
    showMessage(questionFormMessage, '');
});

// botões das alternativas: adicionar uma linha nova ou remover uma (mínimo de 2, como pede a API)
typeFields.addEventListener('click', (event) => {
    if (event.target.id === 'add-choice-button') {
        const rows = document.getElementById('choice-rows');
        rows.insertAdjacentHTML('beforeend', renderChoiceRow(rows.children.length + 1));
        return;
    }

    const removeButton = event.target.closest('.remove-choice');
    if (removeButton && typeFields.querySelectorAll('.choice-row').length > 2) {
        removeButton.closest('.choice-row').remove();
    }
});

createQuestionButton.addEventListener('click', createQuestion);

loginButton.addEventListener('click', login);
studentNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        login();
    }
});
logoutButton.addEventListener('click', logout);
mainActionButton.addEventListener('click', startOrContinue);

myAttemptsList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-attempt-id]');
    if (button) {
        openMyAttempt(button);
    }
});

// um ouvinte só para a lista inteira, porque as questões são criadas depois que a página carrega
questionsList.addEventListener('change', (event) => {
    const questionId = event.target.dataset.questionId;
    if (!questionId) {
        return;
    }

    const question = questions.find((item) => item.id === questionId);
    const value = readAnswer(question);

    if (value === '') {
        if (savedValues[questionId] !== undefined) {
            setSaveStatus(question, 'Resposta vazia não é salva. A anterior continua valendo.', 'error');
        }
        return;
    }
    if (value !== queuedValues[questionId]) {
        queueSave(question, value);
    }
});

submitButton.addEventListener('click', submitQuiz);
backButton.addEventListener('click', backToHome);

refreshButton.addEventListener('click', async () => {
    await loadAttempts();
    if (openedAttempt !== null) {
        openAttempt(openedAttempt.id);
    }
});

attemptsTable.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-attempt-id]');
    if (button) {
        openAttempt(button.dataset.attemptId);
    }
});

attemptDetail.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-answer-id]');
    if (button) {
        gradeAnswer(button);
    }
});

// ---------- ao abrir a página ----------

// se a API ainda estiver ligando (ou desligada), tenta de novo a cada 3 segundos até conseguir
async function connect() {
    try {
        await loadQuestions();
        startInfo.textContent = `${questions.length} questões, valendo ${formatPoints(maxPoints())} no total.`;
        startInfo.className = 'hint';
    } catch (error) {
        startInfo.textContent = `${error.message} Tentando de novo...`;
        startInfo.className = 'hint error';
        setTimeout(connect, 3000);
    }
}

connect();
renderTypeFields();
studentNameInput.focus();
