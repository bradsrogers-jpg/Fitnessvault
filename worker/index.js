export default {
 async fetch(req, env){
  const url = new URL(req.url);

  const user = { id: 1 }; // your current app is single-user default

  // ---------- DASHBOARD ----------
  if(url.pathname==="/api/dashboard"){
    const checkins = await env.DB.prepare("SELECT COUNT(*) c FROM checkins WHERE user_id=?").bind(user.id).first();
    const calories = await env.DB.prepare("SELECT SUM(calories) c FROM nutrition_logs WHERE user_id=? AND log_date=date('now')").bind(user.id).first();

    return json({
      checkins: checkins.c || 0,
      calories: calories.c || 0
    });
  }

  // ---------- CHECKIN ----------
  if(url.pathname==="/api/checkin"){
    await env.DB.prepare(`
      INSERT INTO checkins (user_id, checkin_date, checkin_time)
      VALUES (?, date('now'), time('now'))
    `).bind(user.id).run();

    return json({ ok:true });
  }

  // ---------- WORKOUT ----------
  if(url.pathname==="/api/workouts" && req.method==="POST"){
    const b = await req.json();

    await env.DB.prepare(`
      INSERT INTO workouts (user_id, title)
      VALUES (?, ?)
    `).bind(user.id, b.title).run();

    return json({ ok:true });
  }

  // ---------- FOOD ----------
  if(url.pathname==="/api/foods" && req.method==="POST"){
    const b = await req.json();

    await env.DB.prepare(`
      INSERT INTO foods (user_id, name, calories)
      VALUES (?, ?, ?)
    `).bind(user.id, b.name, b.calories).run();

    return json({ ok:true });
  }

  // ---------- MEDIA ----------
  if(url.pathname==="/api/media" && req.method==="POST"){
    const form = await req.formData();
    const file = form.get("file");

    const key = "media-" + Date.now();

    await env.MEDIA.put(key, file.stream());

    await env.DB.prepare(`
      INSERT INTO media (user_id, media_type, file_key)
      VALUES (?, 'upload', ?)
    `).bind(user.id, key).run();

    return json({ ok:true });
  }

  // =========================================================
  // ====================== AI ROUTES =========================
  // =========================================================

  if(url.pathname==="/api/ai/meal"){
    return json(await aiMeal(req, env, user));
  }

  if(url.pathname==="/api/ai/label"){
    return json(await aiLabel(req, env, user));
  }

  if(url.pathname==="/api/ai/workout"){
    return json(await aiWorkout(req, env, user));
  }

  return env.ASSETS.fetch(req);
 }
};

function json(d){
  return new Response(JSON.stringify(d),{
    headers:{ "content-type":"application/json" }
  });
}

// ===================== AI CORE =====================

async function base64(file){
  const buf = await file.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function callAI(env, prompt, image){
  const res = await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      model:"gpt-4.1-mini",
      input:[{
        role:"user",
        content:[
          {type:"input_text",text:prompt},
          {type:"input_image",image_base64:image}
        ]
      }]
    })
  });

  const data = await res.json();

  try{
    return JSON.parse(data.output[0].content[0].text);
  }catch{
    return { error:true };
  }
}

// ===================== MEAL =====================

async function aiMeal(req, env, user){
  if(!env.OPENAI_API_KEY) return { fallback:true };

  const file = (await req.formData()).get("file");
  const img = await base64(file);

  const parsed = await callAI(env,
    "Estimate calories, protein, carbs, fat JSON",
    img
  );

  if(parsed.error) return parsed;

  await env.DB.prepare(`
    INSERT INTO nutrition_logs
    (user_id, log_date, calories, protein, carbs, fat)
    VALUES (?, date('now'), ?, ?, ?, ?)
  `).bind(
    user.id,
    parsed.calories || 0,
    parsed.protein || 0,
    parsed.carbs || 0,
    parsed.fat || 0
  ).run();

  return { success:true, data:parsed };
}

// ===================== LABEL =====================

async function aiLabel(req, env, user){
  if(!env.OPENAI_API_KEY) return { fallback:true };

  const file = (await req.formData()).get("file");
  const img = await base64(file);

  const parsed = await callAI(env,
    "Extract nutrition label JSON with name, calories, protein, carbs, fat",
    img
  );

  if(parsed.error) return parsed;

  await env.DB.prepare(`
    INSERT INTO foods (user_id, name, calories, protein, carbs, fat)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    parsed.name || "Scanned Food",
    parsed.calories || 0,
    parsed.protein || 0,
    parsed.carbs || 0,
    parsed.fat || 0
  ).run();

  return { success:true, data:parsed };
}

// ===================== WORKOUT =====================

async function aiWorkout(req, env, user){
  if(!env.OPENAI_API_KEY) return { fallback:true };

  const file = (await req.formData()).get("file");
  const img = await base64(file);

  const parsed = await callAI(env,
    "Return JSON { exercises:[{name, weight, reps}] }",
    img
  );

  if(parsed.error) return parsed;

  const result = await env.DB.prepare(`
    INSERT INTO workouts (user_id, title)
    VALUES (?, ?)
  `).bind(user.id, "AI Workout").run();

  const wid = result.meta.last_row_id;

  for(const ex of parsed.exercises || []){
    await env.DB.prepare(`
      INSERT INTO workout_sets (workout_id, exercise, weight, reps)
      VALUES (?, ?, ?, ?)
    `).bind(
      wid,
      ex.name,
      ex.weight || 0,
      ex.reps || 0
    ).run();
  }

  return { success:true, data:parsed };
}
