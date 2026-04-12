export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/checkin") {
      return await checkin(env);
    }

    if (url.pathname === "/api/upload") {
      return await upload(request, env);
    }

    if (url.pathname === "/api/scan-label") {
      return await scanLabel(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function checkin(env) {
  await env.DB.prepare(
    "INSERT INTO checkins (date) VALUES (?)"
  ).bind(new Date().toISOString()).run();

  return Response.json({ success: true });
}

async function upload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  const key = `uploads/${Date.now()}-${file.name}`;

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  return Response.json({ key });
}

async function scanLabel(request) {
  const body = await request.json();

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      "apikey": "helloworld"
    },
    body: new URLSearchParams({
      url: body.image
    })
  });

  const data = await res.json();

  return Response.json(data);
}
