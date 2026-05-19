/*
  ChromaAid - Guía técnica rápida

  Esta app es una PWA de apoyo cromático para personas con daltonismo.
  Funciona como una aplicación de una sola página: todas las pantallas viven
  en index.html y JavaScript muestra solo una sección a la vez con showScreen().

  Pantallas principales:
  - screen-login: inicio de sesión.
  - screen-register: registro de usuarios.
  - screen-recover: recuperación orientativa de cuenta.
  - screen-home: menú principal.
  - screen-intro-test, screen-test y screen-result: test de daltonismo.
  - screen-detect-color: detección de color con cámara o imagen.
  - screen-compare: comparación de accesibilidad entre dos colores.
  - screen-different-color: juego "Encuentra el color diferente".
  - screen-history: historial filtrable de resultados.

  Base de datos usada:
  - La app usa localStorage como base de datos local de demostración.
  - Usuarios: localStorage["chromaaid_users"].
  - Sesión activa: localStorage["chromaaid_session"].
  - Historial: localStorage["chromaaid_history"].

  Qué se guarda en historial:
  - Resultados del test de daltonismo.
  - Detecciones de color.
  - Comparaciones de colores.
  - Resultados del juego "Encuentra el color diferente".

  Nota de seguridad:
  localStorage sirve para una demo funcional local. Para producción real,
  conviene usar autenticación segura con backend o Firebase Authentication.
*/

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     VARIABLES GLOBALES
  ========================= */

  // Referencias generales para controlar pantallas y datos curiosos.
  const screens = document.querySelectorAll(".screen");
  const navButtons = document.querySelectorAll("[data-screen]");
  const funFactText = document.getElementById("fun-fact-text");
  const funFactCounter = document.getElementById("fun-fact-counter");

  // Claves usadas por localStorage para usuarios, sesión e historial.
  const USERS_KEY = "chromaaid_users";
  const SESSION_KEY = "chromaaid_session";
  const protectedScreens = new Set([
    "screen-home",
    "screen-intro-test",
    "screen-test",
    "screen-result",
    "screen-detect-color",
    "screen-compare",
    "screen-different-color",
    "screen-history"
  ]);

  const facts = [
    "El daltonismo afecta aproximadamente al 8% de los hombres y al 0.5% de las mujeres.",
    "El tipo más común de daltonismo es la dificultad para distinguir rojo y verde.",
    "Muchas personas con daltonismo no ven en blanco y negro, sino que confunden ciertos tonos.",
    "La iluminación puede cambiar la forma en que una persona percibe los colores.",
    "Algunas profesiones requieren pruebas de visión cromática.",
    "El daltonismo puede ser hereditario.",
    "Existen herramientas digitales que ayudan a identificar y comparar colores.",
    "Los colores rojo, verde, café y naranja suelen confundirse en algunos tipos de daltonismo.",
    "El daltonismo no siempre impide realizar actividades normales, pero puede requerir apoyo visual.",
    "Las pruebas tipo Ishihara ayudan a detectar posibles alteraciones en la percepción del color."
  ];

  const questions = [
    { image: "img/ishihara1.png", answer: "12", type: "normal" },
    { image: "img/ishihara2.png", answer: "8", type: "protanopia" },
    { image: "img/ishihara3.png", answer: "6", type: "deuteranopia" },
    { image: "img/ishihara4.png", answer: "29", type: "protanopia" },
    { image: "img/Ishihara5.png", answer: "57", type: "deuteranopia" },
    { image: "img/ishihara6.png", answer: "5", type: "protanopia" },
    { image: "img/Ishihara7.png", answer: "3", type: "deuteranopia" },
    { image: "img/Ishihara8.png", answer: "15", type: "normal" },
    { image: "img/ishihara9.png", answer: "74", type: "normal" },
    { image: "img/ishihara10.png", answer: "45", type: "tritanopia" }
  ];

  let factIndex = 0;
  let currentQuestion = 0;
  let correctCount = 0;
  let prot = 0;
  let deut = 0;
  let trit = 0;
  let normalErrors = 0;
  let incorrectCount = 0;
  let lastTestResult = null;
  let cameraStream = null;
  let compareCameraStream = null;
  let lastComparison = null;
  let lastDetection = null;
  let activeHistoryFilter = "all";
  let differentGame = null;
  let differentTimer = null;
  let lastDifferentResult = null;

  const startTestBtn = document.getElementById("start-test-btn");
  const questionTitle = document.getElementById("question-title");
  const testImage = document.getElementById("test-image");
  const answerInput = document.getElementById("answer-input");
  const nextQuestionBtn = document.getElementById("next-question-btn");
  const resultIcon = document.getElementById("result-icon");
  const resultMain = document.getElementById("result-main");
  const resultLevel = document.getElementById("result-level");
  const resultType = document.getElementById("result-type");
  const resultCorrect = document.getElementById("result-correct");
  const resultIncorrect = document.getElementById("result-incorrect");
  const resultPercentage = document.getElementById("result-percentage");
  const resultProgress = document.getElementById("result-progress");
  const resultExplanation = document.getElementById("result-explanation");
  const confusionList = document.getElementById("confusion-list");
  const recommendationList = document.getElementById("recommendation-list");
  const saveTestResultBtn = document.getElementById("save-test-result-btn");
  const repeatTestBtn = document.getElementById("repeat-test-btn");
  const viewRecommendationsBtn = document.getElementById("view-recommendations-btn");
  const colorAPicker = document.getElementById("color-a-picker");
  const colorBPicker = document.getElementById("color-b-picker");
  const colorAHexInput = document.getElementById("color-a-hex");
  const colorBHexInput = document.getElementById("color-b-hex");
  const colorASwatch = document.getElementById("color-a-swatch");
  const colorBSwatch = document.getElementById("color-b-swatch");
  const colorAName = document.getElementById("color-a-name");
  const colorBName = document.getElementById("color-b-name");
  const colorARgbLabel = document.getElementById("color-a-rgb");
  const colorBRgbLabel = document.getElementById("color-b-rgb");
  const colorAHexLabel = document.getElementById("color-a-hex-label");
  const colorBHexLabel = document.getElementById("color-b-hex-label");
  const compareCamera = document.getElementById("compare-camera");
  const compareCameraCanvas = document.getElementById("compare-camera-canvas");
  const compareStartCameraBtn = document.getElementById("compare-start-camera-btn");
  const compareCaptureBtn = document.getElementById("compare-capture-btn");
  const compareImageInput = document.getElementById("compare-image-input");
  const compareImageCanvas = document.getElementById("compare-image-canvas");
  const compareSourceMessage = document.getElementById("compare-source-message");
  const compareSummary = document.getElementById("compare-summary");
  const visualDifference = document.getElementById("visual-difference");
  const contrastRatioLabel = document.getElementById("contrast-ratio");
  const accessibilityScale = document.getElementById("accessibility-scale");
  const recommendationBox = document.getElementById("recommendation-box");
  const diagnosisTableBody = document.getElementById("diagnosis-table-body");
  const clearCompareBtn = document.getElementById("clear-compare-btn");
  const saveCompareBtn = document.getElementById("save-compare-btn");
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");
  const detectStartCameraBtn = document.getElementById("detect-start-camera-btn");
  const captureBtn = document.getElementById("capture-btn");
  const detectedColorText = document.getElementById("detected-color-text");
  const detectedColorBox = document.getElementById("detected-color-box");
  const detectImageInput = document.getElementById("detect-image-input");
  const detectImageCanvas = document.getElementById("detect-image-canvas");
  const detectedColorName = document.getElementById("detected-color-name");
  const detectedColorHex = document.getElementById("detected-color-hex");
  const detectedColorRgb = document.getElementById("detected-color-rgb");
  const detectConfidence = document.getElementById("detect-confidence");
  const detectExplanation = document.getElementById("detect-explanation");
  const visionCards = document.getElementById("vision-cards");
  const detectVisionTableBody = document.getElementById("detect-vision-table-body");
  const saveDetectionBtn = document.getElementById("save-detection-btn");
  const clearDetectionBtn = document.getElementById("clear-detection-btn");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const historySearch = document.getElementById("history-search");
  const historyFilterButtons = document.querySelectorAll("[data-history-filter]");
  const historyTotal = document.getElementById("history-total");
  const historyLastTest = document.getElementById("history-last-test");
  const historyLastDetection = document.getElementById("history-last-detection");
  const historyLatestResult = document.getElementById("history-latest-result");
  const historyTestList = document.getElementById("history-test-list");
  const historyDetectionList = document.getElementById("history-detection-list");
  const historyComparisonList = document.getElementById("history-comparison-list");
  const historyDifferentList = document.getElementById("history-different-list");
  const historyEmptyState = document.getElementById("history-empty-state");
  const modalDetalle = document.getElementById("modalDetalle");
  const modalTitulo = document.getElementById("modalTitulo");
  const modalBody = document.getElementById("modalBody");
  const closeHistoryDetailBtn = document.getElementById("close-history-detail-btn");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const recoverForm = document.getElementById("recover-form");
  const logoutBtn = document.getElementById("logout-btn");
  const homeSubtitle = document.getElementById("home-subtitle");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");
  const recoverMessage = document.getElementById("recover-message");
  const differentFamilySelect = document.getElementById("different-family");
  const differentDifficultySelect = document.getElementById("different-difficulty");
  const differentVisionSelect = document.getElementById("different-vision");
  const differentHelpToggle = document.getElementById("different-help-toggle");
  const differentGrid = document.getElementById("different-grid");
  const differentScore = document.getElementById("different-score");
  const differentLevel = document.getElementById("different-level");
  const differentTime = document.getElementById("temporizadorJuego");
  const differentFeedback = document.getElementById("different-feedback");
  const differentFinalScore = document.getElementById("different-final-score");
  const differentHits = document.getElementById("different-hits");
  const differentErrors = document.getElementById("different-errors");
  const differentResultText = document.getElementById("different-result-text");
  const newDifferentBtn = document.getElementById("new-different-btn");
  const saveDifferentBtn = document.getElementById("save-different-btn");
  const nivelActual = document.getElementById("nivelActual");
  const puntajeActual = document.getElementById("puntajeActual");
  const rondaActual = document.getElementById("rondaActual");
  const totalRondas = document.getElementById("totalRondas");
  const barraProgreso = document.getElementById("barraProgreso");
  const modalFinJuego = document.getElementById("modalFinJuego");
  const badgeResultado = document.getElementById("badgeResultado");
  const modalFinSubtitulo = document.getElementById("modalFinSubtitulo");
  const puntajeFinal = document.getElementById("puntajeFinal");
  const nivelFinal = document.getElementById("nivelFinal");
  const aciertosFinal = document.getElementById("aciertosFinal");
  const erroresFinal = document.getElementById("erroresFinal");
  const tiempoFinal = document.getElementById("tiempoFinal");
  const playAgainDifferentBtn = document.getElementById("play-again-different-btn");
  const saveFinalDifferentBtn = document.getElementById("save-final-different-btn");
  const finishMenuBtn = document.getElementById("finish-menu-btn");

  /* =========================
     BASE DE DATOS / LOCALSTORAGE
  ========================= */

  // Obtiene todos los usuarios registrados en esta demo local.
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  // Guarda el arreglo completo de usuarios en localStorage.
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Normaliza correos para comparar sin problemas por mayúsculas.
  function normalizeEmail(email) {
    return email.trim().toLowerCase();
  }

  // Codificación simple para demo. No debe usarse como seguridad real.
  function encodePassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
  }

  // Lee la sesión persistente del usuario activo.
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }

  // Guarda una sesión para mantener al usuario dentro de la app.
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      name: user.name,
      email: user.email,
      loggedAt: new Date().toISOString()
    }));
  }

  // Cierra sesión eliminando la clave de sesión.
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Indica si hay una sesión activa.
  function isLoggedIn() {
    return Boolean(getSession());
  }

  // Valida el formato básico de correo electrónico.
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Muestra mensajes de error o éxito en formularios.
  function setMessage(element, text, type = "error") {
    element.textContent = text;
    element.classList.remove("error", "success");
    if (text) {
      element.classList.add(type);
    }
  }

  /* =========================
     NAVEGACIÓN ENTRE PANTALLAS
  ========================= */

  // Actualiza el texto del Home con el nombre del usuario activo.
  function updateHomeUser() {
    const session = getSession();

    if (!session) {
      homeSubtitle.textContent = "Asistente de apoyo cromático para daltonismo";
      return;
    }

    homeSubtitle.textContent = `Hola, ${session.name}. Elige una herramienta para comenzar.`;
  }

  // Esta función muestra una pantalla y oculta las demás.
  // Recibe el id de la pantalla que se quiere mostrar.
  function showScreen(screenId) {
    const normalizedScreenId = screenId === "homeScreen" ? "screen-home" : screenId;
    const targetId = protectedScreens.has(normalizedScreenId) && !isLoggedIn()
      ? "screen-login"
      : normalizedScreenId;

    screens.forEach(screen => {
      const isActive = screen.id === targetId;
      screen.classList.toggle("active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
    });

    if (targetId !== "screen-detect-color") {
      stopCamera();
    }

    if (targetId !== "screen-compare") {
      stopCompareCamera();
    }

    if (targetId !== "screen-different-color" && differentGame && differentGame.started) {
      clearInterval(differentTimer);
      differentGame.started = false;
    }

    if (targetId === "screen-home") {
      updateHomeUser();
    }

    if (targetId === "screen-history") {
      renderHistory();
    }

    if (targetId === "screen-detect-color") {
      detectedColorText.textContent = "Activa la cámara o sube una imagen para comenzar.";
    }

    if (targetId === "screen-different-color") {
      prepararJuegoColorDiferente();
    }
  }

  window.showScreen = showScreen;

  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      showScreen(button.dataset.screen);
    });
  });

  /* =========================
     DATOS CURIOSOS
  ========================= */

  // Cambia automáticamente el dato curioso con una animación suave.
  if (funFactText) {
    let factTimer = null;

    function renderFact(index) {
      const factCard = funFactText.closest(".fun-fact-card");
      factCard.classList.remove("is-changing");
      void factCard.offsetWidth;
      factCard.classList.add("is-changing");
      funFactText.textContent = facts[index];
      funFactCounter.textContent = `Dato ${index + 1} de ${facts.length}`;
    }

    function showRandomFact() {
      let nextIndex = Math.floor(Math.random() * facts.length);

      if (nextIndex === factIndex) {
        nextIndex = (nextIndex + 1) % facts.length;
      }

      factIndex = nextIndex;
      renderFact(factIndex);
    }

    function restartFactTimer() {
      clearInterval(factTimer);
      factTimer = setInterval(showRandomFact, 8000);
    }

    renderFact(factIndex);
    restartFactTimer();
  }

  /* =========================
     LOGIN Y REGISTRO
  ========================= */

  // Registra un usuario nuevo, valida datos y evita correos repetidos.
  registerForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = normalizeEmail(document.getElementById("register-email").value);
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;
    const users = getUsers();

    if (!name) {
      setMessage(registerMessage, "Ingresa tu nombre completo.");
      return;
    }

    if (!email) {
      setMessage(registerMessage, "El correo no puede estar vacío.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage(registerMessage, "Ingresa un correo electrónico válido.");
      return;
    }

    if (!password) {
      setMessage(registerMessage, "La contraseña no puede estar vacía.");
      return;
    }

    if (password.length < 6) {
      setMessage(registerMessage, "La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage(registerMessage, "La confirmación no coincide con la contraseña.");
      return;
    }

    if (users.some(user => user.email === email)) {
      setMessage(registerMessage, "Ya existe una cuenta con ese correo.");
      return;
    }

    const newUser = {
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      name,
      email,
      password: encodePassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    registerForm.reset();
    setMessage(registerMessage, "");
    showScreen("screen-home");
  });

  // Inicia sesión validando correo y contraseña contra localStorage.
  loginForm.addEventListener("submit", event => {
    event.preventDefault();

    const email = normalizeEmail(document.getElementById("login-email").value);
    const password = document.getElementById("login-password").value;

    if (!email) {
      setMessage(loginMessage, "El correo no puede estar vacío.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage(loginMessage, "Ingresa un correo electrónico válido.");
      return;
    }

    if (!password) {
      setMessage(loginMessage, "La contraseña no puede estar vacía.");
      return;
    }

    if (password.length < 6) {
      setMessage(loginMessage, "La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    const user = getUsers().find(item =>
      item.email === email && item.password === encodePassword(password)
    );

    if (!user) {
      setMessage(loginMessage, "Correo o contraseña incorrectos.");
      return;
    }

    setSession(user);
    loginForm.reset();
    setMessage(loginMessage, "");
    showScreen("screen-home");
  });

  // Recuperación orientativa: solo verifica si el correo existe localmente.
  recoverForm.addEventListener("submit", event => {
    event.preventDefault();

    const email = normalizeEmail(document.getElementById("recover-email").value);

    if (!email) {
      setMessage(recoverMessage, "El correo no puede estar vacío.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage(recoverMessage, "Ingresa un correo electrónico válido.");
      return;
    }

    const exists = getUsers().some(user => user.email === email);

    if (exists) {
      setMessage(recoverMessage, "Cuenta encontrada. En esta demo local puedes crear una nueva cuenta si olvidaste la contraseña.", "success");
    } else {
      setMessage(recoverMessage, "No hay una cuenta registrada con ese correo.");
    }
  });

  // Cierra la sesión activa y regresa al login.
  logoutBtn.addEventListener("click", () => {
    clearSession();
    showScreen("screen-login");
  });

  /* =========================
     TEST DE DALTONISMO
  ========================= */

  // Carga la pregunta actual del test y prepara el campo de respuesta.
  function loadQuestion() {
    if (currentQuestion >= questions.length) {
      finishTest();
      return;
    }

    questionTitle.textContent = `Pregunta ${currentQuestion + 1} de ${questions.length}`;
    testImage.src = questions[currentQuestion].image;
    answerInput.value = "";
    answerInput.focus();
  }

  startTestBtn.addEventListener("click", () => {
    currentQuestion = 0;
    correctCount = 0;
    prot = 0;
    deut = 0;
    trit = 0;
    normalErrors = 0;
    incorrectCount = 0;
    lastTestResult = null;

    showScreen("screen-test");
    loadQuestion();
  });

  repeatTestBtn.addEventListener("click", () => {
    startTestBtn.click();
  });

  viewRecommendationsBtn.addEventListener("click", () => {
    document.getElementById("recommendations-section").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  saveTestResultBtn.addEventListener("click", () => {
    if (!lastTestResult) {
      return;
    }

    saveHistory(lastTestResult);
    saveTestResultBtn.textContent = "Resultado guardado";
  });

  nextQuestionBtn.addEventListener("click", checkAnswer);
  answerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      checkAnswer();
    }
  });

  // Revisa la respuesta actual y acumula patrones de error.
  function checkAnswer() {
    const userAnswer = answerInput.value.trim();

    if (!userAnswer) {
      answerInput.focus();
      return;
    }

    const question = questions[currentQuestion];

    if (userAnswer === question.answer) {
      correctCount++;
    } else {
      incorrectCount++;
      if (question.type === "normal") normalErrors++;
      if (question.type === "protanopia") prot++;
      if (question.type === "deuteranopia") deut++;
      if (question.type === "tritanopia") trit++;
    }

    currentQuestion++;
    loadQuestion();
  }

  // Finaliza el test, calcula el resultado orientativo y muestra el reporte.
  function finishTest() {
    const result = analyzeTestResult();
    renderTestResult(result);
    lastTestResult = {
      type: "test",
      date: new Date().toLocaleString(),
      score: `${result.correct}/${result.total}`,
      percentage: `${result.percentage}%`,
      diagnosis: result.mainResult,
      level: result.level,
      possibleType: result.possibleType,
      recommendations: result.recommendations
    };
    saveTestResultBtn.textContent = "Guardar resultado en historial";
    showScreen("screen-result");
  }

  // Analiza puntaje y tipos de error para generar una clasificación orientativa.
  function analyzeTestResult() {
    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    const patternCounts = [
      { key: "protanopia", label: "protanopia", count: prot },
      { key: "deuteranopia", label: "deuteranopia", count: deut },
      { key: "tritanopia", label: "tritanopia", count: trit }
    ].sort((a, b) => b.count - a.count);
    const topPattern = patternCounts[0];
    const tiedPatterns = patternCounts.filter(item => item.count === topPattern.count && item.count > 0);
    let possibleType = "Resultado no concluyente";
    let mainResult = "Resultado no concluyente";
    let level = "No concluyente";
    let icon = "?";

    if (correctCount >= 8 && incorrectCount <= 2) {
      possibleType = "Visión normal";
      mainResult = "No se detectaron indicios importantes de daltonismo";
      level = "Bajo";
      icon = "✓";
    } else if (incorrectCount <= 3 && topPattern.count < 2) {
      possibleType = "Daltonismo leve";
      mainResult = "Posibles indicios leves de dificultad para distinguir algunos colores";
      level = "Bajo";
      icon = "i";
    } else if (tiedPatterns.length > 1 || normalErrors >= 2) {
      possibleType = "Resultado no concluyente";
      mainResult = "Resultado orientativo no concluyente";
      level = "No concluyente";
      icon = "?";
    } else {
      possibleType = topPattern.label;
      mainResult = `Posibles indicios de ${topPattern.label}`;
      level = incorrectCount >= 6 ? "Alto" : "Medio";
      icon = "!";
    }

    if (incorrectCount >= 6 && possibleType !== "Resultado no concluyente" && possibleType !== "Visión normal") {
      possibleType = `${possibleType} con indicios severos`;
      mainResult = `Posibles indicios altos asociados a ${topPattern.label}`;
    } else if (incorrectCount >= 4 && level === "Medio") {
      possibleType = `${possibleType} con indicios moderados`;
    }

    return {
      total,
      correct: correctCount,
      incorrect: incorrectCount,
      percentage,
      mainResult,
      level,
      icon,
      possibleType,
      patterns: { protanopia: prot, deuteranopia: deut, tritanopia: trit, normal: normalErrors },
      explanation: getTestExplanation(possibleType, topPattern.key, level),
      confusions: getConfusionExamples(possibleType, topPattern.key),
      recommendations: getTestRecommendations(level)
    };
  }

  // Genera una explicación educativa según el patrón detectado.
  function getTestExplanation(possibleType, topPattern, level) {
    if (possibleType === "Visión normal") {
      return "Tus respuestas no muestran indicios importantes de alteración en la percepción del color dentro de esta prueba orientativa. Aun así, el resultado puede cambiar por iluminación, brillo de pantalla, calidad de imagen o cansancio visual.";
    }

    if (possibleType === "Resultado no concluyente") {
      return "El patrón de respuestas no apunta con claridad a un tipo específico de daltonismo. Puede deberse a iluminación, brillo de pantalla, dudas al responder o variaciones en las imágenes. Se recomienda repetir el test en mejores condiciones.";
    }

    const explanations = {
      protanopia: "La protanopia es una alteración en la percepción de tonos rojos. Las personas con este tipo de daltonismo pueden confundir rojos, verdes, cafés y algunos tonos oscuros.",
      deuteranopia: "La deuteranopia es una alteración en la percepción de tonos verdes. Las personas con este tipo de daltonismo pueden confundir verdes, rojos, cafés y algunos tonos naranjas.",
      tritanopia: "La tritanopia afecta la percepción de tonos azules y amarillos. Puede hacer que algunos azules, verdes, violetas o amarillos se perciban de forma parecida."
    };

    if (possibleType.includes("leve")) {
      return "El resultado muestra posibles indicios leves de dificultad cromática. Esto no representa un diagnóstico médico, pero puede ser útil repetir el test y usar herramientas de apoyo para confirmar si ciertas combinaciones de color generan confusión.";
    }

    return `${explanations[topPattern] || "El resultado sugiere posibles dificultades para distinguir ciertos tonos."} El nivel estimado es ${level.toLowerCase()}, por lo que se recomienda interpretarlo como resultado orientativo y consultar a un profesional si tienes dudas.`;
  }

  // Devuelve pares de colores que podrían confundirse según el resultado.
  function getConfusionExamples(possibleType, topPattern) {
    const base = {
      protanopia: ["Rojo / verde", "Rojo / café", "Naranja / verde", "Rosa / gris"],
      deuteranopia: ["Rojo / verde", "Verde / café", "Naranja / amarillo", "Rosa / gris"],
      tritanopia: ["Azul / morado", "Azul / verde", "Amarillo / rosa", "Naranja / amarillo"],
      default: ["Rojo / verde", "Verde / café", "Azul / morado", "Rosa / gris", "Naranja / amarillo"]
    };

    if (possibleType === "Visión normal") {
      return ["Rojo / verde", "Azul / morado", "Naranja / amarillo"];
    }

    return base[topPattern] || base.default;
  }

  // Lista recomendaciones responsables y no alarmistas para el usuario.
  function getTestRecommendations(level) {
    const recommendations = [
      "Realizar una evaluación visual con un optometrista u oftalmólogo.",
      "No usar este test como diagnóstico médico definitivo.",
      "Repetir el test en un lugar con buena iluminación.",
      "Evitar filtros de pantalla o brillo muy bajo.",
      "Usar herramientas de apoyo como detector de color y comparación de colores."
    ];

    if (level === "No concluyente") {
      recommendations.unshift("Repetir el test con calma antes de sacar conclusiones.");
    }

    return recommendations;
  }

  // Pinta el resultado final del test en la pantalla de reporte.
  function renderTestResult(result) {
    resultIcon.textContent = result.icon;
    resultMain.textContent = result.mainResult;
    resultLevel.textContent = `Nivel estimado: ${result.level}`;
    resultType.textContent = `Tipo orientativo: ${result.possibleType}`;
    resultCorrect.textContent = result.correct;
    resultIncorrect.textContent = result.incorrect;
    resultPercentage.textContent = `${result.percentage}%`;
    resultProgress.style.width = `${result.percentage}%`;
    resultExplanation.textContent = result.explanation;
    confusionList.innerHTML = result.confusions
      .map(item => `<div class="confusion-chip">${item}</div>`)
      .join("");
    recommendationList.innerHTML = result.recommendations
      .map(item => `<li>${item}</li>`)
      .join("");
  }

  /* =========================
     HISTORIAL
  ========================= */

  // Lee todos los registros guardados en el historial.
  function getHistory() {
    return JSON.parse(localStorage.getItem("chromaaid_history") || "[]");
  }

  // Guarda cualquier resultado: test, detección, comparación o juego.
  function saveHistory(item) {
    const history = getHistory();
    history.unshift({
      ...item,
      id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    });
    localStorage.setItem("chromaaid_history", JSON.stringify(history));
  }

  // Muestra el historial aplicando filtro, búsqueda y categorías.
  function renderHistory() {
    const history = getHistory();
    const query = historySearch.value.trim().toLowerCase();
    const normalized = history.map((item, index) => normalizeHistoryItem(item, index));
    const filtered = normalized.filter(item => {
      const matchesFilter = activeHistoryFilter === "all" || item.type === activeHistoryFilter;
      const matchesSearch = !query || item.searchText.includes(query);
      return matchesFilter && matchesSearch;
    });

    renderHistoryStats(normalized);
    renderHistoryCategory("test", filtered, historyTestList);
    renderHistoryCategory("detection", filtered, historyDetectionList);
    renderHistoryCategory("comparison", filtered, historyComparisonList);
    renderHistoryCategory("different", filtered, historyDifferentList);

    document.querySelectorAll("[data-history-category]").forEach(section => {
      const type = section.dataset.historyCategory;
      const hasItems = filtered.some(item => item.type === type);
      section.style.display = hasItems ? "grid" : "none";
    });

    historyEmptyState.style.display = filtered.length === 0 ? "block" : "none";
  }

  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("¿Seguro que deseas eliminar todo el historial?")) {
      localStorage.removeItem("chromaaid_history");
      closeHistoryDetail();
      renderHistory();
    }
  });

  historySearch.addEventListener("input", renderHistory);

  historyFilterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeHistoryFilter = button.dataset.historyFilter;
      historyFilterButtons.forEach(item => item.classList.toggle("active", item === button));
      renderHistory();
    });
  });

  closeHistoryDetailBtn.addEventListener("click", () => {
    closeHistoryDetail();
  });

  modalDetalle.addEventListener("click", event => {
    if (event.target === modalDetalle) {
      closeHistoryDetail();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modalDetalle.classList.contains("active")) {
      closeHistoryDetail();
    }
  });

  // Normaliza registros antiguos o nuevos para pintarlos igual.
  function normalizeHistoryItem(item, index) {
    const type = item.type === "gradient" ? "different" : item.type || "test";
    const id = item.id || String(index);
    const titleMap = {
      test: "Resultado del test",
      detection: "Detección de color",
      comparison: "Comparación de colores",
      different: "Encuentra el color diferente"
    };
    const iconMap = {
      test: "T",
      detection: "D",
      comparison: "C",
      different: "J"
    };
    const summary = getHistorySummary(item, type);
    const searchText = JSON.stringify(item).toLowerCase();

    return {
      ...item,
      id,
      type,
      title: titleMap[type] || "Registro",
      icon: iconMap[type] || "R",
      summary,
      searchText
    };
  }

  // Construye el texto corto que aparece en cada tarjeta del historial.
  function getHistorySummary(item, type) {
    if (type === "detection") {
      return `${item.name || "Color detectado"} - ${item.hex || "--"} - Confianza ${item.confidence || "--"}`;
    }

    if (type === "comparison") {
      return `${item.colorA || "--"} vs ${item.colorB || "--"} - ${item.confusedTypes || "Sin confusión destacada"}`;
    }

    if (type === "different") {
      return `${item.score || "--"} - Nivel ${item.levelReached || item.level || "--"} - ${item.hits || item.correct || 0} aciertos`;
    }

    return `${item.diagnosis || "Resultado del test"} - ${item.score || "--"} ${item.percentage ? `(${item.percentage})` : ""}`;
  }

  // Calcula estadísticas rápidas del historial.
  function renderHistoryStats(items) {
    const latestTest = items.find(item => item.type === "test");
    const latestDetection = items.find(item => item.type === "detection");
    const latest = items[0];

    historyTotal.textContent = items.length;
    historyLastTest.textContent = latestTest ? latestTest.date : "--";
    historyLastDetection.textContent = latestDetection ? latestDetection.date : "--";
    historyLatestResult.textContent = latest ? latest.summary : "--";
  }

  // Pinta una categoría de historial: test, detección, comparación o juego.
  function renderHistoryCategory(type, items, container) {
    const categoryItems = items.filter(item => item.type === type);
    container.innerHTML = categoryItems.map(item => `
      <article class="history-record-card">
        <div class="history-record-top">
          <div class="history-record-title">
            <span class="history-icon">${item.icon}</span>
            <div>
              <h4>${item.title}</h4>
              <p class="history-date">${item.date || "Sin fecha"}</p>
            </div>
          </div>
        </div>
        <p class="history-summary">${item.summary}</p>
        <div class="history-card-actions">
          <button class="history-small-btn" type="button" data-history-detail="${item.id}">Ver detalles</button>
          <button class="history-small-btn delete" type="button" data-history-delete="${item.id}">Eliminar</button>
        </div>
      </article>
    `).join("");

    container.querySelectorAll("[data-history-detail]").forEach(button => {
      button.addEventListener("click", () => showHistoryDetail(button.dataset.historyDetail));
    });

    container.querySelectorAll("[data-history-delete]").forEach(button => {
      button.addEventListener("click", () => deleteHistoryItem(button.dataset.historyDelete));
    });
  }

  // Abre el modal centrado con todos los detalles del registro seleccionado.
  function showHistoryDetail(id) {
    const item = getHistory()
      .map((entry, index) => normalizeHistoryItem(entry, index))
      .find(entry => entry.id === id);

    if (!item) return;

    modalTitulo.textContent = item.title;
    modalBody.innerHTML = buildHistoryDetail(item);
    modalDetalle.classList.add("active");
    modalDetalle.setAttribute("aria-hidden", "false");
  }

  // Cierra el modal de detalle del historial.
  function closeHistoryDetail() {
    modalDetalle.classList.remove("active");
    modalDetalle.setAttribute("aria-hidden", "true");
  }

  // Genera el HTML completo de detalles según el tipo de registro.
  function buildHistoryDetail(item) {
    if (item.type === "detection") {
      const simulations = item.simulations
        ? Object.entries(item.simulations).map(([type, value]) =>
          `<div class="detalle-item"><strong>${type}:</strong> ${value.name} (${value.hex})</div>`
        ).join("")
        : "";

      return `
        <div class="history-detail-grid">
          <div class="detalle-item"><strong>Color:</strong> ${item.name || "--"}</div>
          <div class="detalle-item"><strong>HEX:</strong> ${item.hex || "--"}</div>
          <div class="detalle-item"><strong>RGB:</strong> ${item.rgb || "--"}</div>
          <div class="detalle-item"><strong>Confianza:</strong> ${item.confidence || "--"}</div>
          <div class="detalle-item"><strong>Fecha:</strong> ${item.date || "--"}</div>
          ${simulations}
        </div>
      `;
    }

    if (item.type === "comparison") {
      return `
        <div class="history-detail-grid">
          <div class="detalle-item"><strong>Color A:</strong> ${item.colorA || "--"}</div>
          <div class="detalle-item"><strong>Color B:</strong> ${item.colorB || "--"}</div>
          <div class="detalle-item"><strong>Contraste:</strong> ${item.score || "--"}</div>
          <div class="detalle-item"><strong>Resultado:</strong> ${item.diagnosis || "--"}</div>
          <div class="detalle-item"><strong>Tipo donde puede confundirse:</strong> ${item.confusedTypes || "--"}</div>
          <div class="detalle-item"><strong>Recomendación:</strong> ${item.recommendation || "--"}</div>
          <div class="detalle-item"><strong>Fecha:</strong> ${item.date || "--"}</div>
        </div>
      `;
    }

    if (item.type === "different") {
      return `
        <div class="history-detail-grid">
          <div class="detalle-item"><strong>Tipo:</strong> Encuentra el color diferente</div>
          <div class="detalle-item"><strong>Puntaje:</strong> ${item.score || "--"}</div>
          <div class="detalle-item"><strong>Nivel alcanzado:</strong> ${item.levelReached || "--"}</div>
          <div class="detalle-item"><strong>Aciertos:</strong> ${item.hits || 0}</div>
          <div class="detalle-item"><strong>Errores:</strong> ${item.errors || 0}</div>
          <div class="detalle-item"><strong>Tiempo usado:</strong> ${item.timeUsed || "--"}</div>
          <div class="detalle-item"><strong>Modo de visión usado:</strong> ${item.visionMode || "--"}</div>
          <div class="detalle-item"><strong>Fecha:</strong> ${item.date || "--"}</div>
        </div>
      `;
    }

    return `
      <div class="history-detail-grid">
        <div class="detalle-item"><strong>Resultado:</strong> ${item.diagnosis || "--"}</div>
        <div class="detalle-item"><strong>Nivel estimado:</strong> ${item.level || "--"}</div>
        <div class="detalle-item"><strong>Puntaje:</strong> ${item.score || "--"} ${item.percentage ? `(${item.percentage})` : ""}</div>
        <div class="detalle-item"><strong>Tipo orientativo:</strong> ${item.possibleType || "--"}</div>
        <div class="detalle-item"><strong>Recomendaciones:</strong> ${(item.recommendations || []).join(" ") || "--"}</div>
        <div class="detalle-item"><strong>Fecha:</strong> ${item.date || "--"}</div>
        <div class="detalle-item"><strong>Aviso profesional:</strong> Este resultado es orientativo y no representa un diagnóstico médico. Para confirmar cualquier alteración en la percepción del color, se recomienda acudir con un optometrista u oftalmólogo.</div>
      </div>
    `;
  }

  // Elimina un registro individual del historial.
  function deleteHistoryItem(id) {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) {
      return;
    }

    const history = getHistory();
    const updated = history.filter((item, index) => (item.id || String(index)) !== id);
    localStorage.setItem("chromaaid_history", JSON.stringify(updated));
    closeHistoryDetail();
    renderHistory();
  }

  /* =========================
     COMPARACIÓN DE COLORES
  ========================= */

  // Valida códigos HEX de seis dígitos.
  function isValidHex(hex) {
    return /^#?[0-9a-fA-F]{6}$/.test(hex.trim());
  }

  // Asegura que el HEX tenga # y use mayúsculas.
  function normalizeHex(hex) {
    const clean = hex.trim().replace("#", "").toUpperCase();
    return `#${clean}`;
  }

  // Convierte un color HEX a RGB.
  function hexToRgb(hex) {
    const clean = normalizeHex(hex).replace("#", "");

    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16)
    };
  }

  // Convierte valores RGB a HEX.
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
      .map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  // Indica si las capturas de comparación se aplican a Color A o Color B.
  function getCompareTarget() {
    return document.querySelector('input[name="compare-target"]:checked').value;
  }

  // Actualiza Color A o Color B desde selector, HEX, cámara o imagen.
  function setCompareColor(target, hex) {
    if (!isValidHex(hex)) return false;

    const normalized = normalizeHex(hex);

    if (target === "a") {
      colorAPicker.value = normalized;
      colorAHexInput.value = normalized;
    } else {
      colorBPicker.value = normalized;
      colorBHexInput.value = normalized;
    }

    updateColorCards();
    return true;
  }

  // Refresca las tarjetas visuales de Color A y Color B.
  function updateColorCards() {
    const colorA = hexToRgb(colorAPicker.value);
    const colorB = hexToRgb(colorBPicker.value);
    const hexA = normalizeHex(colorAPicker.value);
    const hexB = normalizeHex(colorBPicker.value);

    colorASwatch.style.background = hexA;
    colorBSwatch.style.background = hexB;
    colorAName.textContent = getColorName(colorA);
    colorBName.textContent = getColorName(colorB);
    colorARgbLabel.textContent = `RGB: ${colorA.r}, ${colorA.g}, ${colorA.b}`;
    colorBRgbLabel.textContent = `RGB: ${colorB.r}, ${colorB.g}, ${colorB.b}`;
    colorAHexLabel.textContent = `HEX: ${hexA}`;
    colorBHexLabel.textContent = `HEX: ${hexB}`;
  }

  // Calcula un nombre aproximado para un color RGB.
  function getColorName({ r, g, b }) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;

    if (delta < 18) {
      if (lightness < 55) return "Negro o gris oscuro";
      if (lightness > 205) return "Blanco o gris claro";
      return "Gris";
    }

    if (r > 200 && g > 170 && b < 90) return "Amarillo";
    if (r > 200 && g > 100 && b < 80) return "Naranja";
    if (r > g + 45 && r > b + 45) return "Rojo";
    if (g > r + 35 && g > b + 35) return "Verde";
    if (b > r + 35 && b > g + 20) return "Azul";
    if (r > 120 && b > 120 && g < 140) return "Morado";
    if (r > 150 && g > 80 && b > 110) return "Rosa";
    if (r > 100 && g > 70 && b < 80) return "Marrón";
    return "Color mixto";
  }

  // Mide la distancia visual aproximada entre dos colores.
  function colorDistance(colorA, colorB) {
    const redMean = (colorA.r + colorB.r) / 2;
    const red = colorA.r - colorB.r;
    const green = colorA.g - colorB.g;
    const blue = colorA.b - colorB.b;

    return Math.sqrt(
      (2 + redMean / 256) * red * red +
      4 * green * green +
      (2 + (255 - redMean) / 256) * blue * blue
    );
  }

  // Calcula luminancia relativa según fórmula usada por WCAG.
  function relativeLuminance({ r, g, b }) {
    const values = [r, g, b].map(value => {
      const channel = value / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });

    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }

  // Calcula contraste WCAG entre dos colores.
  function contrastRatio(colorA, colorB) {
    const lumA = relativeLuminance(colorA);
    const lumB = relativeLuminance(colorB);
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Convierte el contraste numérico en una etiqueta entendible.
  function getContrastLabel(ratio) {
    if (ratio < 3) return "Bajo contraste";
    if (ratio < 4.5) return "Contraste aceptable";
    return "Contraste recomendado";
  }

  // Clasifica la distancia visual entre colores.
  function getDistanceLabel(distance) {
    if (distance < 80) return "Muy similares";
    if (distance < 180) return "Medianamente distinguibles";
    return "Fácilmente distinguibles";
  }

  // Simula cómo se percibe un color con distintos tipos de daltonismo.
  function simulateColorBlindness({ r, g, b }, type) {
    const matrices = {
      normal: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
      deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
      tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
      monocromacia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114]
    };
    const matrix = matrices[type];

    return {
      r: matrix[0] * r + matrix[1] * g + matrix[2] * b,
      g: matrix[3] * r + matrix[4] * g + matrix[5] * b,
      b: matrix[6] * r + matrix[7] * g + matrix[8] * b
    };
  }

  // Sugiere un color alternativo cuando la combinación es poco distinguible.
  function recommendAlternative(colorA, colorB) {
    const candidates = [
      { name: "azul intenso", hex: "#0057D9" },
      { name: "morado profundo", hex: "#6A00A8" },
      { name: "amarillo accesible", hex: "#F2C94C" },
      { name: "cian oscuro", hex: "#007C89" },
      { name: "negro suave", hex: "#1F1F1F" },
      { name: "blanco", hex: "#FFFFFF" }
    ];

    const best = candidates
      .map(candidate => {
        const rgb = hexToRgb(candidate.hex);
        const worstDistance = Math.min(
          colorDistance(colorA, rgb),
          colorDistance(colorB, rgb),
          ...["protanopia", "deuteranopia", "tritanopia", "monocromacia"].map(type =>
            colorDistance(simulateColorBlindness(colorA, type), simulateColorBlindness(rgb, type))
          )
        );
        return { ...candidate, score: worstDistance };
      })
      .sort((a, b) => b.score - a.score)[0];

    return best;
  }

  // Construye las filas de diagnóstico por tipo de visión.
  function buildDiagnosis(colorA, colorB) {
    const visionTypes = [
      { key: "normal", label: "Normal" },
      { key: "protanopia", label: "Protanopia" },
      { key: "deuteranopia", label: "Deuteranopia" },
      { key: "tritanopia", label: "Tritanopia" },
      { key: "monocromacia", label: "Monocromacia" }
    ];

    return visionTypes.map(type => {
      const simulatedA = simulateColorBlindness(colorA, type.key);
      const simulatedB = simulateColorBlindness(colorB, type.key);
      const distance = colorDistance(simulatedA, simulatedB);
      const ratio = contrastRatio(simulatedA, simulatedB);
      const confused = distance < 95 || ratio < 2.4;

      return {
        type: type.label,
        key: type.key,
        colorA: rgbToHex(simulatedA.r, simulatedA.g, simulatedA.b),
        colorB: rgbToHex(simulatedB.r, simulatedB.g, simulatedB.b),
        result: confused ? "posible confusión" : "distinguible",
        confused
      };
    });
  }

  // Muestra la tabla de diagnóstico en pantalla.
  function renderDiagnosis(rows) {
    diagnosisTableBody.innerHTML = rows.map(row => `
      <tr>
        <td>${row.type}</td>
        <td><div class="table-swatch" style="background:${row.colorA}"></div></td>
        <td><div class="table-swatch" style="background:${row.colorB}"></div></td>
        <td>${row.result}</td>
      </tr>
    `).join("");
  }

  // Compara Color A y Color B usando distancia, contraste y simulaciones.
  function compareColors() {
    const colorA = hexToRgb(colorAPicker.value);
    const colorB = hexToRgb(colorBPicker.value);
    const distance = colorDistance(colorA, colorB);
    const ratio = contrastRatio(colorA, colorB);
    const diagnosis = buildDiagnosis(colorA, colorB);
    const riskyTypes = diagnosis
      .filter(row => row.confused && row.key !== "normal")
      .map(row => row.type);
    const distanceLabel = getDistanceLabel(distance);
    const contrastLabel = getContrastLabel(ratio);
    const recommendation = recommendAlternative(colorA, colorB);

    let summary = "Estos colores tienen buen contraste y son fáciles de diferenciar.";

    if (riskyTypes.length > 0) {
      summary = `Estos colores pueden confundirse para personas con ${riskyTypes.join(", ")}.`;
    } else if (distance < 120 || ratio < 3) {
      summary = "Estos colores pueden ser difíciles de distinguir. Se recomienda cambiar uno de los colores.";
    }

    compareSummary.textContent = summary;
    visualDifference.textContent = `${Math.round(distance)} - ${distanceLabel}`;
    contrastRatioLabel.textContent = `${ratio.toFixed(2)}:1`;
    accessibilityScale.textContent = contrastLabel;
    recommendationBox.textContent = riskyTypes.length > 0 || ratio < 3
      ? `Recomendación: cambia uno de los colores por ${recommendation.name} (${recommendation.hex}) para mejorar la separación visual.`
      : "Recomendación: la combinación actual es adecuada para una lectura visual general.";

    renderDiagnosis(diagnosis);

    lastComparison = {
      type: "comparison",
      date: new Date().toLocaleString(),
      colorA: normalizeHex(colorAPicker.value),
      colorB: normalizeHex(colorBPicker.value),
      score: `${ratio.toFixed(2)}:1`,
      diagnosis: summary,
      confusedTypes: riskyTypes.length ? riskyTypes.join(", ") : "Ninguno",
      recommendation: recommendation.hex
    };
  }

  // Restaura la herramienta de comparación a sus valores iniciales.
  function resetComparison() {
    setCompareColor("a", "#7B5BEF");
    setCompareColor("b", "#C9B8FF");
    compareSummary.textContent = "Presiona “Comparar colores” para analizar accesibilidad visual.";
    visualDifference.textContent = "--";
    contrastRatioLabel.textContent = "--";
    accessibilityScale.textContent = "--";
    recommendationBox.textContent = "La recomendación aparecerá después de comparar.";
    diagnosisTableBody.innerHTML = '<tr><td colspan="4">Sin comparación todavía.</td></tr>';
    compareSourceMessage.textContent = "Selecciona si quieres aplicar el color a A o B.";
    compareImageInput.value = "";
    compareImageCanvas.classList.remove("has-image");
    lastComparison = null;
  }

  colorAPicker.addEventListener("input", () => setCompareColor("a", colorAPicker.value));
  colorBPicker.addEventListener("input", () => setCompareColor("b", colorBPicker.value));

  colorAHexInput.addEventListener("input", () => {
    if (isValidHex(colorAHexInput.value)) setCompareColor("a", colorAHexInput.value);
  });

  colorBHexInput.addEventListener("input", () => {
    if (isValidHex(colorBHexInput.value)) setCompareColor("b", colorBHexInput.value);
  });

  document.getElementById("compare-btn").addEventListener("click", compareColors);
  clearCompareBtn.addEventListener("click", resetComparison);

  saveCompareBtn.addEventListener("click", () => {
    if (!lastComparison) {
      compareColors();
    }

    saveHistory(lastComparison);
    compareSourceMessage.textContent = "Comparación guardada en historial.";
  });

  compareStartCameraBtn.addEventListener("click", startCompareCamera);
  compareCaptureBtn.addEventListener("click", captureCompareCameraColor);

  compareImageInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const image = new Image();
    image.onload = () => {
      const maxWidth = compareImageCanvas.clientWidth || 560;
      const scale = Math.min(1, maxWidth / image.width);
      compareImageCanvas.width = image.width * scale;
      compareImageCanvas.height = image.height * scale;
      compareImageCanvas.classList.add("has-image");

      const ctx = compareImageCanvas.getContext("2d");
      ctx.drawImage(image, 0, 0, compareImageCanvas.width, compareImageCanvas.height);
      URL.revokeObjectURL(image.src);
      compareSourceMessage.textContent = "Toca la imagen para extraer un color.";
    };
    image.src = URL.createObjectURL(file);
  });

  compareImageCanvas.addEventListener("click", event => {
    const rect = compareImageCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (compareImageCanvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (compareImageCanvas.height / rect.height));
    const pixel = compareImageCanvas.getContext("2d").getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    setCompareColor(getCompareTarget(), hex);
    compareSourceMessage.textContent = `Color ${hex} aplicado a Color ${getCompareTarget().toUpperCase()}.`;
  });

  /* =========================
     JUEGO: ENCUENTRA EL COLOR DIFERENTE
  ========================= */

  // Convierte HSL a HEX para generar colores del juego.
  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  const differentFamilies = {
    azul: { hue: 214, saturation: 68, lightness: 56, label: "Azul" },
    rosa: { hue: 335, saturation: 78, lightness: 64, label: "Rosa" },
    morado: { hue: 270, saturation: 58, lightness: 58, label: "Morado" },
    verde: { hue: 132, saturation: 48, lightness: 48, label: "Verde" },
    rojo: { hue: 4, saturation: 76, lightness: 56, label: "Rojo" },
    amarillo: { hue: 48, saturation: 82, lightness: 60, label: "Amarillo" },
    gris: { hue: 0, saturation: 0, lightness: 58, label: "Gris" }
  };

  const differentDifficulty = {
    facil: { label: "Fácil", delta: 18 },
    medio: { label: "Medio", delta: 11 },
    dificil: { label: "Difícil", delta: 6 }
  };

  const maxDifferentRounds = 10;
  totalRondas.textContent = maxDifferentRounds;

  // Define el tamaño de la cuadrícula según el nivel actual.
  function getDifferentGridSize(level) {
    if (level <= 1) return 3;
    if (level === 2) return 4;
    if (level === 3) return 5;
    return 6;
  }

  // Crea un color base aleatorio dentro de la gama elegida.
  function createBaseColor() {
    const family = differentFamilies[differentFamilySelect.value];
    const lightnessJitter = Math.floor(Math.random() * 13) - 6;
    const hueJitter = Math.floor(Math.random() * 9) - 4;

    return hslToHex(
      (family.hue + hueJitter + 360) % 360,
      family.saturation,
      Math.max(24, Math.min(82, family.lightness + lightnessJitter))
    );
  }

  // Crea el color distinto, con diferencia según la dificultad.
  function createDifferentColor(baseHex) {
    const family = differentFamilies[differentFamilySelect.value];
    const difficulty = differentDifficulty[differentDifficultySelect.value];
    const baseLum = relativeLuminance(hexToRgb(baseHex));
    const direction = baseLum > 0.48 ? -1 : 1;
    const adjustedLightness = Math.max(18, Math.min(88, family.lightness + direction * difficulty.delta));
    const adjustedHue = family.saturation === 0
      ? family.hue
      : (family.hue + direction * Math.ceil(difficulty.delta / 2) + 360) % 360;

    return hslToHex(adjustedHue, family.saturation, adjustedLightness);
  }

  // Aplica la simulación de daltonismo seleccionada al color visible.
  function simulateHexForVision(hex) {
    const mode = differentVisionSelect.value;
    if (mode === "normal") return hex;

    const simulated = simulateColorBlindness(hexToRgb(hex), mode);
    return rgbToHex(simulated.r, simulated.g, simulated.b);
  }

  function formatDifferentTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }

  // Deja el reto listo, sin temporizador ni cuadrícula jugable.
  function prepareDifferentGame() {
    clearInterval(differentTimer);
    closeDifferentFinalModal();
    differentGame = {
      level: 1,
      score: 0,
      hits: 0,
      errors: 0,
      attemptsThisRound: 0,
      roundLocked: false,
      startedAt: null,
      elapsedSeconds: 0,
      started: false,
      finished: false,
      baseHex: "#7B5BEF",
      oddHex: "#6E4FD3",
      oddIndex: 0
    };

    lastDifferentResult = null;
    saveDifferentBtn.textContent = "Guardar resultado en historial";
    saveFinalDifferentBtn.textContent = "Guardar resultado";
    differentResultText.textContent = "El resultado aparecerá cuando termines o guardes la partida.";
    differentFinalScore.textContent = "--";
    differentHits.textContent = "0";
    differentErrors.textContent = "0";
    differentScore.textContent = "0";
    differentLevel.textContent = "1";
    differentTime.textContent = "00:00";
    puntajeActual.textContent = "0";
    nivelActual.textContent = "1";
    rondaActual.textContent = "0";
    barraProgreso.style.width = "0%";
    differentFeedback.textContent = "Presiona Iniciar juego para comenzar el reto.";
    differentGrid.style.gridTemplateColumns = "";
    differentGrid.classList.remove("locked");
    differentGrid.classList.add("waiting");
    differentGrid.innerHTML = `
      <div class="game-start-card">
        <h3>¿Lista para comenzar?</h3>
        <p>Toca el cuadro con el color diferente. El tiempo empezará cuando presiones iniciar.</p>
        <button id="start-different-game-btn" class="primary-btn" type="button">Iniciar juego</button>
      </div>
    `;

    const startDifferentGameBtn = document.getElementById("start-different-game-btn");
    startDifferentGameBtn.addEventListener("click", iniciarJuegoColorDiferente);
  }

  // Inicia o reinicia el juego desde el nivel 1.
  function startDifferentGame() {
    clearInterval(differentTimer);
    closeDifferentFinalModal();
    differentGame = {
      level: 1,
      score: 0,
      hits: 0,
      errors: 0,
      attemptsThisRound: 0,
      roundLocked: false,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      started: true,
      finished: false,
      baseHex: "#7B5BEF",
      oddHex: "#6E4FD3",
      oddIndex: 0
    };
    lastDifferentResult = null;
    saveDifferentBtn.textContent = "Guardar resultado en historial";
    saveFinalDifferentBtn.textContent = "Guardar resultado";
    differentResultText.textContent = "El resultado aparecerá cuando termines o guardes la partida.";
    differentFinalScore.textContent = "--";
    differentFeedback.textContent = "Encuentra el cuadro con el tono ligeramente diferente.";
    differentGrid.classList.remove("locked", "waiting");
    differentTime.textContent = "00:00";
    updateDifferentTimer();
    updateDifferentProgress();
    differentTimer = setInterval(updateDifferentTimer, 1000);
    generateDifferentGrid();
  }

  function prepararJuegoColorDiferente() {
    prepareDifferentGame();
  }

  function iniciarJuegoColorDiferente() {
    startDifferentGame();
  }

  // Genera una nueva ronda: cuadrícula, color base y cuadro distinto.
  function generateDifferentGrid() {
    if (!differentGame || !differentGame.started) return;

    const size = getDifferentGridSize(differentGame.level);
    const total = size * size;

    differentGame.baseHex = createBaseColor();
    differentGame.oddHex = createDifferentColor(differentGame.baseHex);
    differentGame.oddIndex = Math.floor(Math.random() * total);
    differentGame.attemptsThisRound = 0;
    differentGame.roundLocked = false;
    differentGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    renderDifferentGrid();
    updateDifferentStats();
  }

  // Renderiza los cuadros del reto y activa el modo ayuda si corresponde.
  function renderDifferentGrid() {
    if (!differentGame || !differentGame.started) return;

    const size = getDifferentGridSize(differentGame.level);
    const total = size * size;
    const helpActive = differentHelpToggle.checked || differentGame.attemptsThisRound >= 2;
    const baseDisplay = simulateHexForVision(differentGame.baseHex);
    const oddDisplay = simulateHexForVision(differentGame.oddHex);

    differentGrid.innerHTML = Array.from({ length: total }, (_, index) => {
      const isOdd = index === differentGame.oddIndex;
      const color = isOdd ? oddDisplay : baseDisplay;
      return `
        <button class="different-tile ${helpActive && isOdd ? "hint" : ""}" type="button" data-index="${index}" style="background:${color}" aria-label="Cuadro ${index + 1}">
          ${helpActive && isOdd ? '<span class="different-hint-label">?</span>' : ""}
        </button>
      `;
    }).join("");

    differentGrid.querySelectorAll(".different-tile").forEach(tile => {
      tile.addEventListener("click", () => validateDifferentAnswer(Number(tile.dataset.index)));
    });
  }

  // Valida si el usuario tocó el cuadro diferente.
  function validateDifferentAnswer(index) {
    if (!differentGame || !differentGame.started || differentGame.finished || differentGame.roundLocked) return;

    const tile = differentGrid.querySelector(`[data-index="${index}"]`);
    const isCorrect = index === differentGame.oddIndex;

    if (isCorrect) {
      differentGame.roundLocked = true;
      differentGame.hits++;
      differentGame.score += Math.max(5, 20 - differentGame.attemptsThisRound * 4);
      tile.classList.add("correct");
      differentFeedback.textContent = "Correcto. Pasas al siguiente nivel.";
      setTimeout(nextDifferentLevel, 450);
      return;
    }

    differentGame.errors++;
    differentGame.attemptsThisRound++;
    tile.classList.add("wrong");
    differentFeedback.textContent = differentGame.attemptsThisRound >= 2
      ? "Pista activada: busca el borde punteado o la etiqueta."
      : "Ese no era. Observa brillo, saturación y bordes.";
    updateDifferentStats();
    setTimeout(renderDifferentGrid, 350);
  }

  // Avanza de ronda o finaliza el juego al llegar al máximo.
  function nextDifferentLevel() {
    if (!differentGame || !differentGame.started) return;

    if (differentGame.level >= maxDifferentRounds) {
      finishDifferentGame();
      return;
    }

    differentGame.level++;
    generateDifferentGrid();
  }

  // Actualiza puntaje, nivel, aciertos y errores en pantalla.
  function updateDifferentStats() {
    if (!differentGame) return;

    differentScore.textContent = differentGame.score;
    differentLevel.textContent = differentGame.level;
    differentHits.textContent = differentGame.hits;
    differentErrors.textContent = differentGame.errors;
    updateDifferentProgress();
  }

  // Actualiza la barra de progreso y los contadores superiores.
  function updateDifferentProgress() {
    if (!differentGame) return;
    if (!differentGame.started && !differentGame.finished) {
      barraProgreso.style.width = "0%";
      rondaActual.textContent = "0";
      puntajeActual.textContent = "0";
      nivelActual.textContent = "1";
      return;
    }

    const progress = Math.min(100, (differentGame.level / maxDifferentRounds) * 100);
    barraProgreso.style.width = `${progress}%`;
    rondaActual.textContent = differentGame.level;
    puntajeActual.textContent = differentGame.score;
    nivelActual.textContent = differentGame.level;
  }

  // Actualiza el tiempo transcurrido de la partida.
  function updateDifferentTimer() {
    if (!differentGame || !differentGame.started || !differentGame.startedAt) {
      differentTime.textContent = "00:00";
      return;
    }

    const seconds = Math.floor((Date.now() - differentGame.startedAt) / 1000);
    differentGame.elapsedSeconds = seconds;
    differentTime.textContent = formatDifferentTime(seconds);
  }

  // Finaliza el juego, bloquea la cuadrícula y muestra el modal final.
  function finishDifferentGame() {
    if (!differentGame || !differentGame.started) return;

    differentGame.finished = true;
    differentGame.started = false;
    clearInterval(differentTimer);
    differentGrid.classList.add("locked");
    const seconds = Math.floor((Date.now() - differentGame.startedAt) / 1000);
    differentGame.elapsedSeconds = seconds;
    differentTime.textContent = formatDifferentTime(seconds);
    const message = differentGame.hits >= 7
      ? "Excelente desempeño. Identificaste diferencias de color muy sutiles."
      : "Buen intento. Este reto puede ser difícil cuando los tonos son muy parecidos.";

    differentFinalScore.textContent = differentGame.score;
    differentHits.textContent = differentGame.hits;
    differentErrors.textContent = differentGame.errors;
    differentResultText.textContent = `${message} Tiempo usado: ${formatDifferentTime(seconds)}.`;
    lastDifferentResult = buildDifferentHistoryResult(seconds, message);
    updateDifferentProgress();
    showDifferentFinalModal({
      puntaje: differentGame.score,
      nivel: differentGame.level,
      aciertos: differentGame.hits,
      errores: differentGame.errors,
      tiempo: formatDifferentTime(seconds),
      message
    });
  }

  // Muestra el modal centrado con puntaje y badge de desempeño.
  function showDifferentFinalModal(data) {
    puntajeFinal.textContent = data.puntaje;
    nivelFinal.textContent = data.nivel;
    aciertosFinal.textContent = data.aciertos;
    erroresFinal.textContent = data.errores;
    tiempoFinal.textContent = data.tiempo;

    let result = "bien";
    if (data.aciertos > data.errores * 2) result = "excelente";
    else if (data.errores > data.aciertos) result = "mejorable";

    const labels = {
      excelente: "🟢 EXCELENTE",
      bien: "🟡 BIEN",
      mejorable: "🔴 MEJORABLE"
    };

    badgeResultado.className = `resultado-badge ${result}`;
    badgeResultado.textContent = labels[result];
    modalFinSubtitulo.textContent = result === "mejorable" ? "Sigue practicando" : "Buen trabajo";
    modalFinJuego.classList.add("active");
    modalFinJuego.setAttribute("aria-hidden", "false");
  }

  // Cierra el modal final del juego.
  function closeDifferentFinalModal() {
    modalFinJuego.classList.remove("active");
    modalFinJuego.setAttribute("aria-hidden", "true");
  }

  // Construye el objeto que se guardará en historial.
  function buildDifferentHistoryResult(seconds, message) {
    return {
      type: "different",
      date: new Date().toLocaleString(),
      score: String(differentGame.score),
      levelReached: differentGame.level,
      hits: differentGame.hits,
      errors: differentGame.errors,
      timeUsed: formatDifferentTime(seconds),
      visionMode: differentVisionSelect.options[differentVisionSelect.selectedIndex].textContent,
      result: message
    };
  }

  differentFamilySelect.addEventListener("change", () => {
    if (differentGame && differentGame.started) startDifferentGame();
    else prepareDifferentGame();
  });
  differentDifficultySelect.addEventListener("change", () => {
    if (differentGame && differentGame.started) startDifferentGame();
    else prepareDifferentGame();
  });
  differentVisionSelect.addEventListener("change", renderDifferentGrid);
  differentHelpToggle.addEventListener("change", renderDifferentGrid);
  newDifferentBtn.addEventListener("click", prepareDifferentGame);
  saveDifferentBtn.addEventListener("click", () => {
    if (saveDifferentResult()) {
      saveDifferentBtn.textContent = "Resultado guardado";
    }
  });
  playAgainDifferentBtn.addEventListener("click", prepareDifferentGame);
  saveFinalDifferentBtn.addEventListener("click", () => {
    if (saveDifferentResult()) {
      saveFinalDifferentBtn.textContent = "Resultado guardado";
    }
  });
  finishMenuBtn.addEventListener("click", () => {
    closeDifferentFinalModal();
    showScreen("screen-home");
  });

  // Guarda el resultado del juego, terminado o en progreso.
  function saveDifferentResult() {
    if (!differentGame || !differentGame.startedAt) {
      differentResultText.textContent = "Inicia el juego antes de guardar un resultado.";
      return false;
    }

    if (!lastDifferentResult) {
      const seconds = differentGame.finished
        ? differentGame.elapsedSeconds
        : Math.floor((Date.now() - differentGame.startedAt) / 1000);
      lastDifferentResult = buildDifferentHistoryResult(seconds, "Partida guardada antes de finalizar.");
    }

    saveHistory(lastDifferentResult);
    return true;
  }

  /* =========================
     COMPARACIÓN DE COLORES - CÁMARA E IMAGEN
  ========================= */

  // Activa la cámara para capturar colores dentro de Comparar Colores.
  async function startCompareCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      compareSourceMessage.textContent = "La cámara no está disponible en este dispositivo.";
      return;
    }

    if (compareCameraStream) return;

    try {
      compareCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      compareCamera.srcObject = compareCameraStream;
      compareSourceMessage.textContent = "Cámara activa. Captura el color del centro de la imagen.";
    } catch (error) {
      compareSourceMessage.textContent = "No se pudo acceder a la cámara.";
    }
  }

  function captureCompareCameraColor() {
    if (!compareCamera.videoWidth || !compareCamera.videoHeight) {
      compareSourceMessage.textContent = "La cámara aún se está preparando.";
      return;
    }

    const ctx = compareCameraCanvas.getContext("2d");
    compareCameraCanvas.width = compareCamera.videoWidth;
    compareCameraCanvas.height = compareCamera.videoHeight;
    ctx.drawImage(compareCamera, 0, 0, compareCameraCanvas.width, compareCameraCanvas.height);

    const x = Math.floor(compareCameraCanvas.width / 2);
    const y = Math.floor(compareCameraCanvas.height / 2);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    setCompareColor(getCompareTarget(), hex);
    compareSourceMessage.textContent = `Color ${hex} capturado para Color ${getCompareTarget().toUpperCase()}.`;
  }

  function stopCompareCamera() {
    if (!compareCameraStream) return;

    compareCameraStream.getTracks().forEach(track => track.stop());
    compareCameraStream = null;
    compareCamera.srcObject = null;
  }

  /* =========================
     DETECCIÓN DE COLOR
  ========================= */

  // Obtiene el color promedio del centro de una cámara o imagen.
  function getAverageColorFromCenter(source, ctx, width, height) {
    const sampleSize = Math.max(8, Math.floor(Math.min(width, height) * 0.08));
    const x = Math.max(0, Math.floor(width / 2 - sampleSize / 2));
    const y = Math.max(0, Math.floor(height / 2 - sampleSize / 2));

    if (source) {
      ctx.drawImage(source, 0, 0, width, height);
    }

    const pixels = ctx.getImageData(x, y, sampleSize, sampleSize).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      r += pixels[index];
      g += pixels[index + 1];
      b += pixels[index + 2];
      count++;
    }

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }

  // Estima la confianza del color detectado según brillo y separación RGB.
  function getDetectionConfidence(rgb) {
    const spread = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;

    if (spread > 80 && brightness > 45 && brightness < 230) return "Alta";
    if (spread > 35 && brightness > 25 && brightness < 245) return "Media";
    return "Baja";
  }

  // Explica cómo podría variar el color bajo una condición de visión.
  function getVisionExplanation(original, simulated, type) {
    const distance = colorDistance(original, simulated);
    const simulatedName = getColorName(simulated);

    if (type === "normal") {
      return "Color original detectado por la cámara o imagen.";
    }

    if (type === "protanopia") {
      return distance > 85
        ? "Este color puede percibirse más apagado o con menos presencia de rojo en protanopia."
        : "Este color mantiene una apariencia relativamente cercana en protanopia.";
    }

    if (type === "deuteranopia") {
      return distance > 85
        ? `Este tono puede acercarse visualmente a ${simulatedName.toLowerCase()} en deuteranopia.`
        : "Este color mantiene buena diferencia visual en deuteranopia.";
    }

    if (type === "tritanopia") {
      return distance > 85
        ? "Este color puede cambiar su relación entre azules y amarillos en tritanopia."
        : "Este color mantiene buena diferencia visual en tritanopia.";
    }

    return "En monocromacia se percibe principalmente por luminosidad, sin información cromática.";
  }

  // Prepara las vistas normal/protanopia/deuteranopia/tritanopia/monocromacia.
  function buildDetectionViews(rgb) {
    return [
      { key: "normal", label: "Visión normal", rgb },
      { key: "protanopia", label: "Protanopia", rgb: simulateColorBlindness(rgb, "protanopia") },
      { key: "deuteranopia", label: "Deuteranopia", rgb: simulateColorBlindness(rgb, "deuteranopia") },
      { key: "tritanopia", label: "Tritanopia", rgb: simulateColorBlindness(rgb, "tritanopia") },
      { key: "monocromacia", label: "Monocromacia", rgb: simulateColorBlindness(rgb, "monocromacia") }
    ].map(view => ({
      ...view,
      hex: rgbToHex(view.rgb.r, view.rgb.g, view.rgb.b),
      name: getColorName(view.rgb),
      explanation: getVisionExplanation(rgb, view.rgb, view.key)
    }));
  }

  // Pinta en pantalla el color detectado, sus datos y simulaciones.
  function renderDetection(rgb, sourceLabel) {
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const name = getColorName(rgb);
    const confidence = getDetectionConfidence(rgb);
    const views = buildDetectionViews(rgb);

    detectedColorBox.style.background = hex;
    detectedColorName.textContent = name;
    detectedColorHex.textContent = `HEX: ${hex}`;
    detectedColorRgb.textContent = `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`;
    detectConfidence.textContent = `Confianza: ${confidence}`;
    detectedColorText.textContent = `${sourceLabel}: ${name} (${hex})`;
    detectExplanation.textContent = `${views[1].explanation} Esta simulación es aproximada y puede variar según la persona, la iluminación y la cámara del dispositivo.`;

    visionCards.innerHTML = views.map(view => `
      <article class="vision-card">
        <div class="vision-swatch" style="background:${view.hex}"></div>
        <div>
          <strong>${view.label}</strong>
          <span>${view.name} - ${view.hex}</span>
          <p>${view.explanation}</p>
        </div>
      </article>
    `).join("");

    detectVisionTableBody.innerHTML = views.map(view => `
      <tr>
        <td>${view.label}</td>
        <td>${view.name}</td>
        <td>${view.hex}</td>
        <td><div class="table-swatch" style="background:${view.hex}"></div></td>
      </tr>
    `).join("");

    lastDetection = {
      type: "detection",
      date: new Date().toLocaleString(),
      name,
      hex,
      rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      confidence,
      simulations: views.reduce((acc, view) => {
        acc[view.key] = {
          name: view.name,
          hex: view.hex
        };
        return acc;
      }, {})
    };
  }

  // Activa la cámara principal de Detectar Color.
  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      detectedColorText.textContent = "La cámara no está disponible en este dispositivo.";
      return;
    }

    if (cameraStream) return;

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      video.srcObject = cameraStream;
      detectedColorText.textContent = "Cámara activa. Toma el color del centro cuando estés listo.";
    } catch (error) {
      detectedColorText.textContent = "No se pudo acceder a la cámara.";
    }
  }

  // Detiene la cámara al cambiar de pantalla para liberar recursos.
  function stopCamera() {
    if (!cameraStream) return;

    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    video.srcObject = null;
  }

  detectStartCameraBtn.addEventListener("click", startCamera);

  captureBtn.addEventListener("click", () => {
    if (!video.videoWidth || !video.videoHeight) {
      detectedColorText.textContent = "La cámara aún se está preparando.";
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const rgb = getAverageColorFromCenter(video, ctx, canvas.width, canvas.height);

    renderDetection(rgb, "Color detectado desde cámara");
  });

  detectImageInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const image = new Image();
    image.onload = () => {
      const maxWidth = detectImageCanvas.clientWidth || 560;
      const scale = Math.min(1, maxWidth / image.width);
      detectImageCanvas.width = image.width * scale;
      detectImageCanvas.height = image.height * scale;
      detectImageCanvas.classList.add("has-image");

      const ctx = detectImageCanvas.getContext("2d");
      ctx.drawImage(image, 0, 0, detectImageCanvas.width, detectImageCanvas.height);
      URL.revokeObjectURL(image.src);
      detectedColorText.textContent = "Toca una zona de la imagen para detectar el color.";
    };
    image.src = URL.createObjectURL(file);
  });

  detectImageCanvas.addEventListener("click", event => {
    const rect = detectImageCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (detectImageCanvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (detectImageCanvas.height / rect.height));
    const ctx = detectImageCanvas.getContext("2d");
    const sampleSize = Math.max(6, Math.floor(Math.min(detectImageCanvas.width, detectImageCanvas.height) * 0.04));
    const sampleX = Math.max(0, Math.min(detectImageCanvas.width - sampleSize, x - Math.floor(sampleSize / 2)));
    const sampleY = Math.max(0, Math.min(detectImageCanvas.height - sampleSize, y - Math.floor(sampleSize / 2)));
    const pixels = ctx.getImageData(sampleX, sampleY, sampleSize, sampleSize).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      r += pixels[index];
      g += pixels[index + 1];
      b += pixels[index + 2];
      count++;
    }

    renderDetection({
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    }, "Color detectado desde imagen");
  });

  saveDetectionBtn.addEventListener("click", () => {
    if (!lastDetection) {
      detectedColorText.textContent = "Primero detecta un color para guardarlo.";
      return;
    }

    saveHistory(lastDetection);
    detectedColorText.textContent = "Detección guardada en historial.";
  });

  clearDetectionBtn.addEventListener("click", () => {
    lastDetection = null;
    detectedColorBox.style.background = "#DDDDDD";
    detectedColorName.textContent = "Sin color detectado";
    detectedColorHex.textContent = "HEX: --";
    detectedColorRgb.textContent = "RGB: --";
    detectConfidence.textContent = "Confianza: --";
    detectedColorText.textContent = "Activa la cámara o sube una imagen para comenzar.";
    detectExplanation.textContent = "Esta simulación es aproximada y puede variar según la persona, la iluminación y la cámara del dispositivo.";
    visionCards.innerHTML = '<div class="vision-card empty">Sin detección todavía.</div>';
    detectVisionTableBody.innerHTML = '<tr><td colspan="4">Sin color detectado todavía.</td></tr>';
    detectImageInput.value = "";
    detectImageCanvas.classList.remove("has-image");
  });

  updateColorCards();
  prepararJuegoColorDiferente();
  showScreen(isLoggedIn() ? "screen-home" : "screen-login");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

