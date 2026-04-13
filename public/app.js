
let state={page:"home",theme:localStorage.getItem("theme")||"clean"};
function setTheme(t){state.theme=t;localStorage.setItem("theme",t);document.body.className="theme-"+t;}
function nav(){return `<div class="nav">
<button onclick="go('home')">Home</button>
<button onclick="go('log')">Log</button>
<button onclick="go('vault')">Vault</button>
<button onclick="go('settings')">Settings</button>
</div>`;}
function home(){return `<div class="container"><div class="card">Today Dashboard</div></div>`;}
function log(){return `<div class="container"><div class="card">Log Food / Workout</div></div>`;}
function vault(){return `<div class="container"><div class="card">Media Vault</div></div>`;}
function settings(){return `<div class="container"><div class="card">
<select onchange="setTheme(this.value)">
<option value="clean">Clean</option>
<option value="feminine">Feminine</option>
<option value="performance">Performance</option>
</select>
</div></div>`;}
function render(){setTheme(state.theme);let content="";
if(state.page==="home")content=home();
if(state.page==="log")content=log();
if(state.page==="vault")content=vault();
if(state.page==="settings")content=settings();
document.getElementById("app").innerHTML=content+nav();}
function go(p){state.page=p;render();}
render();
