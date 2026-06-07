import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uyodcfxggvojltmsugyq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5b2RjZnhnZ3Zvamx0bXN1Z3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTI0MzUsImV4cCI6MjA5MjI2ODQzNX0.5uh7JQKLpRvEVmTfxmQWHpdJQndLNvdFkloA4-N7OXA';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Supabase helpers
const DB = {
  async getEmployees() { const {data}=await sb.from('areso_employees').select('*').order('created_at'); return (data||[]).map(e=>({id:e.id,name:e.name,email:e.email,pin:e.password,position:e.position,phone:e.phone,birthday:e.birthday,role:e.role,active:e.active,sickLeave:e.sick_leave||false,created:e.created_at})); },
  async addEmployee(emp) { const {data}=await sb.from('areso_employees').insert({name:emp.name,email:emp.email,password:emp.pin,position:emp.position,phone:emp.phone,birthday:emp.birthday||null,role:emp.role||'employee',active:true}).select().single(); return data?{id:data.id,name:data.name,email:data.email,pin:data.password,position:data.position,phone:data.phone,birthday:data.birthday,role:data.role,active:data.active,created:data.created_at}:null; },
  async updateEmployee(id,fields) { const dbFields={}; if('active' in fields)dbFields.active=fields.active; if('role' in fields)dbFields.role=fields.role; if('sick_leave' in fields)dbFields.sick_leave=fields.sick_leave; await sb.from('areso_employees').update(dbFields).eq('id',id); },
  async updatePin(id,newPin) { await sb.from('areso_employees').update({password:newPin}).eq('id',id); },
  async updateEmployeeProfile(id,f) { await sb.from('areso_employees').update({name:f.name,position:f.position,phone:f.phone,birthday:f.birthday||null,email:f.email}).eq('id',id); },
  async getClockIns(dateFrom,dateTo) { const {data}=await sb.from('areso_clockins').select('*').gte('time',dateFrom).lte('time',dateTo+'T23:59:59').order('time'); return (data||[]).map(r=>({id:r.id,empId:r.employee_id,type:r.type,time:new Date(r.time).getTime(),photo:r.photo_url})); },
  async getAllClockIns() { const from=new Date();from.setMonth(from.getMonth()-3);const {data}=await sb.from('areso_clockins').select('id,employee_id,type,time').gte('time',from.toISOString()).order('time'); return (data||[]).map(r=>({id:r.id,empId:r.employee_id,type:r.type,time:new Date(r.time).getTime(),photo:null})); },
  async addClockIn(rec) { await sb.from('areso_clockins').insert({employee_id:rec.empId,type:rec.type,time:new Date(rec.time).toISOString(),photo_url:null}); },
  async deleteClockIn(id) { await sb.from('areso_clockins').delete().eq('id',id); },
  async updateClockIn(id,time) { await sb.from('areso_clockins').update({time:new Date(time).toISOString()}).eq('id',id); },
  async getSchedules() { const {data}=await sb.from('areso_schedules').select('*').order('shift_index'); const scheds={};(data||[]).forEach(s=>{const key=s.employee_id+"_"+s.date_key;if(!scheds[key])scheds[key]=[];scheds[key].push({id:s.id,empId:s.employee_id,start:s.start_time,end:s.end_time,shiftIndex:s.shift_index});});return scheds; },
  async setSchedule(empId,dateKey,start,end,shiftIndex=0) { const {data:existing}=await sb.from('areso_schedules').select('id').eq('employee_id',empId).eq('date_key',dateKey).eq('shift_index',shiftIndex); if(existing&&existing.length>0){await sb.from('areso_schedules').update({start_time:start,end_time:end}).eq('id',existing[0].id);}else{await sb.from('areso_schedules').insert({employee_id:empId,date_key:dateKey,start_time:start,end_time:end,shift_index:shiftIndex});} },
  async deleteSchedule(empId,dateKey,shiftIndex=null) { const q=sb.from('areso_schedules').delete().eq('employee_id',empId).eq('date_key',dateKey); if(shiftIndex!==null)await q.eq('shift_index',shiftIndex);else await q; },
  async getVacations() { const {data}=await sb.from('areso_vacations').select('*').order('id',{ascending:false}); return (data||[]).map(v=>({id:v.id,empId:v.employee_id,start:v.start_date,end:v.end_date,status:v.status,notes:v.notes})); },
  async addVacation(vac) { await sb.from('areso_vacations').insert({employee_id:vac.empId,start_date:vac.start,end_date:vac.end,status:'pending',notes:vac.notes}); },
  async updateVacation(id,status) { await sb.from('areso_vacations').update({status}).eq('id',id); },
  async getDocuments() { const {data}=await sb.from('areso_documents').select('*').order('id',{ascending:false}); return (data||[]).map(d=>({id:d.id,empId:d.employee_id,type:d.type,file:d.file_url,notes:d.notes,date:d.date})); },
  async addDocument(doc) { await sb.from('areso_documents').insert({employee_id:doc.empId,type:doc.type,file_url:doc.file,notes:doc.notes}); },
  async getAnnouncements() { const {data}=await sb.from('areso_announcements').select('*').order('date',{ascending:false}); return (data||[]).map(a=>({id:a.id,title:a.title,body:a.body,date:new Date(a.date).getTime(),readBy:a.read_by||[]})); },
  async addAnnouncement(ann) { await sb.from('areso_announcements').insert({title:ann.title,body:ann.body}); },
  async deleteAnnouncement(id) { await sb.from('areso_announcements').delete().eq('id',id); },
  async markAnnouncementRead(id,userId) { const {data}=await sb.from('areso_announcements').select('read_by').eq('id',id).single(); const readBy=[...(data?.read_by||[]),userId]; await sb.from('areso_announcements').update({read_by:readBy}).eq('id',id); },
  async getIncidencias() { const {data}=await sb.from('areso_incidencias').select('*').order('created_at',{ascending:false}); return (data||[]).map(i=>({id:i.id,empId:i.employee_id,dateRef:i.date_ref,timeRef:i.time_ref,description:i.description,adminReply:i.admin_reply,status:i.status,createdAt:i.created_at})); },
  async addIncidencia(inc) { await sb.from('areso_incidencias').insert({employee_id:inc.empId,date_ref:inc.dateRef,time_ref:inc.timeRef,description:inc.description,status:'pending'}); },
  async replyIncidencia(id,reply) { await sb.from('areso_incidencias').update({admin_reply:reply,status:'replied'}).eq('id',id); },
};
const DAYS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ADMIN_PIN="0000";
const fmtTime=d=>new Date(d).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
const fmtDate=d=>new Date(d).toLocaleDateString("es-ES",{day:"numeric",month:"short"});
const fmtDateLong=d=>new Date(d).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"short"});
const dateKey=(d=new Date())=>d.toISOString().split("T")[0];
const fmtDur=ms=>{if(!ms||ms<0)return"0h 00m";const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);return h+"h "+String(m).padStart(2,"0")+"m";};
const getWorked=(records,eid,dk)=>{const r=(records[dk]||[]).filter(x=>x.empId===eid).sort((a,b)=>a.time-b.time);let t=0,li=null;for(const x of r){if(x.type==="in")li=x.time;else if(x.type==="out"&&li){t+=x.time-li;li=null;}}if(li)t+=Date.now()-li;return t;};
const getStatus=(records,eid)=>{const r=(records[dateKey()]||[]).filter(x=>x.empId===eid).sort((a,b)=>a.time-b.time);if(!r.length)return"out";return r[r.length-1].type==="in"?"in":"out";};
const getLastRec=(records,eid)=>{const r=(records[dateKey()]||[]).filter(x=>x.empId===eid).sort((a,b)=>a.time-b.time);return r.length?r[r.length-1]:null;};
const getNextSched=(scheds,eid)=>{const now=new Date();for(let i=0;i<14;i++){const d=new Date(now);d.setDate(d.getDate()+i);const key=eid+"_"+dateKey(d);const raw=scheds[key];const s=Array.isArray(raw)?raw[0]:raw;if(s)return{day:DAYS[(d.getDay()+6)%7],start:s.start,end:s.end,isToday:i===0};}return null;};

// Birthday helpers
const getUpcomingBirthdays=(emps)=>{
  const today=new Date();const results=[];
  emps.filter(e=>e.active&&e.birthday).forEach(emp=>{
    const [,m,d]=emp.birthday.split("-").map(Number);
    const bday=new Date(today.getFullYear(),m-1,d);
    if(bday<today){bday.setFullYear(today.getFullYear()+1);}
    const diff=Math.floor((bday-today)/(86400000));
    if(diff<=30)results.push({...emp,bday,daysUntil:diff,dateStr:`${d} ${MONTHS[m-1]}`});
  });
  return results.sort((a,b)=>a.daysUntil-b.daysUntil);
};

// Colors
const AVATAR_COLORS=["#2d5be3","#16a34a","#ea580c","#7c3aed","#dc2626","#0891b2","#db2777","#ca8a04","#4f46e5","#059669"];
const getAvatarColor=(id)=>AVATAR_COLORS[Math.abs(id?.split("").reduce((a,c)=>a+c.charCodeAt(0),0)||0)%AVATAR_COLORS.length];

const C={bg:"#f5f6fa",card:"#ffffff",cardLight:"#f0f1f5",border:"#e2e4ec",text:"#1a1d2e",muted:"#7c819a",dim:"#c0c3d1",accent:"#2d5be3",green:"#16a34a",red:"#dc2626",blue:"#2d5be3",purple:"#7c3aed",orange:"#ea580c",pink:"#db2777"};
const font="'Outfit',sans-serif";
const fontBody="'Outfit',sans-serif";

const Ic={
  clock:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  cal:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5b8def" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  vac:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>,
  doc:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>,
  megaphone:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  mail:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5b8def" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>,
  live:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff5555" strokeWidth="1.5"><circle cx="12" cy="12" r="3" fill="#ff5555" opacity=".3"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49"/></svg>,
  cake:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.5"><path d="M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/></svg>,
  home:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><path d="M3 12l9-8 9 8"/><path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"/></svg>,
  person:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
  logout:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
};

const ss={
  page:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:fontBody,paddingBottom:70},
  header:{background:`linear-gradient(135deg,#2d5be3,#1e40af)`,padding:"20px 20px 24px",borderRadius:"0 0 24px 24px",marginBottom:16},
  card:{background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,boxShadow:"0 1px 3px #0001"},
  statusCard:{background:C.card,borderRadius:14,padding:"14px 18px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 3px #0001"},
  moduleCard:{background:C.card,borderRadius:16,padding:"22px 10px",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",textAlign:"center",position:"relative",boxShadow:"0 1px 3px #0001",transition:"all .15s"},
  secTitle:{fontFamily:fontBody,fontSize:13,fontWeight:600,color:C.muted,marginBottom:10,marginTop:8,textTransform:"uppercase",letterSpacing:1},
  btn:(bg,c)=>({padding:"13px 20px",borderRadius:12,border:"none",background:bg,color:c,fontWeight:600,cursor:"pointer",fontSize:14,fontFamily:font,width:"100%",transition:"opacity .15s"}),
  input:{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,fontFamily:font,width:"100%",boxSizing:"border-box"},
  textarea:{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,fontFamily:font,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"},
  label:{fontFamily:font,fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6,fontWeight:600},
  bottomNav:{position:"fixed",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:50,boxShadow:"0 -2px 10px #0001"},
  navBtn:a=>({display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",color:a?C.accent:C.muted,fontSize:10,fontFamily:font,fontWeight:a?700:400,padding:"4px 16px"}),
  back:{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:font,fontSize:13,textAlign:"left",marginBottom:4,fontWeight:500},
  avatar:(color,size=40)=>({width:size,height:size,borderRadius:"50%",background:color+"22",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,fontSize:size*0.38,fontWeight:700,color,flexShrink:0}),
  badge:(bg,c)=>({position:"absolute",top:-4,right:-4,background:bg,color:c,fontFamily:font,fontSize:9,fontWeight:700,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}),
};
const AresoLogo=({size=32,color="#2d5be3"})=><svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="10" fill={color}/><path d="M20 8L8 30h5l2.5-5h9l2.5 5h5L20 8zm0 6l3.2 7H16.8L20 14z" fill="white"/></svg>;

const CSS=<style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}video{border-radius:12px;width:100%}body{background:${C.bg}}::selection{background:${C.accent}22;color:${C.accent}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.dim};border-radius:4px}.profile-card:active{transform:scale(.96);transition:transform .1s}`}</style>;

// Export
function generateReport(employees,records,schedules,vacations,documents,f,t){
  let csv="\ufeffINFORME ARESO\nPeriodo: "+f+" a "+t+"\nGenerado: "+new Date().toLocaleString("es-ES")+"\n\n";
  csv+="RESUMEN POR EMPLEADO\nNombre,Puesto,Estado,Días,Horas totales,Media\n";
  employees.filter(e=>e.active).forEach(emp=>{let ms=0,days=0;const d1=new Date(f),d2=new Date(t);for(let d=new Date(d1);d<=d2;d.setDate(d.getDate()+1)){const w=getWorked(records,emp.id,dateKey(d));if(w>0){ms+=w;days++;}}const estado=emp.sickLeave?"DE BAJA":"Activo";csv+=`${emp.name},${emp.position||"—"},${estado},${days},${fmtDur(ms)},${days?fmtDur(ms/days):"—"}\n`;});
  csv+="\nFICHAJES\nFecha,Hora,Empleado,Tipo\n";Object.keys(records).filter(d=>d>=f&&d<=t).sort().forEach(d=>(records[d]||[]).sort((a,b)=>a.time-b.time).forEach(r=>{const emp=employees.find(e=>e.id===r.empId);csv+=`${d},${fmtTime(r.time)},${emp?.name||"?"},${r.type==="in"?"Entrada":"Salida"}\n`;}));
  csv+="\nHORARIOS\nEmpleado,Día,Entrada,Salida\n";employees.filter(e=>e.active).forEach(emp=>DAYS.forEach((day,i)=>{const s=schedules[emp.id+"_"+i];if(s)csv+=`${emp.name},${day},${s.start},${s.end}\n`;}));
  csv+="\nVACACIONES\nEmpleado,Desde,Hasta,Estado\n";vacations.forEach(v=>{const emp=employees.find(e=>e.id===v.empId);csv+=`${emp?.name},${v.start},${v.end},${v.status}\n`;});
  return csv;
}

function HorariosEmpleado({schedules,user,calWeekStart2,setCalWeekStart2,goHome}){
  const weekDays=[];for(let i=0;i<7;i++){const d=new Date(calWeekStart2);d.setDate(d.getDate()+i);weekDays.push({date:dateKey(d),label:DAYS[i].slice(0,3),full:DAYS[i],num:d.getDate()});}
  const shiftWk=(dir)=>{const d=new Date(calWeekStart2);d.setDate(d.getDate()+(dir*7));setCalWeekStart2(dateKey(d));};
  const col=getAvatarColor(user.id);
  return(<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
    <button onClick={goHome} style={ss.back}>← Menú</button>
    <div style={{fontSize:22,fontWeight:700}}>Mi horario</div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={()=>shiftWk(-1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>←</button>
      <div style={{flex:1,textAlign:"center",fontFamily:font,fontSize:13,fontWeight:700}}>{weekDays[0].num} {MONTHS[new Date(weekDays[0].date).getMonth()]} — {weekDays[6].num} {MONTHS[new Date(weekDays[6].date).getMonth()]}</div>
      <button onClick={()=>shiftWk(1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>→</button>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {weekDays.map(d=>{
        const raw=schedules[user.id+"_"+d.date];
        const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
        const isToday=d.date===dateKey();
        return(<div key={d.date} style={{background:C.card,borderRadius:14,padding:"14px 18px",border:`1px solid ${isToday?C.accent+"55":C.border}`,display:"flex",alignItems:"center",gap:14,background:isToday?C.accent+"0d":C.card}}>
          <div style={{minWidth:80}}>
            <div style={{fontFamily:font,fontSize:13,fontWeight:700,color:isToday?C.accent:C.text}}>{d.full}</div>
            <div style={{fontFamily:font,fontSize:11,color:C.muted}}>{d.num} {MONTHS[new Date(d.date).getMonth()]}</div>
          </div>
          {shifts.length>0?<div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            {shifts.map((s,si)=><div key={si} style={{background:col+"18",border:`2px solid ${col}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontFamily:font,fontSize:15,fontWeight:700,color:col}}>{s.start}</span>
              <span style={{color:C.dim,fontSize:16}}>→</span>
              <span style={{fontFamily:font,fontSize:15,fontWeight:700,color:col}}>{s.end}</span>
              {shifts.length>1&&<span style={{fontFamily:font,fontSize:9,color:col,background:col+"22",borderRadius:4,padding:"1px 5px"}}>T{si+1}</span>}
            </div>)}
          </div>:<div style={{flex:1,fontFamily:font,fontSize:13,color:C.dim,textAlign:"center"}}>Libre</div>}
          {isToday&&<div style={{fontFamily:font,fontSize:9,color:C.accent,fontWeight:700,background:C.accent+"18",padding:"3px 8px",borderRadius:6}}>HOY</div>}
        </div>);
      })}
    </div>
  </div>);
}

export default function App(){
  const [employees,setEmployees]=useState([]);
  const [records,setRecords]=useState({});
  const [schedules,setSchedules]=useState({});
  const [vacations,setVacations]=useState([]);
  const [documents,setDocuments]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [incidencias,setIncidencias]=useState([]);
  const [loading,setLoading]=useState(true);

  const [view,setView]=useState("login");
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("menu");
  const [sub,setSub]=useState(null);
  const [toast,setToast]=useState(null);
  const [photo,setPhoto]=useState(null);
  const [cameraOn,setCameraOn]=useState(false);
  const videoRef=useRef(null);const streamRef=useRef(null);const fileRef=useRef(null);const docFileRef=useRef(null);
  const [,tick]=useState(0);

  const [adminPin,setAdminPin]=useState("");
  const [adminTab,setAdminTab]=useState("live");
  const [filterDate,setFilterDate]=useState(dateKey());
  const [editRecId,setEditRecId]=useState(null);
  const [editTimeVal,setEditTimeVal]=useState("");
  const [exportFrom,setExportFrom]=useState(()=>{const d=new Date();d.setDate(1);return dateKey(d);});
  const [exportTo,setExportTo]=useState(dateKey());

  const [loginForm,setLoginForm]=useState({email:"",pin:""});
  const [pinForm,setPinForm]=useState({current:"",newPin:"",confirm:""});
  const [showPinChange,setShowPinChange]=useState(false);
  const [loginSelEmp,setLoginSelEmp]=useState(null);
  const [editEmp,setEditEmp]=useState(null);
  const [loginPin,setLoginPin]=useState("");
  const [regForm,setRegForm]=useState({name:"",email:"",pin:"",position:"",phone:"",birthday:""});
  const [editSched,setEditSched]=useState(null);
  const [calWeekStart,setCalWeekStart]=useState(()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));return dateKey(n);});
  const [calWeekStart2,setCalWeekStart2]=useState(()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));return dateKey(n);});
  const [addShift,setAddShift]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [shiftForm,setShiftForm]=useState({start:"09:00",end:"17:00"});
  const [calMonthView,setCalMonthView]=useState(()=>{const n=new Date();return n.getFullYear()*100+n.getMonth()});
  const [scheduleView,setScheduleView]=useState("week"); // "week" | "month"
  const [vacForm,setVacForm]=useState({start:"",end:"",notes:""});
  const [docForm,setDocForm]=useState({type:"medical",notes:""});
  const [docFile,setDocFile]=useState(null);
  const [annForm,setAnnForm]=useState({title:"",body:""});
  const [incForm,setIncForm]=useState({dateRef:"",timeRef:"",description:""});
  const [replyForm,setReplyForm]=useState({});

  // Load all data from Supabase on mount
  const loadData=useCallback(async()=>{
    try{
      const [emps,scheds,vacs,docs,anns,clockins,incs]=await Promise.all([
        DB.getEmployees(),DB.getSchedules(),DB.getVacations(),DB.getDocuments(),DB.getAnnouncements(),DB.getAllClockIns(),DB.getIncidencias()
      ]);
      setEmployees(emps);
      setSchedules(scheds);
      setVacations(vacs);
      setDocuments(docs);
      setAnnouncements(anns);
      setIncidencias(incs);
      // Group clockins by date
      const recs={};clockins.forEach(r=>{const dk=dateKey(new Date(r.time));if(!recs[dk])recs[dk]=[];recs[dk].push(r);});
      setRecords(recs);
    }catch(e){console.error("Error loading data:",e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(()=>{tick(x=>x+1);loadData();},300000);return()=>clearInterval(t);},[loadData]);

  const flash=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),2000);};
  const startCamera=async()=>{try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});streamRef.current=s;setCameraOn(true);setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100);}catch{flash("Cámara no disponible",false);}};
  const stopCamera=()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}setCameraOn(false);};
  const takePhoto=()=>{if(!videoRef.current)return;const c=document.createElement("canvas");c.width=videoRef.current.videoWidth||640;c.height=videoRef.current.videoHeight||480;c.getContext("2d").drawImage(videoRef.current,0,0);setPhoto(c.toDataURL("image/jpeg",0.7));stopCamera();};
  const handleFile=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);e.target.value="";};
  const goHome=()=>{setSub(null);stopCamera();setPhoto(null);setPage("menu");};

  const handleLogin=()=>{const emp=employees.find(e=>e.name.toLowerCase()===loginForm.email.toLowerCase()&&e.pin===loginForm.pin&&e.active);if(emp){setUser(emp);setView("app");setPage("menu");setSub(null);}else flash("Credenciales incorrectas",false);};
  const handleRegister=async()=>{if(!regForm.name||!regForm.email||!regForm.pin)return flash("Rellena los campos obligatorios",false);if(employees.some(e=>e.email===regForm.email))return flash("Email ya registrado",false);const emp=await DB.addEmployee({name:regForm.name,email:regForm.email,pin:regForm.pin,position:regForm.position,phone:regForm.phone,birthday:regForm.birthday,role:"employee"});if(emp){setEmployees([...employees,emp]);flash("Cuenta creada");setView("login");}else flash("Error al crear cuenta",false);};

  const myStatus=user?getStatus(records,user.id):"out";
  const myWorked=user?getWorked(records,user.id,dateKey()):0;
  const confirmFichaje=async()=>{if(!photo)return flash("Foto primero",false);const dk=dateKey();const type=myStatus==="out"?"in":"out";const rec={empId:user.id,type,time:Date.now(),photo};await DB.addClockIn(rec);setRecords({...records,[dk]:[...(records[dk]||[]),rec]});flash(type==="in"?"✓ Entrada registrada":"✓ Salida registrada");setPhoto(null);loadData();};

  // Unread counts
  const unreadAnns=user?announcements.filter(a=>!a.readBy?.includes(user.id)).length:0;

  // Keyboard PIN input
  useEffect(()=>{
    if(view!=="login"||!loginSelEmp)return;
    const onKey=(e)=>{
      if(e.key>="0"&&e.key<="9"){
        const next=loginPin+e.key;
        setLoginPin(next);
        if(next.length===4){
          if(loginSelEmp==="admin"){
            if(next===ADMIN_PIN){setView("admin");setAdminTab("live");setLoginPin("");setLoginSelEmp(null);}
            else{setToast({msg:"PIN incorrecto",ok:false});setTimeout(()=>setToast(null),2000);setLoginPin("");}
          } else {
            const match=employees.find(em=>em.id===loginSelEmp.id&&em.pin===next);
            if(match){setUser(match);setView("app");setPage("menu");setSub(null);setLoginPin("");setLoginSelEmp(null);}
            else{setToast({msg:"PIN incorrecto",ok:false});setTimeout(()=>setToast(null),2000);setLoginPin("");}
          }
        }
      } else if(e.key==="Backspace"){setLoginPin(p=>p.slice(0,-1));}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[view,loginSelEmp,loginPin,employees]);

  const Toast=toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"10px 24px",borderRadius:12,fontWeight:600,fontSize:13,fontFamily:font,pointerEvents:"none",background:toast.ok?"#f0fdf4":"#fef2f2",color:toast.ok?C.green:C.red,border:`1px solid ${toast.ok?"#16a34a33":"#dc262633"}`,boxShadow:"0 4px 12px #0002"}}>{toast.msg}</div>;

  // ═══ LOGIN ═══
  if(loading)return(<div style={{...ss.page,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>{CSS}<div style={{textAlign:"center",animation:"fadeUp .4s"}}><div style={{display:"flex",justifyContent:"center",marginBottom:12}}><AresoLogo size={52} color={C.accent}/></div><div style={{fontFamily:font,fontSize:20,fontWeight:700,color:C.accent,letterSpacing:3,marginBottom:8}}>ARESO</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>Cargando...</div></div></div>);

  // ═══ LOGIN — profile picker ═══
  if(view==="login"){
    const activeEmps=employees.filter(e=>e.active);
    const handlePinKey=(digit)=>{
      if(digit==="del"){setLoginPin(p=>p.slice(0,-1));return;}
      const next=loginPin+digit;
      setLoginPin(next);
      if(next.length===4){
        if(loginSelEmp==="admin"){
          if(next===ADMIN_PIN){setView("admin");setAdminTab("live");setLoginPin("");setLoginSelEmp(null);}
          else{flash("PIN incorrecto",false);setLoginPin("");}
        } else if(loginSelEmp){
          const match=employees.find(e=>e.id===loginSelEmp.id&&e.pin===next);
          if(match){setUser(match);setView("app");setPage("menu");setSub(null);setLoginPin("");setLoginSelEmp(null);}
          else{flash("PIN incorrecto",false);setLoginPin("");}
        }
      }
    };
    return(<div style={{...ss.page,minHeight:"100vh",display:"flex",flexDirection:"column"}}>{CSS}{Toast}
      {!loginSelEmp?(<div style={{flex:1,display:"flex",flexDirection:"column",animation:"fadeUp .35s"}}>
        <div style={{background:`linear-gradient(160deg,#1e40af,#2d5be3 60%,#3b82f6)`,padding:"36px 20px 28px",borderRadius:"0 0 32px 32px",textAlign:"center",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><AresoLogo size={48} color="rgba(255,255,255,.2)"/></div>
          <div style={{fontFamily:font,fontSize:26,fontWeight:700,color:"#fff",letterSpacing:1}}>ARESO</div>
          <div style={{fontFamily:font,fontSize:11,color:"#ffffff88",marginTop:4,letterSpacing:2}}>¿QUIÉN ERES?</div>
        </div>
        <div style={{flex:1,padding:"20px 16px 24px",overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {activeEmps.map(emp=>{const col=getAvatarColor(emp.id);return(<div key={emp.id} className="profile-card" onClick={()=>{setLoginSelEmp(emp);setLoginPin("");}} style={{background:C.card,borderRadius:18,padding:"18px 8px 14px",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",boxShadow:"0 2px 8px #0001",transition:"transform .1s"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:col+"22",border:`2.5px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,fontSize:20,fontWeight:700,color:col}}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
              <div style={{fontFamily:font,fontSize:11,fontWeight:600,color:C.text,textAlign:"center",lineHeight:1.3,wordBreak:"break-word"}}>{emp.name.split(" ")[0]}</div>
              {emp.position&&<div style={{fontFamily:font,fontSize:8,color:C.muted,textAlign:"center"}}>{emp.position}</div>}
            </div>);})}
            <div className="profile-card" onClick={()=>{setLoginSelEmp("admin");setLoginPin("");}} style={{background:"#1e40af11",borderRadius:18,padding:"18px 8px 14px",border:`1.5px solid #1e40af44`,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",boxShadow:"0 2px 8px #0001",transition:"transform .1s"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"#1e40af22",border:`2.5px solid #1e40af`,display:"flex",alignItems:"center",justifyContent:"center"}}><AresoLogo size={28} color="#1e40af"/></div>
              <div style={{fontFamily:font,fontSize:11,fontWeight:600,color:"#1e40af",textAlign:"center"}}>Admin</div>
              <div style={{fontFamily:font,fontSize:8,color:C.muted,textAlign:"center"}}>Gestión</div>
            </div>
          </div>
        </div>
      </div>):(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",animation:"popIn .25s"}}>
          <div style={{background:`linear-gradient(160deg,#1e40af,#2d5be3 60%,#3b82f6)`,width:"100%",padding:"36px 20px 32px",borderRadius:"0 0 32px 32px",textAlign:"center"}}>
            {loginSelEmp==="admin"
              ?<><div style={{width:68,height:68,borderRadius:"50%",background:"rgba(255,255,255,.15)",border:"3px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><AresoLogo size={36} color="white"/></div><div style={{fontFamily:font,fontSize:20,fontWeight:700,color:"#fff"}}>Administrador</div><div style={{fontFamily:font,fontSize:10,color:"#ffffff88",marginTop:4}}>Panel de gestión</div></>
              :<><div style={{width:68,height:68,borderRadius:"50%",background:getAvatarColor(loginSelEmp.id)+"33",border:`3px solid ${getAvatarColor(loginSelEmp.id)}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontFamily:font,fontSize:26,fontWeight:700,color:"#fff"}}>{loginSelEmp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div><div style={{fontFamily:font,fontSize:20,fontWeight:700,color:"#fff"}}>{loginSelEmp.name}</div><div style={{fontFamily:font,fontSize:10,color:"#ffffff88",marginTop:4}}>{loginSelEmp.position||"Empleado"}</div></>
            }
          </div>
          <div style={{padding:"28px 32px 0",width:"100%",maxWidth:360}}>
            <div style={{fontFamily:font,fontSize:11,color:C.muted,textAlign:"center",marginBottom:20,letterSpacing:2}}>INTRODUCE TU PIN</div>
            {/* PIN dots */}
            <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:loginPin.length>i?C.accent:C.border,transition:"background .15s"}}/>)}
            </div>
            {/* Numpad */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((d,i)=>(
                <button key={i} onClick={()=>d&&handlePinKey(d)} style={{height:60,borderRadius:14,border:`1px solid ${C.border}`,background:d===""?"transparent":C.card,color:d==="del"?C.red:C.text,fontFamily:font,fontSize:d==="del"?18:22,fontWeight:600,cursor:d?"pointer":"default",boxShadow:d?"0 2px 6px #0001":"none",transition:"all .1s"}}>{d==="del"?"⌫":d}</button>
              ))}
            </div>
          </div>
          <button onClick={()=>{setLoginSelEmp(null);setLoginPin("");}} style={{marginTop:24,background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:12,textDecoration:"underline"}}>← Cambiar perfil</button>
        </div>
      )}
    </div>);
  }

  // ═══ REGISTER ═══
  if(view==="register")return(<div style={ss.page}>{CSS}{Toast}<div style={{maxWidth:400,margin:"0 auto",padding:20,minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",gap:24,animation:"fadeUp .4s"}}>
    <div style={{textAlign:"center"}}><div style={{fontFamily:font,fontSize:13,color:C.accent,letterSpacing:5,marginBottom:8}}>ARESO</div><div style={{fontSize:26,fontWeight:700}}>Crear cuenta</div></div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <input placeholder="Nombre completo *" value={regForm.name} onChange={e=>setRegForm({...regForm,name:e.target.value})} style={ss.input}/>
      <input placeholder="Email *" value={regForm.email} onChange={e=>setRegForm({...regForm,email:e.target.value})} style={ss.input}/>
      <input placeholder="Contraseña *" type="password" value={regForm.pin} onChange={e=>setRegForm({...regForm,pin:e.target.value})} style={ss.input}/>
      <input placeholder="Puesto (Cocina, Sala...)" value={regForm.position} onChange={e=>setRegForm({...regForm,position:e.target.value})} style={ss.input}/>
      <input placeholder="Teléfono" value={regForm.phone} onChange={e=>setRegForm({...regForm,phone:e.target.value})} style={ss.input}/>
      <div><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Fecha de nacimiento</div><input type="date" value={regForm.birthday} onChange={e=>setRegForm({...regForm,birthday:e.target.value})} style={ss.input}/></div>
      <button onClick={handleRegister} style={ss.btn(C.accent,"#000")}>Registrarse</button>
    </div>
    <button onClick={()=>setView("login")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:12,textDecoration:"underline"}}>Ya tengo cuenta</button>
  </div></div>);



  // ═══ ADMIN PANEL ═══
  if(view==="admin"){
    const tabs=[{id:"live",l:"📡 Directo"},{id:"schedule",l:"📅 Horarios"},{id:"overview",l:"📆 Calendario"},{id:"records",l:"⏱ Fichajes"},{id:"employees",l:"👥 Equipo"},{id:"announcements",l:"📢 Comunicados"},{id:"vacations",l:"🏖 Vacaciones"},{id:"incidencias",l:"📬 Buzón"},{id:"export",l:"📥 Exportar"},{id:"guia",l:"📖 Guía"}];

    return(<div style={{...ss.page,paddingBottom:16}}>{CSS}{Toast}<div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px 32px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:10}}><AresoLogo size={32} color={C.accent}/><div><div style={{fontFamily:font,fontSize:10,color:C.accent,letterSpacing:3}}>ARESO ADMIN</div><div style={{fontSize:20,fontWeight:700}}>Panel de gestión</div></div></div><button onClick={()=>{setView("login");setAdminPin("");}} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11}}>Salir</button></div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>{tabs.map(t=><button key={t.id} onClick={()=>{setAdminTab(t.id);setAddShift(null);setConfirmDelete(null);}} style={{padding:"10px 18px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:font,fontSize:13,fontWeight:600,background:adminTab===t.id?C.accent:"transparent",color:adminTab===t.id?"#fff":C.muted,whiteSpace:"nowrap"}}>{t.l}</button>)}</div>

      {/* LIVE */}
      {adminTab==="live"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:10}}>
          {[{n:employees.filter(e=>e.active&&getStatus(records,e.id)==="in").length,l:"Trabajando",c:C.green},{n:employees.filter(e=>e.active&&getStatus(records,e.id)==="out").length,l:"Fuera",c:C.dim},{n:(records[dateKey()]||[]).length,l:"Fichajes",c:C.accent}].map((x,i)=><div key={i} style={{...ss.card,padding:"14px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:28,fontWeight:700,color:x.c}}>{x.n}</div><div style={{fontFamily:font,fontSize:9,color:C.muted}}>{x.l}</div></div>)}
        </div>
        {/* Who's in */}
        {["in","out"].map(status=>{const emps=employees.filter(e=>e.active&&getStatus(records,e.id)===status);if(!emps.length)return null;
          return(<div key={status}><div style={{fontFamily:font,fontSize:11,color:status==="in"?C.green:C.dim,marginBottom:8,marginTop:8}}>{status==="in"?"🟢 Trabajando":"⚫ Fuera"}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{emps.map(emp=>{const w=getWorked(records,emp.id,dateKey());const col=getAvatarColor(emp.id);return(<div key={emp.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,width:60}}>
            <div style={ss.avatar(col,44)}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <div style={{fontFamily:font,fontSize:9,color:C.text,textAlign:"center",lineHeight:1.2}}>{emp.name.split(" ")[0]}</div>
            {w>0&&<div style={{fontFamily:font,fontSize:8,color:C.accent}}>{fmtDur(w)}</div>}
          </div>);})}</div></div>);
        })}
        {/* Birthdays */}
        {getUpcomingBirthdays(employees).length>0&&<><div style={ss.secTitle}>🎂 Próximos cumpleaños</div>{getUpcomingBirthdays(employees).map(emp=><div key={emp.id} style={{...ss.statusCard,padding:"10px 14px"}}><div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{emp.name.split(" ")[0]}</div><div style={{fontFamily:font,fontSize:10,color:C.muted}}>{emp.dateStr}</div></div><div style={{fontFamily:font,fontSize:11,color:emp.daysUntil===0?"#ec4899":C.muted,fontWeight:700}}>{emp.daysUntil===0?"¡Hoy!":emp.daysUntil===1?"Mañana":emp.daysUntil+"d"}</div></div>)}</>}
      </div>}

      {/* RECORDS */}
      {adminTab==="records"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Añadir fichaje manual */}
        <div style={{...ss.card,display:"flex",flexDirection:"column",gap:8}}>
          <div style={ss.label}>Añadir fichaje</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select id="rec-emp" style={{...ss.input,flex:2,minWidth:120}}>
              <option value="">Empleado...</option>
              {employees.filter(e=>e.active).map(e=><option key={e.id} value={e.id}>{e.name.split(" ")[0]}</option>)}
            </select>
            <select id="rec-type" style={{...ss.input,flex:1,minWidth:90}}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <input type="date" id="rec-date" defaultValue={filterDate} style={{...ss.input,flex:1}}/>
            <input type="time" id="rec-time" style={{...ss.input,flex:1}}/>
          </div>
          <button onClick={async()=>{
            const empId=document.getElementById("rec-emp").value;
            const type=document.getElementById("rec-type").value;
            const date=document.getElementById("rec-date").value;
            const time=document.getElementById("rec-time").value;
            if(!empId||!date||!time)return flash("Rellena todos los campos",false);
            const [h,m]=time.split(":");
            const dt=new Date(date);dt.setHours(+h,+m,0,0);
            const rec={empId,type,time:dt.getTime(),photo:null};
            await DB.addClockIn(rec);
            const dk=dateKey(dt);
            setRecords({...records,[dk]:[...(records[dk]||[]),{...rec,id:Date.now()}]});
            flash(`Fichaje añadido ✓`);loadData();
          }} style={ss.btn(C.accent,"#fff")}>+ Añadir fichaje</button>
        </div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>{const d=new Date(filterDate);d.setDate(d.getDate()-1);setFilterDate(dateKey(d));}} style={{...ss.btn(C.card,C.muted),width:44,border:`1px solid ${C.border}`}}>←</button><input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{...ss.input,flex:1}}/><button onClick={()=>{const d=new Date(filterDate);d.setDate(d.getDate()+1);setFilterDate(dateKey(d));}} style={{...ss.btn(C.card,C.muted),width:44,border:`1px solid ${C.border}`}}>→</button></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{employees.filter(e=>e.active).map(emp=>{const w=getWorked(records,emp.id,filterDate);if(!w&&!(records[filterDate]||[]).some(r=>r.empId===emp.id))return null;return<div key={emp.id} style={{...ss.card,padding:"5px 10px",fontFamily:font,fontSize:11}}>{emp.name.split(" ")[0]} <span style={{color:C.accent,marginLeft:4}}>{fmtDur(w)}</span></div>;})}</div>
        {(records[filterDate]||[]).sort((a,b)=>a.time-b.time).map(r=>{const emp=employees.find(e=>e.id===r.empId);return(<div key={r.id} style={{...ss.card,padding:10,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:font,fontSize:12}}><span style={{color:C.accent,minWidth:44}}>{fmtTime(r.time)}</span><span style={{flex:1}}>{emp?.name?.split(" ")[0]}</span><span style={{color:r.type==="in"?C.green:C.red,fontSize:11}}>{r.type==="in"?"Entrada":"Salida"}</span>
          <button onClick={()=>{setEditRecId(editRecId===r.id?null:r.id);setEditTimeVal("");}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>✎</button>
          <button onClick={async()=>{await DB.deleteClockIn(r.id);setRecords({...records,[filterDate]:(records[filterDate]||[]).filter(x=>x.id!==r.id)});flash("Eliminado");}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button></div>
          {editRecId===r.id&&<div style={{display:"flex",gap:6}}><input type="time" value={editTimeVal} onChange={e=>setEditTimeVal(e.target.value)} style={{...ss.input,flex:1}}/><button onClick={async()=>{if(!editTimeVal)return;const[h,m]=editTimeVal.split(":");const d=new Date(r.time);d.setHours(+h,+m,0);await DB.updateClockIn(r.id,d.getTime());setRecords({...records,[filterDate]:(records[filterDate]||[]).map(x=>{if(x.id!==r.id)return x;return{...x,time:d.getTime()};})});setEditRecId(null);flash("Actualizado");}} style={{background:C.accent,border:"none",color:"#000",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:font,fontSize:11,fontWeight:700}}>✓</button></div>}
        </div>);})}
        {!(records[filterDate]||[]).length&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin registros</div>}
      </div>}

      {/* EMPLOYEES */}
      {adminTab==="employees"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Add employee form */}
        <div style={{...ss.card}}>
          <div style={ss.label}>Crear trabajador</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
            <input placeholder="Nombre completo *" id="adm-emp-name" style={ss.input}/>
            <input placeholder="Email" id="adm-emp-email" style={ss.input}/>
            <input placeholder="Contraseña *" type="password" id="adm-emp-pass" style={ss.input}/>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Puesto" id="adm-emp-pos" style={{...ss.input,flex:1}}/>
              <input placeholder="Teléfono" id="adm-emp-phone" style={{...ss.input,flex:1}}/>
            </div>
            <div><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Fecha de nacimiento</div><input type="date" id="adm-emp-bday" style={ss.input}/></div>
            <button onClick={async()=>{const n=document.getElementById("adm-emp-name").value;const p=document.getElementById("adm-emp-pass").value;if(!n||!p)return flash("Nombre y contraseña obligatorios",false);const emp=await DB.addEmployee({name:n,email:document.getElementById("adm-emp-email").value,pin:p,position:document.getElementById("adm-emp-pos").value,phone:document.getElementById("adm-emp-phone").value,birthday:document.getElementById("adm-emp-bday").value,role:"employee"});if(emp){setEmployees([...employees,emp]);document.getElementById("adm-emp-name").value="";document.getElementById("adm-emp-email").value="";document.getElementById("adm-emp-pass").value="";document.getElementById("adm-emp-pos").value="";document.getElementById("adm-emp-phone").value="";document.getElementById("adm-emp-bday").value="";flash("Trabajador creado");}else flash("Error",false);}} style={ss.btn(C.accent,"#fff")}>+ Crear trabajador</button>
          </div>
        </div>
        {/* Employee list */}
        <div style={ss.label}>Equipo</div>
        {employees.map(emp=><div key={emp.id} style={{...ss.card,opacity:emp.active?1:0.5,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{...ss.avatar(getAvatarColor(emp.id),36),flexShrink:0}}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}{emp.sickLeave&&<span style={{fontFamily:font,fontSize:9,color:C.red,marginLeft:6}}>🏥 BAJA</span>}</div>
              <div style={{fontFamily:font,fontSize:10,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.position||"—"} · {emp.email||"—"}</div>
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button onClick={()=>setEditEmp(editEmp?.id===emp.id?null:{id:emp.id,name:emp.name,email:emp.email||"",position:emp.position||"",phone:emp.phone||"",birthday:emp.birthday||""})} style={{fontFamily:font,fontSize:8,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",fontWeight:700,background:editEmp?.id===emp.id?C.accent+"22":C.cardLight,color:editEmp?.id===emp.id?C.accent:C.muted}}>✎</button>
              <button onClick={async()=>{await DB.updateEmployee(emp.id,{sick_leave:!emp.sickLeave});setEmployees(employees.map(e=>e.id===emp.id?{...e,sickLeave:!e.sickLeave}:e));flash(emp.sickLeave?"Baja quitada":"Marcado de baja");}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:emp.sickLeave?"#fef2f2":"#fff7ed",color:emp.sickLeave?C.red:C.orange}}>🏥</button>
              <button onClick={async()=>{await DB.updateEmployee(emp.id,{active:!emp.active});setEmployees(employees.map(e=>e.id===emp.id?{...e,active:!e.active}:e));}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:emp.active?"#f0fdf4":"#fef2f2",color:emp.active?C.green:C.red}}>{emp.active?"ON":"OFF"}</button>
            </div>
          </div>
          {editEmp?.id===emp.id&&<div style={{display:"flex",flexDirection:"column",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:3}}>Nombre</div><input value={editEmp.name} onChange={e=>setEditEmp({...editEmp,name:e.target.value})} style={ss.input}/></div>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:3}}>Puesto</div><input value={editEmp.position} onChange={e=>setEditEmp({...editEmp,position:e.target.value})} style={ss.input}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:3}}>Email</div><input value={editEmp.email} onChange={e=>setEditEmp({...editEmp,email:e.target.value})} style={ss.input}/></div>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:3}}>Teléfono</div><input value={editEmp.phone} onChange={e=>setEditEmp({...editEmp,phone:e.target.value})} style={ss.input}/></div>
            </div>
            <div><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:3}}>Cumpleaños</div><input type="date" value={editEmp.birthday} onChange={e=>setEditEmp({...editEmp,birthday:e.target.value})} style={ss.input}/></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={async()=>{if(!editEmp.name)return flash("El nombre es obligatorio",false);await DB.updateEmployeeProfile(emp.id,editEmp);setEmployees(employees.map(e=>e.id===emp.id?{...e,...editEmp}:e));setEditEmp(null);flash("Perfil actualizado ✓");}} style={{...ss.btn(C.accent,"#fff"),flex:1}}>✓ Guardar</button>
              <button onClick={()=>setEditEmp(null)} style={{...ss.btn(C.cardLight,C.muted),flex:1,border:`1px solid ${C.border}`}}>Cancelar</button>
            </div>
          </div>}
        </div>)}
      </div>}

      {/* ANNOUNCEMENTS (admin) */}
      {adminTab==="announcements"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}>
          <div style={ss.label}>Nuevo comunicado</div>
          <input placeholder="Título" value={annForm.title} onChange={e=>setAnnForm({...annForm,title:e.target.value})} style={ss.input}/>
          <textarea placeholder="Mensaje..." value={annForm.body} onChange={e=>setAnnForm({...annForm,body:e.target.value})} style={ss.textarea}/>
          <button onClick={async()=>{if(!annForm.title||!annForm.body)return flash("Rellena todo",false);await DB.addAnnouncement({title:annForm.title,body:annForm.body});setAnnForm({title:"",body:""});flash("Comunicado publicado");loadData();}} style={ss.btn(C.orange,"#000")}>📢 Publicar</button>
        </div>
        {announcements.map(a=><div key={a.id} style={{...ss.card}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{fontSize:15,fontWeight:700,flex:1}}>{a.title}</div><span style={{fontFamily:font,fontSize:10,color:C.muted}}>{fmtDate(a.date)}</span><button onClick={async()=>{await DB.deleteAnnouncement(a.id);setAnnouncements(announcements.filter(x=>x.id!==a.id));}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button></div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{a.body}</div>
          <div style={{fontFamily:font,fontSize:9,color:C.dim,marginTop:8}}>Leído por {a.readBy?.length||0}/{employees.filter(e=>e.active).length}</div>
        </div>)}
      </div>}

      {/* WEEKLY SCHEDULE */}
      {adminTab==="schedule"&&(()=>{
        const activeEmps=employees.filter(e=>e.active);
        // ── WEEK VIEW ──
        if(scheduleView==="week"){
          const weekDays=[];for(let i=0;i<7;i++){const d=new Date(calWeekStart);d.setDate(d.getDate()+i);weekDays.push({date:dateKey(d),label:DAYS[i].slice(0,3),full:DAYS[i],num:d.getDate(),month:MONTHS[d.getMonth()]});}
          const shiftWeek=(dir)=>{const d=new Date(calWeekStart);d.setDate(d.getDate()+(dir*7));setCalWeekStart(dateKey(d));};
          return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>shiftWeek(-1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px",flexShrink:0}}>←</button>
              <div style={{flex:1,textAlign:"center",fontFamily:font,fontSize:14,fontWeight:700}}>{weekDays[0].num} {weekDays[0].month} — {weekDays[6].num} {weekDays[6].month}</div>
              <button onClick={()=>shiftWeek(1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px",flexShrink:0}}>→</button>
              <button onClick={()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));setCalWeekStart(dateKey(n));}} style={{...ss.btn(C.cardLight,C.accent),width:"auto",border:`1px solid ${C.border}`,padding:"8px 10px",fontSize:11,flexShrink:0}}>Hoy</button>
              <button onClick={async()=>{
                const wDays=[];for(let i=0;i<7;i++){const d=new Date(calWeekStart);d.setDate(d.getDate()+i);wDays.push(dateKey(d));}
                const y=new Date(calWeekStart).getFullYear();const m=new Date(calWeekStart).getMonth();
                const dim=new Date(y,m+1,0).getDate();const ns={...schedules};let count=0;
                for(const emp of activeEmps){for(let d=1;d<=dim;d++){
                  const cdk=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const dow=new Date(cdk).getDay();const dowIdx=dow===0?6:dow-1;
                  const srcDk=wDays[dowIdx];if(!srcDk)continue;
                  const raw=schedules[emp.id+"_"+srcDk];
                  const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                  if(shifts.length>0){await DB.deleteSchedule(emp.id,cdk);for(let si=0;si<shifts.length;si++){await DB.setSchedule(emp.id,cdk,shifts[si].start,shifts[si].end,si);}ns[emp.id+"_"+cdk]=shifts;count++;}
                }}
                setSchedules(ns);flash(`Semana aplicada al mes (${count} turnos) ✓`);
              }} style={{...ss.btn(C.cardLight,C.green),width:"auto",border:`1px solid ${C.border}`,padding:"8px 10px",fontSize:11,flexShrink:0}}>📆 Aplicar al mes</button>
              <button onClick={()=>setScheduleView("month")} style={{...ss.btn(C.cardLight,C.muted),width:"auto",border:`1px solid ${C.border}`,padding:"8px 10px",fontSize:11,flexShrink:0}}>📆 Mes</button>
            </div>
            {activeEmps.map(emp=>{
              const col=getAvatarColor(emp.id);
              return(<div key={emp.id} style={{...ss.card,padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${C.border}`,background:C.cardLight}}>
                  <div style={ss.avatar(col,32)}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                  <div style={{flex:1}}><div style={{fontFamily:font,fontSize:14,fontWeight:700}}>{emp.name.split(" ")[0]}</div><div style={{fontFamily:font,fontSize:11,color:C.muted}}>{emp.position||"—"}</div></div>
                </div>
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(56px,1fr))",minWidth:392}}>
                    {weekDays.map(d=>{
                      const dayScheds=(schedules[emp.id+"_"+d.date]||[]);
                      const shifts=Array.isArray(dayScheds)?dayScheds:dayScheds.start?[dayScheds]:[];
                      const isToday=d.date===dateKey();
                      return(<div key={d.date} style={{padding:"6px 3px",borderRight:`1px solid ${C.border}22`,background:isToday?C.accent+"0a":"transparent",minHeight:76,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{textAlign:"center",marginBottom:2}}>
                          <div style={{fontFamily:font,fontSize:10,fontWeight:600,color:isToday?C.accent:C.muted}}>{d.label}</div>
                          <div style={{fontFamily:font,fontSize:13,fontWeight:700,color:isToday?C.accent:C.text}}>{d.num}</div>
                        </div>
                        {shifts.map((s,si)=><div key={si} onClick={()=>setConfirmDelete({empId:emp.id,dayKey:d.date,shiftIdx:si})} style={{background:col+"22",border:`2px solid ${col}`,borderRadius:6,padding:"3px 4px",width:"94%",cursor:"pointer",textAlign:"center"}}>
                          <div style={{fontFamily:font,fontSize:10,fontWeight:700,color:col}}>{s.start}</div>
                          <div style={{fontFamily:font,fontSize:9,color:col+"aa"}}>→{s.end}</div>
                        </div>)}
                        <div onClick={()=>{setAddShift({empId:emp.id,dayKey:d.date});setShiftForm({start:"09:00",end:"17:00"});setConfirmDelete(null);}} style={{width:"94%",height:24,border:`1.5px dashed ${C.dim}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.dim,fontSize:16,opacity:.5}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.5}>+</div>
                      </div>);
                    })}
                  </div>
                </div>
              </div>);
            })}
          </div>);
        }
        // ── MONTH VIEW ──
        const year=Math.floor(calMonthView/100);const month=calMonthView%100;
        const daysInMonth=new Date(year,month+1,0).getDate();
        const prevMonth=()=>{const m=month===0?11:month-1;const y=month===0?year-1:year;setCalMonthView(y*100+m);};
        const nextMonth=()=>{const m=month===11?0:month+1;const y=month===11?year+1:year;setCalMonthView(y*100+m);};
        const MONTH_NAMES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const days=Array.from({length:daysInMonth},(_,i)=>i+1);
        const dk=(d)=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isToday=(d)=>dk(d)===dateKey();
        const dow=(d)=>new Date(year,month,d).getDay();
        const isWeekend=(d)=>{const w=dow(d);return w===0||w===6;};
        const DAY_LABELS=["D","L","M","X","J","V","S"];
        const cellW=38,nameW=110,totalW=nameW+daysInMonth*cellW;
        const copyEmpLastMonth=async(emp)=>{
          const pm=month===0?11:month-1;const py=month===0?year-1:year;
          const pdim=new Date(py,pm+1,0).getDate();
          const newScheds={...schedules};let count=0;
          for(let d=1;d<=Math.min(pdim,daysInMonth);d++){
            const pdk=`${py}-${String(pm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const ps=schedules[emp.id+"_"+pdk];
            if(ps){const shifts=Array.isArray(ps)?ps:ps.start?[ps]:[];if(shifts.length){const cdk=dk(d);await DB.setSchedule(emp.id,cdk,shifts[0].start,shifts[0].end);newScheds[emp.id+"_"+cdk]=shifts[0];count++;}}
          }
          setSchedules(newScheds);flash(`${emp.name.split(" ")[0]}: ${count} turnos copiados ✓`);
        };
        return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={prevMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>←</button>
            <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:700,fontFamily:font}}>{MONTH_NAMES[month]} {year}</div>
            <button onClick={nextMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>→</button>
            <button onClick={()=>setScheduleView("week")} style={{...ss.btn(C.cardLight,C.muted),width:"auto",border:`1px solid ${C.border}`,padding:"6px 10px",fontSize:11,flexShrink:0}}>📅 Semana</button>
          </div>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 2px 8px #0001"}}>
            <div style={{minWidth:totalW}}>
              <div style={{display:"grid",gridTemplateColumns:`${nameW}px repeat(${daysInMonth},${cellW}px)`,background:C.cardLight,borderBottom:`2px solid ${C.border}`}}>
                <div style={{padding:"10px 12px",fontFamily:font,fontSize:11,fontWeight:600,color:C.muted,borderRight:`1px solid ${C.border}`}}>Empleado</div>
                {days.map(d=><div key={d} style={{padding:"4px 1px",textAlign:"center",background:isToday(d)?C.accent+"22":isWeekend(d)?"#f5f5ff":"transparent",borderLeft:`1px solid ${C.border}22`}}>
                  <div style={{fontFamily:font,fontSize:9,color:isToday(d)?C.accent:isWeekend(d)?C.purple:C.muted,fontWeight:600}}>{DAY_LABELS[dow(d)]}</div>
                  <div style={{fontFamily:font,fontSize:11,fontWeight:isToday(d)?700:500,color:isToday(d)?C.accent:C.text}}>{d}</div>
                </div>)}
              </div>
              {activeEmps.map((emp,ei)=>{
                const col=getAvatarColor(emp.id);
                return(<div key={emp.id} style={{display:"grid",gridTemplateColumns:`${nameW}px repeat(${daysInMonth},${cellW}px)`,borderBottom:ei<activeEmps.length-1?`1px solid ${C.border}22`:"none",background:ei%2===0?C.card:C.cardLight+"88"}}>
                  <div style={{padding:"6px 10px",display:"flex",alignItems:"center",gap:6,position:"sticky",left:0,background:ei%2===0?C.card:C.cardLight,zIndex:2,borderRight:`1px solid ${C.border}`}}>
                    <div style={ss.avatar(col,26)}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:font,fontSize:10,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}</div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>copyEmpLastMonth(emp)} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:font,fontSize:7,padding:0}}>📋</button>
                        <button onClick={async()=>{if(!window.confirm(`¿Borrar todos los turnos de ${emp.name.split(" ")[0]} en ${MONTH_NAMES[month]}?`))return;const ns={...schedules};let c=0;for(let d=1;d<=daysInMonth;d++){const cdk=dk(d);if(ns[emp.id+"_"+cdk]){await DB.deleteSchedule(emp.id,cdk);delete ns[emp.id+"_"+cdk];c++;}}setSchedules(ns);flash(`${emp.name.split(" ")[0]}: ${c} turnos borrados`);}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontFamily:font,fontSize:7,padding:0}}>🗑</button>
                      </div>
                    </div>
                  </div>
                  {days.map(d=>{
                    const raw=schedules[emp.id+"_"+dk(d)];
                    const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                    const vac=vacations.find(v=>v.empId===emp.id&&v.status==="approved"&&v.start<=dk(d)&&v.end>=dk(d));
                    return(<div key={d} style={{padding:1,borderLeft:`1px solid ${C.border}11`,background:isToday(d)?C.accent+"15":isWeekend(d)?"#f5f5ff":"transparent",minHeight:36,display:"flex",flexDirection:"column",gap:1,alignItems:"center",justifyContent:"center",cursor:vac?"default":"pointer"}}
                      onClick={()=>{if(!vac){setAddShift({empId:emp.id,dayKey:dk(d)});setShiftForm({start:"09:00",end:"17:00"});setConfirmDelete(null);}}}
                      onMouseEnter={e=>{if(!vac)e.currentTarget.style.background=C.accent+"11";}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isToday(d)?C.accent+"15":isWeekend(d)?"#f5f5ff":"transparent";}}>
                      {vac?<div style={{fontSize:9,textAlign:"center"}}>🏖</div>
                      :shifts.length>0?shifts.map((s,si)=><div key={si} style={{width:"92%",background:col+"28",borderRadius:2,borderLeft:`2px solid ${col}`,padding:"1px 2px"}}>
                        <div style={{fontFamily:font,fontSize:6,color:col,fontWeight:700,overflow:"hidden",whiteSpace:"nowrap"}}>{s.start}</div>
                      </div>):<div style={{fontSize:12,color:C.dim,opacity:.3}}>+</div>}
                    </div>);
                  })}
                </div>);
              })}
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            {activeEmps.map(emp=><div key={emp.id} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:8,borderRadius:2,background:getAvatarColor(emp.id)}}/><span style={{fontFamily:font,fontSize:9,color:C.text}}>{emp.name.split(" ")[0]}</span></div>)}
          </div>
        </div>);
      })()}

      {/* OVERVIEW — calendario visual solo lectura, fila por empleado */}
      {adminTab==="overview"&&(()=>{
        const year=Math.floor(calMonthView/100);const month=calMonthView%100;
        const daysInMonth=new Date(year,month+1,0).getDate();
        const prevMonth=()=>{const m=month===0?11:month-1;const y=month===0?year-1:year;setCalMonthView(y*100+m);};
        const nextMonth=()=>{const m=month===11?0:month+1;const y=month===11?year+1:year;setCalMonthView(y*100+m);};
        const MONTH_NAMES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const activeEmps=employees.filter(e=>e.active);
        const firstDow=new Date(year,month,1).getDay();
        const startDow=firstDow===0?6:firstDow-1;
        const cells=[];
        for(let i=0;i<startDow;i++)cells.push(null);
        for(let d=1;d<=daysInMonth;d++)cells.push(d);
        const dk=(d)=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const slotH=28; // height per employee slot in px
        return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={prevMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>←</button>
            <div style={{flex:1,textAlign:"center",fontSize:16,fontWeight:700,fontFamily:font}}>{MONTH_NAMES[month]} {year}</div>
            <button onClick={nextMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>→</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
            {["L","M","X","J","V","S","D"].map(d=><div key={d} style={{textAlign:"center",fontFamily:font,fontSize:10,color:C.muted,padding:"4px 0",fontWeight:600}}>{d}</div>)}
          </div>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginLeft:-4,marginRight:-4,paddingLeft:4,paddingRight:4}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(80px,1fr))",gap:3,minWidth:560}}>
            {cells.map((day,i)=>{
              if(!day)return<div key={i}/>;
              const d=dk(day);
              const today=d===dateKey();
              const isWeekend=new Date(year,month,day).getDay()===0||new Date(year,month,day).getDay()===6;
              // Get the week this day belongs to (row index in the grid)
              const weekIdx=Math.floor((i)/7);
              // Get all days in this week
              const weekStart=weekIdx*7;
              const weekDaysInRow=cells.slice(weekStart,weekStart+7).filter(x=>x);
              return(<div key={day} style={{background:today?C.accent+"15":isWeekend?"#f5f5ff":C.card,border:`1px solid ${today?C.accent+"55":C.border}`,borderRadius:8,padding:"4px 3px",display:"flex",flexDirection:"column",gap:1}}>
                <div style={{fontFamily:font,fontSize:11,fontWeight:today?700:500,color:today?C.accent:isWeekend?C.purple:C.text,textAlign:"center",marginBottom:3}}>{day}</div>
                {activeEmps.filter(emp=>{
                  // Only show if works at least one day THIS WEEK
                  return weekDaysInRow.some(wd=>{
                    const wdk=dk(wd);
                    const raw=schedules[emp.id+"_"+wdk];
                    const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                    const vac=vacations.find(v=>v.empId===emp.id&&v.status==="approved"&&v.start<=wdk&&v.end>=wdk);
                    return shifts.length>0||!!vac;
                  });
                }).map(emp=>{
                  const col=getAvatarColor(emp.id);
                  const raw=schedules[emp.id+"_"+d];
                  const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                  const vac=vacations.find(v=>v.empId===emp.id&&v.status==="approved"&&v.start<=d&&v.end>=d);
                  return(<div key={emp.id} style={{height:52,marginBottom:2,flexShrink:0}}>
                    {vac?<div style={{height:"100%",background:C.green+"33",borderLeft:`3px solid ${C.green}`,borderRadius:"0 4px 4px 0",padding:"3px 6px",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11}}>🏖</span>
                      <span style={{fontFamily:font,fontSize:10,color:C.green,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}</span>
                    </div>:shifts.length>0?<div style={{height:"100%",background:col+"22",borderLeft:`3px solid ${col}`,borderRadius:"0 4px 4px 0",padding:"3px 6px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                      <div style={{fontFamily:font,fontSize:10,color:col,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}</div>
                      {shifts.map((s,si)=><div key={si} style={{fontFamily:font,fontSize:9,color:col+"dd",overflow:"hidden",whiteSpace:"nowrap"}}>{s.start}–{s.end}</div>)}
                    </div>:<div style={{height:"100%"}}/>}
                  </div>);
                })}
              </div>);
            })}
          </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",padding:"4px 0"}}>
            {activeEmps.map(emp=><div key={emp.id} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:8,borderRadius:2,background:getAvatarColor(emp.id)}}/><span style={{fontFamily:font,fontSize:9,color:C.text}}>{emp.name.split(" ")[0]}</span></div>)}
            <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:8,borderRadius:2,background:C.green+"66",border:`1px solid ${C.green}`}}/><span style={{fontFamily:font,fontSize:9,color:C.muted}}>Vacaciones</span></div>
          </div>
        </div>);
      })()}

                  {/* VACATIONS */}
      {/* ── MODAL añadir/partir turno ── */}
      {addShift&&(()=>{
        const emp=employees.find(e=>e.id===addShift.empId);
        const col=getAvatarColor(addShift.empId);
        const fmtDay=(d)=>new Date(d).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
        const existing=schedules[addShift.empId+"_"+addShift.dayKey];
        const existingShifts=Array.isArray(existing)?existing:existing?.start?[existing]:[];
        const isSplit=existingShifts.length>0;
        return(<div onClick={e=>{if(e.target===e.currentTarget)setAddShift(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(3px)"}}>
          <div style={{background:C.card,borderRadius:24,width:"100%",maxWidth:420,boxShadow:"0 24px 60px rgba(0,0,0,.25)",overflow:"hidden",animation:"popIn .2s"}}>
            <div style={{background:`linear-gradient(135deg,${col},${col}cc)`,padding:"20px 24px",position:"relative"}}>
              <button onClick={()=>setAddShift(null)} style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,.25)",border:"2px solid rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,fontSize:16,fontWeight:700,color:"#fff"}}>{emp?.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:700,color:"#fff"}}>{emp?.name.split(" ")[0]}</div>
                  <div style={{fontFamily:font,fontSize:11,color:"rgba(255,255,255,.8)",textTransform:"capitalize"}}>{fmtDay(addShift.dayKey)}</div>
                </div>
              </div>
              {isSplit&&<div style={{marginTop:10,background:"rgba(255,255,255,.15)",borderRadius:8,padding:"6px 10px",fontFamily:font,fontSize:11,color:"#fff"}}>
                Turnos actuales: {existingShifts.map((s,i)=><span key={i} style={{fontWeight:700}}>{s.start}–{s.end}{i<existingShifts.length-1?" · ":""}</span>)}
              </div>}
            </div>
            <div style={{padding:"20px"}}>
              <div style={{fontFamily:font,fontSize:11,fontWeight:600,color:C.muted,marginBottom:10,letterSpacing:1}}>{isSplit?"AÑADIR TURNO PARTIDO":"HORARIO"}</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:font,fontSize:10,color:C.muted,marginBottom:4}}>ENTRADA</div>
                  <input type="time" value={shiftForm.start} onChange={e=>setShiftForm({...shiftForm,start:e.target.value})} style={{...ss.input,fontSize:18,fontWeight:700,textAlign:"center",padding:"10px",color:C.accent,border:`2px solid ${C.accent}33`,borderRadius:12}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",paddingTop:20,color:C.dim,fontSize:18}}>→</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:font,fontSize:10,color:C.muted,marginBottom:4}}>SALIDA</div>
                  <input type="time" value={shiftForm.end} onChange={e=>setShiftForm({...shiftForm,end:e.target.value})} style={{...ss.input,fontSize:18,fontWeight:700,textAlign:"center",padding:"10px",color:C.accent,border:`2px solid ${C.accent}33`,borderRadius:12}}/>
                </div>
              </div>
              <button onClick={async()=>{
                const newShift={start:shiftForm.start,end:shiftForm.end};
                const allShifts=[...existingShifts,newShift].sort((a,b)=>a.start.localeCompare(b.start));
                for(let i=0;i<allShifts.length;i++){await DB.setSchedule(addShift.empId,addShift.dayKey,allShifts[i].start,allShifts[i].end,i);}
                setSchedules({...schedules,[addShift.empId+"_"+addShift.dayKey]:allShifts});
                setAddShift(null);flash(isSplit?"Turno partido añadido ✓":"Turno guardado ✓");
              }} style={{...ss.btn(col,"#fff"),borderRadius:12,marginBottom:8,fontSize:14,fontWeight:700,padding:"13px"}}>{isSplit?"+ Añadir turno partido":"✓ Guardar este día"}</button>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={async()=>{const ns={...schedules};const cd=new Date(addShift.dayKey);const dw=cd.getDay()||7;const mon=new Date(cd);mon.setDate(cd.getDate()-(dw-1));for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const cdk=dateKey(d);await DB.setSchedule(addShift.empId,cdk,shiftForm.start,shiftForm.end);ns[addShift.empId+"_"+cdk]={start:shiftForm.start,end:shiftForm.end};}setSchedules(ns);setAddShift(null);flash("Semana aplicada ✓");}} style={{...ss.btn(C.cardLight,C.green),border:`1.5px solid ${C.green}44`,borderRadius:10,padding:"10px",fontSize:12}}>📅 Esta semana</button>
                <button onClick={async()=>{const ns={...schedules};const y=new Date(addShift.dayKey).getFullYear();const m=new Date(addShift.dayKey).getMonth();const dim=new Date(y,m+1,0).getDate();for(let d=1;d<=dim;d++){const cdk=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;await DB.setSchedule(addShift.empId,cdk,shiftForm.start,shiftForm.end);ns[addShift.empId+"_"+cdk]={start:shiftForm.start,end:shiftForm.end};}setSchedules(ns);setAddShift(null);flash("Mes aplicado ✓");}} style={{...ss.btn(C.cardLight,C.blue),border:`1.5px solid ${C.blue}44`,borderRadius:10,padding:"10px",fontSize:12}}>📆 Todo el mes</button>
              </div>
            </div>
          </div>
        </div>);
      })()}

      {/* ── MODAL borrar turno ── */}
      {confirmDelete&&(()=>{
        const emp=employees.find(e=>e.id===confirmDelete.empId);
        const col=getAvatarColor(confirmDelete.empId);
        const existing=schedules[confirmDelete.empId+"_"+confirmDelete.dayKey];
        const shifts=Array.isArray(existing)?existing:existing?.start?[existing]:[];
        const idx=confirmDelete.shiftIdx??0;
        const s=shifts[idx];
        return(<div onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(3px)"}}>
          <div style={{background:C.card,borderRadius:24,width:"100%",maxWidth:360,boxShadow:"0 24px 60px rgba(0,0,0,.25)",overflow:"hidden",animation:"popIn .2s"}}>
            <div style={{background:`linear-gradient(135deg,${C.red},#ff6b6b)`,padding:"20px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:6}}>🗑</div>
              <div style={{fontFamily:font,fontSize:15,fontWeight:700,color:"#fff"}}>¿Borrar turno?</div>
              <div style={{fontFamily:font,fontSize:12,color:"rgba(255,255,255,.8)",marginTop:3}}>{emp?.name.split(" ")[0]} · {confirmDelete.dayKey}</div>
              {s&&<div style={{fontFamily:font,fontSize:18,fontWeight:700,color:"#fff",marginTop:6}}>{s.start} → {s.end}</div>}
              {shifts.length>1&&<div style={{fontFamily:font,fontSize:10,color:"rgba(255,255,255,.7)",marginTop:4}}>({shifts.length} turnos este día)</div>}
            </div>
            <div style={{padding:"16px",display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(null)} style={{...ss.btn(C.cardLight,C.muted),flex:1,border:`1px solid ${C.border}`,borderRadius:10}}>Cancelar</button>
              <button onClick={async()=>{
                const key=confirmDelete.empId+"_"+confirmDelete.dayKey;
                const remaining=shifts.filter((_,i)=>i!==idx);
                await DB.deleteSchedule(confirmDelete.empId,confirmDelete.dayKey);
                for(let i=0;i<remaining.length;i++){await DB.setSchedule(confirmDelete.empId,confirmDelete.dayKey,remaining[i].start,remaining[i].end,i);}
                if(remaining.length===0){const ns={...schedules};delete ns[key];setSchedules(ns);}
                else{setSchedules({...schedules,[key]:remaining});}
                setConfirmDelete(null);flash("Turno borrado");
              }} style={{...ss.btn(C.red,"#fff"),flex:1,borderRadius:10}}>Borrar</button>
            </div>
          </div>
        </div>);
      })()}
      {adminTab==="vacations"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}>
          <div style={ss.label}>Añadir vacaciones</div>
          <select id="vac-emp-sel" style={ss.input}>
            <option value="">Seleccionar empleado...</option>
            {employees.filter(e=>e.active).map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Desde</div><input type="date" id="vac-start" style={ss.input}/></div>
            <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hasta</div><input type="date" id="vac-end" style={ss.input}/></div>
          </div>
          <select id="vac-status" style={ss.input}>
            <option value="approved">Aprobada</option>
            <option value="pending">Pendiente</option>
          </select>
          <button onClick={async()=>{
            const empId=document.getElementById("vac-emp-sel").value;
            const start=document.getElementById("vac-start").value;
            const end=document.getElementById("vac-end").value;
            const status=document.getElementById("vac-status").value;
            if(!empId||!start||!end)return flash("Rellena todos los campos",false);
            await DB.addVacation({empId,start,end,notes:"Añadido por admin"});
            if(status==="approved"){const {data}=await sb.from('areso_vacations').select('id').eq('employee_id',empId).eq('start_date',start).order('id',{ascending:false}).limit(1);if(data?.[0])await DB.updateVacation(data[0].id,"approved");}
            document.getElementById("vac-emp-sel").value="";document.getElementById("vac-start").value="";document.getElementById("vac-end").value="";
            flash("Vacaciones añadidas ✓");loadData();
          }} style={ss.btn(C.accent,"#fff")}>+ Añadir vacaciones</button>
        </div>
        {vacations.sort((a,b)=>b.id-a.id).map(v=>{const emp=employees.find(e=>e.id===v.empId);const cc={pending:{bg:"#fefce8",c:C.accent},approved:{bg:"#f0fdf4",c:C.green},rejected:{bg:"#fef2f2",c:C.red}}[v.status];return(<div key={v.id} style={{...ss.card,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:600}}>{emp?.name?.split(" ")[0]}</span><span style={{fontFamily:font,fontSize:12}}>{fmtDate(v.start)} → {fmtDate(v.end)}</span><span style={{marginLeft:"auto",fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:cc.bg,color:cc.c}}>{v.status==="pending"?"PENDIENTE":v.status==="approved"?"APROBADA":"RECHAZADA"}</span></div>
          {v.status==="pending"&&<div style={{display:"flex",gap:6}}><button onClick={async()=>{await DB.updateVacation(v.id,"approved");setVacations(vacations.map(x=>x.id===v.id?{...x,status:"approved"}:x));flash("Aprobada");}} style={{...ss.btn(C.green,"#000"),padding:"8px",fontSize:12}}>✓</button><button onClick={async()=>{await DB.updateVacation(v.id,"rejected");setVacations(vacations.map(x=>x.id===v.id?{...x,status:"rejected"}:x));flash("Rechazada");}} style={{...ss.btn(C.red,"#000"),padding:"8px",fontSize:12}}>✕</button></div>}
        </div>);})}
        {!vacations.length&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin solicitudes</div>}
      </div>}

      {/* DOCS */}
      {adminTab==="docs"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {documents.sort((a,b)=>b.id-a.id).map(d=>{const emp=employees.find(e=>e.id===d.empId);return(<div key={d.id} style={{...ss.card,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:600}}>{emp?.name?.split(" ")[0]}</span><span style={{fontFamily:font,fontSize:12}}>{{medical:"🏥",personal:"👤",other:"📄"}[d.type]} {d.type}</span><span style={{fontFamily:font,fontSize:10,color:C.muted,marginLeft:"auto"}}>{d.date}</span></div>
          {d.file?.startsWith("data:image")&&<img src={d.file} alt="" style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:10}}/>}
        </div>);})}
      </div>}

      {/* EXPORT */}
      {adminTab==="incidencias"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {incidencias.length===0&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin incidencias</div>}
        {incidencias.map(inc=>{
          const emp=employees.find(e=>e.id===inc.empId);
          const col=getAvatarColor(inc.empId);
          return(<div key={inc.id} style={{...ss.card,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={ss.avatar(col,34)}>{emp?.name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:font,fontSize:13,fontWeight:700}}>{emp?.name?.split(" ")[0]}</div>
                <div style={{fontFamily:font,fontSize:10,color:C.muted}}>{inc.dateRef} {inc.timeRef&&`· ${inc.timeRef}`}</div>
              </div>
              <div style={{fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:inc.status==="replied"?"#f0fdf4":"#fefce8",color:inc.status==="replied"?C.green:C.orange}}>{inc.status==="replied"?"RESPONDIDA":"PENDIENTE"}</div>
            </div>
            <div style={{fontFamily:font,fontSize:13,color:C.text,background:C.bg,borderRadius:8,padding:"10px 12px"}}>{inc.description}</div>
            {inc.adminReply&&<div style={{fontFamily:font,fontSize:12,color:C.accent,background:C.accent+"0d",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${C.accent}`}}>↩ {inc.adminReply}</div>}
            {!inc.adminReply&&<div style={{display:"flex",gap:6}}>
              <input placeholder="Responder..." value={replyForm[inc.id]||""} onChange={e=>setReplyForm({...replyForm,[inc.id]:e.target.value})} style={{...ss.input,flex:1,fontSize:12}}/>
              <button onClick={async()=>{const reply=replyForm[inc.id];if(!reply)return;await DB.replyIncidencia(inc.id,reply);setReplyForm({...replyForm,[inc.id]:""});flash("Respuesta enviada ✓");loadData();}} style={{background:C.accent,border:"none",color:"#fff",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontFamily:font,fontSize:12,fontWeight:700,flexShrink:0}}>Enviar</button>
            </div>}
          </div>);
        })}
      </div>}

      {adminTab==="export"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={ss.card}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Generar informe</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Desde</div><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} style={ss.input}/></div><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hasta</div><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} style={ss.input}/></div></div>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {[{l:"Esta semana",fn:()=>{const n=new Date();const d=n.getDay()||7;const m=new Date(n);m.setDate(n.getDate()-(d-1));setExportFrom(dateKey(m));setExportTo(dateKey());}},{l:"Este mes",fn:()=>{const n=new Date();setExportFrom(n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-01");setExportTo(dateKey());}},{l:"Mes pasado",fn:()=>{const n=new Date();n.setMonth(n.getMonth()-1);setExportFrom(dateKey(new Date(n.getFullYear(),n.getMonth(),1)));setExportTo(dateKey(new Date(n.getFullYear(),n.getMonth()+1,0)));}}].map(r=><button key={r.l} onClick={r.fn} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:10}}>{r.l}</button>)}
          </div>
          {/* Resumen visual de horas */}
          <div style={{marginBottom:16}}>
            <div style={ss.label}>Resumen del periodo</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
              {employees.filter(e=>e.active).map(emp=>{
                let ms=0,days=0;
                const d1=new Date(exportFrom),d2=new Date(exportTo);
                for(let d=new Date(d1);d<=d2;d.setDate(d.getDate()+1)){const w=getWorked(records,emp.id,dateKey(d));if(w>0){ms+=w;days++;}}
                if(!ms)return null;
                const col=getAvatarColor(emp.id);
                const pct=Math.min(100,ms/(8*3600000*days||1)*100);
                return(<div key={emp.id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{...ss.avatar(col,28),flexShrink:0}}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontFamily:font,fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}</span>
                      <span style={{fontFamily:font,fontSize:11,color:C.accent,fontWeight:700,flexShrink:0,marginLeft:8}}>{fmtDur(ms)}</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:3,transition:"width .3s"}}/>
                    </div>
                    <div style={{fontFamily:font,fontSize:9,color:C.muted,marginTop:2}}>{days} días · media {days?fmtDur(ms/days):"—"}</div>
                  </div>
                </div>);
              })}
            </div>
          </div>
          <button onClick={()=>{const csv=generateReport(employees,records,schedules,vacations,documents,exportFrom,exportTo);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`ARESO_${exportFrom}_${exportTo}.csv`;a.click();flash("Descargado");}} style={ss.btn(C.accent,"#000")}>📥 Descargar informe</button>
        </div>
      </div>}

      {adminTab==="guia"&&(()=>{
        const url="https://areso-app.vercel.app";
        const Step=({n,text})=><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:26,height:26,borderRadius:"50%",background:C.accent,color:"#fff",fontFamily:font,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</div><div style={{fontFamily:font,fontSize:13,color:C.text,lineHeight:1.6,paddingTop:3}}>{text}</div></div>;
        const Section=({title,color,children})=><div style={{...ss.card,borderLeft:`4px solid ${color}`}}><div style={{fontFamily:font,fontSize:14,fontWeight:700,color,marginBottom:14}}>{title}</div><div style={{display:"flex",flexDirection:"column",gap:12}}>{children}</div></div>;
        return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{...ss.card,background:`linear-gradient(135deg,${C.accent}15,${C.accent}05)`,textAlign:"center",padding:"20px 16px"}}>
            <div style={{fontSize:28,marginBottom:8}}>📱</div>
            <div style={{fontFamily:font,fontSize:16,fontWeight:700,marginBottom:6}}>Cómo instalar ARESO</div>
            <div style={{fontFamily:font,fontSize:12,color:C.muted}}>Guía para instalar la app en el móvil</div>
            <div style={{fontFamily:font,fontSize:11,color:C.accent,marginTop:8,background:C.accent+"15",borderRadius:8,padding:"6px 12px",display:"inline-block"}}>🔗 {url}</div>
          </div>

          <Section title="📱 iPhone / iPad (iOS)" color="#007AFF">
            <Step n="1" text={<>Abre <strong>Safari</strong> en tu iPhone (importante: tiene que ser Safari, no Chrome)</>}/>
            <Step n="2" text={<>Escribe o pega la dirección: <strong style={{color:C.accent}}>{url}</strong></>}/>
            <Step n="3" text={<>Espera a que cargue la app y pulsa el botón de <strong>compartir</strong> — es el icono con una flecha hacia arriba que aparece abajo en el centro de la pantalla</>}/>
            <Step n="4" text={<>Desliza hacia abajo en el menú que aparece y pulsa <strong>"Añadir a pantalla de inicio"</strong></>}/>
            <Step n="5" text={<>Pulsa <strong>"Añadir"</strong> arriba a la derecha. ¡Listo! Verás el icono de ARESO en tu pantalla de inicio</>}/>
          </Section>

          <Section title="🤖 Android (móvil Android)" color="#34A853">
            <Step n="1" text={<>Abre <strong>Google Chrome</strong> en tu móvil Android</>}/>
            <Step n="2" text={<>Copia esta dirección: <strong style={{color:C.accent}}>{url}</strong> — mantenla pulsada para copiarla</>}/>
            <Step n="3" text={<>Pégala en la barra de direcciones de Chrome (la franja larga de arriba donde pone la dirección web) y pulsa el botón de ir (flecha o "Enter")</>}/>
            <Step n="4" text={<>Cuando cargue la app, pulsa los <strong>tres puntos</strong> ⋮ que aparecen arriba a la derecha</>}/>
            <Step n="5" text={<>En el menú que aparece, pulsa <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar aplicación"</strong></>}/>
            <Step n="6" text={<>Pulsa <strong>"Añadir"</strong>. ¡Listo! Verás el icono de ARESO en tu pantalla de inicio</>}/>
            <div style={{background:"#34A85315",borderRadius:10,padding:"10px 14px",fontFamily:font,fontSize:12,color:"#34A853",borderLeft:"3px solid #34A853"}}>⚠️ <strong>Si el enlace no se te abre en Chrome:</strong> copia la dirección <strong>{url}</strong>, abre Chrome manualmente, y pégala en la barra de arriba.</div>
          </Section>

          <div style={{...ss.card,background:"#fefce8",borderLeft:`4px solid ${C.orange}`}}>
            <div style={{fontFamily:font,fontSize:13,fontWeight:700,color:C.orange,marginBottom:8}}>💡 Consejo</div>
            <div style={{fontFamily:font,fontSize:13,color:C.text,lineHeight:1.6}}>Una vez instalada, la app funciona como una aplicación normal. Búscala en tu pantalla de inicio o en el cajón de apps. No necesitas descargarla de ninguna tienda.</div>
          </div>
        </div>);
      })()}

    </div></div>);
  }

  // ═══ EMPLOYEE APP ═══
  if(view!=="app"||!user)return null;
  const lastRec=getLastRec(records,user.id);
  const nextSched=getNextSched(schedules,user.id);
  const bdays=getUpcomingBirthdays(employees);

  return(<div style={ss.page}>{CSS}{Toast}<div style={{maxWidth:720,margin:"0 auto"}}>


    {/* HORARIOS empleado */}
    {sub==="horarios"&&<HorariosEmpleado schedules={schedules} user={user} calWeekStart2={calWeekStart2} setCalWeekStart2={setCalWeekStart2} goHome={goHome}/>}

    {/* CALENDARIO EQUIPO empleado */}
    {sub==="calendario"&&(()=>{
      const year=Math.floor(calMonthView/100);const month=calMonthView%100;
      const daysInMonth=new Date(year,month+1,0).getDate();
      const prevMonth=()=>{const m=month===0?11:month-1;const y=month===0?year-1:year;setCalMonthView(y*100+m);};
      const nextMonth=()=>{const m=month===11?0:month+1;const y=month===11?year+1:year;setCalMonthView(y*100+m);};
      const MONTH_NAMES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      const activeEmps=employees.filter(e=>e.active);
      const firstDow=new Date(year,month,1).getDay();
      const startDow=firstDow===0?6:firstDow-1;
      const cells=[];
      for(let i=0;i<startDow;i++)cells.push(null);
      for(let d=1;d<=daysInMonth;d++)cells.push(d);
      const dk=(d)=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      return(<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
        <button onClick={goHome} style={ss.back}>← Menú</button>
        <div style={{fontSize:20,fontWeight:700}}>Calendario del equipo</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prevMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>←</button>
          <div style={{flex:1,textAlign:"center",fontSize:15,fontWeight:700,fontFamily:font}}>{MONTH_NAMES[month]} {year}</div>
          <button onClick={nextMonth} style={{...ss.btn(C.card,C.muted),width:36,border:`1px solid ${C.border}`,padding:"6px",flexShrink:0}}>→</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
          {["L","M","X","J","V","S","D"].map(d=><div key={d} style={{textAlign:"center",fontFamily:font,fontSize:10,color:C.muted,padding:"3px 0",fontWeight:600}}>{d}</div>)}
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(80px,1fr))",gap:3,minWidth:560}}>
            {cells.map((day,i)=>{
              if(!day)return<div key={i}/>;
              const d=dk(day);
              const today=d===dateKey();
              const isWeekend=new Date(year,month,day).getDay()===0||new Date(year,month,day).getDay()===6;
              const weekIdx=Math.floor(i/7);
              const weekDaysInRow=cells.slice(weekIdx*7,weekIdx*7+7).filter(x=>x);
              return(<div key={day} style={{background:today?C.accent+"15":isWeekend?"#f5f5ff":C.card,border:`1px solid ${today?C.accent+"55":C.border}`,borderRadius:8,padding:"4px 3px",display:"flex",flexDirection:"column",gap:1}}>
                <div style={{fontFamily:font,fontSize:11,fontWeight:today?700:500,color:today?C.accent:isWeekend?C.purple:C.text,textAlign:"center",marginBottom:3}}>{day}</div>
                {activeEmps.filter(emp=>{
                  return weekDaysInRow.some(wd=>{
                    const wdk=dk(wd);
                    const raw=schedules[emp.id+"_"+wdk];
                    const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                    const vac=vacations.find(v=>v.empId===emp.id&&v.status==="approved"&&v.start<=wdk&&v.end>=wdk);
                    return shifts.length>0||!!vac;
                  });
                }).map(emp=>{
                  const col=getAvatarColor(emp.id);
                  const raw=schedules[emp.id+"_"+d];
                  const shifts=Array.isArray(raw)?raw:raw?.start?[raw]:[];
                  const vac=vacations.find(v=>v.empId===emp.id&&v.status==="approved"&&v.start<=d&&v.end>=d);
                  const isMe=emp.id===user.id;
                  return(<div key={emp.id} style={{height:52,marginBottom:2,flexShrink:0}}>
                    {vac?<div style={{height:"100%",background:C.green+"33",borderLeft:`3px solid ${C.green}`,borderRadius:"0 4px 4px 0",padding:"3px 6px",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11}}>🏖</span>
                      <span style={{fontFamily:font,fontSize:10,color:C.green,fontWeight:700}}>{emp.name.split(" ")[0]}</span>
                    </div>:shifts.length>0?<div style={{height:"100%",background:isMe?col+"44":col+"22",borderLeft:`3px solid ${col}`,borderRadius:"0 4px 4px 0",padding:"3px 6px",display:"flex",flexDirection:"column",justifyContent:"center",boxShadow:isMe?`0 0 0 1px ${col}`:undefined}}>
                      <div style={{fontFamily:font,fontSize:10,color:col,fontWeight:isMe?800:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}{isMe?" (yo)":""}</div>
                      {shifts.map((s,si)=><div key={si} style={{fontFamily:font,fontSize:9,color:col+"dd",overflow:"hidden",whiteSpace:"nowrap"}}>{s.start}–{s.end}</div>)}
                    </div>:<div style={{height:"100%"}}/>}
                  </div>);
                })}
              </div>);
            })}
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {activeEmps.map(emp=><div key={emp.id} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:8,borderRadius:2,background:getAvatarColor(emp.id)}}/><span style={{fontFamily:font,fontSize:9,color:emp.id===user.id?C.accent:C.text,fontWeight:emp.id===user.id?700:400}}>{emp.name.split(" ")[0]}{emp.id===user.id?" (yo)":""}</span></div>)}
        </div>
      </div>);
    })()}

    {/* FICHAR */}
    {sub==="fichar"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button>
      <div style={{textAlign:"center"}}><div style={{fontFamily:font,fontSize:40,fontWeight:700,letterSpacing:-2}}>{new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div><div style={{fontFamily:font,fontSize:11,color:C.muted,marginTop:4,textTransform:"capitalize"}}>{fmtDateLong(new Date())}</div></div>
      <div style={{display:"flex",gap:10}}><div style={{...ss.card,padding:"12px 18px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.muted,letterSpacing:1}}>ESTADO</div><div style={{fontFamily:font,fontSize:15,fontWeight:700,color:myStatus==="in"?C.green:C.dim,marginTop:4}}>{myStatus==="in"?"Trabajando":"Fuera"}</div></div><div style={{...ss.card,padding:"12px 18px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.muted,letterSpacing:1}}>HOY</div><div style={{fontFamily:font,fontSize:15,fontWeight:700,color:C.accent,marginTop:4}}>{fmtDur(myWorked)}</div></div></div>
      {!photo?(<div style={{...ss.card,textAlign:"center",display:"flex",flexDirection:"column",gap:12,padding:20}}><div style={{fontFamily:font,fontSize:11,color:C.muted}}>📸 Foto al reloj para {myStatus==="out"?"entrada":"salida"}</div>{cameraOn?(<><video ref={videoRef} autoPlay playsInline muted/><button onClick={takePhoto} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>📸 Capturar</button><button onClick={stopCamera} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11}}>Cancelar</button></>):(<><button onClick={startCamera} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>📷 Abrir cámara</button><button onClick={()=>fileRef.current?.click()} style={{...ss.btn(C.cardLight,C.muted),border:`1px solid ${C.border}`}}>📁 Subir de galería</button><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/></>)}</div>):(<div style={{display:"flex",flexDirection:"column",gap:12}}><img src={photo} alt="" style={{width:"100%",borderRadius:14,border:`2px solid ${C.border}`}}/><button onClick={confirmFichaje} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>✓ Confirmar {myStatus==="out"?"entrada":"salida"}</button><button onClick={()=>setPhoto(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11,textAlign:"center"}}>Repetir foto</button></div>)}
    </div>}

    {/* VACACIONES */}
    {sub==="vacaciones"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button><div style={{fontSize:20,fontWeight:700}}>Vacaciones</div>
      <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}><div style={ss.label}>Solicitar</div><div style={{display:"flex",gap:8}}><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Desde</div><input type="date" value={vacForm.start} onChange={e=>setVacForm({...vacForm,start:e.target.value})} style={ss.input}/></div><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hasta</div><input type="date" value={vacForm.end} onChange={e=>setVacForm({...vacForm,end:e.target.value})} style={ss.input}/></div></div><input placeholder="Notas" value={vacForm.notes} onChange={e=>setVacForm({...vacForm,notes:e.target.value})} style={ss.input}/><button onClick={async()=>{if(!vacForm.start||!vacForm.end)return flash("Fechas",false);await DB.addVacation({empId:user.id,start:vacForm.start,end:vacForm.end,notes:vacForm.notes});setVacForm({start:"",end:"",notes:""});flash("Enviada");loadData();}} style={ss.btn(C.accent,"#000")}>Enviar</button></div>
      {vacations.filter(v=>v.empId===user.id).sort((a,b)=>b.id-a.id).map(v=>{const cc={pending:{bg:"#fefce8",c:C.accent},approved:{bg:"#f0fdf4",c:C.green},rejected:{bg:"#fef2f2",c:C.red}}[v.status];return(<div key={v.id} style={{...ss.card,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:font,fontSize:12}}>{fmtDate(v.start)} → {fmtDate(v.end)}</span><span style={{marginLeft:"auto",fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:cc.bg,color:cc.c}}>{v.status==="pending"?"PENDIENTE":v.status==="approved"?"APROBADA":"RECHAZADA"}</span></div>);})}
    </div>}

    {/* DOCS */}
    {sub==="docs"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button><div style={{fontSize:20,fontWeight:700}}>Documentos</div>
      <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}><select value={docForm.type} onChange={e=>setDocForm({...docForm,type:e.target.value})} style={ss.input}><option value="medical">Justificante médico</option><option value="personal">Personal</option><option value="other">Otro</option></select><input placeholder="Notas" value={docForm.notes} onChange={e=>setDocForm({...docForm,notes:e.target.value})} style={ss.input}/><button onClick={()=>docFileRef.current?.click()} style={{...ss.btn(docFile?C.green:C.cardLight,docFile?"#000":C.muted),border:docFile?"none":`1px solid ${C.border}`}}>{docFile?"✓ Archivo":"📎 Seleccionar"}</button><input ref={docFileRef} type="file" accept="image/*,.pdf" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setDocFile(ev.target.result);r.readAsDataURL(f);e.target.value="";}} style={{display:"none"}}/><button onClick={async()=>{if(!docFile)return flash("Archivo",false);await DB.addDocument({empId:user.id,type:docForm.type,file:docFile,notes:docForm.notes});setDocFile(null);setDocForm({type:"medical",notes:""});flash("Subido");loadData();}} style={ss.btn(C.accent,"#000")}>Subir</button></div>
    </div>}

    {/* COMUNICADOS (employee view) */}
    {sub==="comunicados"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:12}}><button onClick={goHome} style={ss.back}>← Menú</button><div style={{fontSize:20,fontWeight:700}}>Comunicados</div>
      {announcements.map(a=>{
        const isRead=a.readBy?.includes(user.id);
        return(<div key={a.id} style={{...ss.card,borderColor:isRead?C.border:C.orange}} onClick={async()=>{if(!isRead){await DB.markAnnouncementRead(a.id,user.id);setAnnouncements(announcements.map(x=>x.id===a.id?{...x,readBy:[...(x.readBy||[]),user.id]}:x));}}}> 
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>{!isRead&&<div style={{width:8,height:8,borderRadius:"50%",background:C.orange}}/>}<div style={{fontSize:15,fontWeight:700,flex:1}}>{a.title}</div><span style={{fontFamily:font,fontSize:10,color:C.muted}}>{fmtDate(a.date)}</span></div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{a.body}</div>
        </div>);
      })}
      {!announcements.length&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin comunicados</div>}
    </div>}

    {/* BUZÓN DE INCIDENCIAS empleado */}
    {sub==="buzon"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
      <button onClick={goHome} style={ss.back}>← Menú</button>
      <div style={{fontSize:20,fontWeight:700}}>Buzón de incidencias</div>
      <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}>
        <div style={ss.label}>Nueva incidencia</div>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Fecha</div><input type="date" value={incForm.dateRef} onChange={e=>setIncForm({...incForm,dateRef:e.target.value})} style={ss.input}/></div>
          <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hora (opcional)</div><input type="time" value={incForm.timeRef} onChange={e=>setIncForm({...incForm,timeRef:e.target.value})} style={ss.input}/></div>
        </div>
        <textarea placeholder="Describe el problema... (ej: me olvidé fichar la entrada a las 9:00)" value={incForm.description} onChange={e=>setIncForm({...incForm,description:e.target.value})} style={ss.textarea}/>
        <button onClick={async()=>{
          if(!incForm.dateRef||!incForm.description)return flash("Rellena la fecha y descripción",false);
          await DB.addIncidencia({empId:user.id,dateRef:incForm.dateRef,timeRef:incForm.timeRef,description:incForm.description});
          setIncForm({dateRef:"",timeRef:"",description:""});
          flash("Incidencia enviada ✓");loadData();
        }} style={ss.btn(C.accent,"#fff")}>📬 Enviar incidencia</button>
      </div>
      {incidencias.filter(i=>i.empId===user.id).map(inc=><div key={inc.id} style={{...ss.card,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:font,fontSize:12,fontWeight:700}}>{inc.dateRef}{inc.timeRef&&` · ${inc.timeRef}`}</div>
            <div style={{fontFamily:font,fontSize:10,color:C.muted}}>{new Date(inc.createdAt).toLocaleDateString("es-ES")}</div>
          </div>
          <div style={{fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:inc.status==="replied"?"#f0fdf4":"#fefce8",color:inc.status==="replied"?C.green:C.orange}}>{inc.status==="replied"?"RESPONDIDA":"PENDIENTE"}</div>
        </div>
        <div style={{fontFamily:font,fontSize:13,color:C.text,background:C.bg,borderRadius:8,padding:"10px 12px"}}>{inc.description}</div>
        {inc.adminReply&&<div style={{fontFamily:font,fontSize:12,color:C.accent,background:C.accent+"0d",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${C.accent}`}}>↩ Admin: {inc.adminReply}</div>}
      </div>)}
      {incidencias.filter(i=>i.empId===user.id).length===0&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin incidencias enviadas</div>}
    </div>}

    {/* MIS FICHAJES empleado */}
    {sub==="misfichajes"&&(()=>{
      const myClockIns=Object.values(records).flat().filter(r=>r.empId===user.id).sort((a,b)=>a.time-b.time);
      const now=new Date();
      // Weekly hours
      const weekStart=new Date(now);const wd=weekStart.getDay()||7;weekStart.setDate(weekStart.getDate()-(wd-1));weekStart.setHours(0,0,0,0);
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
      let weekMs=0,monthMs=0;
      const dayKeys=[...new Set(myClockIns.map(r=>dateKey(new Date(r.time))))];
      dayKeys.forEach(dk=>{
        const w=getWorked(records,user.id,dk);
        const d=new Date(dk);
        if(d>=weekStart)weekMs+=w;
        if(d>=monthStart)monthMs+=w;
      });
      // Group by date
      const byDate={};myClockIns.forEach(r=>{const dk=dateKey(new Date(r.time));if(!byDate[dk])byDate[dk]=[];byDate[dk].push(r);});
      return(<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={goHome} style={ss.back}>← Menú</button>
        <div style={{fontSize:20,fontWeight:700}}>Mis fichajes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{...ss.card,textAlign:"center",padding:"16px 10px"}}>
            <div style={{fontFamily:font,fontSize:11,color:C.muted,marginBottom:6}}>ESTA SEMANA</div>
            <div style={{fontFamily:font,fontSize:22,fontWeight:700,color:C.accent}}>{fmtDur(weekMs)}</div>
          </div>
          <div style={{...ss.card,textAlign:"center",padding:"16px 10px"}}>
            <div style={{fontFamily:font,fontSize:11,color:C.muted,marginBottom:6}}>ESTE MES</div>
            <div style={{fontFamily:font,fontSize:22,fontWeight:700,color:C.green}}>{fmtDur(monthMs)}</div>
          </div>
        </div>
        {Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).map(dk=>{
          const recs=byDate[dk].sort((a,b)=>a.time-b.time);
          const worked=getWorked(records,user.id,dk);
          return(<div key={dk} style={ss.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontFamily:font,fontSize:13,fontWeight:700,textTransform:"capitalize"}}>{fmtDateLong(new Date(dk))}</div>
              {worked>0&&<div style={{fontFamily:font,fontSize:12,fontWeight:700,color:C.accent}}>{fmtDur(worked)}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {recs.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:8,background:r.type==="in"?C.green+"0d":C.red+"0d"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:r.type==="in"?C.green:C.red,flexShrink:0}}/>
                <div style={{fontFamily:font,fontSize:13,fontWeight:600,color:r.type==="in"?C.green:C.red}}>{r.type==="in"?"Entrada":"Salida"}</div>
                <div style={{fontFamily:font,fontSize:13,color:C.text,marginLeft:"auto"}}>{fmtTime(r.time)}</div>
              </div>)}
            </div>
          </div>);
        })}
        {Object.keys(byDate).length===0&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin fichajes registrados</div>}
      </div>);
    })()}

    {/* GUÍA DE INSTALACIÓN empleado */}
    {sub==="guia"&&(()=>{
      const url="https://areso-app.vercel.app";
      const Step=({n,text})=><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:26,height:26,borderRadius:"50%",background:C.accent,color:"#fff",fontFamily:font,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</div><div style={{fontFamily:font,fontSize:13,color:C.text,lineHeight:1.6,paddingTop:3}}>{text}</div></div>;
      return(<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={goHome} style={ss.back}>← Menú</button>
        <div style={{fontSize:20,fontWeight:700}}>📱 Instalar ARESO</div>
        <div style={{...ss.card,background:`linear-gradient(135deg,${C.accent}15,${C.accent}05)`,textAlign:"center"}}>
          <div style={{fontFamily:font,fontSize:13,color:C.muted,marginBottom:6}}>Dirección de la app</div>
          <div style={{fontFamily:font,fontSize:14,fontWeight:700,color:C.accent}}>{url}</div>
        </div>
        <div style={{...ss.card,borderLeft:"4px solid #007AFF"}}>
          <div style={{fontFamily:font,fontSize:14,fontWeight:700,color:"#007AFF",marginBottom:14}}>📱 iPhone (iOS)</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Step n="1" text={<>Abre <strong>Safari</strong> (el navegador con el icono de brújula, NO uses Chrome)</>}/>
            <Step n="2" text={<>Escribe en la barra de arriba: <strong style={{color:C.accent}}>{url}</strong></>}/>
            <Step n="3" text={<>Pulsa el botón de <strong>compartir</strong> — la flecha hacia arriba en el centro abajo</>}/>
            <Step n="4" text={<>Desliza y pulsa <strong>"Añadir a pantalla de inicio"</strong></>}/>
            <Step n="5" text={<>Pulsa <strong>"Añadir"</strong>. ¡Ya está en tu pantalla de inicio!</>}/>
          </div>
        </div>
        <div style={{...ss.card,borderLeft:"4px solid #34A853"}}>
          <div style={{fontFamily:font,fontSize:14,fontWeight:700,color:"#34A853",marginBottom:14}}>🤖 Android</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Step n="1" text={<>Abre <strong>Chrome</strong> (el círculo de colores)</>}/>
            <Step n="2" text={<>Pulsa la barra de arriba, borra lo que pone y escribe: <strong style={{color:C.accent}}>{url}</strong></>}/>
            <Step n="3" text="Pulsa los tres puntos ⋮ arriba a la derecha"/>
            <Step n="4" text={<>Pulsa <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar"</strong></>}/>
            <Step n="5" text={<>Pulsa <strong>"Añadir"</strong>. ¡Ya está!</>}/>
            <div style={{background:"#34A85315",borderRadius:10,padding:"10px 14px",fontFamily:font,fontSize:12,color:"#34A853",borderLeft:"3px solid #34A853"}}>⚠️ Si el enlace no abre Chrome: copia <strong>{url}</strong>, abre Chrome y pégalo arriba.</div>
          </div>
        </div>
        <div style={{...ss.card,background:"#fefce8",borderLeft:`4px solid ${C.orange}`}}>
          <div style={{fontFamily:font,fontSize:13,fontWeight:700,color:C.orange,marginBottom:6}}>💡 Una vez instalada</div>
          <div style={{fontFamily:font,fontSize:13,color:C.text,lineHeight:1.6}}>La app aparece en tu pantalla de inicio como cualquier otra. No necesitas descargarla de ninguna tienda.</div>
        </div>
      </div>);
    })()}

    {/* ─── MENU ─── */}
    {!sub&&page==="menu"&&<>
      <div style={ss.header}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:44,height:44,borderRadius:"50%",background:"#ffffff33",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,fontSize:16,fontWeight:700,color:"#fff"}}>{user.name.charAt(0)}</div><div><div style={{fontFamily:font,fontSize:10,color:"#ffffffaa",letterSpacing:1}}>Bienvenid@</div><div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{user.name.toUpperCase()}</div></div></div></div>
      <div style={{padding:"0 16px 80px",display:"flex",flexDirection:"column",gap:10}}>
        {/* Status cards */}
        <div style={ss.statusCard}><div style={{width:4,height:40,borderRadius:2,background:myStatus==="in"?C.green:C.accent,flexShrink:0}}/><div><div style={{fontWeight:600,fontSize:14}}>{myStatus==="in"?"Jornada en curso":"Jornada finalizada"}</div><div style={{fontFamily:font,fontSize:11,color:C.muted}}>{lastRec?`${fmtTime(lastRec.time)} · ${fmtDateLong(new Date())}`:"Sin fichajes hoy"}</div></div>{myWorked>0&&<div style={{marginLeft:"auto",fontFamily:font,fontSize:13,fontWeight:700,color:C.accent}}>{fmtDur(myWorked)}</div>}</div>
        {nextSched&&<div style={ss.statusCard}><div style={{width:4,height:40,borderRadius:2,background:C.blue,flexShrink:0}}/><div><div style={{fontWeight:600,fontSize:14}}>Próximo turno</div><div style={{fontFamily:font,fontSize:11,color:C.muted}}>{nextSched.isToday?"Hoy":nextSched.day}</div></div><div style={{marginLeft:"auto",fontFamily:font,fontSize:13,fontWeight:600,color:C.blue}}>{nextSched.start}-{nextSched.end}</div></div>}

        {/* Who's in mini */}
        {employees.filter(e=>e.active&&getStatus(records,e.id)==="in").length>0&&<div style={ss.card}>
          <div style={{fontFamily:font,fontSize:10,color:C.green,letterSpacing:1,marginBottom:10}}>🟢 WHO'S IN</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {employees.filter(e=>e.active&&getStatus(records,e.id)==="in").map(emp=><div key={emp.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,width:50}}>
              <div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div>
              <div style={{fontFamily:font,fontSize:8,color:C.text,textAlign:"center"}}>{emp.name.split(" ")[0]}</div>
            </div>)}
          </div>
        </div>}

        {/* Birthdays */}
        {bdays.length>0&&<div style={ss.card}>
          <div style={{fontFamily:font,fontSize:10,color:"#ec4899",letterSpacing:1,marginBottom:10}}>🎂 CUMPLEAÑOS</div>
          <div style={{display:"flex",gap:14,overflowX:"auto"}}>
            {bdays.slice(0,5).map(emp=><div key={emp.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:55}}>
              <div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div>
              <div style={{fontFamily:font,fontSize:8,color:C.text}}>{emp.name.split(" ")[0]}</div>
              <div style={{fontFamily:font,fontSize:8,color:emp.daysUntil===0?"#ec4899":C.muted}}>{emp.daysUntil===0?"¡Hoy!":emp.dateStr}</div>
            </div>)}
          </div>
        </div>}

        {/* Modules */}
        <div style={ss.secTitle}>Jornada</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("fichar")}>{Ic.clock}<span style={{fontSize:14,fontWeight:600}}>Fichar</span></div>
          <div style={ss.moduleCard} onClick={()=>setSub("horarios")}>{Ic.cal}<span style={{fontSize:14,fontWeight:600}}>Horarios</span></div>
          <div style={{...ss.moduleCard,gridColumn:"span 2"}} onClick={()=>setSub("calendario")}>{Ic.live}<span style={{fontSize:14,fontWeight:600}}>Calendario del equipo</span></div>
        </div>
        <div style={ss.secTitle}>Comunicación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("comunicados")}>{Ic.megaphone}<span style={{fontSize:14,fontWeight:600}}>Comunicados</span>{unreadAnns>0&&<div style={ss.badge(C.orange,"#fff")}>{unreadAnns}</div>}</div>
          <div style={ss.moduleCard} onClick={()=>setSub("buzon")}>{Ic.mail}<span style={{fontSize:14,fontWeight:600}}>Buzón de incidencias</span>{incidencias.filter(i=>i.empId===user.id&&i.adminReply&&i.status==="replied").length>0&&<div style={ss.badge(C.accent,"#fff")}>{incidencias.filter(i=>i.empId===user.id&&i.adminReply&&i.status==="replied").length}</div>}</div>
        </div>
        <div style={ss.secTitle}>Mi actividad</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("misfichajes")}>{Ic.clock}<span style={{fontSize:14,fontWeight:600}}>Mis fichajes</span></div>
        </div>
        <div style={ss.secTitle}>Solicitudes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("vacaciones")}>{Ic.vac}<span style={{fontSize:14,fontWeight:600}}>Vacaciones</span></div>
          <div style={ss.moduleCard} onClick={()=>setSub("docs")}>{Ic.doc}<span style={{fontSize:14,fontWeight:600}}>Documentos</span></div>
        </div>
        <div style={ss.secTitle}>Ayuda</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("guia")}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg><span style={{fontSize:14,fontWeight:600}}>Guía de instalación</span></div>
        </div>
      </div>
    </>}

    {/* PROFILE */}
    {!sub&&page==="profile"&&<>
      <div style={{background:`linear-gradient(135deg,#2d5be3,#1e40af)`,padding:"40px 20px 30px",borderRadius:"0 0 24px 24px",textAlign:"center"}}><div style={{width:72,height:72,borderRadius:"50%",background:"#ffffff33",border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontFamily:font,fontSize:28,fontWeight:700,color:"#fff"}}>{user.name[0]}</div><div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{user.name.toUpperCase()}</div><div style={{fontFamily:font,fontSize:11,color:"#ffffffaa",marginTop:4}}>{user.position||"Empleado"}</div></div>
      <div style={{padding:"20px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={ss.card}><div style={{fontWeight:600,fontSize:14,color:C.accent,marginBottom:14}}>Datos Personales</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Email</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.email}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Puesto</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.position||"—"}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Teléfono</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.phone||"—"}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Cumpleaños</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.birthday||"—"}</div></div></div></div>
        <div style={ss.card}><div style={{fontWeight:600,fontSize:14,color:C.accent,marginBottom:14}}>Resumen</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Horas hoy</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.accent}}>{fmtDur(myWorked)}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Fichajes</div><div style={{fontFamily:font,fontSize:16,fontWeight:700}}>{(records[dateKey()]||[]).filter(r=>r.empId===user.id).length}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Vacaciones</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.green}}>{vacations.filter(v=>v.empId===user.id&&v.status==="approved").length}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Documentos</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.purple}}>{documents.filter(d=>d.empId===user.id).length}</div></div></div></div>
        {/* PIN change */}
        <div style={ss.card}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showPinChange?14:0}}>
            <div style={{fontWeight:600,fontSize:14,color:C.accent}}>🔑 Cambiar PIN</div>
            <button onClick={()=>{setShowPinChange(!showPinChange);setPinForm({current:"",newPin:"",confirm:""}); }} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:font,fontSize:11,color:C.muted}}>{showPinChange?"Cancelar":"Cambiar"}</button>
          </div>
          {showPinChange&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input type="password" placeholder="PIN actual" value={pinForm.current} onChange={e=>setPinForm({...pinForm,current:e.target.value})} style={ss.input}/>
            <input type="password" placeholder="Nuevo PIN" value={pinForm.newPin} onChange={e=>setPinForm({...pinForm,newPin:e.target.value})} style={ss.input}/>
            <input type="password" placeholder="Confirmar nuevo PIN" value={pinForm.confirm} onChange={e=>setPinForm({...pinForm,confirm:e.target.value})} style={ss.input}/>
            <button onClick={async()=>{
              if(pinForm.current!==user.pin)return flash("PIN actual incorrecto",false);
              if(!pinForm.newPin)return flash("El nuevo PIN no puede estar vacío",false);
              if(pinForm.newPin!==pinForm.confirm)return flash("Los PINs no coinciden",false);
              await DB.updatePin(user.id,pinForm.newPin);
              setUser({...user,pin:pinForm.newPin});
              setEmployees(employees.map(e=>e.id===user.id?{...e,pin:pinForm.newPin}:e));
              setShowPinChange(false);setPinForm({current:"",newPin:"",confirm:""});
              flash("PIN actualizado ✓");
            }} style={ss.btn(C.accent,"#fff")}>Guardar nuevo PIN</button>
          </div>}
        </div>
      </div>
    </>}

  </div>
  <div style={ss.bottomNav}>
    <button style={ss.navBtn(page==="menu"&&!sub)} onClick={goHome}>{Ic.home}<span>Menú</span></button>
    <button style={ss.navBtn(page==="profile"&&!sub)} onClick={()=>{setPage("profile");setSub(null);stopCamera();setPhoto(null);}}>{Ic.person}<span>Perfil</span></button>
    <button style={{...ss.navBtn(false),color:C.red}} onClick={()=>{setUser(null);setView("login");stopCamera();setPhoto(null);}}>{Ic.logout}<span>Salir</span></button>
  </div>
  </div>);
}