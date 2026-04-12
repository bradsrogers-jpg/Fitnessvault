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

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[s]));
}

function randomAffirmation() {
  return state.affirmations[Math.floor(Math.random() * state.affirmations.length)];
}

async function api(path, options = {}) {
  try {
    const headers =
      options.body instanceof FormData
        ? (options.headers || {})
        : { "Content-Type": "application/json", ...(options.headers || {}) };

    const res = await fetch(path, { ...options, headers });

    if (!res.ok) {
      const text = await res.text();
      console.error(`API error on ${path}:`, text);
      return { error: true, message: text };
    }

    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${path}:`, err);
    return { error: true, message: err.message };
  }
}

function navButton(page, label, icon) {
  return `<button class="nav-btn ${state.page === page ? "active" : ""}" onclick="go('${page}')"><span>${icon} ${label}</span><span>›</span></button>`;
}

function bottomButton(page, label, icon) {
  return `<button class="bottom-btn ${state.page === page ? "active" : ""}" onclick="go('${page}')">${icon}<br>${label}</button>`;
}

function shell(content, title = "FitVault") {
  return `
    <div class="app">
      <div class="topbar">
        <div class="brand">
          <div class="brand-badge">✦</div>
          <div>
            <h1>${title}</h1>
            <p>private fitness vault • mobile-first build</p>
          </div>
        </div>
        <div class="theme-pill">${state.theme}</div>
      </div>

      <div class="layout">
        <aside class="sidebar">
          <div class="nav-title">Navigate</div>
          ${navButton("home", "Home", "⌂")}
          ${navButton("session", "Session", "◔")}
          ${navButton("nutrition", "Nutrition", "◒")}
          ${navButton("progress", "Progress", "◎")}
          ${navButton("library", "Library", "▣")}
          ${navButton("settings", "Settings", "⚙")}
        </aside>

        <main class="content">${content}</main>
      </div>

      <nav class="bottom-nav">
        ${bottomButton("home", "Home", "⌂")}
        ${bottomButton("session", "Session", "◔")}
        ${bottomButton("nutrition", "Fuel", "◒")}
        ${bottomButton("progress", "Track", "◎")}
        ${bottomButton("library", "Vault", "▣")}
      </nav>
    </div>
  `;
}

async function renderHome() {
  const summary = await api("/api/dashboard");
  const safe = {
    totalCheckins: summary?.totalCheckins || 0,
    totalFoods: summary?.totalFoods || 0,
    totalMedia: summary?.totalMedia || 0,
    totalMeasurements: summary?.totalMeasurements || 0
  };

  return shell(`
    <div class="page-stack">
      <div class="hero-grid">
        <section class="surface hero-card">
          <div class="kicker">today's session</div>
          <h2 class="hero-title">Show up. Log it. Keep the receipts.</h2>
          <p class="hero-sub">Check in, track food, save progress media, and keep everything in one place.</p>
          <div class="action-row">
            <button class="action-btn" onclick="checkIn()">Check In</button>
            <button class="ghost-btn" onclick="go('session')">Start Session</button>
          </div>
          <div class="affirmation" id="affirmationBox">${randomAffirmation()}</div>
          ${summary?.error ? `<div class="affirmation">API issue: ${escapeHtml(summary.message || "dashboard failed")}</div>` : ""}
        </section>

        <section class="surface">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Check-ins</div>
              <div class="stat-value">${safe.totalCheckins}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Saved foods</div>
              <div class="stat-value">${safe.totalFoods}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Media files</div>
              <div class="stat-value">${safe.totalMedia}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Measurements</div>
              <div class="stat-value">${safe.totalMeasurements}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `, "FitVault");
}

async function renderSession() {
  const workouts = await api("/api/workouts");
  const items = Array.isArray(workouts) ? workouts : [];

  return shell(`
    <div class="page-stack">
      <section class="surface">
        <div class="section-title-row">
          <div>
            <h2 class="section-title">Session</h2>
            <p class="section-sub">Create workouts and add sets.</p>
          </div>
        </div>

        <div class="split">
          <div class="data-card">
            <h3>Create workout</h3>
            <div class="form-grid">
              <div class="field full">
                <label>Workout title</label>
                <input id="workoutTitle" placeholder="Push Day" />
              </div>
              <div class="field full">
                <label>Notes</label>
                <textarea id="workoutNotes" placeholder="Notes"></textarea>
              </div>
            </div>
            <div class="button-row">
              <button class="action-btn" onclick="createWorkout()">Save Workout</button>
            </div>
          </div>

          <div class="data-card">
            <h3>Add set</h3>
            <div class="form-grid">
              <div class="field full">
                <label>Workout</label>
                <select id="setWorkout">
                  ${items.length ? items.map(w => `<option value="${w.id}">${escapeHtml(w.title || "Untitled workout")}</option>`).join("") : `<option value="">Create a workout first</option>`}
                </select>
              </div>
              <div class="field full">
                <label>Exercise</label>
                <input id="setExercise" placeholder="Bench Press" />
              </div>
              <div class="field">
                <label>Weight</label>
                <input id="setWeight" type="number" step="0.1" placeholder="225" />
              </div>
              <div class="field">
                <label>Reps</label>
                <input id="setReps" type="number" placeholder="5" />
              </div>
            </div>
            <div class="button-row">
              <button class="ghost-btn" onclick="addSet()">Add Set</button>
            </div>
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="list">
          ${items.length ? items.map(w => `
            <div class="list-item">
              <div class="list-head">
                <div>
                  <div class="list-title">${escapeHtml(w.title || "Untitled workout")}</div>
                  <div class="list-meta">${escapeHtml(w.created_at || "")}</div>
                </div>
                <div class="metric-pill">${w.set_count || 0} sets</div>
              </div>
              <div class="note">${escapeHtml(w.notes || "")}</div>
            </div>
          `).join("") : `<div class="empty-state">No workouts yet.</div>`}
        </div>
      </section>
    </div>
  `, "Session");
}

async function renderNutrition() {
  const foods = await api("/api/foods");
  const logs = await api("/api/nutrition");

  const foodItems = Array.isArray(foods) ? foods : [];
  const logItems = Array.isArray(logs) ? logs : [];
  const latest = logItems[0] || {};

  return shell(`
    <div class="page-stack">
      <section class="surface">
        <div class="macro-grid">
          <div class="macro-card"><div class="macro-label">Calories</div><div class="macro-value">${latest.calories || 0}</div></div>
          <div class="macro-card"><div class="macro-label">Protein</div><div class="macro-value">${latest.protein || 0}g</div></div>
          <div class="macro-card"><div class="macro-label">Carbs</div><div class="macro-value">${latest.carbs || 0}g</div></div>
          <div class="macro-card"><div class="macro-label">Fat</div><div class="macro-value">${latest.fat || 0}g</div></div>
        </div>
      </section>

      <section class="split">
        <div class="data-card">
          <h3>Add saved food</h3>
          <div class="form-grid">
            <div class="field"><label>Name</label><input id="foodName" /></div>
            <div class="field"><label>Brand</label><input id="foodBrand" /></div>
            <div class="field full"><label>Serving size</label><input id="foodServing" /></div>
            <div class="field"><label>Calories</label><input id="foodCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="foodProtein" type="number" /></div>
            <div class="field"><label>Carbs</label><input id="foodCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="foodFat" type="number" /></div>
          </div>
          <div class="button-row"><button class="action-btn" onclick="saveFood()">Save Food</button></div>
        </div>

        <div class="data-card">
          <h3>Log daily intake</h3>
          <div class="form-grid">
            <div class="field full"><label>Date</label><input id="nutritionDate" type="date" /></div>
            <div class="field"><label>Calories</label><input id="nutritionCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="nutritionProtein" type="number" /></div>
            <div class="field"><label>Carbs</label><input id="nutritionCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="nutritionFat" type="number" /></div>
            <div class="field full"><label>Water</label><input id="nutritionWater" type="number" /></div>
          </div>
          <div class="button-row"><button class="ghost-btn" onclick="saveNutrition()">Save Intake</button></div>
        </div>
      </section>

      <section class="split">
        <div class="surface">
          <div class="list">
            ${foodItems.length ? foodItems.map(f => `
              <div class="list-item">
                <div class="list-title">${escapeHtml(f.name)}</div>
                <div class="metric-row">
                  <div class="metric-pill">${f.calories || 0} cal</div>
                  <div class="metric-pill">${f.protein || 0}p</div>
                </div>
              </div>
            `).join("") : `<div class="empty-state">No saved foods yet.</div>`}
          </div>
        </div>

        <div class="surface">
          <div class="list">
            ${logItems.length ? logItems.map(l => `
              <div class="list-item">
                <div class="list-title">${escapeHtml(l.log_date)}</div>
                <div class="metric-row">
                  <div class="metric-pill">${l.calories || 0} cal</div>
                  <div class="metric-pill">${l.protein || 0} protein</div>
                </div>
              </div>
            `).join("") : `<div class="empty-state">No logs yet.</div>`}
          </div>
        </div>
      </section>
    </div>
  `, "Nutrition");
}

async function renderProgress() {
  const measurements = await api("/api/measurements");
  const items = Array.isArray(measurements) ? measurements : [];
  const latest = items[0] || {};

  return shell(`
    <div class="page-stack">
      <section class="surface">
        <div class="macro-grid">
          <div class="macro-card"><div class="macro-label">Weight</div><div class="macro-value">${latest.weight || 0}</div></div>
          <div class="macro-card"><div class="macro-label">Waist</div><div class="macro-value">${latest.waist || 0}</div></div>
          <div class="macro-card"><div class="macro-label">Chest</div><div class="macro-value">${latest.chest || 0}</div></div>
          <div class="macro-card"><div class="macro-label">Body Fat</div><div class="macro-value">${latest.body_fat || 0}</div></div>
        </div>
      </section>

      <section class="split">
        <div class="data-card">
          <h3>Log measurements</h3>
          <div class="form-grid">
            <div class="field full"><label>Date</label><input id="measureDate" type="date" /></div>
            <div class="field"><label>Weight</label><input id="measureWeight" type="number" step="0.1" /></div>
            <div class="field"><label>Body Fat</label><input id="measureBodyFat" type="number" step="0.1" /></div>
            <div class="field"><label>Waist</label><input id="measureWaist" type="number" step="0.1" /></div>
            <div class="field"><label>Chest</label><input id="measureChest" type="number" step="0.1" /></div>
            <div class="field"><label>Arms</label><input id="measureArms" type="number" step="0.1" /></div>
            <div class="field"><label>Thighs</label><input id="measureThighs" type="number" step="0.1" /></div>
            <div class="field full"><label>Notes</label><textarea id="measureNotes"></textarea></div>
          </div>
          <div class="button-row"><button class="action-btn" onclick="saveMeasurement()">Save Measurement</button></div>
        </div>

        <div class="surface">
          <div class="list">
            ${items.length ? items.map(m => `
              <div class="list-item">
                <div class="list-title">${escapeHtml(m.log_date)}</div>
                <div class="metric-row">
                  <div class="metric-pill">Weight ${m.weight || "-"}</div>
                  <div class="metric-pill">Waist ${m.waist || "-"}</div>
                </div>
              </div>
            `).join("") : `<div class="empty-state">No measurements yet.</div>`}
          </div>
        </div>
      </section>
    </div>
  `, "Progress");
}

async function renderLibrary() {
  const media = await api("/api/media");
  const items = Array.isArray(media) ? media : [];

  return shell(`
    <div class="page-stack">
      <section class="surface">
        <div class="split">
          <div class="data-card">
            <h3>Upload media</h3>
            <div class="form-grid">
              <div class="field">
                <label>Type</label>
                <select id="mediaType">
                  <option value="selfie">Selfie</option>
                  <option value="progress_photo">Progress Photo</option>
                  <option value="workout_video">Workout Video</option>
                  <option value="idea_video">Workout Idea Video</option>
                </select>
              </div>
              <div class="field">
                <label>Notes</label>
                <input id="mediaNotes" />
              </div>
              <div class="field full">
                <label>File</label>
                <input id="mediaFile" type="file" accept="image/*,video/*" />
              </div>
            </div>
            <div class="button-row"><button class="action-btn" onclick="uploadMedia()">Upload</button></div>
          </div>

          <div class="data-card">
            <h3>Vault status</h3>
            <div class="stat-card">
              <div class="stat-label">Files saved</div>
              <div class="stat-value">${items.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="surface">
        ${items.length ? `
          <div class="media-grid">
            ${items.map(renderMediaTile).join("")}
          </div>
        ` : `<div class="empty-state">No media uploaded yet.</div>`}
      </section>
    </div>
  `, "Library");
}

function renderMediaTile(m) {
  const url = `${R2_PUBLIC_BASE}/${m.file_key}`;
  const isVideo = (m.media_type || "").includes("video");

  return `
    <article class="media-tile">
      <div class="media-frame">
        ${isVideo ? `<video controls src="${url}"></video>` : `<img src="${url}" alt="" />`}
      </div>
      <div class="media-caption">
        <div class="media-type">${escapeHtml(m.media_type)}</div>
        <div class="media-note">${escapeHtml(m.notes || "")}</div>
      </div>
    </article>
  `;
}

async function renderSettings() {
  return shell(`
    <div class="page-stack">
      <section class="surface">
        <div class="split">
          <div class="data-card">
            <h3>Theme</h3>
            <div class="form-grid">
              <div class="field full">
                <label>Theme style</label>
                <select id="themeSelect">
                  <option value="neutral" ${state.theme === "neutral" ? "selected" : ""}>Neutral</option>
                  <option value="feminine" ${state.theme === "feminine" ? "selected" : ""}>Feminine</option>
                  <option value="masculine" ${state.theme === "masculine" ? "selected" : ""}>Masculine</option>
                </select>
              </div>
            </div>
            <div class="button-row"><button class="action-btn" onclick="saveTheme()">Save Theme</button></div>
          </div>

          <div class="data-card">
            <h3>Status</h3>
            <div class="note">If nav works after this file swap, the old JS was crashing on first load.</div>
          </div>
        </div>
      </section>
    </div>
  `, "Settings");
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
  const result = await api("/api/checkin", {
    method: "POST",
    body: JSON.stringify({
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5)
    })
  });

  const box = document.getElementById("affirmationBox");
  if (box) {
    box.textContent = result?.error ? `Check-in failed: ${result.message}` : randomAffirmation();
  }
};

window.createWorkout = async function() {
  await api("/api/workouts", {
    method: "POST",
    body: JSON.stringify({
      title: document.getElementById("workoutTitle")?.value || "",
      notes: document.getElementById("workoutNotes")?.value || ""
    })
  });
  await go("session");
};

window.addSet = async function() {
  const workoutId = document.getElementById("setWorkout")?.value;
  if (!workoutId) return alert("Create a workout first.");

  await api("/api/workout-sets", {
    method: "POST",
    body: JSON.stringify({
      workout_id: Number(workoutId),
      exercise: document.getElementById("setExercise")?.value || "",
      weight: Number(document.getElementById("setWeight")?.value || 0),
      reps: Number(document.getElementById("setReps")?.value || 0)
    })
  });
  await go("session");
};

window.saveFood = async function() {
  await api("/api/foods", {
    method: "POST",
    body: JSON.stringify({
      name: document.getElementById("foodName")?.value || "",
      brand: document.getElementById("foodBrand")?.value || "",
      serving_size: document.getElementById("foodServing")?.value || "",
      calories: Number(document.getElementById("foodCalories")?.value || 0),
      protein: Number(document.getElementById("foodProtein")?.value || 0),
      carbs: Number(document.getElementById("foodCarbs")?.value || 0),
      fat: Number(document.getElementById("foodFat")?.value || 0)
    })
  });
  await go("nutrition");
};

window.saveNutrition = async function() {
  await api("/api/nutrition", {
    method: "POST",
    body: JSON.stringify({
      log_date: document.getElementById("nutritionDate")?.value || "",
      calories: Number(document.getElementById("nutritionCalories")?.value || 0),
      protein: Number(document.getElementById("nutritionProtein")?.value || 0),
      carbs: Number(document.getElementById("nutritionCarbs")?.value || 0),
      fat: Number(document.getElementById("nutritionFat")?.value || 0),
      water: Number(document.getElementById("nutritionWater")?.value || 0)
    })
  });
  await go("nutrition");
};

window.saveMeasurement = async function() {
  await api("/api/measurements", {
    method: "POST",
    body: JSON.stringify({
      log_date: document.getElementById("measureDate")?.value || "",
      weight: Number(document.getElementById("measureWeight")?.value || 0),
      body_fat: Number(document.getElementById("measureBodyFat")?.value || 0),
      waist: Number(document.getElementById("measureWaist")?.value || 0),
      chest: Number(document.getElementById("measureChest")?.value || 0),
      arms: Number(document.getElementById("measureArms")?.value || 0),
      thighs: Number(document.getElementById("measureThighs")?.value || 0),
      notes: document.getElementById("measureNotes")?.value || ""
    })
  });
  await go("progress");
};

window.uploadMedia = async function() {
  const file = document.getElementById("mediaFile")?.files?.[0];
  if (!file) return alert("Pick a file first.");

  const form = new FormData();
  form.append("file", file);
  form.append("media_type", document.getElementById("mediaType")?.value || "selfie");
  form.append("notes", document.getElementById("mediaNotes")?.value || "");

  await api("/api/media/upload", {
    method: "POST",
    body: form
  });

  await go("library");
};

window.saveTheme = async function() {
  const theme = document.getElementById("themeSelect")?.value || "neutral";
  setTheme(theme);

  await api("/api/settings/theme", {
    method: "POST",
    body: JSON.stringify({ theme })
  });

  await go("settings");
};

render();