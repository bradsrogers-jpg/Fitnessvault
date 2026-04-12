
const R2_PUBLIC_BASE = "https://pub-2f7de274ccb949a995e329ce40005b2c.r2.dev";

const state = {
  page: "home",
  theme: localStorage.getItem("theme") || "neutral",
  affirmations: [
    "You showed up. That counts more than mood.",
    "Done is stronger than perfect.",
    "One clean day stacks into a strong month.",
    "Your future body is built in boring little moments.",
    "Progress loves receipts."
  ]
};

const app = document.getElementById("app");

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem("theme", theme);
  document.body.className = `theme-${theme}`;
}

function randAffirmation() {
  return state.affirmations[Math.floor(Math.random() * state.affirmations.length)];
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  return res.json();
}

function shell(content) {
  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="logo">FitVault<small>your private fitness vault</small></div>
        <div class="kicker">${state.theme} theme</div>
      </div>
      <div class="grid">
        <aside class="sidebar">
          ${navButton("home", "Home")}
          ${navButton("session", "Session")}
          ${navButton("nutrition", "Nutrition")}
          ${navButton("progress", "Progress")}
          ${navButton("library", "Library")}
          ${navButton("settings", "Settings")}
        </aside>
        <main class="content">${content}</main>
      </div>
    </div>
  `;
}

function navButton(page, label) {
  return `<button class="nav-btn ${state.page === page ? "active" : ""}" onclick="go('${page}')">${label}</button>`;
}

async function renderHome() {
  const summary = await api("/api/dashboard");
  return shell(`
    <div class="hero">
      <section class="panel">
        <span class="kicker">today</span>
        <h1>Check in and start your session</h1>
        <p class="muted">Neutral onboarding up front. Theme lives in settings. Cute where it should be, practical where it matters.</p>
        <div class="inline">
          <button class="btn" onclick="checkIn()">Check In</button>
          <button class="btn secondary" onclick="go('session')">Open Session</button>
        </div>
        <p id="affirmationBox" class="footer-note">${randAffirmation()}</p>
      </section>
      <section class="card">
        <h3>Today at a glance</h3>
        <div class="stats">
          <div><div class="stat-value">${summary.totalCheckins}</div><div class="muted">Check-ins</div></div>
          <div><div class="stat-value">${summary.totalFoods}</div><div class="muted">Saved foods</div></div>
          <div><div class="stat-value">${summary.totalMedia}</div><div class="muted">Media files</div></div>
          <div><div class="stat-value">${summary.totalMeasurements}</div><div class="muted">Measurements</div></div>
        </div>
      </section>
    </div>

    <section class="panel">
      <h2>Quick actions</h2>
      <div class="row">
        <div class="card">
          <h3>Fuel</h3>
          <p class="muted">Log calories and protein without turning life into spreadsheet jail.</p>
          <button class="btn secondary" onclick="go('nutrition')">Go to Nutrition</button>
        </div>
        <div class="card">
          <h3>Track</h3>
          <p class="muted">Upload selfies, progress photos, workout clips, and receipts from the grind.</p>
          <button class="btn secondary" onclick="go('library')">Open Library</button>
        </div>
      </div>
    </section>
  `);
}

async function renderSession() {
  const workouts = await api("/api/workouts");
  return shell(`
    <section class="panel">
      <h2>Session builder</h2>
      <p class="muted">Manual-first so it actually works. AI hooks can be snapped in later without rebuilding the house.</p>

      <div class="row">
        <div class="card">
          <h3>New workout</h3>
          <div class="field">
            <label>Workout title</label>
            <input id="workoutTitle" placeholder="Leg Day Slay" />
          </div>
          <div class="field">
            <label>Notes</label>
            <textarea id="workoutNotes" rows="4" placeholder="How it felt, what sucked, what hit"></textarea>
          </div>
          <button class="btn" onclick="createWorkout()">Save Workout</button>
        </div>

        <div class="card">
          <h3>Add a set</h3>
          <div class="field"><label>Workout</label><select id="setWorkout">${workouts.map(w => `<option value="${w.id}">${w.title || "Untitled workout"}</option>`).join("")}</select></div>
          <div class="field"><label>Exercise</label><input id="setExercise" placeholder="Bench Press" /></div>
          <div class="row">
            <div class="field"><label>Weight</label><input id="setWeight" type="number" placeholder="225" /></div>
            <div class="field"><label>Reps</label><input id="setReps" type="number" placeholder="5" /></div>
          </div>
          <button class="btn secondary" onclick="addSet()">Add Set</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Recent workouts</h2>
      <div class="list">
        ${workouts.length ? workouts.map(w => `
          <div class="item">
            <div class="inline"><strong>${escapeHtml(w.title || "Untitled workout")}</strong><span class="muted">${w.created_at}</span></div>
            <div class="muted">${escapeHtml(w.notes || "")}</div>
            <div class="footer-note">${(w.set_count || 0)} sets logged</div>
          </div>
        `).join("") : `<div class="item">No workouts yet.</div>`}
      </div>
    </section>
  `);
}

async function renderNutrition() {
  const foods = await api("/api/foods");
  const logs = await api("/api/nutrition");
  return shell(`
    <section class="panel">
      <h2>Nutrition vault</h2>
      <div class="row">
        <div class="card">
          <h3>Add saved food</h3>
          <div class="field"><label>Name</label><input id="foodName" placeholder="Greek yogurt" /></div>
          <div class="field"><label>Brand</label><input id="foodBrand" placeholder="Oikos" /></div>
          <div class="field"><label>Serving size</label><input id="foodServing" placeholder="1 cup" /></div>
          <div class="row">
            <div class="field"><label>Calories</label><input id="foodCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="foodProtein" type="number" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Carbs</label><input id="foodCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="foodFat" type="number" /></div>
          </div>
          <button class="btn" onclick="saveFood()">Save Food</button>
        </div>

        <div class="card">
          <h3>Daily intake</h3>
          <div class="field"><label>Date</label><input id="nutritionDate" type="date" /></div>
          <div class="row">
            <div class="field"><label>Calories</label><input id="nutritionCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="nutritionProtein" type="number" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Carbs</label><input id="nutritionCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="nutritionFat" type="number" /></div>
          </div>
          <div class="field"><label>Water</label><input id="nutritionWater" type="number" placeholder="ounces or whatever you prefer" /></div>
          <button class="btn secondary" onclick="saveNutrition()">Save Daily Log</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="row">
        <div class="card">
          <h3>Saved foods</h3>
          <div class="list">
            ${foods.length ? foods.map(f => `<div class="item"><strong>${escapeHtml(f.name)}</strong> <span class="muted">${escapeHtml(f.brand || "")}</span><div class="footer-note">${f.calories || 0} cal • ${f.protein || 0} protein • ${f.serving_size || ""}</div></div>`).join("") : `<div class="item">No saved foods yet.</div>`}
          </div>
        </div>
        <div class="card">
          <h3>Nutrition logs</h3>
          <div class="list">
            ${logs.length ? logs.map(l => `<div class="item"><strong>${l.log_date}</strong><div class="footer-note">${l.calories || 0} cal • ${l.protein || 0} protein • ${l.carbs || 0} carbs • ${l.fat || 0} fat</div></div>`).join("") : `<div class="item">No daily logs yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `);
}

async function renderProgress() {
  const measurements = await api("/api/measurements");
  return shell(`
    <section class="panel">
      <h2>Progress tracking</h2>
      <div class="row">
        <div class="card">
          <h3>Log measurements</h3>
          <div class="field"><label>Date</label><input id="measureDate" type="date" /></div>
          <div class="row">
            <div class="field"><label>Weight</label><input id="measureWeight" type="number" step="0.1" /></div>
            <div class="field"><label>Body fat</label><input id="measureBodyFat" type="number" step="0.1" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Waist</label><input id="measureWaist" type="number" step="0.1" /></div>
            <div class="field"><label>Chest</label><input id="measureChest" type="number" step="0.1" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Arms</label><input id="measureArms" type="number" step="0.1" /></div>
            <div class="field"><label>Thighs</label><input id="measureThighs" type="number" step="0.1" /></div>
          </div>
          <div class="field"><label>Notes</label><textarea id="measureNotes" rows="3"></textarea></div>
          <button class="btn" onclick="saveMeasurement()">Save Measurement</button>
        </div>

        <div class="card">
          <h3>Recent entries</h3>
          <div class="list">
            ${measurements.length ? measurements.map(m => `<div class="item"><strong>${m.log_date}</strong><div class="footer-note">Weight ${m.weight || "-"} • Waist ${m.waist || "-"} • Body fat ${m.body_fat || "-"}</div></div>`).join("") : `<div class="item">No measurements yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `);
}

async function renderLibrary() {
  const media = await api("/api/media");
  return shell(`
    <section class="panel">
      <h2>Media vault</h2>
      <div class="row">
        <div class="card">
          <h3>Upload photo or video</h3>
          <div class="field"><label>Type</label>
            <select id="mediaType">
              <option value="selfie">Selfie</option>
              <option value="progress_photo">Progress Photo</option>
              <option value="workout_video">Workout Video</option>
              <option value="idea_video">Workout Idea Video</option>
            </select>
          </div>
          <div class="field"><label>Notes</label><input id="mediaNotes" placeholder="front pose / back day / form check" /></div>
          <div class="field"><label>File</label><input id="mediaFile" type="file" accept="image/*,video/*" /></div>
          <button class="btn" onclick="uploadMedia()">Upload</button>
        </div>

        <div class="card">
          <h3>Library</h3>
          <div class="media-grid">
            ${media.length ? media.map(m => renderMediaCard(m)).join("") : `<div class="item">No media yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `);
}

function renderMediaCard(m) {
  const url = `${R2_PUBLIC_BASE}/${m.file_key}`;
  if ((m.media_type || "").includes("video")) {
    return `<div class="item"><video class="thumb" controls src="${url}"></video><div class="footer-note">${escapeHtml(m.media_type)} • ${escapeHtml(m.notes || "")}</div></div>`;
  }
  return `<div class="item"><img class="thumb" src="${url}" alt="" /><div class="footer-note">${escapeHtml(m.media_type)} • ${escapeHtml(m.notes || "")}</div></div>`;
}

async function renderSettings() {
  return shell(`
    <section class="panel">
      <h2>Settings</h2>
      <div class="row">
        <div class="card">
          <h3>Theme</h3>
          <p class="muted">Onboarding stays neutral. The vibe switch lives here where it belongs.</p>
          <div class="field">
            <label>Theme style</label>
            <select id="themeSelect">
              <option value="neutral" ${state.theme === "neutral" ? "selected" : ""}>Neutral</option>
              <option value="feminine" ${state.theme === "feminine" ? "selected" : ""}>Feminine</option>
              <option value="masculine" ${state.theme === "masculine" ? "selected" : ""}>Masculine</option>
            </select>
          </div>
          <button class="btn" onclick="saveTheme()">Save Theme</button>
        </div>
        <div class="card">
          <h3>About this build</h3>
          <p class="muted">This is the fuller starter, not the toothpick skeleton. It has real pages, real forms, real routes, and room for the AI sparkle later.</p>
        </div>
      </div>
    </section>
  `);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

async function render() {
  setTheme(state.theme);
  let html = "";
  if (state.page === "home") html = await renderHome();
  if (state.page === "session") html = await renderSession();
  if (state.page === "nutrition") html = await renderNutrition();
  if (state.page === "progress") html = await renderProgress();
  if (state.page === "library") html = await renderLibrary();
  if (state.page === "settings") html = await renderSettings();
  app.innerHTML = html;
  const today = new Date().toISOString().slice(0, 10);
  ["nutritionDate", "measureDate"].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

window.go = async function(page) {
  state.page = page;
  await render();
};

window.checkIn = async function() {
  const now = new Date();
  const payload = {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5)
  };
  await api("/api/checkin", { method: "POST", body: JSON.stringify(payload) });
  const box = document.getElementById("affirmationBox");
  if (box) box.textContent = randAffirmation();
};

window.createWorkout = async function() {
  const payload = {
    title: document.getElementById("workoutTitle").value,
    notes: document.getElementById("workoutNotes").value
  };
  await api("/api/workouts", { method: "POST", body: JSON.stringify(payload) });
  await go("session");
};

window.addSet = async function() {
  const payload = {
    workout_id: Number(document.getElementById("setWorkout").value),
    exercise: document.getElementById("setExercise").value,
    weight: Number(document.getElementById("setWeight").value || 0),
    reps: Number(document.getElementById("setReps").value || 0)
  };
  await api("/api/workout-sets", { method: "POST", body: JSON.stringify(payload) });
  await go("session");
};

window.saveFood = async function() {
  const payload = {
    name: document.getElementById("foodName").value,
    brand: document.getElementById("foodBrand").value,
    serving_size: document.getElementById("foodServing").value,
    calories: Number(document.getElementById("foodCalories").value || 0),
    protein: Number(document.getElementById("foodProtein").value || 0),
    carbs: Number(document.getElementById("foodCarbs").value || 0),
    fat: Number(document.getElementById("foodFat").value || 0)
  };
  await api("/api/foods", { method: "POST", body: JSON.stringify(payload) });
  await go("nutrition");
};

window.saveNutrition = async function() {
  const payload = {
    log_date: document.getElementById("nutritionDate").value,
    calories: Number(document.getElementById("nutritionCalories").value || 0),
    protein: Number(document.getElementById("nutritionProtein").value || 0),
    carbs: Number(document.getElementById("nutritionCarbs").value || 0),
    fat: Number(document.getElementById("nutritionFat").value || 0),
    water: Number(document.getElementById("nutritionWater").value || 0)
  };
  await api("/api/nutrition", { method: "POST", body: JSON.stringify(payload) });
  await go("nutrition");
};

window.saveMeasurement = async function() {
  const payload = {
    log_date: document.getElementById("measureDate").value,
    weight: Number(document.getElementById("measureWeight").value || 0),
    waist: Number(document.getElementById("measureWaist").value || 0),
    chest: Number(document.getElementById("measureChest").value || 0),
    arms: Number(document.getElementById("measureArms").value || 0),
    thighs: Number(document.getElementById("measureThighs").value || 0),
    body_fat: Number(document.getElementById("measureBodyFat").value || 0),
    notes: document.getElementById("measureNotes").value
  };
  await api("/api/measurements", { method: "POST", body: JSON.stringify(payload) });
  await go("progress");
};

window.uploadMedia = async function() {
  const file = document.getElementById("mediaFile").files[0];
  if (!file) return alert("Pick a file first.");
  const form = new FormData();
  form.append("file", file);
  form.append("media_type", document.getElementById("mediaType").value);
  form.append("notes", document.getElementById("mediaNotes").value);
  const res = await fetch("/api/media/upload", { method: "POST", body: form });
  await res.json();
  await go("library");
};

window.saveTheme = async function() {
  const theme = document.getElementById("themeSelect").value;
  setTheme(theme);
  await api("/api/settings/theme", { method: "POST", body: JSON.stringify({ theme }) });
  await go("settings");
};

render();
