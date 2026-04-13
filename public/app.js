
const state={page:"home"};

async function api(path,opts={}){
 try{
  const res=await fetch(path,opts);
  return await res.json();
 }catch(e){return {error:true}}
}

function nav(){
 return `<div class="nav">
  <button onclick="go('home')">Home</button>
  <button onclick="go('workout')">Workout</button>
  <button onclick="go('food')">Food</button>
  <button onclick="go('vault')">Vault</button>
 </div>`;
}

async function home(){
 const d=await api("/api/dashboard");
 return `<div class="container">
 <div class="card">Checkins: ${d.totalCheckins||0}</div>
 <div class="card">Foods: ${d.totalFoods||0}</div>
 <div class="card">Media: ${d.totalMedia||0}</div>
 </div>`;
}

function workout(){
 return `<div class="container">
 <div class="card">
 <input id="wname" placeholder="Workout name">
 <button onclick="createWorkout()">Save</button>
 </div>
 </div>`;
}

function food(){
 return `<div class="container">
 <div class="card">
 <input id="fname" placeholder="Food name">
 <input id="fcal" placeholder="Calories">
 <button onclick="saveFood()">Save</button>
 </div>
 </div>`;
}

function vault(){
 return `<div class="container">
 <div class="card">
 <input type="file" id="file">
 <button onclick="upload()">Upload</button>
 </div>
 </div>`;
}

function render(){
 let html="";
 if(state.page==="home")html=home();
 if(state.page==="workout")html=workout();
 if(state.page==="food")html=food();
 if(state.page==="vault")html=vault();
 Promise.resolve(html).then(h=>{
  document.getElementById("app").innerHTML=h+nav()+`<button class="fab" onclick="checkin()">+</button>`;
 });
}

function go(p){state.page=p;render();}

async function checkin(){
 await api("/api/checkin",{method:"POST"});
 render();
}

async function createWorkout(){
 await api("/api/workouts",{method:"POST",body:JSON.stringify({title:document.getElementById("wname").value})});
 render();
}

async function saveFood(){
 await api("/api/foods",{method:"POST",body:JSON.stringify({
  name:document.getElementById("fname").value,
  calories:document.getElementById("fcal").value
 })});
 render();
}

async function upload(){
 const f=document.getElementById("file").files[0];
 const form=new FormData();
 form.append("file",f);
 await api("/api/media/upload",{method:"POST",body:form});
 render();
}

render();
