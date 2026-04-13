
const app=document.getElementById("app");
let page="home";

async function api(p,o={}){const r=await fetch(p,o);return r.json();}

function nav(){return `<div class="nav">
<button onclick="go('home')">Home</button>
<button onclick="go('food')">Food</button>
<button onclick="go('workout')">Workout</button>
<button onclick="go('vault')">Vault</button>
</div>`;}

async function home(){
const d=await api("/api/dashboard");
return `<div class="card">
<h3>Dashboard</h3>
Checkins: ${d.checkins||0}<br>
Foods: ${d.foods||0}<br>
Media: ${d.media||0}
</div>`;
}

function food(){
return `<div class="card">
<input id="fname" placeholder="Food">
<input id="cal" placeholder="Calories">
<button onclick="saveFood()">Save</button>
<hr>
<input type="file" id="meal">
<button onclick="scanMeal()">Scan Meal (AI)</button>
<div id="out"></div>
</div>`;
}

function workout(){
return `<div class="card">
<input id="wname" placeholder="Workout">
<button onclick="saveWorkout()">Save</button>
<hr>
<input type="file" id="wimg">
<button onclick="scanWorkout()">Scan Workout (AI)</button>
<div id="wout"></div>
</div>`;
}

function vault(){
return `<div class="card">
<input type="file" id="file">
<button onclick="upload()">Upload</button>
</div>`;
}

function render(){
let c="";
if(page=="home")c=home();
if(page=="food")c=food();
if(page=="workout")c=workout();
if(page=="vault")c=vault();
Promise.resolve(c).then(h=>{
app.innerHTML=h+nav()+`<button class="fab" onclick="checkin()">+</button>`;
});
}

function go(p){page=p;render();}

async function checkin(){await api("/api/checkin",{method:"POST"});render();}
async function saveFood(){
await api("/api/foods",{method:"POST",body:JSON.stringify({
name:fname.value,calories:cal.value
})});render();
}
async function saveWorkout(){
await api("/api/workouts",{method:"POST",body:JSON.stringify({title:wname.value})});
render();
}
async function upload(){
const f=file.files[0];
const fd=new FormData();fd.append("file",f);
await api("/api/media",{method:"POST",body:fd});
render();
}

async function scanMeal(){
const f=meal.files[0];
const fd=new FormData();fd.append("file",f);
const r=await api("/api/ai/meal",{method:"POST",body:fd});
out.innerText=JSON.stringify(r);
}
async function scanWorkout(){
const f=wimg.files[0];
const fd=new FormData();fd.append("file",f);
const r=await api("/api/ai/workout",{method:"POST",body:fd});
wout.innerText=JSON.stringify(r);
}

render();
