export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/dashboard" && req.method === "GET") {
      const checkins = await env.DB.prepare("SELECT COUNT(*) AS c FROM checkins").first();
      const calories = await env.DB.prepare("SELECT COALESCE(SUM(calories), 0) AS c FROM foods").first();
      return json({ checkins: checkins?.c || 0, calories: calories?.c || 0, protein: 0 });
    }

    if (url.pathname === "/api/checkin" && req.method === "POST") {
      await env.DB.prepare("INSERT INTO checkins (date) VALUES (?)")
        .bind(new Date().toISOString())
        .run();
      return json({ ok: true });
    }

    if (url.pathname === "/api/workouts" && req.method === "POST") {
      const body = await req.json();
      await env.DB.prepare("INSERT INTO workouts (title, created_at) VALUES (?, ?)")
        .bind(body.title || "Untitled workout", new Date().toISOString())
        .run();
      return json({ ok: true });
    }

    if (url.pathname === "/api/foods" && req.method === "POST") {
      const body = await req.json();
      await env.DB.prepare("INSERT INTO foods (name, calories, created_at) VALUES (?, ?, ?)")
        .bind(body.name, Number(body.calories || 0), new Date().toISOString())
        .run();
      return json({ ok: true });
    }

    if ((url.pathname === "/api/media" || url.pathname === "/api/media/upload") && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");

      if (!file) return json({ error: "Missing file" }, 400);
      if (!env.MEDIA) return json({ error: "MEDIA binding not configured" }, 501);

      const key = `m-${Date.now()}-${crypto.randomUUID()}`;
      await env.MEDIA.put(key, file.stream());

      await env.DB.prepare("INSERT INTO media (key, created_at) VALUES (?, ?)")
        .bind(key, new Date().toISOString())
        .run();

      const mediaUrl = env.MEDIA_PUBLIC_URL ? `${env.MEDIA_PUBLIC_URL}/${key}` : null;
      return json({ ok: true, key, url: mediaUrl });
    }

    if (url.pathname === "/api/ai/meal" && req.method === "POST") {
      return aiFromImage(req, env, "Estimate calories and macros from this food image. Return strict JSON.");
    }

    if (url.pathname === "/api/ai/label" && req.method === "POST") {
      return aiFromImage(req, env, "Extract nutrition facts from this image. Return strict JSON.");
    }

    if (url.pathname === "/api/ai/workout" && req.method === "POST") {
      return aiFromImage(req, env, "Identify likely exercises/equipment from this image. Return strict JSON.");
    }

    return env.ASSETS.fetch(req);
  }
};

async function aiFromImage(req, env, prompt) {
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === "PUT_KEY") {
    return json({ error: "OPENAI_API_KEY is not configured" }, 501);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file) return json({ error: "Missing file" }, 400);

  const contentType = file.type || "image/jpeg";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = bytesToBase64(bytes);

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: `data:${contentType};base64,${base64}` }
          ]
        }
      ]
    })
  });

  if (!aiResponse.ok) {
    return json({ error: "AI request failed", detail: await aiResponse.text() }, 502);
  }

  const data = await aiResponse.json();
  const text = data?.output?.[0]?.content?.[0]?.text;

  if (!text) return json({ error: "AI returned no content" }, 502);

  try {
    return json({ ok: true, result: JSON.parse(text) });
  } catch {
    return json({ ok: true, result: text });
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}
