export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/dashboard" && request.method === "GET") {
        return json(await getDashboard(env));
      }

      if (url.pathname === "/api/checkin" && request.method === "POST") {
        return json(await createCheckin(request, env));
      }

      if (url.pathname === "/api/workouts" && request.method === "GET") {
        return json(await listWorkouts(env));
      }

      if (url.pathname === "/api/workouts" && request.method === "POST") {
        return json(await createWorkout(request, env));
      }

      if (url.pathname === "/api/workout-sets" && request.method === "POST") {
        return json(await createWorkoutSet(request, env));
      }

      if (url.pathname === "/api/foods" && request.method === "GET") {
        return json(await listFoods(env));
      }

      if (url.pathname === "/api/foods" && request.method === "POST") {
        return json(await createFood(request, env));
      }

      if (url.pathname === "/api/nutrition" && request.method === "GET") {
        return json(await listNutrition(env));
      }

      if (url.pathname === "/api/nutrition" && request.method === "POST") {
        return json(await createNutrition(request, env));
      }

      if (url.pathname === "/api/measurements" && request.method === "GET") {
        return json(await listMeasurements(env));
      }

      if (url.pathname === "/api/measurements" && request.method === "POST") {
        return json(await createMeasurement(request, env));
      }

      if (url.pathname === "/api/media" && request.method === "GET") {
        return json(await listMedia(env));
      }

      if (url.pathname === "/api/media/upload" && request.method === "POST") {
        return json(await uploadMedia(request, env));
      }

      if (url.pathname === "/api/settings/theme" && request.method === "POST") {
        return json(await saveTheme(request, env));
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown server error"
        },
        500
      );
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function scalar(env, sql, bindings = []) {
  let stmt = env.DB.prepare(sql);
  if (bindings.length) {
    stmt = stmt.bind(...bindings);
  }

  const row = await stmt.first();
  if (!row) return 0;

  const firstKey = Object.keys(row)[0];
  return row[firstKey] ?? 0;
}

async function getDashboard(env) {
  const totalCheckins = await scalar(env, "SELECT COUNT(*) AS count FROM checkins");
  const totalFoods = await scalar(env, "SELECT COUNT(*) AS count FROM foods");
  const totalMedia = await scalar(env, "SELECT COUNT(*) AS count FROM media");
  const totalMeasurements = await scalar(env, "SELECT COUNT(*) AS count FROM measurements");

  return {
    success: true,
    totalCheckins,
    totalFoods,
    totalMedia,
    totalMeasurements
  };
}

async function createCheckin(request, env) {
  const body = await safeJson(request);

  const date = body.date || new Date().toISOString().slice(0, 10);
  const time = body.time || new Date().toTimeString().slice(0, 5);
  const mood = body.mood || null;
  const energy = body.energy ?? null;
  const notes = body.notes || null;

  await env.DB.prepare(`
    INSERT INTO checkins (user_id, checkin_date, checkin_time, mood, energy, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(1, date, time, mood, energy, notes)
    .run();

  return { success: true };
}

async function listWorkouts(env) {
  const result = await env.DB.prepare(`
    SELECT
      w.id,
      w.user_id,
      w.checkin_id,
      w.title,
      w.notes,
      w.created_at,
      (
        SELECT COUNT(*)
        FROM workout_sets s
        WHERE s.workout_id = w.id
      ) AS set_count
    FROM workouts w
    ORDER BY w.id DESC
  `).all();

  return result.results || [];
}

async function createWorkout(request, env) {
  const body = await safeJson(request);

  const title = (body.title || "").trim() || "Untitled workout";
  const notes = (body.notes || "").trim() || null;

  await env.DB.prepare(`
    INSERT INTO workouts (user_id, title, notes)
    VALUES (?, ?, ?)
  `)
    .bind(1, title, notes)
    .run();

  return { success: true };
}

async function createWorkoutSet(request, env) {
  const body = await safeJson(request);

  const workoutId = Number(body.workout_id);
  const exercise = (body.exercise || "").trim();
  const weight = body.weight === "" || body.weight == null ? null : Number(body.weight);
  const reps = body.reps === "" || body.reps == null ? null : Number(body.reps);

  if (!workoutId) {
    throw new Error("Missing workout_id");
  }

  if (!exercise) {
    throw new Error("Exercise is required");
  }

  const nextOrder = await scalar(
    env,
    "SELECT COALESCE(MAX(set_order), 0) + 1 AS next_order FROM workout_sets WHERE workout_id = ?",
    [workoutId]
  );

  await env.DB.prepare(`
    INSERT INTO workout_sets (workout_id, exercise, weight, reps, set_order)
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(workoutId, exercise, weight, reps, nextOrder)
    .run();

  return { success: true };
}

async function listFoods(env) {
  const result = await env.DB.prepare(`
    SELECT *
    FROM foods
    ORDER BY id DESC
  `).all();

  return result.results || [];
}

async function createFood(request, env) {
  const body = await safeJson(request);

  const name = (body.name || "").trim();
  if (!name) {
    throw new Error("Food name is required");
  }

  const brand = (body.brand || "").trim() || null;
  const servingSize = (body.serving_size || "").trim() || null;
  const calories = numberOrZero(body.calories);
  const protein = numberOrZero(body.protein);
  const carbs = numberOrZero(body.carbs);
  const fat = numberOrZero(body.fat);

  await env.DB.prepare(`
    INSERT INTO foods (
      user_id,
      name,
      brand,
      serving_size,
      calories,
      protein,
      carbs,
      fat
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(1, name, brand, servingSize, calories, protein, carbs, fat)
    .run();

  return { success: true };
}

async function listNutrition(env) {
  const result = await env.DB.prepare(`
    SELECT *
    FROM nutrition_logs
    ORDER BY log_date DESC, id DESC
  `).all();

  return result.results || [];
}

async function createNutrition(request, env) {
  const body = await safeJson(request);

  const logDate = body.log_date || new Date().toISOString().slice(0, 10);
  const calories = numberOrZero(body.calories);
  const protein = numberOrZero(body.protein);
  const carbs = numberOrZero(body.carbs);
  const fat = numberOrZero(body.fat);
  const water = numberOrZero(body.water);
  const notes = (body.notes || "").trim() || null;

  await env.DB.prepare(`
    INSERT INTO nutrition_logs (
      user_id,
      log_date,
      calories,
      protein,
      carbs,
      fat,
      water,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(1, logDate, calories, protein, carbs, fat, water, notes)
    .run();

  return { success: true };
}

async function listMeasurements(env) {
  const result = await env.DB.prepare(`
    SELECT *
    FROM measurements
    ORDER BY log_date DESC, id DESC
  `).all();

  return result.results || [];
}

async function createMeasurement(request, env) {
  const body = await safeJson(request);

  const logDate = body.log_date || new Date().toISOString().slice(0, 10);
  const weight = nullableNumber(body.weight);
  const waist = nullableNumber(body.waist);
  const chest = nullableNumber(body.chest);
  const arms = nullableNumber(body.arms);
  const thighs = nullableNumber(body.thighs);
  const bodyFat = nullableNumber(body.body_fat);
  const notes = (body.notes || "").trim() || null;

  await env.DB.prepare(`
    INSERT INTO measurements (
      user_id,
      log_date,
      weight,
      waist,
      chest,
      arms,
      thighs,
      body_fat,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(1, logDate, weight, waist, chest, arms, thighs, bodyFat, notes)
    .run();

  return { success: true };
}

async function listMedia(env) {
  const result = await env.DB.prepare(`
    SELECT *
    FROM media
    ORDER BY id DESC
  `).all();

  return result.results || [];
}

async function uploadMedia(request, env) {
  const form = await request.formData();

  const file = form.get("file");
  const mediaType = String(form.get("media_type") || "selfie").trim();
  const notes = String(form.get("notes") || "").trim() || null;

  if (!(file instanceof File)) {
    throw new Error("No file uploaded");
  }

  const originalName = file.name || "upload";
  const safeName = originalName.replace(/[^\w.\-]+/g, "_");
  const key = `users/1/${mediaType}/${Date.now()}-${safeName}`;

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
    }
  });

  await env.DB.prepare(`
    INSERT INTO media (user_id, media_type, file_key, notes)
    VALUES (?, ?, ?, ?)
  `)
    .bind(1, mediaType, key, notes)
    .run();

  return {
    success: true,
    key
  };
}

async function saveTheme(request, env) {
  const body = await safeJson(request);
  const theme = String(body.theme || "neutral").trim() || "neutral";

  await env.DB.prepare(`
    INSERT OR IGNORE INTO users (id, email, theme)
    VALUES (?, ?, ?)
  `)
    .bind(1, "local@fitvault.app", theme)
    .run();

  await env.DB.prepare(`
    UPDATE users
    SET theme = ?
    WHERE id = ?
  `)
    .bind(theme, 1)
    .run();

  return { success: true };
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function nullableNumber(value) {
  if (value === "" || value == null) {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}