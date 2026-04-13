async function login(){
 const email=document.getElementById("email").value;
 const password=document.getElementById("pass").value;

 await fetch("/api/login",{
  method:"POST",
  body:JSON.stringify({email,password})
 });

 location.reload();
}
async function login(){
 const email=document.getElementById("email").value;
 const password=document.getElementById("pass").value;

 await fetch("/api/login",{
  method:"POST",
  body:JSON.stringify({email,password})
 });

 location.reload();
}
const affirmations = [
  "You showed up. That’s what matters.",
  "Discipline > motivation.",
  "Stack small wins daily."
];

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

async function checkin() {
  document.getElementById("affirmation").innerText =
    affirmations[Math.floor(Math.random() * affirmations.length)];

  await fetch("/api/checkin", { method: "POST" });
}

function addSet() {
  const ex = document.getElementById("exercise").value;
  const w = document.getElementById("weight").value;
  const r = document.getElementById("reps").value;

  const div = document.createElement("div");
  div.innerText = `${ex} - ${w} x ${r}`;
  document.getElementById("sets").appendChild(div);
}

function addFood() {
  const name = document.getElementById("foodName").value;
  const cal = document.getElementById("foodCalories").value;

  const div = document.createElement("div");
  div.innerText = `${name} - ${cal} cal`;
  document.getElementById("foods").appendChild(div);
}

async function upload() {
  const file = document.getElementById("fileInput").files[0];

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: form
  });

  const data = await res.json();

  const url = `https://pub-2f7de274ccb949a995e329ce40005b2c.r2.dev/${data.key}`;

  const img = document.createElement("img");
  img.src = url;
  img.width = 120;

  document.getElementById("media").appendChild(img);
}
