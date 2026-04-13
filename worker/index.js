
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/dashboard" && request.method === "GET") return json(await getDashboard(env));
      if (url.pathname === "/api/checkin" && request.method === "POST") return json(await createCheckin(request, env));
      if (url.pathname === "/api/workouts" && request.method === "GET") return json(await listWorkouts(env));
      if (url.pathname === "/api/workouts" && request.method === "POST") return json(await createWorkout(request, env));
      if (url.pathname === "/api/workout-sets" && request.method === "POST") return json(await createWorkoutSet(request, env));
      if (url.pathname === "/api/foods" && request.method === "GET") return json(await listFoods(env));
      if (url.pathname === "/api/foods" && request.method === "POST") return json(await createFood(request, env));
      if (url.pathname === "/api/nutrition" && request.method === "GET") return json(await listNutrition(env));
      if (url.pathname === "/api/nutrition" && request.method === "POST") return json(await createNutrition(request, env));
      if (url.pathname === "/api/measurements" && request.method === "GET") return json(await listMeasurements(env));
      if (url.pathname === "/api/measurements" && request.method === "POST") return json(await createMeasurement(request, env));
      if (url.pathname === "/api/media" && request.method === "GET") return json(await listMedia(env));
      if (url.pathname === "/api/media/upload" && request.method === "POST") return json(await uploadMedia(request, env));
      if (url.pathname === "/api/saved-workouts" && request.method === "GET") return json(await listSavedWorkouts(env));
      if (url.pathname === "/api/saved-workouts" && request.method === "POST") return json(await createSavedWorkout(request, env));
      if (url.pathname === "/api/cycles" && request.method === "GET") return json(await listCycles(env));
      if (url.pathname === "/api/cycles" && request.method === "POST") return json(await createCycle(request, env));
      if (url.pathname === "/api/settings" && request.method === "GET") return json(await getSettings(env));
      if (url.pathname === "/api/settings/theme" && request.method === "POST") return json(await saveTheme(request, env));
      if (url.pathname === "/api/settings/cycle-tracking" && request.method === "POST") return json(await saveCycleTracking(request, env));

      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown server error"
      }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

async function safeJson(request) {
  try { return await request.json(); } catch { return {}; }
}
function num0(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function nullable(v) { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

async function scalar(env, sql, bindings = []) {
  let stmt = env.DB.prepare(sql);
  if (bindings.length) stmt = stmt.bind(...bindings);
  const row = await stmt.first();
  if (!row) return 0;
  const key = Object.keys(row)[0];
  return row[key] ?? 0;
}

async function getDashboard(env) {
  const totalCheckins = await scalar(env, "SELECT COUNT(*) AS c FROM checkins");
  const totalFoods = await scalar(env, "SELECT COUNT(*) AS c FROM foods");
  const totalMedia = await scalar(env, "SELECT COUNT(*) AS c FROM media");
  const totalMeasurements = await scalar(env, "SELECT COUNT(*) AS c FROM measurements");
  const today = new Date().toISOString().slice(0,10);
  const todayCalories = await scalar(env, "SELECT COALESCE(SUM(calories),0) AS c FROM nutrition_logs WHERE log_date = ?", [today]);
  const todayProtein = await scalar(env, "SELECT COALESCE(SUM(protein),0) AS c FROM nutrition_logs WHERE log_date = ?", [today]);
  const todayWorkouts = await scalar(env, "SELECT COUNT(*) AS c FROM workouts WHERE substr(created_at,1,10) = ?", [today]);
  const streak = await calculateStreak(env);
  const settings = await getSettings(env);
  return { success:true, totalCheckins, totalFoods, totalMedia, totalMeasurements, todayCalories, todayProtein, todayWorkouts, streak, cycleTrackingEnabled: settings.cycle_tracking_enabled || 0 };
}

async function calculateStreak(env) {
  const { results } = await env.DB.prepare("SELECT DISTINCT checkin_date FROM checkins ORDER BY checkin_date DESC").all();
  if (!results || !results.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);
  for (const row of results) {
    const d = new Date(row.checkin_date + "T00:00:00");
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0) {
      const yesterday = new Date();
      yesterday.setHours(0,0,0,0);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.getTime() === yesterday.getTime()) {
        streak++;
        cursor = yesterday;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

async function createCheckin(request, env) {
  const body = await safeJson(request);
  const date = body.date || new Date().toISOString().slice(0,10);
  const time = body.time || new Date().toTimeString().slice(0,5);
  await env.DB.prepare("INSERT INTO checkins (user_id, checkin_date, checkin_time) VALUES (1, ?, ?)").bind(date, time).run();
  return { success:true };
}

async function listWorkouts(env) {
  const { results } = await env.DB.prepare(`
    SELECT w.*, (SELECT COUNT(*) FROM workout_sets s WHERE s.workout_id = w.id) AS set_count
    FROM workouts w
    ORDER BY w.id DESC
  `).all();
  const workouts = results || [];
  for (const w of workouts) {
    const setRes = await env.DB.prepare("SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_order ASC, id ASC").bind(w.id).all();
    w.sets = setRes.results || [];
  }
  return workouts;
}

async function createWorkout(request, env) {
  const body = await safeJson(request);
  const title = (body.title || "").trim() || "Untitled workout";
  const notes = (body.notes || "").trim() || null;
  await env.DB.prepare("INSERT INTO workouts (user_id, title, notes) VALUES (1, ?, ?)").bind(title, notes).run();
  return { success:true };
}

async function createWorkoutSet(request, env) {
  const body = await safeJson(request);
  const workoutId = Number(body.workout_id);
  const exercise = (body.exercise || "").trim();
  if (!workoutId) throw new Error("Missing workout_id");
  if (!exercise) throw new Error("Exercise is required");
  const next = await scalar(env, "SELECT COALESCE(MAX(set_order),0)+1 AS c FROM workout_sets WHERE workout_id = ?", [workoutId]);
  await env.DB.prepare("INSERT INTO workout_sets (workout_id, exercise, weight, reps, set_order) VALUES (?, ?, ?, ?, ?)")
    .bind(workoutId, exercise, nullable(body.weight), nullable(body.reps), next).run();
  return { success:true };
}

async function listFoods(env) {
  const { results } = await env.DB.prepare("SELECT * FROM foods ORDER BY id DESC").all();
  return results || [];
}

async function createFood(request, env) {
  const body = await safeJson(request);
  const name = (body.name || "").trim();
  if (!name) throw new Error("Food name is required");
  await env.DB.prepare(`
    INSERT INTO foods (user_id, name, brand, serving_size, calories, protein, carbs, fat)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name,
    (body.brand || "").trim() || null,
    (body.serving_size || "").trim() || null,
    num0(body.calories),
    num0(body.protein),
    num0(body.carbs),
    num0(body.fat)
  ).run();
  return { success:true };
}

async function listNutrition(env) {
  const { results } = await env.DB.prepare("SELECT * FROM nutrition_logs ORDER BY log_date DESC, id DESC").all();
  const rows = results || [];
  for (const row of rows) {
    const totals = await env.DB.prepare(`
      SELECT COALESCE(SUM(calories),0) AS calories,
             COALESCE(SUM(protein),0) AS protein,
             COALESCE(SUM(carbs),0) AS carbs,
             COALESCE(SUM(fat),0) AS fat
      FROM nutrition_logs WHERE log_date = ?
    `).bind(row.log_date).first();
    row.day_totals = totals || { calories:0, protein:0, carbs:0, fat:0 };
  }
  return rows;
}

async function createNutrition(request, env) {
  const body = await safeJson(request);
  await env.DB.prepare(`
    INSERT INTO nutrition_logs (user_id, log_date, meal_name, calories, protein, carbs, fat, water, notes)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.log_date || new Date().toISOString().slice(0,10),
    (body.meal_name || "Meal").trim(),
    num0(body.calories),
    num0(body.protein),
    num0(body.carbs),
    num0(body.fat),
    num0(body.water),
    (body.notes || "").trim() || null
  ).run();
  return { success:true };
}

async function listMeasurements(env) {
  const { results } = await env.DB.prepare("SELECT * FROM measurements ORDER BY log_date DESC, id DESC").all();
  return results || [];
}

async function createMeasurement(request, env) {
  const body = await safeJson(request);
  await env.DB.prepare(`
    INSERT INTO measurements (user_id, log_date, weight, waist, chest, arms, thighs, body_fat, notes)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.log_date || new Date().toISOString().slice(0,10),
    nullable(body.weight),
    nullable(body.waist),
    nullable(body.chest),
    nullable(body.arms),
    nullable(body.thighs),
    nullable(body.body_fat),
    (body.notes || "").trim() || null
  ).run();
  return { success:true };
}

async function listMedia(env) {
  const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id DESC").all();
  return results || [];
}

async function uploadMedia(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  const mediaType = String(form.get("media_type") || "selfie").trim();
  const notes = String(form.get("notes") || "").trim() || null;
  if (!(file instanceof File)) throw new Error("No file uploaded");
  const safeName = String(file.name || "upload").replace(/[^\w.\-]+/g, "_");
  const key = `users/1/${mediaType}/${Date.now()}-${safeName}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });
  await env.DB.prepare("INSERT INTO media (user_id, media_type, file_key, notes) VALUES (1, ?, ?, ?)").bind(mediaType, key, notes).run();
  return { success:true, key };
}

async function listSavedWorkouts(env) {
  const { results } = await env.DB.prepare("SELECT * FROM saved_workouts ORDER BY id DESC").all();
  return results || [];
}

async function createSavedWorkout(request, env) {
  const body = await safeJson(request);
  const title = (body.title || "").trim();
  if (!title) throw new Error("Title is required");
  await env.DB.prepare("INSERT INTO saved_workouts (user_id, title, category, notes) VALUES (1, ?, ?, ?)")
    .bind(title, (body.category || "").trim() || null, (body.notes || "").trim() || null).run();
  return { success:true };
}

async function listCycles(env) {
  const { results } = await env.DB.prepare("SELECT * FROM cycles ORDER BY id DESC").all();
  return results || [];
}

async function createCycle(request, env) {
  const body = await safeJson(request);
  const start = body.start_date || new Date().toISOString().slice(0,10);
  await env.DB.prepare("INSERT INTO cycles (user_id, start_date, end_date, symptoms, notes) VALUES (1, ?, ?, ?, ?)")
    .bind(start, body.end_date || null, (body.symptoms || "").trim() || null, (body.notes || "").trim() || null).run();
  return { success:true };
}

async function getSettings(env) {
  await env.DB.prepare("INSERT OR IGNORE INTO users (id, email, theme, cycle_tracking_enabled) VALUES (1, 'local@fitvault.app', 'neutral', 0)").run();
  const row = await env.DB.prepare("SELECT theme, cycle_tracking_enabled FROM users WHERE id = 1").first();
  return row || { theme:"neutral", cycle_tracking_enabled:0 };
}

async function saveTheme(request, env) {
  const body = await safeJson(request);
  const theme = String(body.theme || "neutral").trim() || "neutral";
  await env.DB.prepare("INSERT OR IGNORE INTO users (id, email, theme, cycle_tracking_enabled) VALUES (1, 'local@fitvault.app', ?, 0)").bind(theme).run();
  await env.DB.prepare("UPDATE users SET theme = ? WHERE id = 1").bind(theme).run();
  return { success:true };
}

async function saveCycleTracking(request, env) {
  const body = await safeJson(request);
  const enabled = Number(body.enabled || 0) ? 1 : 0;
  await env.DB.prepare("INSERT OR IGNORE INTO users (id, email, theme, cycle_tracking_enabled) VALUES (1, 'local@fitvault.app', 'neutral', ?)").bind(enabled).run();
  await env.DB.prepare("UPDATE users SET cycle_tracking_enabled = ? WHERE id = 1").bind(enabled).run();
  return { success:true };
}
