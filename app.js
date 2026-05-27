const activityTypeTags = ["Weight lifting", "Cardio", "Stretching"];
const allowedMuscleTags = ["chest", "back", "shoulders", "biceps", "triceps", "abs", "glutes", "quads", "hamstrings", "calves", "cardio"];
const supabaseProjectUrl = "https://npllwuavofpfudchotma.supabase.co";
const supabaseAnonKey = "sb_publishable_q_yZF9APuTUsGfHu8N7avA_QbAxS3KY";
const cloudTables = {
  profiles: "workoutstudio_profiles",
  workouts: "workoutstudio_workouts",
  activities: "workoutstudio_custom_activities",
  sessions: "workoutstudio_sessions"
};
const authClient = window.supabase?.createClient(supabaseProjectUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
const trainingPeaksSource = Array.isArray(window.trainingPeaksExercises) ? window.trainingPeaksExercises : [];
const seedActivities = trainingPeaksSource.map((exercise, index) => {
  const type = typeForTrainingPeaksCategory(exercise.category);
  const muscleTags = normalizeMuscleTags(exercise.muscleTags?.length ? exercise.muscleTags : [...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])]);
  return {
    id: `tp-${String(index + 1).padStart(4, "0")}-${slugifyExerciseName(exercise.name)}`,
    name: exercise.name,
    description: exercise.description || defaultExerciseDescription(exercise.name, type, muscleTags),
    tags: normalizeActivityTags(type, muscleTags),
    defaults: defaultActivityTarget(type),
    source: "TrainingPeaks",
    builtIn: true,
    confidence: exercise.confidence || ""
  };
});

const legacyActivityNameById = {
  "act-squat": "Back Squat",
  "act-deadlift": "Deadlift",
  "act-bench": "Bench Press",
  "act-row": "Cable Seated Row",
  "act-lunge": "Body Weight Walking Lunge",
  "act-plank": "Plank",
  "act-hamstring": "Lying Hamstring Stretch with Band",
  "act-hip": "Hip Flexor Stretch",
  "act-run": "Jog In Place",
  "act-bike": "Stationary Bike",
  "act-rower": "Rowing"
};

const muscleLabels = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  cardio: "Cardio"
};

const filterTagOptions = [
  ...activityTypeTags.map((tag) => ({ id: tag, label: tag })),
  ...Object.entries(muscleLabels)
    .filter(([id]) => id !== "cardio")
    .map(([id, label]) => ({ id, label }))
];

function typeForTrainingPeaksCategory(category) {
  if (category === "cardio") return "Cardio";
  if (category === "mobility") return "Stretching";
  return "Weight lifting";
}

function normalizeMuscleTags(tags = []) {
  return [...new Set(tags.map((tag) => tag === "core" ? "abs" : tag).filter((tag) => allowedMuscleTags.includes(tag)))];
}

function normalizeActivityTags(type = "Weight lifting", muscleTags = []) {
  const tags = [activityTypeTags.includes(type) ? type : "Weight lifting"];
  normalizeMuscleTags(muscleTags).forEach((tag) => tags.push(tag === "cardio" ? "Cardio" : tag));
  return [...new Set(tags)];
}

function defaultExerciseDescription(name, type, muscleTags = []) {
  const focus = formatTagList(normalizeMuscleTags(muscleTags).filter((tag) => tag !== "cardio"));
  if (type === "Cardio") {
    return `Instructions: Complete ${name} at the programmed effort or duration. Keep the rhythm smooth, maintain controlled breathing, and adjust pace so the set matches the workout target.`;
  }
  if (type === "Stretching") {
    return `Instructions: Move through ${name} slowly and stay within a comfortable range. Keep breathing steady, control the position around ${focus}, and stop before any sharp discomfort.`;
  }
  return `Instructions: Set up for ${name} as prescribed in the workout. Move through the programmed range with control, keep posture steady, and match the load or reps to the workout target while focusing on ${focus}.`;
}

function formatTagList(tags) {
  const labels = tags.map((tag) => muscleLabels[tag] || tag.toLowerCase());
  if (!labels.length) return "general movement quality";
  if (labels.length === 1) return labels[0].toLowerCase();
  return `${labels.slice(0, -1).map((label) => label.toLowerCase()).join(", ")} and ${labels.at(-1).toLowerCase()}`;
}

function slugifyExerciseName(name) {
  return String(name)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function seedActivityIdByName(name) {
  return seedActivities.find((activity) => activity.name === name)?.id || seedActivities[0]?.id || "";
}

const state = {
  screen: "dashboard",
  authMode: "login",
  authLoading: true,
  passwordRecovery: false,
  currentUserId: null,
  pendingVerificationEmail: "",
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
  toast: "",
  syncStatus: "local",
  syncMessage: "Saved on this device.",
  librarySearch: "",
  libraryTagFilters: [],
  librarySort: "name",
  pickerSearch: "",
  pickerSourceFilter: "all",
  pickerTagFilters: [],
  pickerSort: "name"
};

const store = loadStore();
let toastTimer = null;
let syncTimer = null;
let syncInFlight = false;
let syncPending = false;

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
  const initial = {
    users: [],
    activities: seedActivities,
    workouts: [],
    sessions: []
  };
  localStorage.setItem("workoutstudio-store", JSON.stringify(initial));
  return initial;
}

function saveStore() {
  saveLocalStore();
  queueCloudSave();
}

function saveLocalStore() {
  localStorage.setItem("workoutstudio-store", JSON.stringify(store));
}

function normalizeStore(data) {
  data.users = data.users || [];
  data.activities = data.activities || [];
  data.workouts = data.workouts || [];
  data.sessions = data.sessions || [];
  const previousActivitiesById = new Map(data.activities.map((activity) => [activity.id, activity]));
  data.users.forEach((user) => {
    if (user.email === "demo@liftlog.local") user.email = "demo@workoutstudio.local";
    delete user.password;
    delete user.verificationCode;
  });
  const customActivities = data.activities
    .filter((activity) => isCustomActivityData(activity))
    .map((activity) => {
      const tags = activityTags(activity);
      const { type, muscles, ...rest } = activity;
      return {
        ...rest,
        description: activity.description || "",
        tags,
        defaults: activity.defaults || defaultActivityTarget(typeFromTags(tags))
      };
    });
  data.activities = [...seedActivities, ...customActivities];
  data.workouts.forEach((workout) => {
    workout.activities = (workout.activities || []).map((activity) => ({
      ...activity,
      activityId: replacementActivityId(activity.activityId, previousActivitiesById)
    }));
  });
  data.sessions.forEach((session) => {
    session.entries = (session.entries || []).map((entry) => ({
      ...entry,
      activityId: replacementActivityId(entry.activityId, previousActivitiesById),
      muscles: normalizeMuscleTags(entry.muscles || [])
    }));
  });
  localStorage.setItem("workoutstudio-store", JSON.stringify(data));
  return data;
}

function replacementActivityId(activityId, previousActivitiesById) {
  if (seedActivities.some((activity) => activity.id === activityId)) return activityId;
  const legacyName = legacyActivityNameById[activityId];
  if (legacyName) return seedActivityIdByName(legacyName);
  const previousActivity = previousActivitiesById.get(activityId);
  if (!previousActivity || isCustomActivityData(previousActivity)) return activityId;
  return seedActivityIdByName(previousActivity.name);
}

async function initAuth() {
  if (!authClient) {
    state.authLoading = false;
    render();
    showToast("Supabase Auth could not load. Check the app connection.");
    return;
  }
  authClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      enterPasswordRecovery();
      return;
    }
    if (state.passwordRecovery && event !== "SIGNED_OUT") return;
    applyAuthSession(session, true);
  });
  const { data } = await authClient.auth.getSession();
  if (isPasswordRecoveryUrl()) {
    enterPasswordRecovery();
    return;
  }
  await applyAuthSession(data.session, true);
}

async function applyAuthSession(session, shouldRender = true) {
  state.authLoading = false;
  if (!session?.user) {
    state.currentUserId = null;
    state.syncStatus = "local";
    state.syncMessage = "Sign in to sync across devices.";
    if (shouldRender) render();
    return;
  }
  if (state.passwordRecovery) {
    if (shouldRender) render();
    return;
  }
  const user = ensureLocalUser(session.user);
  state.currentUserId = user.id;
  state.pendingVerificationEmail = "";
  state.authMode = "login";
  state.syncStatus = "syncing";
  state.syncMessage = "Syncing your account...";
  if (shouldRender) render();
  try {
    await loadCloudData();
  } catch (error) {
    state.syncStatus = "local";
    state.syncMessage = "Cloud sync is not set up yet. Changes are saved on this device.";
  }
  showFirstWorkoutPromptIfNeeded();
  state.selectedWorkoutId = userWorkouts()[0]?.id || null;
  saveLocalStore();
  if (shouldRender) render();
}

function isPasswordRecoveryUrl() {
  const urlText = `${window.location.search} ${window.location.hash}`.toLowerCase();
  return urlText.includes("type=recovery") || urlText.includes("auth=recovery");
}

function enterPasswordRecovery() {
  state.authLoading = false;
  state.passwordRecovery = true;
  state.currentUserId = null;
  state.authMode = "update-password";
  render();
}

function ensureLocalUser(authUser) {
  const name = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Athlete";
  let user = store.users.find((item) => item.id === authUser.id);
  if (!user) {
    user = {
      id: authUser.id,
      name,
      email: authUser.email,
      verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
      verifiedAt: authUser.email_confirmed_at || authUser.confirmed_at || null
    };
    store.users.push(user);
  } else {
    user.name = user.name || name;
    user.email = authUser.email || user.email;
    user.verified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at || user.verified);
    user.verifiedAt = authUser.email_confirmed_at || authUser.confirmed_at || user.verifiedAt || null;
  }
  return user;
}

function showFirstWorkoutPromptIfNeeded() {
  if (userWorkouts().length) return;
  state.screen = "workouts";
  state.workoutsMode = "list";
  state.selectedWorkoutId = null;
  state.modal = { type: "workout", workout: null, onboarding: true };
}

async function loadCloudData() {
  if (!authClient || !state.currentUserId) return;
  const userId = state.currentUserId;
  const [workoutResult, activityResult, sessionResult] = await Promise.all([
    authClient.from(cloudTables.workouts).select("data").eq("user_id", userId),
    authClient.from(cloudTables.activities).select("data").eq("user_id", userId),
    authClient.from(cloudTables.sessions).select("data").eq("user_id", userId)
  ]);
  const error = workoutResult.error || activityResult.error || sessionResult.error;
  if (error) throw error;

  store.workouts = [
    ...store.workouts.filter((workout) => workout.userId !== userId),
    ...workoutResult.data.map((row) => ({ ...row.data, userId }))
  ];
  store.activities = [
    ...seedActivities,
    ...store.activities.filter((activity) => isCustomActivityData(activity) && activity.userId !== userId),
    ...activityResult.data.map((row) => ({ ...row.data, userId, custom: true }))
  ];
  store.sessions = [
    ...store.sessions.filter((session) => session.userId !== userId),
    ...sessionResult.data.map((row) => ({ ...row.data, userId }))
  ];
  state.syncStatus = "synced";
  state.syncMessage = "Synced across devices.";
  saveLocalStore();
}

function queueCloudSave() {
  if (!authClient || !state.currentUserId) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncUserData();
  }, 400);
}

async function syncUserData() {
  if (!authClient || !state.currentUserId) return;
  if (syncInFlight) {
    syncPending = true;
    return;
  }
  syncInFlight = true;
  syncPending = false;
  state.syncStatus = "syncing";
  state.syncMessage = "Saving to cloud...";
  const userId = state.currentUserId;
  try {
    await upsertProfile();
    await replaceUserRows(cloudTables.workouts, userWorkouts());
    await replaceUserRows(cloudTables.activities, userCustomActivities());
    await replaceUserRows(cloudTables.sessions, userSessions());
    state.syncStatus = "synced";
    state.syncMessage = "Synced across devices.";
  } catch (error) {
    state.syncStatus = "local";
    state.syncMessage = "Cloud sync is not set up yet. Changes are saved on this device.";
  } finally {
    syncInFlight = false;
    if (syncPending && state.currentUserId === userId) syncUserData();
  }
}

async function upsertProfile() {
  const user = currentUser();
  if (!user) return;
  const { error } = await authClient.from(cloudTables.profiles).upsert({
    id: user.id,
    email: user.email,
    full_name: user.name,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

async function replaceUserRows(tableName, items) {
  const userId = state.currentUserId;
  const deleteResult = await authClient.from(tableName).delete().eq("user_id", userId);
  if (deleteResult.error) throw deleteResult.error;
  if (!items.length) return;
  const insertResult = await authClient.from(tableName).insert(items.map((item) => ({
    id: item.id,
    user_id: userId,
    data: item,
    updated_at: new Date().toISOString()
  })));
  if (insertResult.error) throw insertResult.error;
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

function userCustomActivities() {
  return store.activities.filter((activity) => isCustomActivity(activity));
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
  const search = state.librarySearch.trim().toLowerCase();
  return availableActivities()
    .filter((activity) => state.libraryFilter === "all" || (state.libraryFilter === "custom" ? isCustomActivity(activity) : !isCustomActivityData(activity)))
    .filter((activity) => hasSelectedTags(activity, state.libraryTagFilters))
    .filter((activity) => !search || activity.name.toLowerCase().includes(search))
    .sort(compareLibraryActivities);
}

function compareLibraryActivities(a, b) {
  if (state.librarySort === "type") return activityType(a).localeCompare(activityType(b)) || a.name.localeCompare(b.name);
  if (state.librarySort === "muscle") return primaryDisplayMuscle(a).localeCompare(primaryDisplayMuscle(b)) || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name);
}

function primaryDisplayMuscle(activity) {
  const muscles = activityMuscles(activity);
  return muscles.find((muscle) => muscle !== "cardio") || muscles[0] || "";
}

function pickerActivities() {
  const search = state.pickerSearch.trim().toLowerCase();
  return availableActivities()
    .filter((activity) => state.pickerSourceFilter === "all" || (state.pickerSourceFilter === "custom" ? isCustomActivity(activity) : !isCustomActivityData(activity)))
    .filter((activity) => hasSelectedTags(activity, state.pickerTagFilters))
    .filter((activity) => !search || activity.name.toLowerCase().includes(search))
    .sort(comparePickerActivities);
}

function hasSelectedTags(activity, selectedTags) {
  const tags = activityTags(activity);
  return !selectedTags.length || selectedTags.every((tag) => tags.includes(tag));
}

function comparePickerActivities(a, b) {
  if (state.pickerSort === "source") return sourceLabel(a).localeCompare(sourceLabel(b)) || a.name.localeCompare(b.name);
  if (state.pickerSort === "type") return activityType(a).localeCompare(activityType(b)) || a.name.localeCompare(b.name);
  if (state.pickerSort === "muscle") return primaryDisplayMuscle(a).localeCompare(primaryDisplayMuscle(b)) || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name);
}

function sourceLabel(activity) {
  return isCustomActivityData(activity) ? "Custom" : "Built-in";
}

function toggleTagFilter(selectedTags, tag) {
  if (tag === "all") return [];
  if (selectedTags.includes(tag)) return selectedTags.filter((item) => item !== tag);
  return [...selectedTags, tag];
}

function activityTags(activity) {
  if (Array.isArray(activity.tags) && activity.tags.length) return normalizeStoredTags(activity.tags);
  return normalizeActivityTags(activity.type, activity.muscles || []);
}

function normalizeStoredTags(tags = []) {
  return [...new Set(tags.map((tag) => tag === "core" ? "abs" : tag).map((tag) => tag === "cardio" ? "Cardio" : tag).filter((tag) => activityTypeTags.includes(tag) || allowedMuscleTags.includes(tag)))];
}

function activityType(activity) {
  return typeFromTags(activityTags(activity));
}

function typeFromTags(tags = []) {
  return activityTypeTags.find((tag) => tags.includes(tag)) || "Weight lifting";
}

function activityMuscles(activity) {
  return activityTags(activity)
    .map((tag) => tag === "Cardio" ? "cardio" : tag)
    .filter((tag) => allowedMuscleTags.includes(tag));
}

function tagLabel(tag) {
  return muscleLabels[tag] || tag;
}

function isCustomActivity(activity) {
  return isCustomActivityData(activity) && (!activity.userId || activity.userId === state.currentUserId);
}

function isCustomActivityData(activity) {
  return Boolean(activity?.custom || activity?.userId);
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = state.currentUserId && !state.passwordRecovery ? renderShell() : renderAuth();
  bindEvents();
}

function renderAuth() {
  if (state.authLoading) {
    return `
      <section class="auth-page">
        <div class="auth-box">
          <div class="brand"><span class="mark">WS</span><span>WorkoutStudio</span></div>
          <div>
            <p class="eyebrow">Secure sign in</p>
            <h1>Opening WorkoutStudio...</h1>
            <p class="muted">Checking your sign-in session.</p>
          </div>
        </div>
        <div class="auth-art" aria-hidden="true"></div>
      </section>
      ${renderToast()}
    `;
  }
  const title =
    state.authMode === "login"
      ? "Welcome back"
      : state.authMode === "register"
        ? "Create your account"
        : state.authMode === "verify"
          ? "Verify your email"
          : state.authMode === "update-password"
            ? "Set a new password"
            : "Reset password";
  const subtitle =
    state.authMode === "login"
      ? "Sign in to manage templates, start sessions, and compare your training history."
      : state.authMode === "register"
        ? "Create an account and confirm your email before opening WorkoutStudio."
        : state.authMode === "verify"
          ? "Use the confirmation link sent to your inbox, then return here to log on."
          : state.authMode === "update-password"
            ? "Choose a new password for your account."
            : "Enter your email and WorkoutStudio will send a reset link.";
  return `
    <section class="auth-page">
      <div class="auth-box">
        <div class="brand"><span class="mark">WS</span><span>WorkoutStudio</span></div>
        <div>
          <p class="eyebrow">SaaS training tracker</p>
          <h1>${title}</h1>
          <p class="muted">${subtitle}</p>
        </div>
        ${state.authMode === "update-password" ? "" : `
          <div class="tabs">
            <button data-auth-tab="login" class="${state.authMode === "login" ? "active" : ""}">Logon</button>
            <button data-auth-tab="register" class="${state.authMode === "register" ? "active" : ""}">Register</button>
            <button data-auth-tab="reset" class="${state.authMode === "reset" ? "active" : ""}">Reset</button>
          </div>
        `}
        ${renderAuthForm()}
      </div>
      <div class="auth-art" aria-hidden="true"></div>
    </section>
    ${renderToast()}
  `;
}

function renderAuthForm() {
  if (state.authMode === "update-password") {
    return `
      <form class="form" data-action="update-password">
        <label>New password<input name="password" type="password" minlength="6" required placeholder="At least 6 characters" /></label>
        <label>Confirm password<input name="confirmPassword" type="password" minlength="6" required placeholder="Retype your password" /></label>
        <button class="btn" type="submit">Update password</button>
      </form>
    `;
  }
  if (state.authMode === "reset") {
    return `
      <form class="form" data-action="reset">
        <label>Email<input name="email" type="email" required placeholder="alex@example.com" /></label>
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
  if (state.authMode === "verify") {
    return `
      <div class="form verify-panel">
        <label>Email<input type="email" readonly value="${escapeAttr(state.pendingVerificationEmail)}" /></label>
        <p class="muted">Check your inbox for the verification email. Once the email is confirmed, use Logon to continue.</p>
        <button class="btn" type="button" data-auth-tab="login">Go to logon</button>
      </div>
    `;
  }
  return `
    <form class="form" data-action="login">
      <label>Email<input name="email" type="email" required placeholder="alex@example.com" /></label>
      <label>Password<input name="password" type="password" required placeholder="Your password" /></label>
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
          <span class="sync-pill ${state.syncStatus}" title="${escapeAttr(state.syncMessage)}">${escapeHtml(syncStatusLabel())}</span>
          <strong>${escapeHtml(user.name)}</strong>
          <button class="btn secondary" data-action="logout">Sign out</button>
        </div>
      </header>
      <section class="content">
        ${renderScreen()}
      </section>
      <nav class="bottom-nav">
        ${navButton("dashboard", "Dashboard")}
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
  if (state.screen !== "workouts") return "";
  if (state.workoutsMode === "detail" && selectedWorkout()) {
    return `<button class="header-back" data-workouts-list aria-label="Back to workouts" title="Back to workouts">Back</button>`;
  }
  return "";
}

function navButton(screen, label) {
  return `<button data-screen="${screen}" class="${state.screen === screen ? "active" : ""}">${label}</button>`;
}

function syncStatusLabel() {
  if (state.syncStatus === "synced") return "Synced";
  if (state.syncStatus === "syncing") return "Syncing";
  return "Local";
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
        <h1>Dashboard.</h1>
      </div>
      <button class="btn primary-action" data-screen="session">Start workout</button>
    </div>
    <div class="grid three">
      <div class="panel stat"><span class="muted">Workout templates</span><strong>${workouts.length}</strong></div>
      <div class="panel stat"><span class="muted">Completed sessions</span><strong>${sessions.length}</strong></div>
      <div class="panel stat"><span class="muted">Training minutes</span><strong>${totalMinutes}</strong></div>
    </div>
    <div class="panel grid">
      <h2>Completed workouts</h2>
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
      <button class="btn workouts-create" data-modal="workout">Create workout</button>
      <div class="list">${workouts.length ? workouts.map((workout) => renderWorkoutRow(workout)).join("") : renderEmptyWorkouts()}</div>
    </div>
  `;
}

function renderEmptyWorkouts() {
  return `
    <div class="empty">
      <span>No workouts yet.</span>
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
        <button class="btn secondary" data-modal="activity" data-workout-id="${workout.id}">Add exercise</button>
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
  const type = activityType(activity);
  const fields = templateFields(type);
  const isOpen = state.openSwipeActivityId === item.id;
  return `
    <div class="swipe-activity ${isOpen ? "open" : ""}" data-swipe-activity="${item.id}">
      <button class="swipe-delete" data-remove-activity="${item.id}" data-workout-id="${workout.id}" type="button">Delete</button>
      <article class="activity-row">
        <div class="toolbar">
          <div>
            <h3>${activity.name}</h3>
            <p class="muted">${type}</p>
          </div>
        </div>
        <div class="template-fields">
          ${fields.map((field) => renderTemplateField(workout.id, item, field)).join("")}
        </div>
        <div class="chips">${activityTags(activity).map((tag) => `<span class="chip gold">${tagLabel(tag)}</span>`).join("")}</div>
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
  const total = availableActivities().length;
  return `
    <div class="topbar">
      <div>
        <p class="eyebrow">Activity library</p>
        <h1>Create and manage movement options.</h1>
        <p class="muted">Library entries can be used across workout templates.</p>
      </div>
    </div>
    <div class="panel library-tools">
      <div class="tabs library-filter">
        <button data-library-filter="all" class="${state.libraryFilter === "all" ? "active" : ""}">All</button>
        <button data-library-filter="built-in" class="${state.libraryFilter === "built-in" ? "active" : ""}">Built-in</button>
        <button data-library-filter="custom" class="${state.libraryFilter === "custom" ? "active" : ""}">Custom</button>
      </div>
      ${state.libraryFilter === "custom" ? `<button class="btn library-create" type="button" data-modal="library-activity">Create exercise</button>` : ""}
      <label>Search
        <input data-library-search type="search" value="${escapeAttr(state.librarySearch)}" placeholder="Exercise name" />
      </label>
      ${renderTagFilter("library", state.libraryTagFilters)}
      <label>Sort
        <select data-library-sort>
          <option value="name" ${state.librarySort === "name" ? "selected" : ""}>Name A-Z</option>
          <option value="type" ${state.librarySort === "type" ? "selected" : ""}>Type</option>
          <option value="muscle" ${state.librarySort === "muscle" ? "selected" : ""}>Primary tag</option>
        </select>
      </label>
      <strong class="library-count">${activities.length} of ${total}</strong>
    </div>
    <div class="activity-grid">
      ${activities.length ? activities.map((activity) => renderLibraryActivityCard(activity)).join("") : `<div class="empty">No exercises match those filters.</div>`}
    </div>
  `;
}

function renderTagFilter(scope, selectedTags) {
  return `
    <div class="tag-filter" role="group" aria-label="Tags">
      <div class="tag-filter-title">Tags</div>
      <div class="tag-filter-options">
        ${filterTagOptions.map(({ id, label }) => `
          <label class="tag-filter-option ${selectedTags.includes(id) ? "active" : ""}">
            <input type="checkbox" data-${scope}-tag="${escapeAttr(id)}" ${selectedTags.includes(id) ? "checked" : ""} />
            <span>${label}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderActivityTagPicker(selectedTags = []) {
  return `
    <div class="tag-filter" role="group" aria-label="Tags">
      <div class="tag-filter-title">Tags</div>
      <div class="tag-filter-options">
        ${filterTagOptions.map(({ id, label }) => `
          <label class="tag-filter-option ${selectedTags.includes(id) ? "active" : ""}">
            <input type="checkbox" name="tags" value="${escapeAttr(id)}" ${selectedTags.includes(id) ? "checked" : ""} />
            <span>${label}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLibraryActivityCard(activity) {
  const editable = isCustomActivity(activity);
  const isOpen = state.openSwipeLibraryActivityId === activity.id;
  return `
    <div class="swipe-library ${isOpen ? "open" : ""} ${editable ? "" : "locked"}" ${editable ? `data-swipe-library="${activity.id}"` : ""}>
      ${editable ? `<button class="swipe-delete" data-delete-library-activity="${activity.id}" type="button">Delete</button>` : ""}
      <article class="card grid library-card" data-open-library-detail="${activity.id}" role="button" tabindex="0">
        <div class="library-card-head">
          <div>
            <h3>${escapeHtml(activity.name)}</h3>
            <p class="muted">${activityType(activity)}${activity.custom ? " · Custom" : ""}</p>
          </div>
          ${editable ? `<button class="icon-btn library-edit" title="Edit" aria-label="Edit ${escapeAttr(activity.name)}" data-modal="library-activity" data-activity-id="${activity.id}">${pencilIcon()}</button>` : `<span class="library-lock">Built-in</span>`}
        </div>
        <div class="chips">${activityTags(activity).map((tag) => `<span class="chip">${tagLabel(tag)}</span>`).join("")}</div>
        <div class="template-fields">
          ${Object.entries(activity.defaults || {}).map(([key, value]) => `
            <span class="library-default">${templateFieldLabel(key)}: ${value}</span>
          `).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderLibraryActivityDetail(activity) {
  return `
    <div class="modal">
      <div class="modal-panel">
        <div class="library-detail-head">
          <div>
            <h2>${escapeHtml(activity.name)}</h2>
            <p class="muted">${activityType(activity)}${activity.custom ? " · Custom" : " · Built-in"}</p>
          </div>
          <div class="toolbar modal-head-actions">
            ${isCustomActivity(activity) ? `<button class="btn secondary" type="button" data-modal="library-activity" data-activity-id="${activity.id}">Edit</button>` : ""}
            <button class="btn secondary" type="button" data-close-modal>Close</button>
          </div>
        </div>
        <div class="chips">${activityTags(activity).map((tag) => `<span class="chip">${tagLabel(tag)}</span>`).join("")}</div>
        <div class="description-panel">
          <h3>Description</h3>
          <p>${escapeHtml(activity.description || "No description has been added for this exercise yet.")}</p>
        </div>
      </div>
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
      <rect class="${cls("abs")}" x="52" y="119" width="46" height="55" rx="12"></rect>
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
    const onboarding = state.modal.onboarding && !workout;
    return `
      <div class="modal">
        <form class="modal-panel" data-action="save-workout">
          <h2>${workout ? "Edit workout" : onboarding ? "Let's get started by creating a workout" : "New workout"}</h2>
          <input type="hidden" name="id" value="${workout?.id || ""}" />
          <label>${onboarding ? "What's the name of the workout?" : "Name"}<input name="name" required value="${escapeAttr(workout?.name || "")}" placeholder="Leg day" /></label>
          <label>${onboarding ? "List the goals for the workout" : "Goal"}<textarea name="goal" placeholder="Strength, conditioning, mobility...">${escapeHtml(workout?.goal || "")}</textarea></label>
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
  if (state.modal.type === "library-detail") {
    return renderLibraryActivityDetail(state.modal.activity);
  }
  if (state.modal.type === "custom-activity") {
    return renderCustomActivityModal(state.modal.workoutId);
  }
  const workout = store.workouts.find((item) => item.id === state.modal.workoutId);
  const activities = pickerActivities();
  const total = availableActivities().length;
  return `
    <div class="modal">
      <div class="modal-panel">
        <div class="custom-activity-head">
          <h2>Add activity to ${escapeHtml(workout.name)}</h2>
          <div class="toolbar modal-head-actions">
            <button class="btn secondary" type="button" data-open-custom-activity="${workout.id}">Create custom</button>
            <button class="btn secondary" type="button" data-close-modal>Cancel</button>
          </div>
        </div>
        <div class="picker-tools">
          <div class="tabs picker-source-filter">
            <button data-picker-source="all" class="${state.pickerSourceFilter === "all" ? "active" : ""}">All</button>
            <button data-picker-source="built-in" class="${state.pickerSourceFilter === "built-in" ? "active" : ""}">Built-in</button>
            <button data-picker-source="custom" class="${state.pickerSourceFilter === "custom" ? "active" : ""}">Custom</button>
          </div>
          <label>Search
            <input data-picker-search type="search" value="${escapeAttr(state.pickerSearch)}" placeholder="Exercise name" />
          </label>
          ${renderTagFilter("picker", state.pickerTagFilters)}
          <label>Sort
            <select data-picker-sort>
              <option value="name" ${state.pickerSort === "name" ? "selected" : ""}>Name A-Z</option>
              <option value="source" ${state.pickerSort === "source" ? "selected" : ""}>Built-in/Custom</option>
              <option value="type" ${state.pickerSort === "type" ? "selected" : ""}>Type</option>
              <option value="muscle" ${state.pickerSort === "muscle" ? "selected" : ""}>Primary tag</option>
            </select>
          </label>
          <strong class="library-count">${activities.length} of ${total}</strong>
        </div>
        <div class="activity-grid">
          ${activities.length ? activities.map((activity) => `
            <button class="activity-pick" data-add-activity="${activity.id}" data-workout-id="${workout.id}">
              <strong>${activity.name}</strong>
              <p class="muted">${activityType(activity)} · ${sourceLabel(activity)}</p>
            </button>
          `).join("") : `<div class="empty">No exercises match those filters.</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderCustomActivityModal(workoutId) {
  const workout = store.workouts.find((item) => item.id === workoutId);
  return `
    <div class="modal">
      <form class="modal-panel" data-action="create-activity">
        <div>
          <button class="btn ghost back-action" type="button" data-back-to-activity-picker="${workoutId}">Back</button>
          <h2>Create custom activity</h2>
          <p class="muted">${workout ? `Add it to ${escapeHtml(workout.name)} after saving.` : "Create a reusable custom exercise."}</p>
        </div>
        <input type="hidden" name="workoutId" value="${workoutId || ""}" />
        <label>Name<input name="name" required placeholder="Incline dumbbell press" /></label>
        <label>Description<textarea name="description" placeholder="What should the athlete know before doing this exercise?"></textarea></label>
        ${renderActivityTagPicker(["Weight lifting"])}
        <div class="toolbar">
          <button class="btn" type="submit">Create custom</button>
          <button class="btn secondary" type="button" data-close-modal>Cancel</button>
        </div>
      </form>
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
        <label>Description<textarea name="description" placeholder="What should the athlete know before doing this exercise?">${escapeHtml(activity?.description || "")}</textarea></label>
        ${renderActivityTagPicker(activity ? activityTags(activity) : ["Weight lifting"])}
        <div class="template-fields">
          ${["sets", "reps", "load", "time", "distance"].map((field) => `
            <label class="template-field">
              <span>${templateFieldLabel(field)}</span>
              <input name="${field}" type="number" min="0" step="${fieldStep(field)}" value="${defaults[field] || 0}" />
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
  document.querySelectorAll("[data-library-search]").forEach((input) => {
    input.addEventListener("input", () => {
      const cursor = input.selectionStart;
      state.librarySearch = input.value;
      state.openSwipeLibraryActivityId = null;
      render();
      const nextInput = document.querySelector("[data-library-search]");
      nextInput?.focus();
      nextInput?.setSelectionRange(cursor, cursor);
    });
  });
  document.querySelectorAll("[data-library-tag]").forEach((input) => {
    input.addEventListener("change", () => {
      state.libraryTagFilters = toggleTagFilter(state.libraryTagFilters, input.dataset.libraryTag);
      state.openSwipeLibraryActivityId = null;
      render();
    });
  });
  document.querySelectorAll("[data-library-sort]").forEach((select) => {
    select.addEventListener("change", () => {
      state.librarySort = select.value;
      state.openSwipeLibraryActivityId = null;
      render();
    });
  });
  document.querySelectorAll("[data-picker-source]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pickerSourceFilter = button.dataset.pickerSource;
      render();
    });
  });
  document.querySelectorAll("[data-picker-search]").forEach((input) => {
    input.addEventListener("input", () => {
      const cursor = input.selectionStart;
      state.pickerSearch = input.value;
      render();
      const nextInput = document.querySelector("[data-picker-search]");
      nextInput?.focus();
      nextInput?.setSelectionRange(cursor, cursor);
    });
  });
  document.querySelectorAll("[data-picker-tag]").forEach((input) => {
    input.addEventListener("change", () => {
      state.pickerTagFilters = toggleTagFilter(state.pickerTagFilters, input.dataset.pickerTag);
      render();
    });
  });
  document.querySelectorAll("[data-picker-sort]").forEach((select) => {
    select.addEventListener("change", () => {
      state.pickerSort = select.value;
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
  document.querySelectorAll("[data-open-library-detail]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openLibraryActivityDetail(card.dataset.openLibraryDetail);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openLibraryActivityDetail(card.dataset.openLibraryDetail);
    });
  });
  document.querySelectorAll("[data-open-custom-activity]").forEach((button) => button.addEventListener("click", () => openCustomActivityModal(button.dataset.openCustomActivity)));
  document.querySelectorAll("[data-back-to-activity-picker]").forEach((button) => button.addEventListener("click", () => reopenActivityPicker(button.dataset.backToActivityPicker)));
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
  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.action;
  if (action === "login") login(data);
  if (action === "register") register(data);
  if (action === "reset") resetPassword(data);
  if (action === "update-password") updatePassword(data);
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

async function login({ email, password }) {
  if (!authClient) return showToast("Supabase Auth is not available. Check the app connection.");
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) {
    const message = error.message.toLowerCase().includes("email not confirmed")
      ? "Please verify your email before logging on."
      : error.message;
    if (message.includes("verify")) {
      state.authMode = "verify";
      state.pendingVerificationEmail = email;
      render();
    }
    return showToast(message);
  }
  applyAuthSession(data.session, false);
  showToast("Logged on successfully.");
}

async function register({ name, email, password }) {
  if (!authClient) return showToast("Supabase Auth is not available. Check the app connection.");
  const { error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) return showToast(error.message);
  state.authMode = "verify";
  state.pendingVerificationEmail = email;
  showToast("Account created. Check your email to verify it.");
  render();
}

async function resetPassword({ email }) {
  if (!authClient) return showToast("Supabase Auth is not available. Check the app connection.");
  const { error } = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}?auth=recovery`
  });
  if (error) return showToast(error.message);
  showToast("If that email exists, a reset link will be sent.");
}

async function updatePassword({ password, confirmPassword }) {
  if (!authClient) return showToast("Supabase Auth is not available. Check the app connection.");
  if (password !== confirmPassword) return showToast("Those passwords do not match.");
  const { error } = await authClient.auth.updateUser({ password });
  if (error) return showToast(error.message);
  state.passwordRecovery = false;
  state.currentUserId = null;
  state.authMode = "login";
  await authClient.auth.signOut();
  showToast("Password updated. Please log on with your new password.");
}

async function logout() {
  if (authClient) await authClient.auth.signOut();
  cancelTimer();
  state.currentUserId = null;
  state.passwordRecovery = false;
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
  state.modal = { type: "workout", workout, onboarding: !workout && !userWorkouts().length };
  render();
}

function openActivityModal(workoutId) {
  resetPickerFilters();
  state.modal = { type: "activity", workoutId };
  render();
}

function reopenActivityPicker(workoutId) {
  state.modal = { type: "activity", workoutId };
  render();
}

function openCustomActivityModal(workoutId) {
  state.modal = { type: "custom-activity", workoutId };
  render();
}

function openLibraryActivityDetail(activityId) {
  const activity = activityById(activityId);
  if (!activity) return;
  state.openSwipeLibraryActivityId = null;
  state.modal = { type: "library-detail", activity };
  render();
}

function resetPickerFilters() {
  state.pickerSearch = "";
  state.pickerSourceFilter = "all";
  state.pickerTagFilters = [];
  state.pickerSort = "name";
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
  const tags = tagsFromForm(form);
  const type = typeFromTags(tags);
  const defaults = defaultsFromForm(data, type);
  if (data.id) {
    const activity = activityById(data.id);
    if (!activity) return;
    if (!isCustomActivity(activity)) return;
    activity.name = data.name.trim();
    activity.description = data.description.trim();
    activity.tags = tags;
    delete activity.type;
    delete activity.muscles;
    activity.defaults = defaults;
    activity.custom = activity.custom || Boolean(activity.userId);
  } else {
    store.activities.push({
      id: crypto.randomUUID(),
      name: data.name.trim(),
      description: data.description.trim(),
      tags,
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

function tagsFromForm(form) {
  const tags = normalizeStoredTags(new FormData(form).getAll("tags"));
  if (activityTypeTags.some((tag) => tags.includes(tag))) return tags;
  return ["Weight lifting", ...tags];
}

function defaultsFromForm(data, type) {
  const base = {
    sets: Number(data.sets || 0),
    reps: Number(data.reps || 0),
    load: Number(data.load || 0),
    time: Number(data.time || 0),
    distance: Number(data.distance || 0)
  };
  if (type === "Cardio") return { time: base.time || 10, distance: base.distance || 1 };
  if (type === "Stretching") return { sets: base.sets || 2, time: base.time || 1, reps: base.reps || 0 };
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
  const tags = tagsFromForm(form);
  const type = typeFromTags(tags);
  const activity = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    description: data.description.trim(),
    tags,
    defaults: defaultActivityTarget(type),
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
      const type = activityType(activity);
      return {
        id: crypto.randomUUID(),
        activityId: activity.id,
        activityName: activity.name,
        muscles: activityMuscles(activity),
        type,
        sets: item.target.sets || 0,
        reps: item.target.reps || 0,
        time: item.target.time || 0,
        distance: item.target.distance || 0,
        load: item.target.load || 0,
        setRows: buildSetRows(type, item.target)
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
  return [...new Set(workout.activities.flatMap((item) => activityMuscles(activityById(item.activityId))))];
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
  if (toastTimer) clearTimeout(toastTimer);
  render();
  toastTimer = setTimeout(() => {
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
initAuth();
