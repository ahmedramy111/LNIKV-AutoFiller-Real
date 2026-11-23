const express=require('express'); const path=require('path'); const fs=require('fs'); const crypto=require('crypto'); const {spawn}=require('child_process'); const cfg=require('./config');
const app=express(); app.use(express.json({limit:'2mb'}));
const sessions=new Map(), jobs=new Map(); let currentJobId=null;
const controlFile=path.join(__dirname,'runtime','control.json'); fs.mkdirSync(path.dirname(controlFile),{recursive:true});
function writeControl(patch){let x={fast:false};try{x=JSON.parse(fs.readFileSync(controlFile,'utf8'))}catch{};Object.assign(x,patch);fs.writeFileSync(controlFile,JSON.stringify(x));}
function isAdmin(req){const t=req.headers['x-admin-token']||req.cookies?.admin; return t&&sessions.has(t)}
function token(){return crypto.randomBytes(24).toString('hex')}
function adminGuard(req,res,next){if(!isAdmin(req))return res.status(401).json({error:'unauthorized'});next()}
app.get('/',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/api/status',(_,res)=>res.json({ok:true,running:!!currentJobId,jobId:currentJobId}));
app.post('/api/jobs',async(req,res)=>{if(currentJobId)return res.status(409).json({error:'هناك جلسة تعمل بالفعل'}); const {phone,code,password}=req.body||{}; if(!/^\d{11}$/.test(String(phone||'')))return res.status(400).json({error:'رقم الهاتف يجب أن يكون 11 رقمًا'}); if(!code||!password)return res.status(400).json({error:'أدخل الكود وكلمة المرور'}); const id=crypto.randomUUID(); const job={id,phone:String(phone),code:String(code),password:String(password),status:'queued',events:[],createdAt:Date.now(),fast:false}; jobs.set(id,job); currentJobId=id; writeControl({fast:false,jobId:id}); const child=spawn(process.execPath,[path.join(__dirname,'worker.js'),id],{env:{...process.env,CONTROL_FILE:controlFile,JOB_CODE:String(code),JOB_PASSWORD:String(password),JOB_PHONE:String(phone)}}); child.stdout.on('data',d=>{for(const line of d.toString().split(/\n/).filter(Boolean)){try{const e=JSON.parse(line); job.events.push(e); if(job.events.length>300)job.events.shift(); if(e.type==='status')job.status=e.status; if(e.type==='done'||e.type==='error')job.status=e.type; }catch{}}}); child.stderr.on('data',d=>job.events.push({type:'log',message:d.toString().trim(),ts:Date.now()})); child.on('exit',()=>{if(currentJobId===id)currentJobId=null; job.password=''; job.code='';}); res.json({jobId:id});});
app.get('/api/jobs/:id', (req,res)=>{const j=jobs.get(req.params.id); if(!j)return res.status(404).json({error:'not found'});res.json({id:j.id,status:j.status,events:j.events.slice(-80),fast:j.fast});});
app.post('/api/jobs/:id/cancel',adminGuard,(req,res)=>{const j=jobs.get(req.params.id); if(!j)return res.status(404).json({error:'not found'}); writeControl({cancel:true});res.json({ok:true});});
app.get('/'+cfg.ADMIN_PATH,(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.post('/'+cfg.ADMIN_PATH+'/login',(req,res)=>{const {user,pass}=req.body||{};if(user!==cfg.ADMIN_USER||pass!==cfg.ADMIN_PASS)return res.status(401).json({error:'بيانات الدخول غير صحيحة'});const t=token();sessions.set(t,{created:Date.now()});res.json({token:t});});
app.get('/'+cfg.ADMIN_PATH+'/jobs',adminGuard,(_,res)=>res.json([...jobs.values()].map(j=>({id:j.id,status:j.status,createdAt:j.createdAt,fast:j.fast,events:j.events.slice(-5)}))));
app.post('/'+cfg.ADMIN_PATH+'/fast',adminGuard,(req,res)=>{const on=!!req.body?.on; if(currentJobId&&jobs.get(currentJobId))jobs.get(currentJobId).fast=on; writeControl({fast:on});res.json({ok:true,fast:on});});
app.use('/assets',express.static(path.join(__dirname,'public')));
app.listen(cfg.PORT,()=>console.log(`LYNIKV V4 listening on ${cfg.PORT}`));
