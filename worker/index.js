export default {
 async fetch(req, env){
  const url=new URL(req.url);

  const user = await auth(req, env);

  // --- AUTH ---
  if(url.pathname==="/api/register") return json(await register(req, env));
  if(url.pathname==="/api/login") return json(await login(req, env));

  // --- DASHBOARD ---
  if(url.pathname==="/api/dashboard"){
   const c=await env.DB.prepare("SELECT COUNT(*) c FROM checkins WHERE user_id=?").bind(user.id).first();
   const cal=await env.DB.prepare("SELECT SUM(calories) c FROM foods WHERE user_id=?").bind(user.id).first();
   return json({checkins:c.c||0,calories:cal.c||0});
  }

  // --- CHECKIN ---
  if(url.pathname==="/api/checkin"){
   await env.DB.prepare("INSERT INTO checkins (user_id,date) VALUES (?,?)")
   .bind(user.id,new Date().toISOString()).run();
   return json({ok:true});
  }

  // --- WORKOUT ---
  if(url.pathname==="/api/workouts"){
   const b=await req.json();
   await env.DB.prepare("INSERT INTO workouts (user_id,title) VALUES (?,?)")
   .bind(user.id,b.title).run();
   return json({ok:true});
  }

  // --- FOOD ---
  if(url.pathname==="/api/foods"){
   const b=await req.json();
   await env.DB.prepare("INSERT INTO foods (user_id,name,calories) VALUES (?,?,?)")
   .bind(user.id,b.name,b.calories).run();
   return json({ok:true});
  }

  // --- MEDIA ---
  if(url.pathname==="/api/media"){
   const form=await req.formData();
   const f=form.get("file");
   const key="m-"+Date.now();
   await env.MEDIA.put(key,f.stream());
   await env.DB.prepare("INSERT INTO media (user_id,file_key) VALUES (?,?)")
   .bind(user.id,key).run();
   return json({ok:true});
  }

  // --- AI ---
  if(url.pathname==="/api/ai/meal") return json(await ai(req,env,"Estimate calories JSON"));
  if(url.pathname==="/api/ai/label") return json(await ai(req,env,"Extract nutrition JSON"));
  if(url.pathname==="/api/ai/workout") return json(await ai(req,env,"List exercises JSON"));

  return env.ASSETS.fetch(req);
 }
};

function json(d){return new Response(JSON.stringify(d),{headers:{"content-type":"application/json"}})}

async function auth(req, env){
 const cookie=req.headers.get("cookie")||"";
 const sid=cookie.split("sid=")[1];
 if(!sid) return {};

 const s=await env.DB.prepare("SELECT * FROM sessions WHERE id=?").bind(sid).first();
 if(!s) return {};

 return {id:s.user_id};
}

async function register(req, env){
 const b=await req.json();
 await env.DB.prepare("INSERT INTO users (email,password) VALUES (?,?)")
 .bind(b.email,b.password).run();
 return {ok:true};
}

async function login(req, env){
 const b=await req.json();
 const u=await env.DB.prepare("SELECT * FROM users WHERE email=? AND password=?")
 .bind(b.email,b.password).first();

 if(!u) return {error:true};

 const sid=crypto.randomUUID();

 await env.DB.prepare("INSERT INTO sessions (id,user_id,created_at) VALUES (?,?,?)")
 .bind(sid,u.id,new Date().toISOString()).run();

 return new Response(JSON.stringify({ok:true}),{
  headers:{
   "Set-Cookie":`sid=${sid}; Path=/; HttpOnly`,
   "content-type":"application/json"
  }
 });
}

async function ai(req,env,prompt){
 if(!env.OPENAI_API_KEY)return{fallback:true};

 const form=await req.formData();
 const f=form.get("file");

 const buf=await f.arrayBuffer();
 const base64=btoa(String.fromCharCode(...new Uint8Array(buf)));

 const r=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",
  headers:{
   "Authorization":`Bearer ${env.OPENAI_API_KEY}`,
   "Content-Type":"application/json"
  },
  body:JSON.stringify({
   model:"gpt-4.1-mini",
   input:[{role:"user",content:[
    {type:"input_text",text:prompt},
    {type:"input_image",image_base64:base64}
   ]}]
  })
 });

 const d=await r.json();
 try{return JSON.parse(d.output[0].content[0].text)}catch{return{error:true}};
}
