const seedActivities = [
  { id: "act-squat", name: "Back Squat", type: "Weight lifting", muscles: ["quads", "glutes", "core"], defaults: { sets: 4, reps: 8, load: 80 } },
  { id: "act-deadlift", name: "Deadlift", type: "Weight lifting", muscles: ["hamstrings", "glutes", "back"], defaults: { sets: 3, reps: 5, load: 100 } },
  { id: "act-bench", name: "Bench Press", type: "Weight lifting", muscles: ["chest", "triceps", "shoulders"], defaults: { sets: 4, reps: 8, load: 60 } },
  { id: "act-row", name: "Seated Row", type: "Weight lifting", muscles: ["back", "biceps"], defaults: { sets: 3, reps: 10, load: 45 } },
  { id: "act-lunge", name: "Walking Lunge", type: "Weight lifting", muscles: ["quads", "glutes"], defaults: { sets: 3, reps: 12, load: 20 } },
  { id: "act-plank", name: "Plank", type: "Stretching", muscles: ["core", "shoulders"], defaults: { sets: 3, time: 45 } },
  { id: "act-hamstring", name: "Hamstring Stretch", type: "Stretching", muscles: ["hamstrings"], defaults: { sets: 2, time: 40 } },
  { id: "act-hip", name: "Hip Flexor Stretch", type: "Stretching", muscles: ["quads", "core"], defaults: { sets: 2, time: 35 } },
  { id: "act-run", name: "Treadmill Run", type: "Cardio", muscles: ["quads", "hamstrings", "calves"], defaults: { time: 20, distance: 3 } },
  { id: "act-bike", name: "Stationary Bike", type: "Cardio", muscles: ["quads", "calves"], defaults: { time: 25, distance: 10 } },
  { id: "act-rower", name: "Rowing Machine", type: "Cardio", muscles: ["back", "biceps", "quads"], defaults: { time: 15, distance: 3 } }
];

const starterWorkouts = [
  {
    id: "wo-leg-day",
    name: "Leg Day",
    goal: "Strength and lower body volume",
    activities: [
      templateActivity("act-squat"),
      templateActivity("act-deadlift"),
      templateActivity("act-lunge"),
      templateActivity("act-hamstring")
    ]
  },
  {
    id: "wo-cardio-core",
    name: "Cardio + Core",
    goal: "Conditioning with trunk stability",
    activities: [templateActivity("act-run"), templateActivity("act-plank"), templateActivity("act-bike")]
  }
];

const muscleLabels = {
  shoulders: "Shoulders",
  chest: "Chest",
  biceps: "Biceps",
  triceps: "Triceps",
  back: "Back",
  core: "Core",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves"
};

const state = {
  screen: "dashboard",
  authMode: "login",
  currentUserId: null,
  selectedWorkoutId: null,
  workoutsMode: "list",
  libraryFilter: "all",
  openSwipeWorkoutId: null,
  openSwipeActivityId: null,
  openSwipeSessionId: null,
  openSwipeLibraryActivityId: null,
  selectedSessionId: null,
  activeSession: null,
  sessionStartedAt: null,
  tick: null,
  modal: null,
  toast: ""
};

const store = loadStore();

function templateActivity(activityId) {
  const source = seedActivities.find((item) => item.id === activityId) || activityById(activityId);
  if (!source) {
    return {
      id: crypto.randomUUID(),
      activityId,
      target: {}
    };
  }
  return {
    id: crypto.randomUUID(),
    activityId,
    target: { ...source.defaults }
  };
}

function loadStore() {
  const stored = localStorage.getItem("workoutstudio-store") || localStorage.getItem("liftlog-store");
  if (stored) return normalizeStore(JSON.parse(stored));
  const demoUser = {
    id: "user-demo",
    name: "Demo Athlete",
    email: "demo@workoutstudio.local",
    password: "demo123",
    verified: true
  };
  const initial = {
    users: [demoUser],
    activities: seedActivities,
    workouts: starterWorkouts.map((workout) => ({ ...workout, userId: demoUser.id })),
    sessions: []
  };
  localStorage.setItem("workoutstudio-store", JSON.stringify(initial));
  return initial;
}

function saveStore() {
  localStorage.setItem("workoutstudio-store", JSON.stringify(store));
}

function normalizeStore(data) {
  data.users = data.users || [];
  data.users.forEach((user) => {
    if (user.email === "demo@liftlog.local") user.email = "demo@workoutstudio.local";
  });
  localStorage.setItem("workoutstudio-store", JSON.stringify(data));
  return data;
}

function currentUser() {
  return store.users.find((user) => user.id === state.currentUserId);
}

function userWorkouts() {
  return store.workouts.filter((workout) => workout.userId === state.currentUserId);
}

function userSessions() {
  return store.sessions.filter((session) => session.userId === state.currentUserId);
}

function selectedWorkout() {
  return userWorkouts().find((workout) => workout.id === state.selectedWorkoutId) || userWorkouts()[0];
}

function activityById(id) {
  return store.activities.find((activity) => activity.id === id);
}

function availableActivities() {
  return store.activities.filter((activity) => !activity.userId || activity.userId === state.currentUserId);
}

function libraryActivities() {
  const activities = availableActivities();
  if (state.libraryFilter === "custom") return activities.filter((activity) => isCustomActivity(activity));
  return activities;
}

function isCustomActivity(activity) {
  return activity.custom || activity.userId === state.currentUserId;
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = state.currentUserId ? renderShell() : renderAuth();
  bindEvents();
}

function renderAuth() {
  const title = state.authMode === "login" ? "Welcome back" : state.authMode === "register" ? "Create your account" : "Reset password";
  const subtitle =
    state.authMode === "login"
      ? "Sign in to manage templates, start sessions, and compare your training history."
      : state.authMode === "register"
        ? "Registration includes a demo email verification step so the SaaS flow is visible."
        : "Enter your email and the app will simulate a reset link.";
  return `
    <section class="auth-page">
      <div class="auth-box">
        <div class="brand"><span class="mark">WS</span><span>WorkoutStudio</span></div>
        <div>
          <p class="eyebrow">SaaS training tracker</p>
          <h1>${title}</h1>
          <p class="muted">${subtitle}</p>
        </div>
        <div class="tabs">
          <button data-auth-tab="login" class="${state.authMode === "login" ? "active" : ""}">Logon</button>
          <button data-auth-tab="register" class="${state.authMode === "register" ? "active" : ""}">Register</button>
          <button data-auth-tab="reset" class="${state.authMode === "reset" ? "active" : ""}">Reset</button>
        </div>
        ${renderAuthForm()}
        <p class="muted">Demo login: demo@workoutstudio.local / demo123</p>
      </div>
      <div class="auth-art" aria-hidden="true"></div>
    </section>
    ${renderToast()}
  `;
}

function renderAuthForm() {
  if (state.authMode === "reset") {
    return `
      <form class="form" data-action="reset">
        <label>Email<input name="email" type="email" required value="demo@workoutstudio.local" /></label>
        <button class="btn" type="submit">Send reset link</button>
      </form>
    `;
  }
  if (state.authMode === "register") {
    return `
      <form class="form" data-action="register">
        <label>Name<input name="name" required placeholder="Alex Morgan" /></label>
        <label>Email<input name="email" type="email" required placeholder="alex@example.com" /></label>
        <label>Password<input name="password" type="password" minlength="6" required placeholder="At least 6 characters" /></label>
        <button class="btn" type="submit">Create account</button>
      </form>
    `;
  }
  return `
    <form class="form" data-action="login">
      <label>Email<input name="email" type="email" required value="demo@workoutstudio.local" /></label>
      <label>Password<input name="password" type="password" required value="demo123" /></label>
      <button class="btn" type="submit">Logon</button>
    </form>
  `;
}

function renderShell() {
  const user = currentUser();
  return `
    <section class="shell">
      <header class="mobile-header">
        <div class="brand">
          ${renderHeaderAdd()}
          <span>WorkoutStudio</span>
        </div>
        <div class="account">
          <strong>${escapeHtml(user.name)}</strong>
          <button class="btn secondary" data-action="logout">Sign out</button>
        </div>
      </header>
      <section class="content">
        ${renderScreen()}
      </section>
      <nav class="bottom-nav">
        ${navButton("dashboard", "Home")}
        ${navButton("workouts", "Workouts")}
        ${navButton("session", "Session")}
        ${navButton("activities", "Library")}
      </nav>
    </section>
    ${state.modal ? renderModal() : ""}
    ${renderToast()}
  `;
}

function renderHeaderAdd() {
  if (state.screen === "activities") {
    return `<button class="header-add" data-modal="library-activity" aria-label="New library activity" title="New library activity">+</button>`;
  }
  if (state.screen !== "workouts") return "";
  if (state.workoutsMode === "detail" && selectedWorkout()) {
    return `<button class="header-add" data-modal="activity" data-workout-id="${selectedWorkout().id}" aria-label="Add activity" title="Add activity">+</button>`;
  }
  return `<button class="header-add" data-modal="workout" aria-label="New workout" title="New workout">+</button>`;
}

function navButton(screen, label) {
  return `<button data-screen="${screen}" class="${state.screen === screen ? "active" : ""}">${label}</button>`;
}

function renderScreen() {
  if (state.screen === "workouts") return renderWorkouts();
  if (state.screen === "session") return renderSession();
  if (state.screen === "activities") return renderActivities();
  return renderDashboard();
}

function renderDashboard() {
  const workouts = userWorkouts();
  const sessions = sortedUserSessions();
  const selectedSession = sessions.find((session) => session.id === state.selectedSessionId);
  const totalMinutes = sessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0);
  if (selectedSession) return renderSessionDetail(selectedSession);
  return `
    <div class="topbar">
      <div>
        <p class="eyebrow">Training command centre</p>
        <h1>Workout history.</h1>
      </div>
      <button class="btn primary-action" data-screen="session">Start workout</button>
    </div>
    <div class="grid three">
      <div class="panel stat"><span class="muted">Workout templates</span><strong>${workouts.length}</strong></div>
      <div class="panel stat"><span class="muted">Completed sessions</span><strong>${sessions.length}</strong></div>
      <div class="panel stat"><span class="muted">Training minutes</span><strong>${totalMinutes}</strong></div>
    </div>
    <div class="panel grid">
      <div class="toolbar"><h2>Completed workouts</h2><button class="btn secondary" data-screen="workouts">Manage templates</button></div>
      <div class="list">
        ${sessions.length ? sessions.map((session) => renderSessionHistoryRow(session)).join("") : `<div class="empty">Complete a session and your workout history will appear here.</div>`}
      </div>
    </div>
  `;
}

function sortedUserSessions() {
  return userSessions()
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function renderSessionHistoryRow(session) {
  const totalSets = session.entries.reduce((sum, entry) => sum + totalEntrySets(entry), 0);
  const totalReps = session.entries.reduce((sum, entry) => sum + totalEntryReps(entry), 0);
  const completed = new Date(session.completedAt);
  const muscleScores = sessionMuscleScores(session);
  const isOpen = state.openSwipeSessionId === session.id;
  return `
    <div class="swipe-session ${isOpen ? "open" : ""}" data-swipe-session="${session.id}">
      <button class="swipe-delete" data-delete-session="${session.id}" type="button">Delete</button>
      <article class="history-row" data-open-session="${session.id}" role="button" tabindex="0">
        <div class="history-body-map">${renderBodyMap(muscleScores)}</div>
        <div>
          <h3>${escapeHtml(session.workoutName)}</h3>
          <p class="muted">${completed.toLocaleString()}</p>
        </div>
        <div class="history-meta">
          <span>${formatDuration(session.duration)}</span>
          <span>${totalSets} sets</span>
          <span>${totalReps} reps</span>
        </div>
        <span class="row-chevron">›</span>
      </article>
    </div>
  `;
}

function renderSessionDetail(session) {
  return `
    <div class="topbar manage-topbar">
      <div>
        <button class="btn ghost back-action" data-session-list>Back</button>
        <p class="eyebrow">Completed workout</p>
        <h1>${escapeHtml(session.workoutName)}</h1>
        <p class="muted">${new Date(session.completedAt).toLocaleString()}</p>
      </div>
    </div>
    <div class="panel grid">
      ${renderCompletedSummary(session)}
      <div class="list">
        ${session.entries.map((entry) => renderCompletedEntryDetail(entry, session)).join("")}
      </div>
    </div>
  `;
}

function renderCompletedEntryDetail(entry, session) {
  const trend = exerciseTrend(entry, session);
  return `
    <article class="session-row">
      <div class="exercise-detail-head">
        <div>
          <h3>${escapeHtml(entry.activityName)}</h3>
          <p class="muted">${entry.type}</p>
        </div>
        <span class="trend-badge ${trend.status}">${trend.label}</span>
      </div>
      ${renderReadonlyRows(entry)}
    </article>
  `;
}

function renderReadonlyRows(entry) {
  const fields = rowFields(entry);
  const rows = entry.setRows?.length ? entry.setRows : [entry];
  return `
    <div class="set-table readonly-set-table">
      <div class="set-head readonly-set-head">
        <span>${entry.type === "Cardio" ? "Round" : "Set"}</span>
        ${fields.map((field) => `<span>${shortMetric(field)}</span>`).join("")}
        <span>Done</span>
      </div>
      ${rows.map((row, index) => `
        <div class="set-row readonly-set-row">
          <span class="set-number">${index + 1}</span>
          ${fields.map((field) => `<span class="readonly-value">${formatRowValue(row[field], field)}</span>`).join("")}
          <span class="readonly-done">${row.complete ? "Done" : "-"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWorkouts() {
  const workouts = userWorkouts();
  if (state.workoutsMode === "detail" && selectedWorkout()) {
    const workout = selectedWorkout();
    return `
      <div class="topbar manage-topbar">
        <div>
          <button class="btn ghost back-action" data-workouts-list>Back</button>
          <p class="eyebrow">Manage workout</p>
          <h1>${escapeHtml(workout.name)}</h1>
          <p class="muted">${escapeHtml(workout.goal || "No goal set")}</p>
        </div>
      </div>
      <div class="panel grid manage-workout-panel">
        ${renderWorkoutDetail(workout)}
      </div>
    `;
  }
  return `
    <div class="topbar">
      <div>
        <p class="eyebrow">Workout templates</p>
        <h1>Create and manage sessions before gym time.</h1>
      </div>
    </div>
    <div class="panel grid">
      <h2>Your workouts</h2>
      <div class="list">${workouts.length ? workouts.map((workout) => renderWorkoutRow(workout)).join("") : `<div class="empty">No workouts yet.</div>`}</div>
    </div>
  `;
}

function renderWorkoutRow(workout, compact = false) {
  const muscles = uniqueMuscles(workout);
  if (!compact) {
    const isOpen = state.openSwipeWorkoutId === workout.id;
    return `
      <div class="swipe-workout ${isOpen ? "open" : ""}" data-swipe-workout="${workout.id}">
        <button class="swipe-delete" data-delete-workout="${workout.id}" type="button">Delete</button>
        <article class="workout-row workout-tap-row" data-open-workout="${workout.id}" role="button" tabindex="0">
          <div class="grid">
            <div>
              <h3>${escapeHtml(workout.name)}</h3>
              <p class="muted">${escapeHtml(workout.goal || "No goal set")}</p>
            </div>
            <div class="chips">
              <span class="chip green">${workout.activities.length} activities</span>
              ${muscles.slice(0, 4).map((muscle) => `<span class="chip">${muscleLabels[muscle]}</span>`).join("")}
            </div>
          </div>
          <span class="row-chevron">›</span>
        </article>
      </div>
    `;
  }
  return `
    <article class="workout-row">
      <div class="grid">
        <div>
          <h3>${escapeHtml(workout.name)}</h3>
          <p class="muted">${escapeHtml(workout.goal || "No goal set")}</p>
        </div>
        <div class="chips">
          <span class="chip green">${workout.activities.length} activities</span>
          ${muscles.slice(0, 4).map((muscle) => `<span class="chip">${muscleLabels[muscle]}</span>`).join("")}
        </div>
      </div>
      <div class="toolbar">
        ${compact ? "" : `<button class="btn secondary" data-select-workout="${workout.id}">Select</button>`}
        <button class="icon-btn" title="Edit" aria-label="Edit ${escapeAttr(workout.name)}" data-edit-workout="${workout.id}">${pencilIcon()}</button>
        <button class="icon-btn" title="Delete" data-delete-workout="${workout.id}">X</button>
      </div>
    </article>
  `;
}

function renderWorkoutDetail(workout) {
  return `
    <div class="grid">
      <div class="toolbar">
        <button class="btn" data-start-workout="${workout.id}">Start workout</button>
        <button class="btn secondary" data-edit-workout="${workout.id}">Edit details</button>
      </div>
      <div class="list">
        ${workout.activities.length ? workout.activities.map((item) => renderTemplateActivity(workout, item)).join("") : `<div class="empty">Add stretches, cardio, and lifting activities.</div>`}
      </div>
    </div>
  `;
}

function renderTemplateActivity(workout, item) {
  const activity = activityById(item.activityId);
  const fields = templateFields(activity.type);
  const isOpen = state.openSwipeActivityId === item.id;
  return `
    <div class="swipe-activity ${isOpen ? "open" : ""}" data-swipe-activity="${item.id}">
      <button class="swipe-delete" data-remove-activity="${item.id}" data-workout-id="${workout.id}" type="button">Delete</button>
      <article class="activity-row">
        <div class="toolbar">
          <div>
            <h3>${activity.name}</h3>
            <p class="muted">${activity.type}</p>
          </div>
        </div>
        <div class="template-fields">
          ${fields.map((field) => renderTemplateField(workout.id, item, field)).join("")}
        </div>
        <div class="chips">${activity.muscles.map((muscle) => `<span class="chip gold">${muscleLabels[muscle]}</span>`).join("")}</div>
      </article>
    </div>
  `;
}

function templateFields(type) {
  if (type === "Cardio") return ["time", "distance"];
  if (type === "Stretching") return ["sets", "time", "reps"];
  return ["sets", "reps", "load"];
}

function renderTemplateField(workoutId, item, field) {
  return `
    <label class="template-field">
      <span>${templateFieldLabel(field)}</span>
      <input data-template-workout="${workoutId}" data-template-activity="${item.id}" data-field="${field}" type="number" min="0" step="${fieldStep(field)}" value="${item.target[field] || 0}" />
    </label>
  `;
}

function renderActivities() {
  const activities = libraryActivities();
  return `
    <div class="topbar">
      <div>
        <p class="eyebrow">Activity library</p>
        <h1>Create and manage movement options.</h1>
        <p class="muted">Library entries can be used across workout templates.</p>
      </div>
    </div>
    <div class="tabs library-filter">
      <button data-library-filter="all" class="${state.libraryFilter === "all" ? "active" : ""}">All</button>
      <button data-library-filter="custom" class="${state.libraryFilter === "custom" ? "active" : ""}">Custom</button>
    </div>
    <div class="activity-grid">
      ${activities.length ? activities.map((activity) => renderLibraryActivityCard(activity)).join("") : `<div class="empty">No custom activity entries yet.</div>`}
    </div>
  `;
}

function renderLibraryActivityCard(activity) {
  const editable = isCustomActivity(activity);
  const isOpen = state.openSwipeLibraryActivityId === activity.id;
  return `
    <div class="swipe-library ${isOpen ? "open" : ""} ${editable ? "" : "locked"}" ${editable ? `data-swipe-library="${activity.id}"` : ""}>
      ${editable ? `<button class="swipe-delete" data-delete-library-activity="${activity.id}" type="button">Delete</button>` : ""}
      <article class="card grid library-card">
        <div class="library-card-head">
          <div>
            <h3>${escapeHtml(activity.name)}</h3>
            <p class="muted">${activity.type}${activity.custom ? " · Custom" : ""}</p>
          </div>
          ${editable ? `<button class="icon-btn library-edit" title="Edit" aria-label="Edit ${escapeAttr(activity.name)}" data-modal="library-activity" data-activity-id="${activity.id}">${pencilIcon()}</button>` : `<span class="library-lock">Built-in</span>`}
        </div>
        <div class="chips">${activity.muscles.map((muscle) => `<span class="chip">${muscleLabels[muscle]}</span>`).join("")}</div>
        <div class="template-fields">
          ${Object.entries(activity.defaults || {}).map(([key, value]) => `
            <span class="library-default">${templateFieldLabel(key)}: ${value}</span>
          `).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderSession() {
  const workouts = userWorkouts();
  if (!state.activeSession) {
    return `
      <div class="topbar">
        <div>
          <p class="eyebrow">Workout session</p>
          <h1>Pick a template and start the clock.</h1>
        </div>
      </div>
      <div class="panel grid start-panel">
        <label>Workout
          <select data-session-workout>
            ${workouts.map((workout) => `<option value="${workout.id}" ${selectedWorkout()?.id === workout.id ? "selected" : ""}>${escapeHtml(workout.name)}</option>`).join("")}
          </select>
        </label>
        <button class="btn" data-start-workout="${selectedWorkout()?.id || ""}" ${workouts.length ? "" : "disabled"}>Start workout</button>
        ${workouts.length ? "" : `<div class="empty">Create a workout first.</div>`}
      </div>
    `;
  }
  const elapsed = Math.floor((Date.now() - state.sessionStartedAt) / 1000);
  return `
    <div class="session-topbar">
      <div>
        <p class="eyebrow">Active session</p>
        <h1>${escapeHtml(state.activeSession.workoutName)}</h1>
      </div>
      <div class="timer">${formatDuration(elapsed)}</div>
    </div>
    <div class="panel grid">
      <div class="list">
        ${state.activeSession.entries.map((entry) => renderSessionEntry(entry)).join("")}
      </div>
      <div class="session-actions">
        <button class="btn" data-complete-session>Complete workout</button>
        <button class="btn secondary" data-cancel-session>Cancel</button>
      </div>
    </div>
  `;
}

function renderSessionEntry(entry) {
  const previous = previousBest(entry.activityId);
  return `
    <article class="session-row">
      <div>
        <h3>${entry.activityName}</h3>
        <p class="muted">Previous: ${previous || "No prior result"}</p>
      </div>
      ${renderSetRows(entry)}
    </article>
  `;
}

function renderSetRows(entry) {
  const lastRows = previousSetRows(entry.activityId);
  const fields = rowFields(entry);
  return `
    <div class="set-table" role="group" aria-label="${escapeAttr(entry.activityName)} sets">
      <div class="set-head">
        <span>Done</span>
        <span>Last</span>
        <span>${entry.type === "Cardio" ? "Round" : "Set"}</span>
        ${fields.map((field) => `<span>${shortMetric(field)}</span>`).join("")}
      </div>
      ${entry.setRows.map((row, index) => `
        <div class="set-row">
          <button class="set-complete ${row.complete ? "complete" : ""}" type="button" data-set-complete="${entry.id}" data-row="${row.id}" aria-pressed="${row.complete ? "true" : "false"}">${row.complete ? "Done" : "Done"}</button>
          <span class="last-set">${formatPreviousSet(lastRows[index], entry.type)}</span>
          <span class="set-number">${index + 1}</span>
          ${fields.map((field) => renderSetInput(entry, row, field, fieldStep(field))).join("")}
        </div>
      `).join("")}
      <button class="btn secondary" type="button" data-add-set="${entry.id}">${entry.type === "Cardio" ? "Add round" : "Add set"}</button>
    </div>
  `;
}

function renderSetInput(entry, row, field, step) {
  return `
    <div class="set-input">
      <input data-set-entry="${entry.id}" data-row="${row.id}" data-field="${field}" type="number" min="0" step="${step}" value="${row[field] || 0}" />
    </div>
  `;
}

function rowFields(entry) {
  if (entry.type === "Cardio") return ["time", "distance"];
  if (entry.type === "Stretching") return ["time", "reps"];
  return ["reps", "load"];
}

function fieldStep(field) {
  if (field === "distance") return 0.1;
  if (field === "load") return 2.5;
  return 1;
}

function formatRowValue(value, field) {
  const number = Number(value || 0);
  if (field === "load") return `${number} kg`;
  if (field === "distance") return `${number} km`;
  if (field === "time") return `${number} min`;
  return String(number);
}

function renderCompletedSummary(session) {
  const muscles = sessionMuscleScores(session);
  const top = Object.entries(muscles).sort((a, b) => b[1] - a[1]);
  const totalSets = session.entries.reduce((sum, entry) => sum + totalEntrySets(entry), 0);
  const totalReps = session.entries.reduce((sum, entry) => sum + totalEntryReps(entry), 0);
  return `
    <div class="grid">
      <div class="body-wrap">
        ${renderBodyMap(muscles)}
        <div class="summary-lines">
          <strong>${escapeHtml(session.workoutName)}</strong>
          <span class="muted">${new Date(session.completedAt).toLocaleString()}</span>
          <span>${formatDuration(session.duration)} total</span>
          <span>${totalSets} sets and ${totalReps} reps logged</span>
          <span>Primary focus: ${top.slice(0, 3).map(([muscle]) => muscleLabels[muscle]).join(", ") || "No completed sets marked"}</span>
        </div>
      </div>
    </div>
  `;
}

function renderBodyMap(muscleScores) {
  const scores = Array.isArray(muscleScores)
    ? Object.fromEntries(muscleScores.map((muscle) => [muscle, 1]))
    : muscleScores;
  const maxScore = Math.max(0, ...Object.values(scores).map((score) => Number(score || 0)));
  const cls = (muscle) => {
    const score = Number(scores[muscle] || 0);
    if (!score || !maxScore) return "muscle";
    const ratio = score / maxScore;
    if (ratio >= 0.75) return "muscle intensity-4";
    if (ratio >= 0.5) return "muscle intensity-3";
    if (ratio >= 0.25) return "muscle intensity-2";
    return "muscle intensity-1";
  };
  return `
    <svg class="body-svg" viewBox="0 0 150 300" role="img" aria-label="Muscles worked">
      <circle class="muscle" cx="75" cy="28" r="20"></circle>
      <rect class="${cls("shoulders")}" x="34" y="54" width="82" height="25" rx="12"></rect>
      <rect class="${cls("chest")}" x="48" y="78" width="54" height="42" rx="12"></rect>
      <rect class="${cls("core")}" x="52" y="119" width="46" height="55" rx="12"></rect>
      <rect class="${cls("biceps")}" x="20" y="82" width="22" height="70" rx="11"></rect>
      <rect class="${cls("triceps")}" x="108" y="82" width="22" height="70" rx="11"></rect>
      <rect class="${cls("glutes")}" x="50" y="174" width="50" height="28" rx="12"></rect>
      <rect class="${cls("quads")}" x="45" y="202" width="26" height="58" rx="12"></rect>
      <rect class="${cls("hamstrings")}" x="79" y="202" width="26" height="58" rx="12"></rect>
      <rect class="${cls("calves")}" x="47" y="260" width="24" height="35" rx="11"></rect>
      <rect class="${cls("calves")}" x="79" y="260" width="24" height="35" rx="11"></rect>
      <rect class="${cls("back")}" x="61" y="83" width="28" height="86" rx="12" opacity="0.65"></rect>
    </svg>
  `;
}

function renderModal() {
  if (state.modal.type === "workout") {
    const workout = state.modal.workout;
    return `
      <div class="modal">
        <form class="modal-panel" data-action="save-workout">
          <h2>${workout ? "Edit workout" : "New workout"}</h2>
          <input type="hidden" name="id" value="${workout?.id || ""}" />
          <label>Name<input name="name" required value="${escapeAttr(workout?.name || "")}" placeholder="Leg day" /></label>
          <label>Goal<textarea name="goal" placeholder="Strength, conditioning, mobility...">${escapeHtml(workout?.goal || "")}</textarea></label>
          <div class="toolbar">
            <button class="btn" type="submit">Save</button>
            <button class="btn secondary" type="button" data-close-modal>Cancel</button>
          </div>
        </form>
      </div>
    `;
  }
  if (state.modal.type === "library-activity") {
    return renderLibraryActivityModal(state.modal.activity);
  }
  const workout = store.workouts.find((item) => item.id === state.modal.workoutId);
  return `
    <div class="modal">
      <div class="modal-panel">
        <h2>Add activity to ${escapeHtml(workout.name)}</h2>
        <form class="custom-activity-form" data-action="create-activity">
          <input type="hidden" name="workoutId" value="${workout.id}" />
          <div class="custom-activity-head">
            <h3>Custom activity</h3>
            <button class="btn" type="submit">Create</button>
          </div>
          <label>Name<input name="name" required placeholder="Incline dumbbell press" /></label>
          <label>Type
            <select name="type" required>
              <option value="Weight lifting">Weight lifting</option>
              <option value="Cardio">Cardio</option>
              <option value="Stretching">Stretching</option>
            </select>
          </label>
          <div class="muscle-picker" aria-label="Muscles worked">
            ${Object.entries(muscleLabels).map(([id, label]) => `
              <label class="muscle-option">
                <input type="checkbox" name="muscles" value="${id}" />
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
        </form>
        <div class="activity-grid">
          ${availableActivities().map((activity) => `
            <button class="activity-pick" data-add-activity="${activity.id}" data-workout-id="${workout.id}">
              <strong>${activity.name}</strong>
              <p class="muted">${activity.type}</p>
            </button>
          `).join("")}
        </div>
        <button class="btn secondary" data-close-modal>Cancel</button>
      </div>
    </div>
  `;
}

function renderLibraryActivityModal(activity) {
  const defaults = activity?.defaults || {};
  return `
    <div class="modal">
      <form class="modal-panel" data-action="save-library-activity">
        <h2>${activity ? "Edit activity" : "New activity"}</h2>
        <input type="hidden" name="id" value="${activity?.id || ""}" />
        <label>Name<input name="name" required value="${escapeAttr(activity?.name || "")}" placeholder="Incline dumbbell press" /></label>
        <label>Type
          <select name="type" required>
            ${["Weight lifting", "Cardio", "Stretching"].map((type) => `<option value="${type}" ${activity?.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </label>
        <div class="template-fields">
          ${["sets", "reps", "load", "time", "distance"].map((field) => `
            <label class="template-field">
              <span>${templateFieldLabel(field)}</span>
              <input name="${field}" type="number" min="0" step="${fieldStep(field)}" value="${defaults[field] || 0}" />
            </label>
          `).join("")}
        </div>
        <div class="muscle-picker" aria-label="Muscles worked">
          ${Object.entries(muscleLabels).map(([id, label]) => `
            <label class="muscle-option">
              <input type="checkbox" name="muscles" value="${id}" ${activity?.muscles?.includes(id) ? "checked" : ""} />
              <span>${label}</span>
            </label>
          `).join("")}
        </div>
        <div class="toolbar">
          <button class="btn" type="submit">Save</button>
          <button class="btn secondary" type="button" data-close-modal>Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function renderToast() {
  return state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : "";
}

function pencilIcon() {
  return `
    <svg class="edit-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16v4z"></path>
      <path d="M13.5 6.5l4 4"></path>
    </svg>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.screen;
      if (state.screen === "workouts") state.workoutsMode = "list";
      if (state.screen === "dashboard") state.selectedSessionId = null;
      state.openSwipeSessionId = null;
      state.openSwipeLibraryActivityId = null;
      render();
    });
  });
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authTab;
      render();
    });
  });
  document.querySelectorAll("[data-library-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.libraryFilter = button.dataset.libraryFilter;
      state.openSwipeLibraryActivityId = null;
      render();
    });
  });
  document.querySelectorAll("form[data-action]").forEach((form) => {
    form.addEventListener("submit", handleForm);
  });
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", logout));
  document.querySelectorAll("[data-modal='workout']").forEach((button) => button.addEventListener("click", () => openWorkoutModal()));
  document.querySelectorAll("[data-modal='activity']").forEach((button) => button.addEventListener("click", () => openActivityModal(button.dataset.workoutId)));
  document.querySelectorAll("[data-modal='library-activity']").forEach((button) => button.addEventListener("click", () => openLibraryActivityModal(button.dataset.activityId)));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  document.querySelectorAll("[data-select-workout]").forEach((button) => {
    button.addEventListener("click", () => {
      openWorkoutDetail(button.dataset.selectWorkout);
    });
  });
  document.querySelectorAll("[data-open-workout]").forEach((row) => {
    row.addEventListener("click", () => openWorkoutDetail(row.dataset.openWorkout));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWorkoutDetail(row.dataset.openWorkout);
      }
    });
  });
  document.querySelectorAll("[data-swipe-workout]").forEach((row) => bindSwipeRow(row));
  document.querySelectorAll("[data-workouts-list]").forEach((button) => {
    button.addEventListener("click", () => {
      state.workoutsMode = "list";
      state.openSwipeWorkoutId = null;
      state.openSwipeActivityId = null;
      render();
    });
  });
  document.querySelectorAll("[data-open-session]").forEach((row) => {
    row.addEventListener("click", () => openSessionDetail(row.dataset.openSession));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSessionDetail(row.dataset.openSession);
      }
    });
  });
  document.querySelectorAll("[data-swipe-session]").forEach((row) => bindSessionSwipeRow(row));
  document.querySelectorAll("[data-session-list]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSessionId = null;
      state.openSwipeSessionId = null;
      render();
    });
  });
  document.querySelectorAll("[data-delete-session]").forEach((button) => button.addEventListener("click", () => deleteSession(button.dataset.deleteSession)));
  document.querySelectorAll("[data-delete-library-activity]").forEach((button) => button.addEventListener("click", () => deleteLibraryActivity(button.dataset.deleteLibraryActivity)));
  document.querySelectorAll("[data-swipe-library]").forEach((row) => bindLibrarySwipeRow(row));
  document.querySelectorAll("[data-edit-workout]").forEach((button) => button.addEventListener("click", () => openWorkoutModal(button.dataset.editWorkout)));
  document.querySelectorAll("[data-delete-workout]").forEach((button) => button.addEventListener("click", () => deleteWorkout(button.dataset.deleteWorkout)));
  document.querySelectorAll("[data-remove-activity]").forEach((button) => {
    button.addEventListener("click", () => removeActivity(button.dataset.workoutId, button.dataset.removeActivity));
  });
  document.querySelectorAll("[data-swipe-activity]").forEach((row) => bindActivitySwipeRow(row));
  document.querySelectorAll("[data-template-activity]").forEach((input) => {
    input.addEventListener("input", () => updateTemplateActivity(input.dataset.templateWorkout, input.dataset.templateActivity, input.dataset.field, input.value));
  });
  document.querySelectorAll("[data-add-activity]").forEach((button) => {
    button.addEventListener("click", () => addActivity(button.dataset.workoutId, button.dataset.addActivity));
  });
  document.querySelectorAll("[data-start-workout]").forEach((button) => button.addEventListener("click", () => startWorkout(button.dataset.startWorkout)));
  document.querySelectorAll("[data-session-workout]").forEach((select) => {
    select.addEventListener("change", () => {
      state.selectedWorkoutId = select.value;
      render();
    });
  });
  document.querySelectorAll("[data-set-entry]").forEach((input) => {
    input.addEventListener("input", () => updateSetRow(input.dataset.setEntry, input.dataset.row, input.dataset.field, input.value));
  });
  document.querySelectorAll("[data-set-complete]").forEach((input) => {
    input.addEventListener("click", () => toggleSetComplete(input.dataset.setComplete, input.dataset.row));
  });
  document.querySelectorAll("[data-add-set]").forEach((button) => {
    button.addEventListener("click", () => addSetRow(button.dataset.addSet));
  });
  document.querySelectorAll("[data-complete-session]").forEach((button) => button.addEventListener("click", completeSession));
  document.querySelectorAll("[data-cancel-session]").forEach((button) => button.addEventListener("click", cancelSession));
}

function handleForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.action;
  if (action === "login") login(data);
  if (action === "register") register(data);
  if (action === "reset") resetPassword(data);
  if (action === "save-workout") saveWorkout(data);
  if (action === "create-activity") createCustomActivity(form, data);
  if (action === "save-library-activity") saveLibraryActivity(form, data);
}

function openWorkoutDetail(workoutId) {
  state.selectedWorkoutId = workoutId;
  state.workoutsMode = "detail";
  state.openSwipeWorkoutId = null;
  state.openSwipeActivityId = null;
  render();
}

function openSessionDetail(sessionId) {
  state.selectedSessionId = sessionId;
  state.openSwipeSessionId = null;
  render();
}

function bindSwipeRow(row) {
  let startX = 0;
  let startY = 0;
  let swiped = false;
  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiped = false;
  });
  row.addEventListener("pointerup", (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    swiped = true;
    state.openSwipeWorkoutId = deltaX < 0 ? row.dataset.swipeWorkout : null;
    render();
  });
  row.querySelector("[data-open-workout]")?.addEventListener("click", (event) => {
    if (!swiped) return;
    event.preventDefault();
    event.stopPropagation();
  });
}

function bindActivitySwipeRow(row) {
  let startX = 0;
  let startY = 0;
  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
  });
  row.addEventListener("pointerup", (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    state.openSwipeActivityId = deltaX < 0 ? row.dataset.swipeActivity : null;
    render();
  });
}

function bindSessionSwipeRow(row) {
  let startX = 0;
  let startY = 0;
  let swiped = false;
  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiped = false;
  });
  row.addEventListener("pointerup", (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    swiped = true;
    state.openSwipeSessionId = deltaX < 0 ? row.dataset.swipeSession : null;
    render();
  });
  row.querySelector("[data-open-session]")?.addEventListener("click", (event) => {
    if (!swiped) return;
    event.preventDefault();
    event.stopPropagation();
  });
}

function bindLibrarySwipeRow(row) {
  let startX = 0;
  let startY = 0;
  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
  });
  row.addEventListener("pointerup", (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    state.openSwipeLibraryActivityId = deltaX < 0 ? row.dataset.swipeLibrary : null;
    render();
  });
}

function login({ email, password }) {
  const user = store.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
  if (!user) return showToast("Those login details did not match a user.");
  if (!user.verified) return showToast("Please verify your email before logging on.");
  state.currentUserId = user.id;
  state.selectedWorkoutId = userWorkouts()[0]?.id || null;
  showToast("Logged on successfully.");
  render();
}

function register({ name, email, password }) {
  if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return showToast("That email is already registered.");
  }
  const user = { id: crypto.randomUUID(), name, email, password, verified: true };
  store.users.push(user);
  store.workouts.push(
    ...starterWorkouts.map((workout) => ({
      ...workout,
      id: crypto.randomUUID(),
      userId: user.id,
      activities: workout.activities.map((activity) => ({ ...activity, id: crypto.randomUUID() }))
    }))
  );
  saveStore();
  state.currentUserId = user.id;
  state.selectedWorkoutId = userWorkouts()[0]?.id || null;
  showToast("Account created. Email verification simulated as complete.");
  render();
}

function resetPassword({ email }) {
  const exists = store.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
  showToast(exists ? "Password reset link simulated. Check your email flow in production." : "If that email exists, a reset link will be sent.");
}

function logout() {
  cancelTimer();
  state.currentUserId = null;
  state.activeSession = null;
  state.screen = "dashboard";
  state.workoutsMode = "list";
  state.openSwipeActivityId = null;
  state.openSwipeSessionId = null;
  state.openSwipeLibraryActivityId = null;
  render();
}

function openWorkoutModal(workoutId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  state.modal = { type: "workout", workout };
  render();
}

function openActivityModal(workoutId) {
  state.modal = { type: "activity", workoutId };
  render();
}

function openLibraryActivityModal(activityId) {
  const activity = activityId ? activityById(activityId) : null;
  if (activity && !isCustomActivity(activity)) return;
  state.openSwipeLibraryActivityId = null;
  state.modal = { type: "library-activity", activity };
  render();
}

function closeModal() {
  state.modal = null;
  render();
}

function saveWorkout(data) {
  if (data.id) {
    const workout = store.workouts.find((item) => item.id === data.id);
    workout.name = data.name;
    workout.goal = data.goal;
  } else {
    const workout = {
      id: crypto.randomUUID(),
      userId: state.currentUserId,
      name: data.name,
      goal: data.goal,
      activities: []
    };
    store.workouts.push(workout);
    state.selectedWorkoutId = workout.id;
    state.workoutsMode = "detail";
  }
  saveStore();
  state.modal = null;
  showToast("Workout saved.");
  render();
}

function deleteWorkout(workoutId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  if (!workout || !confirm(`Delete ${workout.name}?`)) return;
  store.workouts = store.workouts.filter((item) => item.id !== workoutId);
  if (state.openSwipeWorkoutId === workoutId) state.openSwipeWorkoutId = null;
  if (state.selectedWorkoutId === workoutId) {
    state.selectedWorkoutId = userWorkouts()[0]?.id || null;
    state.workoutsMode = "list";
  }
  saveStore();
  render();
}

function deleteSession(sessionId) {
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session || !confirm(`Delete completed workout ${session.workoutName}?`)) return;
  store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  if (state.selectedSessionId === sessionId) state.selectedSessionId = null;
  if (state.openSwipeSessionId === sessionId) state.openSwipeSessionId = null;
  saveStore();
  render();
}

function saveLibraryActivity(form, data) {
  const muscles = new FormData(form).getAll("muscles");
  const defaults = defaultsFromForm(data);
  if (data.id) {
    const activity = activityById(data.id);
    if (!activity) return;
    if (!isCustomActivity(activity)) return;
    activity.name = data.name.trim();
    activity.type = data.type;
    activity.muscles = muscles.length ? muscles : defaultMusclesForType(data.type);
    activity.defaults = defaults;
    activity.custom = activity.custom || Boolean(activity.userId);
  } else {
    store.activities.push({
      id: crypto.randomUUID(),
      name: data.name.trim(),
      type: data.type,
      muscles: muscles.length ? muscles : defaultMusclesForType(data.type),
      defaults,
      custom: true,
      userId: state.currentUserId
    });
  }
  saveStore();
  state.modal = null;
  showToast("Library activity saved.");
  render();
}

function defaultsFromForm(data) {
  const base = {
    sets: Number(data.sets || 0),
    reps: Number(data.reps || 0),
    load: Number(data.load || 0),
    time: Number(data.time || 0),
    distance: Number(data.distance || 0)
  };
  if (data.type === "Cardio") return { time: base.time || 10, distance: base.distance || 1 };
  if (data.type === "Stretching") return { sets: base.sets || 2, time: base.time || 1, reps: base.reps || 0 };
  return { sets: base.sets || 3, reps: base.reps || 10, load: base.load || 0 };
}

function deleteLibraryActivity(activityId) {
  const activity = activityById(activityId);
  if (activity && !isCustomActivity(activity)) return;
  if (!activity || !confirm(`Delete ${activity.name} from the library?`)) return;
  store.activities = store.activities.filter((item) => item.id !== activityId);
  store.workouts.forEach((workout) => {
    workout.activities = workout.activities.filter((item) => item.activityId !== activityId);
  });
  if (state.openSwipeLibraryActivityId === activityId) state.openSwipeLibraryActivityId = null;
  saveStore();
  showToast("Library activity deleted.");
  render();
}

function addActivity(workoutId, activityId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  workout.activities.push(templateActivity(activityId));
  saveStore();
  state.modal = null;
  showToast("Activity added to workout.");
  render();
}

function createCustomActivity(form, data) {
  const muscles = new FormData(form).getAll("muscles");
  const activity = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    type: data.type,
    muscles: muscles.length ? muscles : defaultMusclesForType(data.type),
    defaults: defaultActivityTarget(data.type),
    custom: true,
    userId: state.currentUserId
  };
  store.activities.push(activity);
  addActivity(data.workoutId, activity.id);
  showToast("Custom activity added.");
}

function defaultActivityTarget(type) {
  if (type === "Cardio") return { time: 10, distance: 1 };
  if (type === "Stretching") return { sets: 2, time: 1, reps: 0 };
  return { sets: 3, reps: 10, load: 0 };
}

function defaultMusclesForType(type) {
  if (type === "Cardio") return ["quads", "hamstrings", "calves"];
  if (type === "Stretching") return ["core"];
  return ["chest"];
}

function removeActivity(workoutId, templateActivityId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  workout.activities = workout.activities.filter((item) => item.id !== templateActivityId);
  if (state.openSwipeActivityId === templateActivityId) state.openSwipeActivityId = null;
  saveStore();
  render();
}

function updateTemplateActivity(workoutId, templateActivityId, field, value) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  const activity = workout?.activities.find((item) => item.id === templateActivityId);
  if (!activity) return;
  activity.target[field] = Number(value);
  saveStore();
}

function startWorkout(workoutId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  if (!workout) return;
  state.selectedWorkoutId = workout.id;
  state.screen = "session";
  state.sessionStartedAt = Date.now();
  state.activeSession = {
    id: crypto.randomUUID(),
    userId: state.currentUserId,
    workoutId: workout.id,
    workoutName: workout.name,
    entries: workout.activities.map((item) => {
      const activity = activityById(item.activityId);
      return {
        id: crypto.randomUUID(),
        activityId: activity.id,
        activityName: activity.name,
        muscles: activity.muscles,
        type: activity.type,
        sets: item.target.sets || 0,
        reps: item.target.reps || 0,
        time: item.target.time || 0,
        distance: item.target.distance || 0,
        load: item.target.load || 0,
        setRows: buildSetRows(activity.type, item.target)
      };
    })
  };
  cancelTimer();
  state.tick = setInterval(render, 1000);
  render();
}

function buildSetRows(type, target) {
  const setCount = type === "Cardio" ? 1 : Math.max(1, Number(target.sets || 1));
  return Array.from({ length: setCount }, () => ({
    id: crypto.randomUUID(),
    reps: Number(target.reps || 0),
    load: Number(target.load || 0),
    time: Number(target.time || 0),
    distance: Number(target.distance || 0),
    complete: false
  }));
}

function updateSetRow(entryId, rowId, field, value) {
  const row = findSetRow(entryId, rowId);
  if (!row) return;
  row[field] = Number(value);
}

function toggleSetComplete(entryId, rowId) {
  const row = findSetRow(entryId, rowId);
  if (!row) return;
  row.complete = !row.complete;
  render();
}

function addSetRow(entryId) {
  const entry = state.activeSession.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const last = entry.setRows.at(-1) || {
    reps: entry.reps || 0,
    load: entry.load || 0,
    time: entry.time || 0,
    distance: entry.distance || 0
  };
  entry.setRows.push({
    id: crypto.randomUUID(),
    reps: Number(last.reps || 0),
    load: Number(last.load || 0),
    time: Number(last.time || 0),
    distance: Number(last.distance || 0),
    complete: false
  });
  entry.sets = entry.setRows.length;
  render();
}

function findSetRow(entryId, rowId) {
  const entry = state.activeSession.entries.find((item) => item.id === entryId);
  return entry?.setRows.find((row) => row.id === rowId);
}

function completeSession() {
  const session = {
    ...state.activeSession,
    duration: Math.max(1, Math.floor((Date.now() - state.sessionStartedAt) / 1000)),
    completedAt: new Date().toISOString()
  };
  store.sessions.push(session);
  saveStore();
  state.activeSession = null;
  state.sessionStartedAt = null;
  state.selectedSessionId = null;
  state.screen = "dashboard";
  cancelTimer();
  showToast("Workout complete. Summary updated.");
  render();
}

function cancelSession() {
  if (!confirm("Cancel this active workout?")) return;
  state.activeSession = null;
  state.sessionStartedAt = null;
  cancelTimer();
  render();
}

function cancelTimer() {
  if (state.tick) clearInterval(state.tick);
  state.tick = null;
}

function previousBest(activityId) {
  const entries = userSessions()
    .flatMap((session) => session.entries)
    .filter((entry) => entry.activityId === activityId);
  if (!entries.length) return "";
  const best = entries.reduce((winner, entry) => volume(entry) > volume(winner) ? entry : winner, entries[0]);
  return describeEntry(best);
}

function previousSetRows(activityId) {
  const previousSession = userSessions()
    .slice()
    .reverse()
    .find((session) => session.entries.some((entry) => entry.activityId === activityId && entry.setRows?.length));
  return previousSession?.entries.find((entry) => entry.activityId === activityId)?.setRows || [];
}

function formatPreviousSet(row, type) {
  if (!row) return "-";
  if (type === "Cardio") {
    const time = Number(row.time || 0);
    const distance = Number(row.distance || 0);
    if (!time && !distance) return "-";
    return `${time} min / ${distance} km`;
  }
  if (type === "Stretching") {
    const time = Number(row.time || 0);
    const reps = Number(row.reps || 0);
    if (!time && !reps) return "-";
    return reps ? `${time} min / ${reps} reps` : `${time} min`;
  }
  const reps = Number(row.reps || 0);
  const load = Number(row.load || 0);
  if (!reps && !load) return "-";
  return `${reps} x ${load}kg`;
}

function describeEntry(entry) {
  if (entry.setRows?.length) {
    if (entry.type === "Cardio") {
      const totalTime = entry.setRows.reduce((sum, row) => sum + Number(row.time || 0), 0);
      const totalDistance = entry.setRows.reduce((sum, row) => sum + Number(row.distance || 0), 0);
      return `${totalTime} min, ${Number(totalDistance.toFixed(1))} km`;
    }
    if (entry.type === "Stretching") {
      const totalTime = entry.setRows.reduce((sum, row) => sum + Number(row.time || 0), 0);
      return `${entry.setRows.length} sets, ${totalTime} min`;
    }
    const totalSets = totalEntrySets(entry);
    const totalReps = totalEntryReps(entry);
    const heaviest = Math.max(...entry.setRows.map((row) => Number(row.load || 0)));
    return `${totalSets} sets, ${totalReps} reps, up to ${heaviest} kg`;
  }
  const pieces = [];
  if (entry.sets) pieces.push(`${entry.sets} sets`);
  if (entry.reps) pieces.push(`${entry.reps} reps`);
  if (entry.load) pieces.push(`${entry.load} kg`);
  if (entry.time) pieces.push(`${entry.time} min`);
  if (entry.distance) pieces.push(`${entry.distance} km`);
  return pieces.join(", ");
}

function volume(entry) {
  if (entry.setRows?.length) {
    if (entry.type === "Cardio") {
      return entry.setRows.reduce((sum, row) => sum + Number(row.time || 0) * 10 + Number(row.distance || 0) * 20, 0);
    }
    if (entry.type === "Stretching") {
      return entry.setRows.reduce((sum, row) => sum + Number(row.time || 0) * 10 + Number(row.reps || 0), 0);
    }
    return entry.setRows.reduce((sum, row) => sum + Number(row.reps || 0) * Math.max(1, Number(row.load || 1)), 0);
  }
  return Number(entry.sets || 0) * Number(entry.reps || 0) * Math.max(1, Number(entry.load || 1)) + Number(entry.time || 0) * 10 + Number(entry.distance || 0) * 20;
}

function exerciseTrend(entry, session) {
  const current = entryCompletedIntensity(entry);
  const previousEntry = previousCompletedEntry(entry.activityId, session.completedAt);
  if (!previousEntry) return { status: "neutral", label: "No previous" };
  const previous = entryCompletedIntensity(previousEntry);
  if (!previous && !current) return { status: "neutral", label: "No change" };
  if (!previous && current) return { status: "up", label: "Trending up" };
  const change = ((current - previous) / previous) * 100;
  if (change > 2) return { status: "up", label: `Up ${Math.round(change)}%` };
  if (change < -2) return { status: "down", label: `Down ${Math.abs(Math.round(change))}%` };
  return { status: "neutral", label: "No change" };
}

function previousCompletedEntry(activityId, completedAt) {
  const completedTime = new Date(completedAt).getTime();
  return userSessions()
    .filter((session) => new Date(session.completedAt).getTime() < completedTime)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .flatMap((session) => session.entries)
    .find((entry) => entry.activityId === activityId);
}

function entryCompletedIntensity(entry) {
  const rows = entry.setRows?.length ? entry.setRows.filter((row) => row.complete) : [entry];
  return rows.reduce((sum, row) => sum + completedRowScore(entry, row), 0);
}

function totalEntrySets(entry) {
  if (entry.setRows?.length) return entry.setRows.length;
  return Number(entry.sets || 0);
}

function totalEntryReps(entry) {
  if (entry.setRows?.length) return entry.setRows.reduce((sum, row) => sum + Number(row.reps || 0), 0);
  return Number(entry.sets || 0) * Number(entry.reps || 0);
}

function sessionMuscleScores(session) {
  return session.entries.reduce((scores, entry) => {
    const completedRows = (entry.setRows || []).filter((row) => row.complete);
    const score = completedRows.reduce((sum, row) => sum + completedRowScore(entry, row), 0);
    if (!score) return scores;
    entry.muscles.forEach((muscle) => {
      scores[muscle] = (scores[muscle] || 0) + score;
    });
    return scores;
  }, {});
}

function completedRowScore(entry, row) {
  if (entry.type === "Cardio") {
    return Number(row.time || 0) * 10 + Number(row.distance || 0) * 20;
  }
  if (entry.type === "Stretching") {
    return Number(row.time || 0) * 5 + Number(row.reps || 0);
  }
  return Number(row.reps || 0) * Math.max(1, Number(row.load || 1));
}

function uniqueMuscles(workout) {
  return [...new Set(workout.activities.flatMap((item) => activityById(item.activityId).muscles))];
}

function labelMetric(metric) {
  return { sets: "Sets", reps: "Reps", load: "Load kg", time: "Time sec/min", distance: "Distance km" }[metric] || metric;
}

function shortMetric(metric) {
  return { sets: "Sets", reps: "Reps", load: "Kg", time: "Min", distance: "Km" }[metric] || metric;
}

function templateFieldLabel(metric) {
  return { sets: "Sets", reps: "Reps", load: "Starting kg", time: "Minutes", distance: "Km" }[metric] || metric;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function showToast(message) {
  state.toast = message;
  setTimeout(() => {
    state.toast = "";
    render();
  }, 3000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

render();
