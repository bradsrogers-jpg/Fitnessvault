
export default {
 async fetch(req, env){
  const url=new URL(req.url);

  if(url.pathname==="/api/dashboard"){
   const c=await env.DB.prepare("SELECT COUNT(*) as c FROM checkins").first();
   const f=await env.DB.prepare("SELECT COUNT(*) as c FROM foods").first();
   const m=await env.DB.prepare("SELECT COUNT(*) as c FROM media").first();
   return json({totalCheckins:c.c,totalFoods:f.c,totalMedia:m.c});
  }

  if(url.pathname==="/api/checkin"){
   await env.DB.prepare("INSERT INTO checkins (checkin_date) VALUES (?)")
   .bind(new Date().toISOString()).run();
   return json({ok:true});
  }

  if(url.pathname==="/api/workouts"){
   const body=await req.json();
   await env.DB.prepare("INSERT INTO workouts (title) VALUES (?)")
   .bind(body.title).run();
   return json({ok:true});
  }

  if(url.pathname==="/api/foods"){
   const body=await req.json();
   await env.DB.prepare("INSERT INTO foods (name,calories) VALUES (?,?)")
   .bind(body.name,body.calories).run();
   return json({ok:true});
  }

  if(url.pathname==="/api/media/upload"){
   const form=await req.formData();
   const file=form.get("file");
   const key="upload-"+Date.now();
   await env.MEDIA.put(key,file.stream());
   await env.DB.prepare("INSERT INTO media (file_key) VALUES (?)").bind(key).run();
   return json({ok:true});
  }

  return env.ASSETS.fetch(req);
 }
}

function json(d){return new Response(JSON.stringify(d),{headers:{"content-type":"application/json"}})}
