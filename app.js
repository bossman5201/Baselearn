import { TRACKS, LESSONS, CERTIFICATES, SPONSOR_POLICY } from "./data/lessons.js";

const APP_CONFIG = {
  paymentMode: "basepay",
  appVersion: "v1.1.0",
  enableCloudSync: true,
  adminWallet: "0xbd14b65E9c6E767F02D1900894261735F5f48A57",
  expectedChainId: 8453,
  expectedChainHex: "0x2105"
};

const STORAGE_KEYS = {
  quizResults: "learn-base-quiz-results",
  progress: "learn-base-progress",
  certificates: "learn-base-certificates",
  prefs: "learn-base-prefs",
  account: "learn-base-account",
  auth: "learn-base-auth"
};

const PASSING_SCORE = 70;
const ENABLE_THEME_STUDIO = false;
const THEME_OPTIONS = [
  {
    id: "amber-frost",
    name: "Amber Frost",
    subtitle: "Luxury Warm",
    description: "Golden ambient glass with warm premium contrast.",
    color: "#f59e0b"
  },
  {
    id: "emerald-vault",
    name: "Emerald Vault",
    subtitle: "Trust + Wealth",
    description: "Deep emerald glass and confident financial tone.",
    color: "#10b981"
  },
  {
    id: "pearl-gold",
    name: "Pearl + Gold",
    subtitle: "High-end Editorial",
    description: "Pearl translucency, ivory cards, gold highlights.",
    color: "#ca8a04"
  },
  {
    id: "frosted-onyx",
    name: "Frosted Onyx",
    subtitle: "Executive Night",
    description: "Dark smoked glass with restrained luxury accents.",
    color: "#f97316"
  },
  {
    id: "ocean-prism",
    name: "Ocean Prism",
    subtitle: "Modern Clean",
    description: "Cool cyan glass layers with modern product energy.",
    color: "#06b6d4"
  }
];
const DEFAULT_THEME_ID = "ocean-prism";
const THEME_ID_SET = new Set(THEME_OPTIONS.map((theme) => theme.id));
const THEME_META_COLOR = {
  "amber-frost": "#bc6a18",
  "emerald-vault": "#0f766e",
  "pearl-gold": "#b0891f",
  "frosted-onyx": "#1f2937",
  "ocean-prism": "#0e7490"
};

const state = {
  route: { page: "home", id: null },
  searchTerm: "",
  quizResults: loadJson(STORAGE_KEYS.quizResults, {}),
  progress: loadJson(STORAGE_KEYS.progress, { lessons: {} }),
  certificates: loadJson(STORAGE_KEYS.certificates, {}),
  prefs: loadJson(STORAGE_KEYS.prefs, { disclaimerSeen: false, themeId: DEFAULT_THEME_ID }),
  account: loadJson(STORAGE_KEYS.account, { learnerId: "", learnerSecret: "" }),
  auth: loadJson(STORAGE_KEYS.auth, {
    token: "",
    learnerId: "",
    walletAddress: "",
    expiresAt: ""
  }),
  cloud: {
    mode: "checking",
    storageReady: false,
    message: "Checking cloud sync..."
  },
  wallet: {
    status: "disconnected",
    address: "",
    chainId: null,
    usingMiniAppProvider: false,
    message: "Wallet not connected."
  },
  contract: {
    loading: true,
    configured: false,
    contractAddress: "",
    adminWallet: APP_CONFIG.adminWallet,
    chainId: APP_CONFIG.expectedChainId,
    balanceWei: "0",
    certificatePricing: {},
    message: "Loading contract status..."
  }
};

if (state.account.learnerId && !state.account.learnerSecret) {
  state.account.learnerSecret = generateLearnerSecret();
  try {
    localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(state.account));
  } catch {
    // Ignore storage write failures; app can still run in-memory.
  }
}

if (!THEME_ID_SET.has(state.prefs.themeId)) {
  state.prefs.themeId = DEFAULT_THEME_ID;
}

if (!ENABLE_THEME_STUDIO) {
  state.prefs.themeId = DEFAULT_THEME_ID;
}

const appEl = document.getElementById("app");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const progressButton = document.getElementById("view-progress");

const LESSON_MAP = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const TRACK_MAP = new Map(TRACKS.map((track) => [track.id, track]));

applyTheme(state.prefs.themeId);
syncRouteFromHash();
render();
void initializeCloud();
void initializeOnchain();

window.addEventListener("hashchange", () => {
  syncRouteFromHash();
  render();
});

progressButton.addEventListener("click", () => {
  navigate("progress");
});

document.querySelector(".bottom-nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-route]");
  if (!button) return;
  const route = button.dataset.route;
  navigate(route);
});

appEl.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;

  if (action === "open-track") {
    navigate(`track/${id}`);
    return;
  }

  if (action === "open-lesson") {
    navigate(`lesson/${id}`);
    return;
  }

  if (action === "start-quiz") {
    navigate(`quiz/${id}`);
    return;
  }

  if (action === "open-next") {
    navigate(`lesson/${id}`);
    return;
  }

  if (action === "claim-cert") {
    void claimCertificate(id);
    return;
  }

  if (action === "open-certs") {
    navigate("certs");
    return;
  }

  if (action === "sync-now") {
    void loadCloudProfile();
    return;
  }

  if (action === "connect-wallet") {
    void connectWallet().catch((error) => {
      state.wallet.status = "disconnected";
      state.wallet.message = `Wallet connect failed: ${error.message}`;
      render();
      window.alert(`Wallet connect failed: ${error.message}`);
    });
    return;
  }

  if (action === "disconnect-wallet") {
    disconnectWallet();
    return;
  }

  if (action === "refresh-contract") {
    void loadContractStatus();
    return;
  }

  if (action === "withdraw-all") {
    void withdrawAllRevenue();
    return;
  }

  if (action === "clear-account") {
    if (!window.confirm("Clear learner ID from this device? Local progress will stay on this browser.")) {
      return;
    }

    clearAuthSession();
    state.account.learnerId = "";
    state.account.learnerSecret = "";
    saveState();
    render();
    return;
  }

  if (action === "set-theme") {
    if (!ENABLE_THEME_STUDIO) {
      return;
    }

    const themeId = actionEl.dataset.theme;
    setTheme(themeId);
    return;
  }
});

appEl.addEventListener("input", (event) => {
  const search = event.target.closest("#search-input");
  if (!search) return;
  state.searchTerm = search.value.trim().toLowerCase();
  render();
});

appEl.addEventListener("submit", async (event) => {
  const accountForm = event.target.closest("form[data-account-form]");
  if (accountForm) {
    event.preventDefault();
    const formData = new FormData(accountForm);
    const rawLearnerId = String(formData.get("learnerId") || "");
    const learnerId = normalizeLearnerId(rawLearnerId);

    if (!learnerId) {
      window.alert("Learner ID must be 3 to 40 characters using only letters, numbers, '-' or '_'.");
      return;
    }

    const previousLearnerId = state.account.learnerId;
    const learnerChanged = Boolean(previousLearnerId && previousLearnerId !== learnerId);

    if (learnerChanged) {
      clearAuthSession();
    }

    state.account.learnerId = learnerId;
    if (!state.account.learnerSecret || learnerChanged) {
      state.account.learnerSecret = generateLearnerSecret();
    }
    saveState();
    render();
    await loadCloudProfile();
    return;
  }

  const form = event.target.closest("form[data-quiz-for]");
  if (!form) return;

  event.preventDefault();
  const lessonId = form.dataset.quizFor;
  const lesson = LESSON_MAP.get(lessonId);
  if (!lesson) return;

  if (!state.account.learnerId) {
    window.alert("Set your learner ID first to submit quizzes.");
    return;
  }

  if (state.progress.lessons[lessonId]?.passed) {
    window.alert("You already passed this quiz. Continue to the next lesson.");
    return;
  }

  if (!state.account.learnerSecret) {
    window.alert("Learner session not initialized. Re-save your learner ID.");
    return;
  }

  if (!state.cloud.storageReady) {
    window.alert("Cloud storage is required for secure quiz grading. Configure backend storage first.");
    return;
  }

  const formData = new FormData(form);
  const answers = {};
  lesson.quiz.forEach((q) => {
    answers[q.id] = Number(formData.get(q.id));
  });

  try {
    const data = await apiPost("/api/progress", {
      learnerId: state.account.learnerId,
      learnerSecret: state.account.learnerSecret,
      lessonId,
      answers
    });

    const result = data.result || {};
    const correctAnswers = result.correctAnswers || {};
    const breakdown = lesson.quiz.map((q) => {
      const userAnswer = Number.isFinite(answers[q.id]) ? answers[q.id] : -1;
      const correctAnswer = Number.isInteger(correctAnswers[q.id]) ? correctAnswers[q.id] : -1;

      return {
        id: q.id,
        userAnswer,
        correctAnswer,
        isCorrect: userAnswer === correctAnswer,
        explanation: q.explanation,
        question: q.question,
        options: q.options
      };
    });

    state.quizResults[lessonId] = {
      score: Number(result.score || 0),
      passed: Boolean(result.passed),
      total: Number(result.total || lesson.quiz.length),
      correct: Number(result.correct || 0),
      breakdown,
      completedAt: new Date().toISOString()
    };

    mergeProfileFromCloud(data.profile);
    state.cloud.mode = "ready";
    state.cloud.message = "Progress synced.";
    saveState();
    render();
  } catch (error) {
    state.cloud.mode = "error";
    state.cloud.message = `Progress sync failed: ${error.message}`;
    render();
    window.alert(`Quiz submission failed: ${error.message}`);
  }
});

function render() {
  renderNav();

  if (state.route.page === "home") {
    appEl.innerHTML = renderHome();
    return;
  }

  if (state.route.page === "tracks") {
    appEl.innerHTML = renderTracks();
    return;
  }

  if (state.route.page === "track") {
    appEl.innerHTML = renderTrackDetails(state.route.id);
    return;
  }

  if (state.route.page === "lesson") {
    appEl.innerHTML = renderLesson(state.route.id);
    return;
  }

  if (state.route.page === "quiz") {
    appEl.innerHTML = renderQuiz(state.route.id);
    return;
  }

  if (state.route.page === "progress") {
    appEl.innerHTML = renderProgress();
    return;
  }

  if (state.route.page === "certs") {
    appEl.innerHTML = renderCertificates();
    return;
  }

  if (state.route.page === "about") {
    appEl.innerHTML = renderAbout();
    return;
  }

  appEl.innerHTML = renderHome();
}

function renderNav() {
  const navMap = {
    home: "home",
    tracks: "tracks",
    track: "tracks",
    lesson: "tracks",
    quiz: "tracks",
    progress: "home",
    certs: "certs",
    about: "about"
  };

  const activeRoute = navMap[state.route.page] || "home";
  navButtons.forEach((button) => {
    const isActive = button.dataset.route === activeRoute;
    button.classList.toggle("active", isActive);
  });
}

function renderHome() {
  const nextLesson = getNextLesson();
  const matches = searchLessons(state.searchTerm);

  return `
    <section class="card hero">
      <h2>Learn Base safely, one lesson at a time.</h2>
      <p>This app is education-first: no required swaps, no required bridge actions, and no forced money movement to learn.</p>
      <div class="badge-row">
        <span class="badge safe">No required onchain actions</span>
        <span class="badge track">20 launch lessons</span>
      </div>
      <div class="alert-note">Educational content only. Not financial, legal, or tax advice.</div>
      <div class="action-row">
        <button class="primary-button" data-action="open-track" data-id="fundamentals" type="button">Start Beginner Track</button>
        <button class="secondary-button" data-action="open-certs" type="button">View Certificates</button>
      </div>
    </section>

    ${renderThemeStudio("home")}

    ${renderAccountCard()}

    <section class="card search-box">
      <label for="search-input">Search lesson title or topic</label>
      <input id="search-input" class="search-input" placeholder="Try: gas, scams, NFTs, manifest" value="${escapeHtml(state.searchTerm)}" />
    </section>

    ${nextLesson ? renderContinueCard(nextLesson) : ""}

    <section class="card">
      <h2>Tracks</h2>
      <div class="track-grid">
        ${TRACKS.map((track) => renderTrackCard(track)).join("")}
      </div>
    </section>

    <section class="card">
      <h2>Search Results</h2>
      <div class="lesson-list">
        ${matches.length ? matches.map((lesson) => renderLessonCard(lesson)).join("") : document.getElementById("empty-state-template").innerHTML}
      </div>
    </section>
  `;
}

function renderAccountCard() {
  const cloudStatus = getCloudStatusLabel();
  const learnerId = state.account.learnerId || "";
  const syncAvailable = canSyncCloud();

  if (!learnerId) {
    return `
      <section class="card">
        <h2>Your Learner ID</h2>
        <p>Create a learner ID to keep your progress synced across devices once backend storage is configured.</p>
        <p class="footer-note">${escapeHtml(cloudStatus)}</p>
        <form data-account-form class="account-form">
          <input class="search-input" type="text" name="learnerId" minlength="3" maxlength="40" placeholder="example: founder_01" required />
          <div class="action-row">
            <button class="primary-button" type="submit">Save Learner ID</button>
          </div>
        </form>
      </section>
    `;
  }

  return `
    <section class="card">
      <h2>Your Learner ID</h2>
      <p><strong>${escapeHtml(learnerId)}</strong></p>
      <p class="footer-note">${escapeHtml(cloudStatus)}</p>
      <div class="action-row">
        <button class="secondary-button" data-action="sync-now" type="button" ${syncAvailable ? "" : "disabled"}>Sync Now</button>
        <button class="secondary-button" data-action="clear-account" type="button">Clear ID</button>
      </div>
    </section>
  `;
}

function renderContinueCard(lesson) {
  const track = TRACK_MAP.get(lesson.trackId);
  return `
    <section class="card">
      <h2>Continue Learning</h2>
      <p>${escapeHtml(track.title)}: ${escapeHtml(lesson.title)}</p>
      <div class="action-row">
        <button class="primary-button" data-action="open-lesson" data-id="${lesson.id}" type="button">Open Lesson</button>
      </div>
    </section>
  `;
}

function renderTracks() {
  return `
    <section class="card">
      <h2>All Learning Tracks</h2>
      <p>Choose the path that matches your level. You can complete tracks in any order.</p>
      <div class="track-grid">
        ${TRACKS.map((track) => renderTrackCard(track)).join("")}
      </div>
    </section>
  `;
}

function renderTrackCard(track) {
  const completion = getTrackCompletion(track.id);
  return `
    <article class="track-card">
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.description)}</p>
      <div class="meta-row">
        <span>${track.lessonIds.length} lessons</span>
        <span>${completion.completed}/${completion.total} complete</span>
        <span>${completion.percent}%</span>
      </div>
      <div class="action-row">
        <button class="secondary-button" data-action="open-track" data-id="${track.id}" type="button">Open Track</button>
      </div>
    </article>
  `;
}

function renderLessonCard(lesson) {
  const completed = isLessonComplete(lesson.id);
  const track = TRACK_MAP.get(lesson.trackId);
  const sponsorTag = lesson.sponsor
    ? `<span class="badge sponsored">Sponsored</span>`
    : "";

  return `
    <article class="lesson-card">
      <div class="lesson-chip-row">
        <span class="badge track">${escapeHtml(track.title)}</span>
        ${sponsorTag}
        ${completed ? '<span class="badge safe">Completed</span>' : ""}
      </div>
      <h3>${escapeHtml(lesson.title)}</h3>
      <p>${escapeHtml(lesson.summary)}</p>
      <div class="meta-row">
        <span>${escapeHtml(lesson.duration)}</span>
        <span>${escapeHtml(lesson.level)}</span>
      </div>
      <div class="action-row">
        <button class="secondary-button" data-action="open-lesson" data-id="${lesson.id}" type="button">Open Lesson</button>
      </div>
    </article>
  `;
}

function renderTrackDetails(trackId) {
  const track = TRACK_MAP.get(trackId);
  if (!track) return renderNotFound("Track not found.");

  const lessons = track.lessonIds.map((id) => LESSON_MAP.get(id)).filter(Boolean);
  const completion = getTrackCompletion(trackId);

  return `
    <section class="card">
      <h2>${escapeHtml(track.title)}</h2>
      <p>${escapeHtml(track.description)}</p>
      <div class="meta-row">
        <span>${completion.completed}/${completion.total} complete</span>
        <span>${completion.percent}%</span>
      </div>
      <div class="lesson-list">
        ${lessons.map((lesson) => renderLessonCard(lesson)).join("")}
      </div>
    </section>
  `;
}
function renderLesson(lessonId) {
  const lesson = LESSON_MAP.get(lessonId);
  if (!lesson) return renderNotFound("Lesson not found.");

  const track = TRACK_MAP.get(lesson.trackId);
  const completed = isLessonComplete(lesson.id);

  return `
    <section class="card">
      <div class="lesson-chip-row">
        <span class="badge track">${escapeHtml(track.title)}</span>
        ${lesson.sponsor ? '<span class="badge sponsored">Sponsored</span>' : ""}
        ${completed ? '<span class="badge safe">Completed</span>' : ""}
      </div>
      <h2>${escapeHtml(lesson.title)}</h2>
      <p>${escapeHtml(lesson.summary)}</p>
      <div class="meta-row">
        <span>${escapeHtml(lesson.duration)}</span>
        <span>${escapeHtml(lesson.level)}</span>
      </div>
      ${lesson.sponsor ? `<div class="callout"><strong>Sponsored:</strong> ${escapeHtml(lesson.sponsor.name)}. ${escapeHtml(lesson.sponsor.disclosure)}</div>` : ""}
      <div class="copy-block">
        <h4>Objective</h4>
        <p>${escapeHtml(lesson.objective)}</p>
      </div>
      <div class="copy-block">
        <h4>Key Points</h4>
        <ul>
          ${lesson.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
      </div>
      <div class="copy-block">
        <h4>Risk Notes</h4>
        <ul>
          ${lesson.riskNotes.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}
        </ul>
      </div>
      <div class="copy-block">
        <h4>Glossary</h4>
        <ul>
          ${lesson.glossary.map((item) => `<li><strong>${escapeHtml(item.term)}:</strong> ${escapeHtml(item.definition)}</li>`).join("")}
        </ul>
      </div>
      <div class="action-row">
        <button class="primary-button" data-action="start-quiz" data-id="${lesson.id}" type="button">Take Quiz</button>
        <button class="secondary-button" data-action="open-track" data-id="${lesson.trackId}" type="button">Back to Track</button>
      </div>
    </section>
  `;
}

function renderQuiz(lessonId) {
  const lesson = LESSON_MAP.get(lessonId);
  if (!lesson) return renderNotFound("Lesson quiz not found.");

  const result = state.quizResults[lessonId];
  const current = state.progress.lessons[lessonId];
  const passed = Boolean(current?.passed || result?.passed);
  const latestScore = Number(current?.score ?? result?.score ?? 0);
  const completionNote = passed
    ? `<div class="result-ok">Last passing score: ${latestScore}%</div>`
    : "";
  const nextLessonId = getNextLessonInTrack(lessonId);

  if (passed) {
    return `
      <section class="card">
        <h2>${escapeHtml(lesson.title)} Quiz</h2>
        <p>You already passed this quiz. Repeating it is not required.</p>
        ${completionNote}
        ${result ? renderQuizResult(result) : ""}
        <div class="action-row">
          ${nextLessonId ? `<button class="primary-button" data-action="open-next" data-id="${nextLessonId}" type="button">Next Lesson</button>` : '<button class="primary-button" data-action="open-certs" type="button">View Certificates</button>'}
          <button class="secondary-button" data-action="open-track" data-id="${lesson.trackId}" type="button">Back to Track</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="card">
      <h2>${escapeHtml(lesson.title)} Quiz</h2>
      <p>Pass score: ${PASSING_SCORE}% or higher.</p>
      ${completionNote}
      ${result ? renderQuizResult(result) : ""}
      <form data-quiz-for="${lesson.id}">
        ${lesson.quiz.map((q, idx) => renderQuizQuestion(q, idx + 1)).join("")}
        <div class="action-row">
          <button class="primary-button" type="submit">Submit Quiz</button>
          <button class="secondary-button" data-action="open-lesson" data-id="${lesson.id}" type="button">Back to Lesson</button>
        </div>
      </form>
    </section>
  `;
}

function renderQuizQuestion(question, number) {
  return `
    <article class="quiz-question">
      <h3>Q${number}. ${escapeHtml(question.question)}</h3>
      <div class="quiz-options">
        ${question.options
          .map(
            (option, optionIndex) => `
            <label>
              <input type="radio" name="${question.id}" value="${optionIndex}" required />
              <span>${escapeHtml(option)}</span>
            </label>
          `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderQuizResult(result) {
  const klass = result.passed ? "result-ok" : "result-warn";
  const title = result.passed ? "Passed" : "Not passed yet";

  return `
    <section class="${klass}">
      <strong>${title}:</strong> ${result.score}% (${result.correct}/${result.total})
    </section>
    <div class="copy-block">
      <h4>Review</h4>
      <ul>
        ${result.breakdown
          .map((item) => {
            const prefix = item.isCorrect ? "Correct" : "Review";
            const answer = item.options[item.correctAnswer];
            return `<li><strong>${prefix}:</strong> ${escapeHtml(item.question)}. ${escapeHtml(item.explanation)} (Answer: ${escapeHtml(answer)})</li>`;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderProgress() {
  const completedLessons = LESSONS.filter((lesson) => isLessonComplete(lesson.id));
  const total = LESSONS.length;
  const completed = completedLessons.length;
  const percent = Math.round((completed / total) * 100);
  const certCount = Object.keys(state.certificates).length;
  const storageMessage = canSyncCloud()
    ? `Cloud sync enabled for learner ID: ${state.account.learnerId}`
    : "Local browser storage mode. Configure backend storage to enable cloud sync.";

  return `
    <section class="card">
      <h2>Your Progress</h2>
      <p>${escapeHtml(storageMessage)}</p>
      <div class="stat-grid">
        <article class="stat-card">
          <h3>${completed}/${total}</h3>
          <p>Lessons complete</p>
        </article>
        <article class="stat-card">
          <h3>${percent}%</h3>
          <p>Total progress</p>
        </article>
        <article class="stat-card">
          <h3>${TRACKS.filter((track) => getTrackCompletion(track.id).percent === 100).length}</h3>
          <p>Tracks complete</p>
        </article>
        <article class="stat-card">
          <h3>${certCount}</h3>
          <p>Certificates claimed</p>
        </article>
      </div>
      <div class="copy-block">
        <h4>Completed Lessons</h4>
        <ul>
          ${completedLessons.length ? completedLessons.map((lesson) => `<li>${escapeHtml(lesson.title)}</li>`).join("") : "<li>No lessons completed yet.</li>"}
        </ul>
      </div>
      <div class="action-row">
        <button class="secondary-button" data-action="open-certs" type="button">Check Certificate Eligibility</button>
      </div>
    </section>
  `;
}

function renderCertificates() {
  const paymentModeLabel = state.contract.configured ? "onchain-paid" : "not-configured";

  return `
    ${renderWalletCard()}

    <section class="card">
      <h2>Certificates</h2>
      <p>Lessons stay free. Certificates are optional paid credentials on Base mainnet.</p>
      <div class="cert-grid">
        ${CERTIFICATES.map((cert) => renderCertificateCard(cert)).join("")}
      </div>
      <p class="footer-note">Current payment mode: ${escapeHtml(paymentModeLabel)}</p>
      <p class="footer-note">${escapeHtml(state.contract.message || "")}</p>
    </section>

    ${renderAdminPanel()}
  `;
}

function renderCertificateCard(cert) {
  const eligible = isCertificateEligible(cert);
  const owned = Boolean(state.certificates[cert.id]);
  const priceLabel = getCertificatePriceLabel(cert.id, cert.priceUsd);
  const onchainReady = state.contract.configured;

  const status = owned
    ? "Claimed"
    : eligible
      ? "Eligible"
      : "Locked";

  const buttonLabel = owned
    ? "Already Claimed"
    : onchainReady
      ? `Mint for ${priceLabel}`
      : "Mint unavailable";

  const description = cert.trackId === "all"
    ? "Requires all 20 lessons completed."
    : `Requires full ${TRACK_MAP.get(cert.trackId).title} track completion.`;

  return `
    <article class="cert-card">
      <h3>${escapeHtml(cert.name)}</h3>
      <p>${escapeHtml(description)}</p>
      <div class="meta-row">
        <span>Status: ${status}</span>
        <span>Type: ${escapeHtml(cert.type)}</span>
      </div>
      <div class="action-row">
        <button class="primary-button" data-action="claim-cert" data-id="${cert.id}" ${!eligible || owned || !onchainReady ? "disabled" : ""} type="button">${buttonLabel}</button>
      </div>
    </article>
  `;
}

function renderWalletCard() {
  const walletAddress = state.wallet.address || "Not connected";
  const chainName = state.wallet.chainId === APP_CONFIG.expectedChainId ? "Base Mainnet" : "Unknown chain";
  const isConnected = state.wallet.status === "connected";
  const connectButton = isConnected
    ? '<button class="secondary-button" data-action="disconnect-wallet" type="button">Disconnect</button>'
    : '<button class="primary-button" data-action="connect-wallet" type="button">Connect Wallet</button>';

  return `
    <section class="card">
      <h2>Wallet</h2>
      <p>Connect only when minting or withdrawing. Learning flow does not require wallet connection.</p>
      <div class="meta-row">
        <span>Status: ${escapeHtml(state.wallet.status)}</span>
        <span>Provider: ${state.wallet.usingMiniAppProvider ? "Mini App" : "Injected"}</span>
      </div>
      <div class="copy-block">
        <ul>
          <li>Address: ${escapeHtml(walletAddress)}</li>
          <li>Chain: ${escapeHtml(chainName)}</li>
        </ul>
      </div>
      <p class="footer-note">${escapeHtml(state.wallet.message || "")}</p>
      <div class="action-row">
        ${connectButton}
        <button class="secondary-button" data-action="refresh-contract" type="button">Refresh Contract</button>
      </div>
    </section>
  `;
}

function renderAdminPanel() {
  const connected = state.wallet.status === "connected";
  const adminWallet = (state.contract.adminWallet || APP_CONFIG.adminWallet || "").toLowerCase();
  const isAdmin = connected && adminWallet && state.wallet.address.toLowerCase() === adminWallet;

  if (!isAdmin) {
    return "";
  }

  const balanceEth = formatWeiToEth(state.contract.balanceWei);
  const withdrawDisabled = !state.contract.configured || !state.contract.balanceWei || state.contract.balanceWei === "0";

  return `
    <section class="card">
      <h2>Admin Panel</h2>
      <p>Visible only to deployer/admin wallet.</p>
      <div class="copy-block">
        <ul>
          <li>Admin wallet: ${escapeHtml(state.contract.adminWallet || APP_CONFIG.adminWallet)}</li>
          <li>Contract: ${escapeHtml(state.contract.contractAddress || "not configured")}</li>
          <li>Revenue balance: ${escapeHtml(balanceEth)} ETH</li>
        </ul>
      </div>
      <div class="action-row">
        <button class="primary-button" data-action="withdraw-all" type="button" ${withdrawDisabled ? "disabled" : ""}>Withdraw All</button>
      </div>
    </section>
  `;
}

function renderAbout() {
  return `
    ${renderThemeStudio("about")}

    <section class="card">
      <h2>About Learn Base</h2>
      <p>Learn Base is a safety-first education mini app. It teaches concepts before actions and avoids forcing users into risky flows.</p>
      <div class="copy-block">
        <h4>Sponsored Lesson Policy</h4>
        <ul>
          ${SPONSOR_POLICY.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
        </ul>
      </div>
      <div class="copy-block">
        <h4>Build Notes</h4>
        <ul>
          <li>Version: ${escapeHtml(APP_CONFIG.appVersion)}</li>
          <li>Launch mode: content-first with optional paid onchain certificates.</li>
          <li>Learner ID: ${state.account.learnerId ? escapeHtml(state.account.learnerId) : "not set"}</li>
          <li>Sync status: ${escapeHtml(getCloudStatusLabel())}</li>
          <li>Contract status: ${state.contract.configured ? "configured" : "not configured"}</li>
          <li>Theme: ${escapeHtml(getCurrentTheme()?.name || "Unknown")}</li>
          <li>Date baseline: March 4, 2026.</li>
        </ul>
      </div>
    </section>
  `;
}

function renderThemeStudio(context = "home") {
  if (!ENABLE_THEME_STUDIO) {
    return "";
  }

  const activeTheme = state.prefs.themeId;
  const title = context === "about"
    ? "Theme Studio"
    : "Premium Visual Themes";
  const subtitle = context === "about"
    ? "Switch instantly between all five full glassmorphism art directions."
    : "Live switch between five premium glassmorphism design systems.";

  return `
    <section class="card theme-studio">
      <div class="theme-studio-header">
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="theme-grid">
        ${THEME_OPTIONS.map((theme) => {
          const selected = theme.id === activeTheme;
          return `
            <button
              type="button"
              class="theme-option ${selected ? "active" : ""}"
              data-action="set-theme"
              data-theme="${theme.id}"
              aria-pressed="${selected ? "true" : "false"}"
            >
              <span class="theme-swatch" style="--theme-chip:${theme.color};"></span>
              <span class="theme-copy">
                <strong>${theme.name}</strong>
                <em>${theme.subtitle}</em>
                <small>${theme.description}</small>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderNotFound(message) {
  return `
    <section class="card empty-state">
      <h2>Not Found</h2>
      <p>${escapeHtml(message)}</p>
      <div class="action-row">
        <button class="secondary-button" data-action="open-track" data-id="fundamentals" type="button">Open Beginner Track</button>
      </div>
    </section>
  `;
}

function searchLessons(term) {
  if (!term) return LESSONS;
  return LESSONS.filter((lesson) => {
    const haystack = [
      lesson.title,
      lesson.summary,
      lesson.level,
      TRACK_MAP.get(lesson.trackId)?.title || ""
    ].join(" ").toLowerCase();

    return haystack.includes(term);
  });
}

function getTrackCompletion(trackId) {
  const track = TRACK_MAP.get(trackId);
  if (!track) return { completed: 0, total: 0, percent: 0 };

  const total = track.lessonIds.length;
  const completed = track.lessonIds.filter((lessonId) => isLessonComplete(lessonId)).length;
  const percent = Math.round((completed / total) * 100);

  return { completed, total, percent };
}

function getNextLesson() {
  return LESSONS.find((lesson) => !isLessonComplete(lesson.id)) || null;
}

function isLessonComplete(lessonId) {
  return Boolean(state.progress.lessons[lessonId]?.passed);
}

function isCertificateEligible(cert) {
  if (cert.trackId === "all") {
    return LESSONS.every((lesson) => isLessonComplete(lesson.id));
  }

  return getTrackCompletion(cert.trackId).percent === 100;
}

async function claimCertificate(certId) {
  const cert = CERTIFICATES.find((item) => item.id === certId);
  if (!cert) return;

  if (!isCertificateEligible(cert)) {
    window.alert("Complete required lessons before claiming this certificate.");
    return;
  }

  if (state.certificates[cert.id]) {
    window.alert("Certificate already claimed.");
    return;
  }

  if (!state.contract.configured) {
    window.alert("Certificate contract is not configured yet.");
    return;
  }

  if (!state.account.learnerId) {
    window.alert("Set your learner ID first so your progress can be verified before mint.");
    return;
  }

  if (!state.cloud.storageReady) {
    window.alert("Cloud storage is not ready yet. Configure Neon in Vercel before minting.");
    return;
  }

  try {
    await syncAllProgressToCloud();

    const walletAddress = await connectWallet();
    if (!walletAddress) {
      return;
    }

    await ensureBaseMainnet();
    await ensureWalletAuth();

    const quoteResponse = await apiPost("/api/certificate-quote", {
      learnerId: state.account.learnerId,
      learnerSecret: state.account.learnerSecret,
      certificateId: cert.id,
      walletAddress
    }, {
      headers: getAuthHeaders()
    });

    const quote = quoteResponse.quote;
    const priceEth = formatWeiToEth(quote.priceWei);
    const accepted = window.confirm(
      `Mint ${cert.name} for ${priceEth} ETH on Base?\n\nYou will pay gas + certificate price from your wallet.`
    );
    if (!accepted) {
      return;
    }

    const txHash = await sendWalletTransaction(quote.txRequest);
    state.wallet.message = `Mint submitted: ${shortTx(txHash)}`;
    render();

    const receipt = await waitForTransactionReceipt(txHash);
    if (receipt.status !== "0x1") {
      throw new Error("transaction_reverted");
    }

    state.certificates[cert.id] = {
      claimedAt: new Date().toISOString(),
      paymentMode: "basepay",
      paymentRef: txHash,
      walletAddress,
      paymentAmountWei: quote.priceWei
    };

    saveState();
    render();

    await ensureWalletAuth();
    await pushCertificateToCloud(cert.id, cert.typeId, "basepay", {
      paymentRef: txHash,
      walletAddress,
      paymentAmountWei: quote.priceWei
    });

    await loadContractStatus();
    state.wallet.message = "Certificate minted successfully.";
    render();

    window.alert(`Certificate minted: ${cert.name}`);
  } catch (error) {
    state.wallet.message = `Mint failed: ${error.message}`;
    render();
    window.alert(`Mint failed: ${error.message}`);
    return;
  }
}

function navigate(path) {
  window.location.hash = `#/${path}`;
}

function syncRouteFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  const safe = raw || "home";
  const [page, id] = safe.split("/");

  const validPages = new Set(["home", "tracks", "track", "lesson", "quiz", "progress", "certs", "about"]);
  if (!validPages.has(page)) {
    state.route = { page: "home", id: null };
    return;
  }

  state.route = { page, id: id || null };
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.quizResults, JSON.stringify(state.quizResults));
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
  localStorage.setItem(STORAGE_KEYS.certificates, JSON.stringify(state.certificates));
  localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs));
  localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(state.account));
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(state.auth));
}

function normalizeLearnerId(rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  const safe = rawValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (safe.length < 3 || safe.length > 40) {
    return "";
  }

  return safe;
}

function setTheme(themeId) {
  if (!ENABLE_THEME_STUDIO) {
    return;
  }

  if (!THEME_ID_SET.has(themeId)) {
    return;
  }

  state.prefs.themeId = themeId;
  applyTheme(themeId);
  saveState();
  render();
}

function applyTheme(themeId) {
  const resolvedTheme = THEME_ID_SET.has(themeId) ? themeId : DEFAULT_THEME_ID;
  document.body.dataset.theme = resolvedTheme;
  document.body.classList.add("theme-ready");
  updateMetaThemeColor(resolvedTheme);
}

function updateMetaThemeColor(themeId) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    return;
  }

  const resolvedColor = THEME_META_COLOR[themeId] || THEME_META_COLOR[DEFAULT_THEME_ID];
  metaThemeColor.setAttribute("content", resolvedColor);
}

function getCurrentTheme() {
  return THEME_OPTIONS.find((theme) => theme.id === state.prefs.themeId) || THEME_OPTIONS[0];
}

function getNextLessonInTrack(lessonId) {
  const lesson = LESSON_MAP.get(lessonId);
  if (!lesson) {
    return "";
  }

  const track = TRACK_MAP.get(lesson.trackId);
  if (!track || !Array.isArray(track.lessonIds)) {
    return "";
  }

  const currentIndex = track.lessonIds.indexOf(lessonId);
  if (currentIndex < 0 || currentIndex >= track.lessonIds.length - 1) {
    return "";
  }

  return track.lessonIds[currentIndex + 1] || "";
}

function generateLearnerSecret() {
  const bytes = new Uint8Array(24);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function canSyncCloud() {
  return Boolean(
    APP_CONFIG.enableCloudSync &&
    state.cloud.storageReady &&
    state.account.learnerId &&
    state.account.learnerSecret
  );
}

function getCloudStatusLabel() {
  if (!APP_CONFIG.enableCloudSync) {
    return "Cloud sync disabled by configuration.";
  }

  if (state.cloud.mode === "checking") {
    return "Checking cloud sync status...";
  }

  if (state.cloud.mode === "offline") {
    return "Cloud API unavailable. Local-only mode active.";
  }

  if (state.cloud.mode === "error") {
    return state.cloud.message || "Cloud sync encountered an error.";
  }

  if (state.cloud.storageReady && state.account.learnerId) {
    return "Cloud sync active.";
  }

  if (state.cloud.storageReady && !state.account.learnerId) {
    return "Cloud ready. Set learner ID to start syncing.";
  }

  return "Backend storage not configured yet. Local-only mode active.";
}

async function initializeCloud() {
  if (!APP_CONFIG.enableCloudSync) {
    state.cloud = {
      mode: "disabled",
      storageReady: false,
      message: "Cloud sync disabled by configuration."
    };
    render();
    return;
  }

  try {
    const data = await apiGet("/api/health");
    state.cloud.storageReady = Boolean(data.storageReady);
    state.cloud.mode = data.storageReady ? "ready" : "unavailable";
    state.cloud.message = data.storageReady
      ? "Cloud storage configured."
      : "Backend storage missing environment setup.";

    if (canSyncCloud()) {
      await loadCloudProfile();
    } else {
      render();
    }
  } catch {
    state.cloud.mode = "offline";
    state.cloud.storageReady = false;
    state.cloud.message = "Cloud API unreachable.";
    render();
  }
}

let miniAppProvider = null;
let walletListenersAttached = false;

async function initializeOnchain() {
  await initializeMiniAppProvider();
  await loadContractStatus();
}

async function initializeMiniAppProvider() {
  try {
    const module = await import("https://esm.sh/@farcaster/miniapp-sdk@0.2.3");
    const sdk = module.default || module.sdk || null;

    if (sdk?.actions?.ready) {
      sdk.actions.ready();
    }

    if (sdk?.wallet?.getEthereumProvider) {
      const provider = await sdk.wallet.getEthereumProvider();
      if (provider) {
        miniAppProvider = provider;
        state.wallet.usingMiniAppProvider = true;
        state.wallet.message = "Mini app wallet provider detected.";
      }
    }
  } catch {
    state.wallet.usingMiniAppProvider = false;
  }
}

function getEthereumProvider() {
  if (miniAppProvider) {
    return miniAppProvider;
  }

  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum;
  }

  if (typeof window !== "undefined" && window.coinbaseWalletExtension?.ethereum) {
    return window.coinbaseWalletExtension.ethereum;
  }

  return null;
}

function attachWalletListeners(provider) {
  if (!provider || walletListenersAttached || typeof provider.on !== "function") {
    return;
  }

  provider.on("accountsChanged", (accounts) => {
    const address = Array.isArray(accounts) && accounts.length ? String(accounts[0]) : "";
    if (!address) {
      disconnectWallet();
      return;
    }

    if (
      state.auth.walletAddress &&
      state.auth.walletAddress.toLowerCase() !== address.toLowerCase()
    ) {
      clearAuthSession();
    }

    state.wallet.address = address;
    state.wallet.status = "connected";
    state.wallet.message = "Wallet account updated.";
    saveState();
    render();
  });

  provider.on("chainChanged", (chainIdHex) => {
    const chainId = Number.parseInt(String(chainIdHex || "0x0"), 16);
    state.wallet.chainId = Number.isFinite(chainId) ? chainId : null;
    state.wallet.message = chainId === APP_CONFIG.expectedChainId
      ? "Connected to Base mainnet."
      : "Switch to Base mainnet to mint.";
    render();
  });

  walletListenersAttached = true;
}

async function connectWallet() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("No wallet provider found. Open this inside Base app or Coinbase Wallet.");
  }

  state.wallet.status = "connecting";
  state.wallet.message = "Requesting wallet connection...";
  render();

  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = Array.isArray(accounts) && accounts.length ? String(accounts[0]) : "";
  if (!address) {
    state.wallet.status = "disconnected";
    state.wallet.message = "Wallet connection canceled.";
    render();
    return "";
  }

  const chainIdHex = await provider.request({ method: "eth_chainId" });
  const chainId = Number.parseInt(String(chainIdHex || "0x0"), 16);

  state.wallet.status = "connected";
  state.wallet.address = address;
  state.wallet.chainId = Number.isFinite(chainId) ? chainId : null;
  if (
    state.auth.walletAddress &&
    state.auth.walletAddress.toLowerCase() !== address.toLowerCase()
  ) {
    clearAuthSession();
  }

  state.wallet.message = chainId === APP_CONFIG.expectedChainId
    ? "Wallet connected."
    : "Wallet connected. Switch to Base mainnet to mint.";

  attachWalletListeners(provider);
  saveState();
  render();
  return address;
}

function disconnectWallet() {
  clearAuthSession();
  state.wallet.status = "disconnected";
  state.wallet.address = "";
  state.wallet.chainId = null;
  state.wallet.message = "Wallet disconnected from app session.";
  saveState();
  render();
}

async function ensureBaseMainnet() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Wallet provider not found.");
  }

  let chainIdHex = await provider.request({ method: "eth_chainId" });
  if (String(chainIdHex).toLowerCase() !== APP_CONFIG.expectedChainHex) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: APP_CONFIG.expectedChainHex }]
      });
      chainIdHex = await provider.request({ method: "eth_chainId" });
    } catch (switchError) {
      const code = Number(switchError?.code);
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: APP_CONFIG.expectedChainHex,
            chainName: "Base",
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"]
          }]
        });
        chainIdHex = await provider.request({ method: "eth_chainId" });
      } else {
        throw switchError;
      }
    }
  }

  const chainId = Number.parseInt(String(chainIdHex || "0x0"), 16);
  state.wallet.chainId = chainId;
  if (chainId !== APP_CONFIG.expectedChainId) {
    throw new Error("Please switch to Base mainnet.");
  }
}

async function sendWalletTransaction(txRequest) {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Wallet provider not available.");
  }

  if (!state.wallet.address) {
    throw new Error("Wallet is not connected.");
  }

  return provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: state.wallet.address,
      to: txRequest.to,
      data: txRequest.data,
      value: txRequest.value || "0x0"
    }]
  });
}

async function waitForTransactionReceipt(txHash, timeoutMs = 180000) {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Wallet provider not available.");
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });

    if (receipt) {
      return receipt;
    }

    await sleep(2000);
  }

  throw new Error("Transaction confirmation timeout.");
}

async function loadContractStatus() {
  state.contract.loading = true;
  state.contract.message = "Loading contract status...";
  render();

  try {
    const data = await apiGet("/api/contract-status");
    const contract = data.contract || {};
    const pricing = {};

    for (const item of data.certificates || []) {
      pricing[item.certificateId] = String(item.priceWei || "0");
    }

    state.contract.loading = false;
    state.contract.configured = Boolean(contract.configured);
    state.contract.contractAddress = contract.contractAddress || "";
    state.contract.adminWallet = contract.adminWallet || APP_CONFIG.adminWallet;
    state.contract.chainId = Number(contract.chainId || APP_CONFIG.expectedChainId);
    state.contract.balanceWei = String(contract.balanceWei || "0");
    state.contract.certificatePricing = pricing;
    state.contract.message = state.contract.configured
      ? "Contract ready for paid minting."
      : "Contract not configured yet.";
  } catch (error) {
    state.contract.loading = false;
    state.contract.configured = false;
    state.contract.contractAddress = "";
    state.contract.balanceWei = "0";
    state.contract.certificatePricing = {};
    state.contract.message = `Contract status unavailable: ${error.message}`;
  }

  render();
}

async function syncAllProgressToCloud() {
  if (!canSyncCloud()) {
    throw new Error("Cloud sync is required before minting.");
  }

  let remoteLessons = {};
  try {
    const remoteData = await apiGet(
      `/api/profile?learnerId=${encodeURIComponent(state.account.learnerId)}&learnerSecret=${encodeURIComponent(state.account.learnerSecret)}`
    );
    remoteLessons = remoteData.profile?.lessons || {};
  } catch (error) {
    if (error.message !== "learner_secret_not_initialized") {
      throw error;
    }
  }
  const pendingQuizResults = Object.entries(state.quizResults)
    .filter(([lessonId, quizResult]) => quizResult?.passed && !remoteLessons[lessonId]?.passed);

  for (const [lessonId, quizResult] of pendingQuizResults) {
    const answers = {};
    for (const item of quizResult.breakdown || []) {
      if (!item || !item.id || !Number.isInteger(item.userAnswer) || item.userAnswer < 0) {
        continue;
      }

      answers[item.id] = item.userAnswer;
    }

    if (Object.keys(answers).length === 0) {
      continue;
    }

    await apiPost("/api/progress", {
      learnerId: state.account.learnerId,
      learnerSecret: state.account.learnerSecret,
      lessonId,
      answers
    });
  }

  await loadCloudProfile();
}

async function withdrawAllRevenue() {
  if (state.wallet.status !== "connected" || !state.wallet.address) {
    window.alert("Connect admin wallet first.");
    return;
  }

  const adminWallet = (state.contract.adminWallet || APP_CONFIG.adminWallet || "").toLowerCase();
  if (!adminWallet || state.wallet.address.toLowerCase() !== adminWallet) {
    window.alert("Only deployer/admin wallet can withdraw.");
    return;
  }

  if (!state.contract.configured || !state.contract.balanceWei || state.contract.balanceWei === "0") {
    window.alert("No withdrawable balance.");
    return;
  }

  const amountWei = state.contract.balanceWei;
  const amountEth = formatWeiToEth(amountWei);
  const accepted = window.confirm(`Withdraw ${amountEth} ETH to admin wallet?`);
  if (!accepted) {
    return;
  }

  try {
    await ensureBaseMainnet();
    await ensureWalletAuth();

    const intentResponse = await apiPost("/api/admin-withdraw-intent", {
      walletAddress: state.wallet.address,
      toAddress: state.wallet.address,
      amountWei
    }, {
      headers: getAuthHeaders()
    });

    const txHash = await sendWalletTransaction(intentResponse.intent.txRequest);
    state.wallet.message = `Withdraw submitted: ${shortTx(txHash)}`;
    render();

    const receipt = await waitForTransactionReceipt(txHash);
    if (receipt.status !== "0x1") {
      throw new Error("withdraw_transaction_reverted");
    }

    await apiPost("/api/admin-withdraw-log", {
      walletAddress: state.wallet.address,
      toAddress: state.wallet.address,
      txHash,
      amountWei
    }, {
      headers: getAuthHeaders()
    });

    state.wallet.message = "Withdraw completed.";
    await loadContractStatus();
    render();
    window.alert(`Withdraw complete. Tx: ${txHash}`);
  } catch (error) {
    state.wallet.message = `Withdraw failed: ${error.message}`;
    render();
    window.alert(`Withdraw failed: ${error.message}`);
  }
}

async function loadCloudProfile() {
  if (!canSyncCloud()) {
    render();
    return;
  }

  try {
    const data = await apiGet(
      `/api/profile?learnerId=${encodeURIComponent(state.account.learnerId)}&learnerSecret=${encodeURIComponent(state.account.learnerSecret)}`
    );
    mergeProfileFromCloud(data.profile);
    state.cloud.mode = "ready";
    state.cloud.message = "Cloud profile synced.";
    saveState();
    render();
  } catch (error) {
    if (error.message === "learner_secret_not_initialized") {
      state.cloud.mode = "ready";
      state.cloud.message = "Cloud profile will initialize after your first quiz submission.";
      render();
      return;
    }

    state.cloud.mode = "error";
    state.cloud.message = `Cloud sync failed: ${error.message}`;
    render();
  }
}

async function pushCertificateToCloud(certificateId, certificateTypeId, paymentMode, paymentData = {}) {
  if (!canSyncCloud()) {
    return;
  }

  try {
    const requestOptions = paymentMode === "basepay"
      ? { headers: getAuthHeaders() }
      : undefined;

    const data = await apiPost("/api/certificate-claim", {
      learnerId: state.account.learnerId,
      learnerSecret: state.account.learnerSecret,
      certificateId,
      certificateTypeId,
      paymentMode: paymentMode || "demo",
      paymentRef: paymentData.paymentRef || null,
      walletAddress: paymentData.walletAddress || null,
      paymentAmountWei: paymentData.paymentAmountWei || null
    }, requestOptions);

    mergeProfileFromCloud(data.profile);
    state.cloud.mode = "ready";
    state.cloud.message = "Certificate synced.";
    saveState();
    render();
  } catch (error) {
    state.cloud.mode = "error";
    state.cloud.message = `Certificate sync failed: ${error.message}`;
    render();
  }
}

function mergeProfileFromCloud(profile) {
  if (!profile || typeof profile !== "object") {
    return;
  }

  if (profile.lessons && typeof profile.lessons === "object") {
    Object.entries(profile.lessons).forEach(([lessonId, remoteRecord]) => {
      if (!remoteRecord) return;
      const localRecord = state.progress.lessons[lessonId];

      if (!localRecord) {
        state.progress.lessons[lessonId] = remoteRecord;
        return;
      }

      const localAttempts = Number(localRecord.attempts || 0);
      const remoteAttempts = Number(remoteRecord.attempts || 0);
      const shouldUseRemote = remoteAttempts > localAttempts || (remoteRecord.passed && !localRecord.passed);

      if (shouldUseRemote) {
        state.progress.lessons[lessonId] = remoteRecord;
      }
    });
  }

  if (profile.certificates && typeof profile.certificates === "object") {
    state.certificates = {
      ...state.certificates,
      ...profile.certificates
    };
  }
}

function clearAuthSession() {
  state.auth = {
    token: "",
    learnerId: "",
    walletAddress: "",
    expiresAt: ""
  };
}

function hasValidAuthSession() {
  if (!state.auth.token || !state.auth.expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(state.auth.expiresAt);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) {
    return false;
  }

  if (!state.account.learnerId || state.auth.learnerId !== state.account.learnerId) {
    return false;
  }

  if (!state.wallet.address || state.auth.walletAddress.toLowerCase() !== state.wallet.address.toLowerCase()) {
    return false;
  }

  return true;
}

function buildWalletAuthMessage({ learnerId, walletAddress, issuedAt, expiresAt }) {
  return [
    "Learn Base Wallet Authentication",
    `learner_id:${String(learnerId).trim().toLowerCase()}`,
    `wallet:${String(walletAddress).trim().toLowerCase()}`,
    `issued_at:${issuedAt}`,
    `expires_at:${expiresAt}`
  ].join("\n");
}

async function signPersonalMessage(message, walletAddress) {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Wallet provider not available.");
  }

  try {
    return await provider.request({
      method: "personal_sign",
      params: [message, walletAddress]
    });
  } catch {
    return provider.request({
      method: "personal_sign",
      params: [walletAddress, message]
    });
  }
}

async function authenticateWalletSession() {
  if (!state.account.learnerId) {
    throw new Error("Set learner ID first.");
  }

  if (!state.wallet.address) {
    throw new Error("Connect wallet first.");
  }

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const message = buildWalletAuthMessage({
    learnerId: state.account.learnerId,
    walletAddress: state.wallet.address,
    issuedAt,
    expiresAt
  });

  const signature = await signPersonalMessage(message, state.wallet.address);
  const data = await apiPost("/api/auth-wallet", {
    learnerId: state.account.learnerId,
    learnerSecret: state.account.learnerSecret,
    walletAddress: state.wallet.address,
    issuedAt,
    expiresAt,
    signature
  });

  state.auth = {
    token: data.token || "",
    learnerId: state.account.learnerId,
    walletAddress: state.wallet.address,
    expiresAt
  };
  saveState();
}

async function ensureWalletAuth() {
  if (hasValidAuthSession()) {
    return;
  }

  await authenticateWalletSession();
}

function getAuthHeaders() {
  if (!hasValidAuthSession()) {
    return {};
  }

  return {
    Authorization: `Bearer ${state.auth.token}`
  };
}

function getCertificatePriceLabel(certificateId, fallbackUsd) {
  const priceWei = state.contract.certificatePricing[certificateId];
  if (priceWei && priceWei !== "0") {
    return `${formatWeiToEth(priceWei)} ETH`;
  }

  if (Number.isFinite(Number(fallbackUsd))) {
    return `$${Number(fallbackUsd).toFixed(2)}`;
  }

  return "N/A";
}

function formatWeiToEth(weiValue) {
  try {
    const wei = BigInt(String(weiValue || "0"));
    const whole = wei / 1000000000000000000n;
    const fraction = wei % 1000000000000000000n;
    const fractionText = fraction.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
    return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
  } catch {
    return "0";
  }
}

function shortTx(txHash) {
  const value = String(txHash || "");
  if (value.length < 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function apiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `request_failed_${response.status}`);
  }

  return data;
}

async function apiPost(url, payload, options = {}) {
  const extraHeaders = options.headers && typeof options.headers === "object" ? options.headers : {};
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `request_failed_${response.status}`);
  }

  return data;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
