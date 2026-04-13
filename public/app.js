
const R2_PUBLIC_BASE = "https://pub-2f7de274ccb949a995e329ce40005b2c.r2.dev";

const state = {
  page: "home",
  theme: localStorage.getItem("theme") || "neutral",
  affirmations: {
    clean: [
      "Show up. Log it. Let it compound.",
      "Small sessions still count.",
      "Consistency beats intensity."
    ],
    feminine: [
      "You showed up. That already matters.",
      "Stack the little wins, pretty and practical.",
      "Soft vibe, hard work."
    ],
    performance: [
      "Discipline beats mood.",
      "Log the work. Build the pattern.",
      "Mission first. Feelings later."
    ]
  }
};

const app = document.getElementById("app");

function currentMode() {
  if (state.theme === "feminine") return "feminine";
  if (state.theme === "performance") return "performance";
  return "clean";
}

function randomAffirmation() {
  const arr = state.affirmations[currentMode()];
  return arr[Math.floor(Math.random() * arr.length)];
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem("theme", theme);
  document.body.className = `theme-${theme}`;
}

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

async function api(path, options = {}) {
  try {
    const isForm = options.body instanceof FormData;
    const headers = isForm ? (options.headers || {}) : {"Content-Type":"application/json", ...(options.headers || {})};
    const res = await fetch(path, {...options, headers});
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) return { error: true, message: data.error || data.raw || "Request failed" };
    return data;
  } catch (err) {
    return { error: true, message: err.message || "Request failed" };
  }
}

function shell(content, title="FitVault") {
  return `
    <div class="app">
      <div class="topbar">
        <div class="brand">
          <h1>${title}</h1>
          <p>private fitness vault</p>
        </div>
        <div class="pilltop">${state.theme}</div>
      </div>
      <div class="layout">
        <aside class="sidebar">
          <div class="nav-title">Navigate</div>
          ${navBtn("home","Home")}
          ${navBtn("session","Session")}
          ${navBtn("nutrition","Nutrition")}
          ${navBtn("progress","Progress")}
          ${navBtn("library","Library")}
          ${navBtn("settings","Settings")}
        </aside>
        <main class="content">${content}</main>
      </div>
      <button class="fab" onclick="openQuickAdd()">+</button>
      <nav class="bottom-nav">
        ${bottomBtn("home","Home")}
        ${bottomBtn("session","Session")}
        ${bottomBtn("nutrition","Fuel")}
        ${bottomBtn("progress","Track")}
        ${bottomBtn("library","Vault")}
        ${bottomBtn("settings","Settings")}
      </nav>
    </div>
  `;
}

function navBtn(page, label) {
  return `<button class="nav-btn ${state.page===page?"active":""}" onclick="go('${page}')">${label}</button>`;
}
function bottomBtn(page, label) {
  return `<button class="bottom-btn ${state.page===page?"active":""}" onclick="go('${page}')">${label}</button>`;
}

async function renderHome() {
  const d = await api("/api/dashboard");
  const safe = {
    totalCheckins: d.totalCheckins || 0,
    totalFoods: d.totalFoods || 0,
    totalMedia: d.totalMedia || 0,
    totalMeasurements: d.totalMeasurements || 0,
    todayCalories: d.todayCalories || 0,
    todayProtein: d.todayProtein || 0,
    todayWorkouts: d.todayWorkouts || 0,
    streak: d.streak || 0,
    cycleTrackingEnabled: !!d.cycleTrackingEnabled
  };

  return shell(`
    <div class="hero">
      <section class="surface">
        <div class="kicker">today</div>
        <div class="hero-title">Check in. Train. Fuel. Track. Keep the receipts.</div>
        <div class="hero-sub">This version actually works. It tracks gym days, workouts, foods, progress, media, workout ideas, themes, and optional cycle logs in one place.</div>
        <div class="row">
          <button class="primary" onclick="checkIn()">Check In</button>
          <button class="secondary" onclick="go('session')">Open Session</button>
          <button class="secondary" onclick="go('nutrition')">Log Food</button>
        </div>
        <div class="affirm" id="affirmBox">${randomAffirmation()}</div>
        ${d.error ? `<div class="affirm">Backend issue: ${esc(d.message)}</div>` : ""}
      </section>
      <section class="surface">
        <div class="stats-grid">
          <div class="stat"><div class="label">Gym days</div><div class="value">${safe.totalCheckins}</div></div>
          <div class="stat"><div class="label">Streak</div><div class="value">${safe.streak}</div></div>
          <div class="stat"><div class="label">Today calories</div><div class="value">${safe.todayCalories}</div></div>
          <div class="stat"><div class="label">Today protein</div><div class="value">${safe.todayProtein}g</div></div>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="section"><div><h2>Overview</h2><p>The parts people actually use.</p></div></div>
      <div class="tile-grid">
        <div class="tile"><div class="kicker">session</div><h3>Workouts</h3><div class="note">${safe.todayWorkouts} workout(s) logged today</div></div>
        <div class="tile"><div class="kicker">fuel</div><h3>Food vault</h3><div class="note">${safe.totalFoods} saved food(s)</div></div>
        <div class="tile"><div class="kicker">progress</div><h3>Measurements</h3><div class="note">${safe.totalMeasurements} entries saved</div></div>
        <div class="tile"><div class="kicker">vault</div><h3>Media</h3><div class="note">${safe.totalMedia} photo/video file(s)</div></div>
        <div class="tile"><div class="kicker">ideas</div><h3>Workout ideas</h3><div class="note">Save exercises or ideas to try later</div></div>
        <div class="tile"><div class="kicker">health</div><h3>Cycle logs</h3><div class="note">${safe.cycleTrackingEnabled ? "Enabled" : "Optional and off by default"}</div></div>
      </div>
    </section>
  `);
}

async function renderSession() {
  const workouts = await api("/api/workouts");
  const ideas = await api("/api/saved-workouts");
  const items = Array.isArray(workouts) ? workouts : [];
  const saved = Array.isArray(ideas) ? ideas : [];

  return shell(`
    <section class="surface">
      <div class="section"><div><h2>Session</h2><p>Create workouts, add sets, and save workout ideas.</p></div></div>
      <div class="split">
        <div class="card">
          <h3>Create workout</h3>
          <div class="form-grid">
            <div class="field full"><label>Workout title</label><input id="workoutTitle" placeholder="Push Day / Lower / Full Body" /></div>
            <div class="field full"><label>Notes</label><textarea id="workoutNotes" placeholder="How it felt, cues, what sucked"></textarea></div>
          </div>
          <div class="row"><button class="primary" onclick="createWorkout()">Save Workout</button></div>
        </div>

        <div class="card">
          <h3>Add set</h3>
          <div class="form-grid">
            <div class="field full"><label>Workout</label>
              <select id="setWorkout">${items.length ? items.map(w=>`<option value="${w.id}">${esc(w.title)}</option>`).join("") : `<option value="">Create a workout first</option>`}</select>
            </div>
            <div class="field full"><label>Exercise</label><input id="setExercise" placeholder="Bench Press" /></div>
            <div class="field"><label>Weight</label><input id="setWeight" type="number" step="0.1" /></div>
            <div class="field"><label>Reps</label><input id="setReps" type="number" /></div>
          </div>
          <div class="row"><button class="secondary" onclick="addSet()">Add Set</button></div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="split">
        <div>
          <div class="section"><h3>Recent workouts</h3></div>
          <div class="list">
            ${items.length ? items.map(w=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(w.title)}</div><div class="list-meta">${esc(w.created_at || "")}</div></div>
                  <div class="pill">${w.set_count || 0} sets</div>
                </div>
                <div class="note">${esc(w.notes || "No notes yet.")}</div>
                <div class="pills">${(w.sets || []).map(s=>`<div class="pill">${esc(s.exercise)} ${s.weight ?? "-"} x ${s.reps ?? "-"}</div>`).join("")}</div>
              </div>
            `).join("") : `<div class="empty">No workouts yet.</div>`}
          </div>
        </div>

        <div>
          <div class="section"><h3>Workout ideas library</h3></div>
          <div class="card">
            <div class="form-grid">
              <div class="field full"><label>Title</label><input id="ideaTitle" placeholder="Smith squat variation" /></div>
              <div class="field"><label>Category</label><input id="ideaCategory" placeholder="Legs / Push / Pull" /></div>
              <div class="field"><label>Notes</label><input id="ideaNotes" placeholder="Try next glute day" /></div>
            </div>
            <div class="row"><button class="secondary" onclick="saveWorkoutIdea()">Save Idea</button></div>
          </div>
          <div class="list">
            ${saved.length ? saved.map(i=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(i.title)}</div><div class="list-meta">${esc(i.category || "")}</div></div>
                </div>
                <div class="note">${esc(i.notes || "")}</div>
              </div>
            `).join("") : `<div class="empty">No workout ideas yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `, "Session");
}

async function renderNutrition() {
  const foods = await api("/api/foods");
  const logs = await api("/api/nutrition");
  const foodItems = Array.isArray(foods) ? foods : [];
  const logItems = Array.isArray(logs) ? logs : [];
  const latest = logItems[0] || {};

  return shell(`
    <section class="surface">
      <div class="section"><div><h2>Nutrition</h2><p>Saved foods, daily intake, meals, and water.</p></div></div>
      <div class="macro-grid">
        <div class="stat"><div class="label">Calories</div><div class="value">${latest.day_totals ? latest.day_totals.calories : 0}</div></div>
        <div class="stat"><div class="label">Protein</div><div class="value">${latest.day_totals ? latest.day_totals.protein : 0}g</div></div>
        <div class="stat"><div class="label">Carbs</div><div class="value">${latest.day_totals ? latest.day_totals.carbs : 0}g</div></div>
        <div class="stat"><div class="label">Fat</div><div class="value">${latest.day_totals ? latest.day_totals.fat : 0}g</div></div>
      </div>
    </section>

    <section class="surface">
      <div class="split">
        <div class="card">
          <h3>Add saved food</h3>
          <div class="form-grid">
            <div class="field"><label>Name</label><input id="foodName" placeholder="Greek yogurt" /></div>
            <div class="field"><label>Brand</label><input id="foodBrand" placeholder="Oikos" /></div>
            <div class="field full"><label>Serving size</label><input id="foodServing" placeholder="170g / 1 cup / 1 bar" /></div>
            <div class="field"><label>Calories</label><input id="foodCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="foodProtein" type="number" /></div>
            <div class="field"><label>Carbs</label><input id="foodCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="foodFat" type="number" /></div>
          </div>
          <div class="row"><button class="primary" onclick="saveFood()">Save Food</button></div>
        </div>

        <div class="card">
          <h3>Log meal / intake</h3>
          <div class="form-grid">
            <div class="field full"><label>Date</label><input id="nutritionDate" type="date" /></div>
            <div class="field"><label>Meal name</label><input id="mealName" placeholder="Breakfast / Lunch / Snack" /></div>
            <div class="field"><label>Water</label><input id="nutritionWater" type="number" /></div>
            <div class="field"><label>Calories</label><input id="nutritionCalories" type="number" /></div>
            <div class="field"><label>Protein</label><input id="nutritionProtein" type="number" /></div>
            <div class="field"><label>Carbs</label><input id="nutritionCarbs" type="number" /></div>
            <div class="field"><label>Fat</label><input id="nutritionFat" type="number" /></div>
            <div class="field full"><label>Notes</label><input id="nutritionNotes" placeholder="Chicken, rice, etc." /></div>
          </div>
          <div class="row"><button class="secondary" onclick="saveNutrition()">Save Intake</button></div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="split">
        <div>
          <div class="section"><h3>Saved foods</h3></div>
          <div class="list">
            ${foodItems.length ? foodItems.map(f=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(f.name)}</div><div class="list-meta">${esc(f.brand || "")}</div></div>
                  <div class="pill">${f.calories || 0} cal</div>
                </div>
                <div class="pills">
                  <div class="pill">${f.protein || 0}p</div>
                  <div class="pill">${f.carbs || 0}c</div>
                  <div class="pill">${f.fat || 0}f</div>
                  <div class="pill">${esc(f.serving_size || "serving")}</div>
                </div>
              </div>
            `).join("") : `<div class="empty">No saved foods yet.</div>`}
          </div>
        </div>
        <div>
          <div class="section"><h3>Recent intake logs</h3></div>
          <div class="list">
            ${logItems.length ? logItems.map(l=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(l.log_date)} • ${esc(l.meal_name || "Meal")}</div><div class="list-meta">${esc(l.notes || "")}</div></div>
                  <div class="pill">${l.calories || 0} cal</div>
                </div>
                <div class="pills">
                  <div class="pill">${l.protein || 0}g protein</div>
                  <div class="pill">${l.carbs || 0}g carbs</div>
                  <div class="pill">${l.fat || 0}g fat</div>
                  <div class="pill">${l.water || 0} water</div>
                </div>
              </div>
            `).join("") : `<div class="empty">No intake logs yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `, "Nutrition");
}

async function renderProgress() {
  const measurements = await api("/api/measurements");
  const cycles = await api("/api/cycles");
  const items = Array.isArray(measurements) ? measurements : [];
  const cycleItems = Array.isArray(cycles) ? cycles : [];
  const latest = items[0] || {};

  return shell(`
    <section class="surface">
      <div class="section"><div><h2>Progress</h2><p>Measurements, body stats, and optional cycle context.</p></div></div>
      <div class="macro-grid">
        <div class="stat"><div class="label">Weight</div><div class="value">${latest.weight || 0}</div></div>
        <div class="stat"><div class="label">Waist</div><div class="value">${latest.waist || 0}</div></div>
        <div class="stat"><div class="label">Chest</div><div class="value">${latest.chest || 0}</div></div>
        <div class="stat"><div class="label">Body Fat</div><div class="value">${latest.body_fat || 0}</div></div>
      </div>
    </section>

    <section class="surface">
      <div class="split">
        <div class="card">
          <h3>Log measurements</h3>
          <div class="form-grid">
            <div class="field full"><label>Date</label><input id="measureDate" type="date" /></div>
            <div class="field"><label>Weight</label><input id="measureWeight" type="number" step="0.1" /></div>
            <div class="field"><label>Body Fat</label><input id="measureBodyFat" type="number" step="0.1" /></div>
            <div class="field"><label>Waist</label><input id="measureWaist" type="number" step="0.1" /></div>
            <div class="field"><label>Chest</label><input id="measureChest" type="number" step="0.1" /></div>
            <div class="field"><label>Arms</label><input id="measureArms" type="number" step="0.1" /></div>
            <div class="field"><label>Thighs</label><input id="measureThighs" type="number" step="0.1" /></div>
            <div class="field full"><label>Notes</label><textarea id="measureNotes" placeholder="Bloaty, leaner, stronger, etc."></textarea></div>
          </div>
          <div class="row"><button class="primary" onclick="saveMeasurement()">Save Measurement</button></div>
        </div>

        <div class="card">
          <h3>Optional cycle log</h3>
          <div class="form-grid">
            <div class="field"><label>Start date</label><input id="cycleStart" type="date" /></div>
            <div class="field"><label>End date</label><input id="cycleEnd" type="date" /></div>
            <div class="field full"><label>Symptoms</label><input id="cycleSymptoms" placeholder="Bloating, fatigue, cramps" /></div>
            <div class="field full"><label>Notes</label><input id="cycleNotes" placeholder="Scale up 3 lbs, low energy, etc." /></div>
          </div>
          <div class="row"><button class="secondary" onclick="saveCycle()">Save Cycle Log</button></div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="split">
        <div>
          <div class="section"><h3>Measurement history</h3></div>
          <div class="list">
            ${items.length ? items.map(m=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(m.log_date)}</div><div class="list-meta">${esc(m.notes || "")}</div></div>
                </div>
                <div class="pills">
                  <div class="pill">Weight ${m.weight || "-"}</div>
                  <div class="pill">Waist ${m.waist || "-"}</div>
                  <div class="pill">Chest ${m.chest || "-"}</div>
                  <div class="pill">BF ${m.body_fat || "-"}</div>
                </div>
              </div>
            `).join("") : `<div class="empty">No measurements yet.</div>`}
          </div>
        </div>
        <div>
          <div class="section"><h3>Cycle logs</h3></div>
          <div class="list">
            ${cycleItems.length ? cycleItems.map(c=>`
              <div class="list-item">
                <div class="list-head">
                  <div><div class="list-title">${esc(c.start_date)}${c.end_date ? " → " + esc(c.end_date) : ""}</div><div class="list-meta">${esc(c.symptoms || "")}</div></div>
                </div>
                <div class="note">${esc(c.notes || "")}</div>
              </div>
            `).join("") : `<div class="empty">No cycle logs yet.</div>`}
          </div>
        </div>
      </div>
    </section>
  `, "Progress");
}

async function renderLibrary() {
  const media = await api("/api/media");
  const items = Array.isArray(media) ? media : [];

  return shell(`
    <section class="surface">
      <div class="section"><div><h2>Library</h2><p>Selfies, progress photos, workout videos, and inspiration all in one place.</p></div></div>
      <div class="split">
        <div class="card">
          <h3>Upload media</h3>
          <div class="form-grid">
            <div class="field"><label>Type</label>
              <select id="mediaType">
                <option value="selfie">Selfie</option>
                <option value="progress_photo">Progress Photo</option>
                <option value="workout_video">Workout Video</option>
                <option value="idea_video">Workout Idea Video</option>
              </select>
            </div>
            <div class="field"><label>Notes</label><input id="mediaNotes" placeholder="Front pose / leg day / form check" /></div>
            <div class="field full"><label>File</label><input id="mediaFile" type="file" accept="image/*,video/*" /></div>
          </div>
          <div class="row"><button class="primary" onclick="uploadMedia()">Upload</button></div>
        </div>

        <div class="card">
          <h3>Vault status</h3>
          <div class="stats-grid">
            <div class="stat"><div class="label">Files saved</div><div class="value">${items.length}</div></div>
            <div class="stat"><div class="label">Last type</div><div class="value" style="font-size:18px">${esc((items[0] && items[0].media_type) || "none")}</div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="section"><h3>Media grid</h3></div>
      ${items.length ? `
        <div class="media-grid">${items.map(renderMedia).join("")}</div>
      ` : `<div class="empty">No media uploaded yet.</div>`}
    </section>
  `, "Library");
}

function renderMedia(m) {
  const url = `${R2_PUBLIC_BASE}/${m.file_key}`;
  const isVideo = (m.media_type || "").includes("video");
  return `
    <article class="media-tile">
      <div class="frame">
        ${isVideo ? `<video controls src="${url}"></video>` : `<img src="${url}" alt="" />`}
      </div>
      <div class="caption">
        <div class="list-title">${esc(m.media_type)}</div>
        <div class="list-meta">${esc(m.notes || "")}</div>
      </div>
    </article>
  `;
}

async function renderSettings() {
  const s = await api("/api/settings");
  const settings = s && !s.error ? s : { theme: state.theme, cycle_tracking_enabled: 0 };

  return shell(`
    <section class="surface">
      <div class="section"><div><h2>Settings</h2><p>Switch themes and optional tracking features.</p></div></div>
      <div class="split">
        <div class="card">
          <h3>Appearance</h3>
          <div class="form-grid">
            <div class="field full">
              <label>Theme style</label>
              <select id="themeSelect">
                <option value="neutral" ${settings.theme === "neutral" ? "selected" : ""}>Clean</option>
                <option value="feminine" ${settings.theme === "feminine" ? "selected" : ""}>Feminine</option>
                <option value="performance" ${settings.theme === "performance" ? "selected" : ""}>Performance</option>
              </select>
            </div>
          </div>
          <div class="row"><button class="primary" onclick="saveTheme()">Save Theme</button></div>
        </div>

        <div class="card">
          <h3>Optional cycle tracking</h3>
          <div class="form-grid">
            <div class="field full">
              <label>Enable cycle tracking</label>
              <select id="cycleTrackingEnabled">
                <option value="0" ${settings.cycle_tracking_enabled ? "" : "selected"}>Off</option>
                <option value="1" ${settings.cycle_tracking_enabled ? "selected" : ""}>On</option>
              </select>
            </div>
          </div>
          <div class="row"><button class="secondary" onclick="saveCycleTracking()">Save Setting</button></div>
        </div>
      </div>
    </section>
  `, "Settings");
}

function openQuickAdd() {
  const choice = prompt("Quick add: type checkin, workout, food, selfie");
  if (!choice) return;
  const c = choice.toLowerCase().trim();
  if (c === "checkin") return checkIn();
  if (c === "workout") return go("session");
  if (c === "food") return go("nutrition");
  if (c === "selfie") return go("library");
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

  const today = new Date().toISOString().slice(0,10);
  ["nutritionDate","measureDate","cycleStart","cycleEnd"].forEach(id=>{
    const el = document.getElementById(id);
    if (el && !el.value && id !== "cycleEnd") el.value = today;
  });
}

window.go = async function(page) { state.page = page; await render(); }

window.checkIn = async function() {
  const now = new Date();
  const result = await api("/api/checkin", {
    method:"POST",
    body:JSON.stringify({date:now.toISOString().slice(0,10), time:now.toTimeString().slice(0,5)})
  });
  const box = document.getElementById("affirmBox");
  if (box) box.textContent = result.error ? `Check-in failed: ${result.message}` : randomAffirmation();
  await render();
}

window.createWorkout = async function() {
  await api("/api/workouts", {
    method:"POST",
    body:JSON.stringify({
      title:document.getElementById("workoutTitle")?.value || "",
      notes:document.getElementById("workoutNotes")?.value || ""
    })
  });
  await render();
}

window.addSet = async function() {
  const workoutId = document.getElementById("setWorkout")?.value;
  if (!workoutId) return alert("Create a workout first.");
  await api("/api/workout-sets", {
    method:"POST",
    body:JSON.stringify({
      workout_id:Number(workoutId),
      exercise:document.getElementById("setExercise")?.value || "",
      weight:Number(document.getElementById("setWeight")?.value || 0),
      reps:Number(document.getElementById("setReps")?.value || 0)
    })
  });
  await render();
}

window.saveWorkoutIdea = async function() {
  await api("/api/saved-workouts", {
    method:"POST",
    body:JSON.stringify({
      title:document.getElementById("ideaTitle")?.value || "",
      category:document.getElementById("ideaCategory")?.value || "",
      notes:document.getElementById("ideaNotes")?.value || ""
    })
  });
  await render();
}

window.saveFood = async function() {
  await api("/api/foods", {
    method:"POST",
    body:JSON.stringify({
      name:document.getElementById("foodName")?.value || "",
      brand:document.getElementById("foodBrand")?.value || "",
      serving_size:document.getElementById("foodServing")?.value || "",
      calories:Number(document.getElementById("foodCalories")?.value || 0),
      protein:Number(document.getElementById("foodProtein")?.value || 0),
      carbs:Number(document.getElementById("foodCarbs")?.value || 0),
      fat:Number(document.getElementById("foodFat")?.value || 0)
    })
  });
  await render();
}

window.saveNutrition = async function() {
  await api("/api/nutrition", {
    method:"POST",
    body:JSON.stringify({
      log_date:document.getElementById("nutritionDate")?.value || "",
      meal_name:document.getElementById("mealName")?.value || "",
      calories:Number(document.getElementById("nutritionCalories")?.value || 0),
      protein:Number(document.getElementById("nutritionProtein")?.value || 0),
      carbs:Number(document.getElementById("nutritionCarbs")?.value || 0),
      fat:Number(document.getElementById("nutritionFat")?.value || 0),
      water:Number(document.getElementById("nutritionWater")?.value || 0),
      notes:document.getElementById("nutritionNotes")?.value || ""
    })
  });
  await render();
}

window.saveMeasurement = async function() {
  await api("/api/measurements", {
    method:"POST",
    body:JSON.stringify({
      log_date:document.getElementById("measureDate")?.value || "",
      weight:Number(document.getElementById("measureWeight")?.value || 0),
      body_fat:Number(document.getElementById("measureBodyFat")?.value || 0),
      waist:Number(document.getElementById("measureWaist")?.value || 0),
      chest:Number(document.getElementById("measureChest")?.value || 0),
      arms:Number(document.getElementById("measureArms")?.value || 0),
      thighs:Number(document.getElementById("measureThighs")?.value || 0),
      notes:document.getElementById("measureNotes")?.value || ""
    })
  });
  await render();
}

window.saveCycle = async function() {
  await api("/api/cycles", {
    method:"POST",
    body:JSON.stringify({
      start_date:document.getElementById("cycleStart")?.value || "",
      end_date:document.getElementById("cycleEnd")?.value || "",
      symptoms:document.getElementById("cycleSymptoms")?.value || "",
      notes:document.getElementById("cycleNotes")?.value || ""
    })
  });
  await render();
}

window.uploadMedia = async function() {
  const file = document.getElementById("mediaFile")?.files?.[0];
  if (!file) return alert("Pick a file first.");
  const form = new FormData();
  form.append("file", file);
  form.append("media_type", document.getElementById("mediaType")?.value || "selfie");
  form.append("notes", document.getElementById("mediaNotes")?.value || "");
  await api("/api/media/upload", { method:"POST", body:form });
  await render();
}

window.saveTheme = async function() {
  const theme = document.getElementById("themeSelect")?.value || "neutral";
  setTheme(theme);
  await api("/api/settings/theme", { method:"POST", body:JSON.stringify({theme}) });
  await render();
}

window.saveCycleTracking = async function() {
  const enabled = Number(document.getElementById("cycleTrackingEnabled")?.value || 0);
  await api("/api/settings/cycle-tracking", { method:"POST", body:JSON.stringify({enabled}) });
  await render();
}

render();
