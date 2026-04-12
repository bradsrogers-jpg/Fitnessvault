
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

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
      if (url.pathname === "/api/settings/theme" && request.method === "POST") return json(await saveTheme(request, env));
      return new Response("Not found", { status: 404 });
    } catch (err) {
      return json({ error: err.message || "Server error" }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function getDashboard(env) {
  const totalCheckins = await scalar(env, "SELECT COUNT(*) FROM checkins");
  const totalFoods = await scalar(env, "SELECT COUNT(*) FROM foods");
  const totalMedia = await scalar(env, "SELECT COUNT(*) FROM media");
  const totalMeasurements = await scalar(env, "SELECT COUNT(*) FROM measurements");
  return { totalCheckins, totalFoods, totalMedia, totalMeasurements };
}

async function scalar(env, sql) {
  const row = await env.DB.prepare(sql).first();
  const key = Object.keys(row || {})[0];
  return row ? row[key] : 0;
}

async function createCheckin(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO checkins (user_id, checkin_date, checkin_time, mood, energy, notes)
    VALUES (1, ?, ?, ?, ?, ?)
  `).bind(body.date, body.time, body.mood || null, body.energy || null, body.notes || null).run();
  return { success: true };
}

async function listWorkouts(env) {
  const { results } = await env.DB.prepare(`
    SELECT w.*, 
      (SELECT COUNT(*) FROM workout_sets s WHERE s.workout_id = w.id) AS set_count
    FROM workouts w
    ORDER BY w.id DESC
  `).all();
  return results || [];
}

async function createWorkout(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO workouts (user_id, title, notes)
    VALUES (1, ?, ?)
  `).bind(body.title || "Untitled workout", body.notes || null).run();
  return { success: true };
}

async function createWorkoutSet(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO workout_sets (workout_id, exercise, weight, reps, set_order)
    VALUES (?, ?, ?, ?, 0)
  `).bind(body.workout_id, body.exercise, body.weight, body.reps).run();
  return { success: true };
}

async function listFoods(env) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM foods ORDER BY id DESC
  `).all();
  return results || [];
}

async function createFood(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO foods (user_id, name, brand, serving_size, calories, protein, carbs, fat)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).bind(body.name, body.brand || null, body.serving_size || null, body.calories || 0, body.protein || 0, body.carbs || 0, body.fat || 0).run();
  return { success: true };
}

async function listNutrition(env) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM nutrition_logs ORDER BY log_date DESC, id DESC
  `).all();
  return results || [];
}

async function createNutrition(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO nutrition_logs (user_id, log_date, calories, protein, carbs, fat, water, notes)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).bind(body.log_date, body.calories || 0, body.protein || 0, body.carbs || 0, body.fat || 0, body.water || 0, body.notes || null).run();
  return { success: true };
}

async function listMeasurements(env) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM measurements ORDER BY log_date DESC, id DESC
  `).all();
  return results || [];
}

async function createMeasurement(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO measurements (user_id, log_date, weight, waist, chest, arms, thighs, body_fat, notes)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(body.log_date, body.weight || null, body.waist || null, body.chest || null, body.arms || null, body.thighs || null, body.body_fat || null, body.notes || null).run();
  return { success: true };
}

async function listMedia(env) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM media ORDER BY id DESC
  `).all();
  return results || [];
}

async function uploadMedia(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  const mediaType = form.get("media_type") || "selfie";
  const notes = form.get("notes") || "";
  if (!file) throw new Error("No file uploaded");

  const safeName = String(file.name || "upload").replace(/[^\w.\-]+/g, "_");
  const key = `users/1/${mediaType}/${Date.now()}-${safeName}`;

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  await env.DB.prepare(`
    INSERT INTO media (user_id, media_type, file_key, notes)
    VALUES (1, ?, ?, ?)
  `).bind(mediaType, key, notes).run();

  return { success: true, key };
}

async function saveTheme(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO users (id, email, theme)
    VALUES (1, 'local@fitvault.app', ?)
  `).bind(body.theme || "neutral").run();

  await env.DB.prepare(`
    UPDATE users SET theme = ? WHERE id = 1
  `).bind(body.theme || "neutral").run();

  return { success: true };
}
