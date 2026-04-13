export default {
async fetch(req, env) {
const url = new URL(req.url);

// DASHBOARD
if (url.pathname == "/api/dashboard") {
const c = await env.DB.prepare("SELECT COUNT(*) c FROM checkins").first();
const f = await env.DB.prepare("SELECT COUNT(*) c FROM foods").first();
const m = await env.DB.prepare("SELECT COUNT(*) c FROM media").first();
return json({ checkins: c.c, foods: f.c, media: m.c });
}

// CHECKIN
if (url.pathname == "/api/checkin") {
await env.DB.prepare("INSERT INTO checkins VALUES(NULL, datetime('now'))").run();
return json({ ok: true });
}

// FOODS
if (url.pathname == "/api/foods") {
const b = await req.json();
await env.DB.prepare("INSERT INTO foods VALUES(NULL, ?, ?)").bind(b.name, b.calories).run();
return json({ ok: true });
}

// WORKOUTS
if (url.pathname == "/api/workouts") {
const b = await req.json();
await env.DB.prepare("INSERT INTO workouts VALUES(NULL, ?)").bind(b.title).run();
return json({ ok: true });
}

// MEDIA UPLOAD
if (url.pathname == "/api/media") {
const fd = await req.formData();
const file = fd.get("file");

if (!file) return json({ error: "No file uploaded" });

const key = "file-" + Date.now();
await env.MEDIA.put(key, file.stream());
await env.DB.prepare("INSERT INTO media VALUES(NULL, ?)").bind(key).run();

return json({ ok: true });
}

// 🧠 AI MEAL SCAN (FIXED)
if (url.pathname == "/api/ai/meal") {
const fd = await req.formData();
const file = fd.get("file");

if (!file) return json({ error: "No file uploaded" });

// convert to base64 safely (Cloudflare compatible)
const buffer = await file.arrayBuffer();
const base64 = btoa(
  String.fromCharCode(...new Uint8Array(buffer))
);

const res = await fetch("https://api.openai.com/v1/responses", {
method: "POST",
headers: {
"Authorization": `Bearer ${env.OPENAI_API_KEY}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
model: "gpt-4.1-mini",
input: [
{
role: "user",
content: [
{ type: "input_text", text: "Estimate calories, protein, carbs, and fat for this meal. Return clean JSON." },
{ type: "input_image", image_base64: base64 }
]
}
]
})
});

return new Response(await res.text(), {
headers: { "content-type": "application/json" }
});
}

// AI WORKOUT (placeholder but working)
if (url.pathname == "/api/ai/workout") {
return json({
exercises: ["bench press", "squat", "deadlift"]
});
}

// FALLBACK
return env.ASSETS.fetch(req);
}
};

function json(d) {
return new Response(JSON.stringify(d), {
headers: { "content-type": "application/json" }
});
}