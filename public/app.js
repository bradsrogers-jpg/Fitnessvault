const affirmations = [
  "You showed up. That’s what matters.",
  "Discipline > motivation.",
  "Stack small wins daily."
];

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(path, {
    headers: {
      ...(isFormData ? {} : { "content-type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function loadDashboard() {
  try {
    const data = await apiFetch("/api/dashboard", { method: "GET" });
    document.getElementById("calories").innerText = String(data.calories ?? 0);
    document.getElementById("protein").innerText = `${data.protein ?? 0}g`;
  } catch (err) {
    console.error("Failed to load dashboard", err);
  }
}

async function checkin() {
  document.getElementById("affirmation").innerText =
    affirmations[Math.floor(Math.random() * affirmations.length)];

  try {
    await apiFetch("/api/checkin", { method: "POST", body: JSON.stringify({}) });
    await loadDashboard();
  } catch (err) {
    console.error("Check-in failed", err);
  }
}

function addSet() {
  const ex = document.getElementById("exercise").value.trim();
  const w = document.getElementById("weight").value.trim();
  const r = document.getElementById("reps").value.trim();

  if (!ex || !w || !r) return;

  const div = document.createElement("div");
  div.innerText = `${ex} - ${w} x ${r}`;
  document.getElementById("sets").appendChild(div);
}

async function addFood() {
  const name = document.getElementById("foodName").value.trim();
  const calories = Number(document.getElementById("foodCalories").value);

  if (!name || Number.isNaN(calories)) return;

  try {
    await apiFetch("/api/foods", {
      method: "POST",
      body: JSON.stringify({ name, calories })
    });

    const div = document.createElement("div");
    div.innerText = `${name} - ${calories} cal`;
    document.getElementById("foods").appendChild(div);

    document.getElementById("foodName").value = "";
    document.getElementById("foodCalories").value = "";

    await loadDashboard();
  } catch (err) {
    console.error("Add food failed", err);
  }
}

async function upload() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  try {
    const data = await apiFetch("/api/media/upload", {
      method: "POST",
      body: form
    });

    if (!data.url) return;

    const img = document.createElement("img");
    img.src = data.url;
    img.width = 120;

    document.getElementById("media").appendChild(img);
  } catch (err) {
    console.error("Upload failed", err);
  }
}

async function analyzeImage(type) {
  const file = document.getElementById("fileInput").files[0];
  const out = document.getElementById("aiOutput");

  if (!file) {
    out.textContent = "Choose an image first.";
    return;
  }

  const form = new FormData();
  form.append("file", file);

  out.textContent = "Analyzing...";

  try {
    const data = await apiFetch(`/api/ai/${type}`, {
      method: "POST",
      body: form
    });

    out.textContent = JSON.stringify(data.result ?? data, null, 2);
  } catch (err) {
    out.textContent = `AI request failed: ${err.message}`;
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
