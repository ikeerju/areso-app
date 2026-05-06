import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uyodcfxggvojltmsugyq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5b2RjZnhnZ3Zvamx0bXN1Z3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTI0MzUsImV4cCI6MjA5MjI2ODQzNX0.5uh7JQKLpRvEVmTfxmQWHpdJQndLNvdFkloA4-N7OXA';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
  async getEmployees() { const {data}=await sb.from('areso_employees').select('*').order('created_at'); return (data||[]).map(e=>({id:e.id,name:e.name,email:e.email,pin:e.password,position:e.position,phone:e.phone,birthday:e.birthday,role:e.role,active:e.active,sickLeave:e.sick_leave||false,photo:e.photo||null,created:e.created_at})); },
  async addEmployee(emp) { const {data}=await sb.from('areso_employees').insert({name:emp.name,email:emp.email,password:emp.pin,position:emp.position,phone:emp.phone,birthday:emp.birthday||null,role:emp.role||'employee',active:true}).select().single(); return data?{id:data.id,name:data.name,email:data.email,pin:data.password,position:data.position,phone:data.phone,birthday:data.birthday,role:data.role,active:data.active,photo:data.photo||null,created:data.created_at}:null; },
  async updateEmployee(id,fields) { const dbFields={}; if('active' in fields)dbFields.active=fields.active; if('role' in fields)dbFields.role=fields.role; if('sick_leave' in fields)dbFields.sick_leave=fields.sick_leave; if('name' in fields)dbFields.name=fields.name; if('position' in fields)dbFields.position=fields.position; if('phone' in fields)dbFields.phone=fields.phone; if('email' in fields)dbFields.email=fields.email; if('pin' in fields)dbFields.password=fields.pin; if('birthday' in fields)dbFields.birthday=fields.birthday; await sb.from('areso_employees').update(dbFields).eq('id',id); },
  async getClockIns(dateFrom,dateTo) { const {data}=await sb.from('areso_clockins').select('*').gte('time',dateFrom).lte('time',dateTo+'T23:59:59').order('time'); return (data||[]).map(r=>({id:r.id,empId:r.employee_id,type:r.type,time:new Date(r.time).getTime(),photo:r.photo_url})); },
  async getAllClockIns() { const {data}=await sb.from('areso_clockins').select('*').order('time'); return (data||[]).map(r=>({id:r.id,empId:r.employee_id,type:r.type,time:new Date(r.time).getTime(),photo:r.photo_url})); },
  async addClockIn(rec) { await sb.from('areso_clockins').insert({employee_id:rec.empId,type:rec.type,time:new Date(rec.time).toISOString(),photo_url:rec.photo||null}); },
  async deleteClockIn(id) { await sb.from('areso_clockins').delete().eq('id',id); },
  async updateClockIn(id,time) { await sb.from('areso_clockins').update({time:new Date(time).toISOString()}).eq('id',id); },
  async getSchedules() { const {data}=await sb.from('areso_schedules').select('*'); const scheds={};(data||[]).forEach(s=>{scheds[s.employee_id+"_"+s.date_key]={id:s.id,empId:s.employee_id,start:s.start_time,end:s.end_time};});return scheds; },
  async setSchedule(empId,dateKey,start,end) { const {data:existing}=await sb.from('areso_schedules').select('id').eq('employee_id',empId).eq('date_key',dateKey); if(existing&&existing.length>0){await sb.from('areso_schedules').update({start_time:start,end_time:end}).eq('id',existing[0].id);}else{await sb.from('areso_schedules').insert({employee_id:empId,date_key:dateKey,start_time:start,end_time:end});} },
  async deleteSchedule(empId,dateKey) { await sb.from('areso_schedules').delete().eq('employee_id',empId).eq('date_key',dateKey); },
  async getVacations() { const {data}=await sb.from('areso_vacations').select('*').order('id',{ascending:false}); return (data||[]).map(v=>({id:v.id,empId:v.employee_id,start:v.start_date,end:v.end_date,status:v.status,notes:v.notes})); },
  async addVacation(vac) { await sb.from('areso_vacations').insert({employee_id:vac.empId,start_date:vac.start,end_date:vac.end,status:'pending',notes:vac.notes}); },
  async updateVacation(id,status) { await sb.from('areso_vacations').update({status}).eq('id',id); },
  async getDocuments() { const {data}=await sb.from('areso_documents').select('*').order('id',{ascending:false}); return (data||[]).map(d=>({id:d.id,empId:d.employee_id,type:d.type,file:d.file_url,notes:d.notes,date:d.date})); },
  async addDocument(doc) { await sb.from('areso_documents').insert({employee_id:doc.empId,type:doc.type,file_url:doc.file,notes:doc.notes}); },
  async getAnnouncements() { const {data}=await sb.from('areso_announcements').select('*').order('date',{ascending:false}); return (data||[]).map(a=>({id:a.id,title:a.title,body:a.body,date:new Date(a.date).getTime(),readBy:a.read_by||[]})); },
  async addAnnouncement(ann) { await sb.from('areso_announcements').insert({title:ann.title,body:ann.body}); },
  async deleteAnnouncement(id) { await sb.from('areso_announcements').delete().eq('id',id); },
  async deleteEmployee(id) { await sb.rpc('delete_employee_cascade', {emp_id: id}); },
  async markAnnouncementRead(id,userId) { const {data}=await sb.from('areso_announcements').select('read_by').eq('id',id).single(); const readBy=[...(data?.read_by||[]),userId]; await sb.from('areso_announcements').update({read_by:readBy}).eq('id',id); },
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
const getNextSched=(scheds,eid)=>{const now=new Date();for(let i=0;i<14;i++){const d=new Date(now);d.setDate(d.getDate()+i);const key=eid+"_"+dateKey(d);const s=scheds[key];if(s)return{day:DAYS[(d.getDay()+6)%7],start:s.start,end:s.end,isToday:i===0};}return null;};

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

const CSS=<style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}video{border-radius:12px;width:100%}body{background:${C.bg}}::selection{background:${C.accent}22;color:${C.accent}}.profile-card:hover{transform:translateY(-3px) scale(1.03);}.profile-card:active{transform:scale(0.97);}`}</style>;

function generateReport(employees,records,schedules,vacations,f,t){
  // Build data per employee for the period
  const d1=new Date(f),d2=new Date(t);
  const empData=employees.filter(e=>e.active).map(emp=>{
    let totalMs=0,days=0;
    const dailyRows=[];
    for(let d=new Date(d1);d<=d2;d.setDate(d.getDate()+1)){
      const dk=dateKey(d);
      const dayMs=getWorked(records,emp.id,dk);
      const dayRecs=(records[dk]||[]).filter(r=>r.empId===emp.id).sort((a,b)=>a.time-b.time);
      if(dayMs>0||dayRecs.length>0){
        totalMs+=dayMs; days++;
        // find first in and last out
        const firstIn=dayRecs.find(r=>r.type==="in");
        const lastOut=[...dayRecs].reverse().find(r=>r.type==="out");
        dailyRows.push({date:dk,entrada:firstIn?fmtTime(firstIn.time):"—",salida:lastOut?fmtTime(lastOut.time):"—",horas:fmtDur(dayMs)});
      }
    }
    return{emp,totalMs,days,media:days?totalMs/days:0,dailyRows};
  }).filter(x=>x.totalMs>0||x.dailyRows.length>0);

  // CSV with clear sections
  let csv="﻿";
  csv+="INFORME ARESO
";
  csv+="Período:,"+f+" → "+t+"
";
  csv+="Generado:,"+new Date().toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+"

";

  // Section 1: Summary
  csv+="=== RESUMEN POR TRABAJADOR ===
";
  csv+="Trabajador,Puesto,Estado,Días trabajados,Horas totales,Media diaria
";
  empData.forEach(({emp,totalMs,days,media})=>{
    const estado=emp.sickLeave?"DE BAJA":"Activo";
    csv+=`"${emp.name}","${emp.position||"—"}",${estado},${days},${fmtDur(totalMs)},${days?fmtDur(media):"—"}
`;
  });

  // Section 2: Daily detail per employee
  csv+="
=== DETALLE DIARIO POR TRABAJADOR ===
";
  empData.forEach(({emp,totalMs,days,dailyRows})=>{
    csv+=`
${emp.name} — ${emp.position||""}
`;
    csv+="Fecha,Día,Entrada,Salida,Horas
";
    dailyRows.forEach(row=>{
      const d=new Date(row.date);
      const dayName=DAYS[(d.getDay()+6)%7];
      csv+=`${row.date},${dayName},${row.entrada},${row.salida},${row.horas}
`;
    });
    csv+=`,,,,TOTAL: ${fmtDur(totalMs)} (${days} días — media ${days?fmtDur(totalMs/days):"—"})
`;
  });

  // Section 3: Vacations
  const vacs=vacations.filter(v=>v.start<=t&&v.end>=f);
  if(vacs.length){
    csv+="
=== VACACIONES ===
";
    csv+="Trabajador,Desde,Hasta,Estado
";
    vacs.forEach(v=>{
      const emp=employees.find(e=>e.id===v.empId);
      const estado=v.status==="approved"?"Aprobada":v.status==="pending"?"Pendiente":"Rechazada";
      csv+=`"${emp?.name||"?"}",${v.start},${v.end},${estado}
`;
    });
  }

  return csv;
}

// ─── PIN KEYPAD ───────────────────────────────────────────────
function PinKeypad({ value, onChange, onConfirm, onClose, error, name, color, photo }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const handleKey = (k) => {
    if (k === "⌫") { onChange(value.slice(0,-1)); }
    else if (k !== "" && value.length < 4) {
      const next = value + k;
      onChange(next);
      if (next.length === 4) setTimeout(() => onConfirm(next), 120);
    }
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(10,12,26,0.82)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .2s ease"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#0f1120",borderRadius:"24px 24px 0 0",padding:"24px 24px 44px",width:"100%",maxWidth:400,border:"1px solid rgba(255,255,255,.12)",animation:"slideUp .28s cubic-bezier(.22,1,.36,1)"}}>
        {/* Avatar + nombre */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:color+"33",border:`2.5px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontSize:photo?0:22,fontWeight:700,color,fontFamily:font,overflow:"hidden"}}>
            {photo ? <img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : name[0]}
          </div>
          <div style={{fontFamily:font,fontSize:16,fontWeight:700,color:"#fff"}}>{name}</div>
        </div>
        {/* Puntos */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:8}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:11,height:11,borderRadius:"50%",background:i<value.length?(error?"#dc2626":C.accent):"rgba(255,255,255,.18)",transition:"all .12s",transform:i<value.length?"scale(1.25)":"scale(1)"}}/>
          ))}
        </div>
        <div style={{textAlign:"center",fontFamily:font,fontSize:12,color:"#dc2626",height:18,marginBottom:8}}>{error?"PIN incorrecto":""}</div>
        {/* Teclado */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {keys.map((k,i)=>(
            <button key={i} onClick={()=>handleKey(k)} style={{height:56,borderRadius:14,background:k==="⌫"?"rgba(255,255,255,.08)":k===""?"transparent":"rgba(255,255,255,.06)",border:k===""?"none":"1px solid rgba(255,255,255,.12)",color:k==="⌫"?"rgba(255,255,255,.6)":"#fff",fontSize:k==="⌫"?18:22,fontFamily:font,fontWeight:600,cursor:k===""?"default":"pointer",pointerEvents:k===""?"none":"auto",transition:"background .1s"}}
              onMouseDown={e=>{if(k!=="")e.currentTarget.style.background=C.accent+"55";}}
              onMouseUp={e=>{e.currentTarget.style.background=k==="⌫"?"rgba(255,255,255,.08)":"rgba(255,255,255,.06)";}}
            >{k}</button>
          ))}
        </div>
        <button onClick={()=>onConfirm(value)} style={{width:"100%",marginTop:14,height:52,borderRadius:14,background:value.length>0?C.accent:"rgba(255,255,255,.12)",border:"none",color:value.length>0?"#fff":"rgba(255,255,255,.3)",fontFamily:font,fontSize:15,fontWeight:700,cursor:value.length>0?"pointer":"default",transition:"all .2s"}}>
          Entrar
        </button>
        <button onClick={onClose} style={{width:"100%",marginTop:8,height:36,borderRadius:10,background:"transparent",border:"none",color:"rgba(255,255,255,.3)",fontFamily:font,fontSize:12,cursor:"pointer"}}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE SELECTOR ─────────────────────────────────────────
function ProfileSelector({ employees, onLogin, onAdminLogin, loading }) {
  const [selected, setSelected] = useState(null);
  const [pinVal, setPinVal] = useState("");
  const [pinErr, setPinErr] = useState(false);

  const activeEmps = employees.filter(e => e.active);

  const handleSelect = (profile) => {
    setSelected(profile);
    setPinVal("");
    setPinErr(false);
  };

  const handleConfirm = (overridePin) => {
    const pin = overridePin !== undefined ? overridePin : pinVal;
    if (!selected) return;
    if (selected.isAdmin) {
      if (pin === ADMIN_PIN) { onAdminLogin(); }
      else { setPinErr(true); setPinVal(""); setTimeout(()=>setPinErr(false),900); }
    } else {
      if (pin === selected.pin) { onLogin(selected); }
      else { setPinErr(true); setPinVal(""); setTimeout(()=>setPinErr(false),900); }
    }
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font}}>
      {CSS}
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:font,fontSize:13,color:C.accent,letterSpacing:5,marginBottom:12}}>ARESO</div>
        <div style={{fontFamily:font,fontSize:13,color:C.muted}}>Cargando...</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:fontBody,paddingBottom:40}}>
      {CSS}
      {/* Header */}
      <div style={{padding:"48px 24px 28px",textAlign:"center"}}>
        <div style={{fontFamily:font,fontSize:10,letterSpacing:6,color:C.accent,marginBottom:10}}>ARESO</div>
        <div style={{fontSize:24,fontWeight:700}}>¿Quién eres?</div>
        <div style={{fontFamily:font,fontSize:12,color:C.muted,marginTop:6}}>Selecciona tu perfil para continuar</div>
      </div>

      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(96px,1fr))",gap:12,padding:"0 18px",maxWidth:480,margin:"0 auto"}}>
        {activeEmps.map(emp => {
          const color = getAvatarColor(emp.id);
          return (
            <div key={emp.id} className="profile-card" onClick={()=>handleSelect(emp)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:9,cursor:"pointer",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"16px 8px",transition:"transform .2s, background .15s",boxShadow:"0 1px 3px #0001"}}>
              <div style={{width:54,height:54,borderRadius:"50%",background:color+"33",border:`2.5px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:emp.photo?0:20,fontWeight:700,color,overflow:"hidden",flexShrink:0}}>
                {emp.photo ? <img src={emp.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <div style={{fontFamily:font,fontSize:11,fontWeight:600,color:C.text,textAlign:"center",lineHeight:1.3,wordBreak:"break-word"}}>{emp.name}</div>
              {emp.position && <div style={{fontFamily:font,fontSize:9,color:C.muted,textAlign:"center"}}>{emp.position}</div>}
            </div>
          );
        })}
        {/* Admin tile */}
        <div className="profile-card" onClick={()=>handleSelect({isAdmin:true,name:"Admin"})}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:9,cursor:"pointer",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"16px 8px",transition:"transform .2s, background .15s",boxShadow:"0 1px 3px #0001"}}>
          <div style={{width:54,height:54,borderRadius:"50%",background:"#7c3aed33",border:"2.5px solid #7c3aed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔒</div>
          <div style={{fontFamily:font,fontSize:12,fontWeight:600,color:C.text}}>Admin</div>
          <div style={{fontFamily:font,fontSize:9,color:C.muted}}>Administrador</div>
        </div>
      </div>

      {/* PIN Modal */}
      {selected && (
        <PinKeypad
          value={pinVal}
          onChange={setPinVal}
          onConfirm={handleConfirm}
          onClose={()=>setSelected(null)}
          error={pinErr}
          name={selected.name}
          color={selected.isAdmin ? "#7c3aed" : getAvatarColor(selected.id)}
          photo={selected.photo||null}
        />
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  const [employees,setEmployees]=useState([]);
  const [records,setRecords]=useState({});
  const [schedules,setSchedules]=useState({});
  const [vacations,setVacations]=useState([]);
  const [documents,setDocuments]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
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

  const [adminTab,setAdminTab]=useState("live");
  const [editEmp,setEditEmp]=useState(null);
  const [editEmpForm,setEditEmpForm]=useState({});
  const [addManual,setAddManual]=useState(false);
  const [manualForm,setManualForm]=useState({empId:'',type:'in',time:''});
  const [filterDate,setFilterDate]=useState(dateKey());
  const [editRecId,setEditRecId]=useState(null);
  const [editTimeVal,setEditTimeVal]=useState("");
  const [exportFrom,setExportFrom]=useState(()=>{const d=new Date();d.setDate(1);return dateKey(d);});
  const [exportTo,setExportTo]=useState(dateKey());

  const [editSched,setEditSched]=useState(null);
  const [calWeekStart,setCalWeekStart]=useState(()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));return dateKey(n);});
  const [calWeekStart2,setCalWeekStart2]=useState(()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));return dateKey(n);});
  const [addShift,setAddShift]=useState(null);
  const [shiftForm,setShiftForm]=useState({start:"09:00",end:"17:00"});
  const [calMonthView,setCalMonthView]=useState(()=>{const n=new Date();return n.getFullYear()*100+n.getMonth();});
  const [vacForm,setVacForm]=useState({start:"",end:"",notes:""});
  const [docForm,setDocForm]=useState({type:"medical",notes:""});
  const [docFile,setDocFile]=useState(null);
  const [annForm,setAnnForm]=useState({title:"",body:""});

  const loadData=useCallback(async()=>{
    try{
      const [emps,scheds,vacs,docs,anns,clockins]=await Promise.all([
        DB.getEmployees(),DB.getSchedules(),DB.getVacations(),DB.getDocuments(),DB.getAnnouncements(),DB.getAllClockIns()
      ]);
      setEmployees(emps);
      setSchedules(scheds);
      setVacations(vacs);
      setDocuments(docs);
      setAnnouncements(anns);
      const recs={};clockins.forEach(r=>{const dk=dateKey(new Date(r.time));if(!recs[dk])recs[dk]=[];recs[dk].push(r);});
      setRecords(recs);
    }catch(e){console.error("Error loading data:",e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(()=>{tick(x=>x+1);loadData();},30000);return()=>clearInterval(t);},[loadData]);

  const flash=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),2000);};
  const startCamera=async()=>{try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});streamRef.current=s;setCameraOn(true);setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100);}catch{flash("Cámara no disponible",false);}};
  const stopCamera=()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}setCameraOn(false);};
  const takePhoto=()=>{if(!videoRef.current)return;const c=document.createElement("canvas");c.width=videoRef.current.videoWidth||640;c.height=videoRef.current.videoHeight||480;c.getContext("2d").drawImage(videoRef.current,0,0);setPhoto(c.toDataURL("image/jpeg",0.7));stopCamera();};
  const handleFile=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);e.target.value="";};
  const goHome=()=>{setSub(null);stopCamera();setPhoto(null);setPage("menu");};

  const myStatus=user?getStatus(records,user.id):"out";
  const myWorked=user?getWorked(records,user.id,dateKey()):0;
  const confirmFichaje=async()=>{if(!photo)return flash("Foto primero",false);const dk=dateKey();const type=myStatus==="out"?"in":"out";const rec={empId:user.id,type,time:Date.now(),photo};await DB.addClockIn(rec);setRecords({...records,[dk]:[...(records[dk]||[]),rec]});flash(type==="in"?"✓ Entrada registrada":"✓ Salida registrada");setPhoto(null);loadData();};

  const unreadAnns=user?announcements.filter(a=>!a.readBy?.includes(user.id)).length:0;

  const Toast=toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"10px 24px",borderRadius:12,fontWeight:600,fontSize:13,fontFamily:font,pointerEvents:"none",background:toast.ok?"#f0fdf4":"#fef2f2",color:toast.ok?C.green:C.red,border:`1px solid ${toast.ok?"#16a34a33":"#dc262633"}`,boxShadow:"0 4px 12px #0002"}}>{toast.msg}</div>;

  // ═══ LOGIN / SELECTOR DE PERFILES ═══
  if(view==="login") return (
    <ProfileSelector
      employees={employees}
      loading={loading}
      onLogin={(emp)=>{setUser(emp);setView("app");setPage("menu");setSub(null);}}
      onAdminLogin={()=>{setView("admin");setAdminTab("live");}}
    />
  );

  // ═══ ADMIN PANEL ═══
  if(view==="admin"){
    const tabs=[{id:"live",l:"📡 Directo"},{id:"calendar",l:"📅 Horarios"},{id:"monthly",l:"📆 Calendario"},{id:"records",l:"⏱ Fichajes"},{id:"employees",l:"👥 Equipo"},{id:"announcements",l:"📢 Comunicados"},{id:"vacations",l:"🏖 Vacaciones"},{id:"export",l:"📥 Exportar"}];

    return(<div style={{...ss.page,paddingBottom:16}}>{CSS}{Toast}<div style={{maxWidth:600,margin:"0 auto",padding:"16px 16px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div><div style={{fontFamily:font,fontSize:10,color:C.accent,letterSpacing:3}}>ARESO ADMIN</div><div style={{fontSize:20,fontWeight:700}}>Panel de gestión</div></div><button onClick={()=>setView("login")} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11}}>Salir</button></div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>{tabs.map(t=><button key={t.id} onClick={()=>setAdminTab(t.id)} style={{padding:"7px 10px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:font,fontSize:9,fontWeight:600,background:adminTab===t.id?C.accent:"transparent",color:adminTab===t.id?"#000":C.muted,whiteSpace:"nowrap"}}>{t.l}</button>)}</div>

      {/* LIVE */}
      {adminTab==="live"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:10}}>
          {[{n:employees.filter(e=>e.active&&getStatus(records,e.id)==="in").length,l:"Trabajando",c:C.green},{n:employees.filter(e=>e.active&&getStatus(records,e.id)==="out").length,l:"Fuera",c:C.dim},{n:(records[dateKey()]||[]).length,l:"Fichajes",c:C.accent}].map((x,i)=><div key={i} style={{...ss.card,padding:"14px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:28,fontWeight:700,color:x.c}}>{x.n}</div><div style={{fontFamily:font,fontSize:9,color:C.muted}}>{x.l}</div></div>)}
        </div>
        {["in","out"].map(status=>{const emps=employees.filter(e=>e.active&&getStatus(records,e.id)===status);if(!emps.length)return null;
          return(<div key={status}><div style={{fontFamily:font,fontSize:11,color:status==="in"?C.green:C.dim,marginBottom:8,marginTop:8}}>{status==="in"?"🟢 Trabajando":"⚫ Fuera"}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{emps.map(emp=>{const w=getWorked(records,emp.id,dateKey());const col=getAvatarColor(emp.id);return(<div key={emp.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,width:60}}>
            <div style={ss.avatar(col,44)}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <div style={{fontFamily:font,fontSize:9,color:C.text,textAlign:"center",lineHeight:1.2}}>{emp.name.split(" ")[0]}</div>
            {w>0&&<div style={{fontFamily:font,fontSize:8,color:C.accent}}>{fmtDur(w)}</div>}
          </div>);})}</div></div>);
        })}
        {getUpcomingBirthdays(employees).length>0&&<><div style={ss.secTitle}>🎂 Próximos cumpleaños</div>{getUpcomingBirthdays(employees).map(emp=><div key={emp.id} style={{...ss.statusCard,padding:"10px 14px"}}><div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{emp.name.split(" ")[0]}</div><div style={{fontFamily:font,fontSize:10,color:C.muted}}>{emp.dateStr}</div></div><div style={{fontFamily:font,fontSize:11,color:emp.daysUntil===0?"#ec4899":C.muted,fontWeight:700}}>{emp.daysUntil===0?"¡Hoy!":emp.daysUntil===1?"Mañana":emp.daysUntil+"d"}</div></div>)}</>}
      </div>}

      {/* CALENDAR */}
      {adminTab==="calendar"&&(()=>{
        const weekDays=[];for(let i=0;i<7;i++){const d=new Date(calWeekStart);d.setDate(d.getDate()+i);weekDays.push({date:dateKey(d),label:DAYS[i].slice(0,3),num:d.getDate(),month:MONTHS[d.getMonth()]});}
        const shiftWeek=(dir)=>{const d=new Date(calWeekStart);d.setDate(d.getDate()+(dir*7));setCalWeekStart(dateKey(d));};
        const activeEmps=employees.filter(e=>e.active);
        return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>shiftWeek(-1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>←</button>
            <div style={{flex:1,textAlign:"center"}}><span style={{fontFamily:font,fontSize:13,fontWeight:700}}>{weekDays[0].num} {weekDays[0].month}</span><span style={{fontFamily:font,fontSize:13,color:C.dim}}> — </span><span style={{fontFamily:font,fontSize:13,fontWeight:700}}>{weekDays[6].num} {weekDays[6].month}</span></div>
            <button onClick={()=>shiftWeek(1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>→</button>
            <button onClick={()=>{const n=new Date();const d=n.getDay()||7;n.setDate(n.getDate()-(d-1));setCalWeekStart(dateKey(n));}} style={{...ss.btn(C.card,C.muted),width:"auto",border:`1px solid ${C.border}`,padding:"8px 12px",fontSize:10}}>Hoy</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:`100px repeat(7, 1fr)`,gap:2,minWidth:600}}>
              <div style={{padding:8}}/>
              {weekDays.map(d=><div key={d.date} style={{padding:"8px 4px",textAlign:"center",background:d.date===dateKey()?C.accent+"22":C.cardLight,borderRadius:8}}>
                <div style={{fontFamily:font,fontSize:10,color:d.date===dateKey()?C.accent:C.muted}}>{d.label}</div>
                <div style={{fontFamily:font,fontSize:16,fontWeight:700,color:d.date===dateKey()?C.accent:C.text}}>{d.num}</div>
              </div>)}
              {activeEmps.map(emp=>{const col=getAvatarColor(emp.id);return(<React.Fragment key={emp.id}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 4px"}}>
                  <div style={ss.avatar(col,28)}>{emp.name[0]}</div>
                  <div style={{fontFamily:font,fontSize:10,color:C.text,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name.split(" ")[0]}</div>
                </div>
                {weekDays.map(d=>{const key=emp.id+"_"+d.date;const shift=schedules[key];
                  return(<div key={d.date} style={{padding:3,minHeight:44,display:"flex",flexDirection:"column",gap:2,justifyContent:"center",cursor:"pointer",borderRadius:8,background:C.bg,border:`1px solid ${C.border}`}} onClick={async()=>{if(shift){await DB.deleteSchedule(emp.id,d.date);const newScheds={...schedules};delete newScheds[key];setSchedules(newScheds);}else{setAddShift({empId:emp.id,dayKey:d.date});setShiftForm({start:"09:00",end:"17:00"});}}}>
                    {shift?<div style={{background:col+"33",border:`1px solid ${col}`,borderRadius:6,padding:"3px 4px",textAlign:"center"}}>
                      <div style={{fontFamily:font,fontSize:9,fontWeight:700,color:col}}>{shift.start}</div>
                      <div style={{fontFamily:font,fontSize:8,color:col+"aa"}}>{shift.end}</div>
                    </div>:<div style={{fontFamily:font,fontSize:14,color:C.dim,textAlign:"center"}}>+</div>}
                  </div>);
                })}
              </React.Fragment>);})}
            </div>
          </div>
          {addShift&&<div style={{...ss.card,border:`1px solid ${C.accent}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontWeight:700,fontSize:14}}>{employees.find(e=>e.id===addShift.empId)?.name.split(" ")[0]}</span>
              <span style={{fontFamily:font,fontSize:11,color:C.muted}}>{addShift.dayKey}</span>
              <button onClick={()=>setAddShift(null)} style={{marginLeft:"auto",background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Entrada</div><input type="time" value={shiftForm.start} onChange={e=>setShiftForm({...shiftForm,start:e.target.value})} style={ss.input}/></div>
              <div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Salida</div><input type="time" value={shiftForm.end} onChange={e=>setShiftForm({...shiftForm,end:e.target.value})} style={ss.input}/></div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={async()=>{await DB.setSchedule(addShift.empId,addShift.dayKey,shiftForm.start,shiftForm.end);const key=addShift.empId+"_"+addShift.dayKey;setSchedules({...schedules,[key]:{empId:addShift.empId,start:shiftForm.start,end:shiftForm.end}});setAddShift(null);flash("Turno añadido");}} style={ss.btn(C.accent,"#000")}>Guardar turno</button>
            </div>
            <button onClick={async()=>{const newScheds={...schedules};for(const d of weekDays){await DB.setSchedule(addShift.empId,d.date,shiftForm.start,shiftForm.end);newScheds[addShift.empId+"_"+d.date]={empId:addShift.empId,start:shiftForm.start,end:shiftForm.end};}setSchedules(newScheds);setAddShift(null);flash("Copiado a toda la semana");}} style={{...ss.btn(C.cardLight,C.muted),marginTop:6,border:`1px solid ${C.border}`,fontSize:11}}>Copiar a toda la semana</button>
          </div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activeEmps.map(emp=><div key={emp.id} style={{display:"flex",alignItems:"center",gap:4,fontFamily:font,fontSize:10}}>
              <div style={{width:10,height:10,borderRadius:3,background:getAvatarColor(emp.id)}}/>
              <span style={{color:C.muted}}>{emp.name.split(" ")[0]}</span>
            </div>)}
          </div>
        </div>);
      })()}

      {/* RECORDS */}
      {adminTab==="records"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Date nav */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{const d=new Date(filterDate);d.setDate(d.getDate()-1);setFilterDate(dateKey(d));}} style={{...ss.btn(C.card,C.muted),width:44,border:`1px solid ${C.border}`}}>←</button>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{...ss.input,flex:1}}/>
          <button onClick={()=>{const d=new Date(filterDate);d.setDate(d.getDate()+1);setFilterDate(dateKey(d));}} style={{...ss.btn(C.card,C.muted),width:44,border:`1px solid ${C.border}`}}>→</button>
          <button onClick={()=>setAddManual(!addManual)} style={{...ss.btn(addManual?C.accent:C.card,addManual?"#fff":C.muted),width:44,border:`1px solid ${C.border}`,fontSize:18}}>+</button>
        </div>

        {/* Manual fichaje form */}
        {addManual&&<div style={{...ss.card,border:`1px solid ${C.accent}`,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontFamily:font,fontSize:11,fontWeight:700,color:C.accent}}>Añadir fichaje manual</div>
          <select value={manualForm.empId} onChange={e=>setManualForm({...manualForm,empId:e.target.value})} style={ss.input}>
            <option value="">Selecciona trabajador...</option>
            {employees.filter(e=>e.active).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div style={{display:"flex",gap:8}}>
            <select value={manualForm.type} onChange={e=>setManualForm({...manualForm,type:e.target.value})} style={{...ss.input,flex:1}}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
            </select>
            <input type="time" value={manualForm.time} onChange={e=>setManualForm({...manualForm,time:e.target.value})} style={{...ss.input,flex:1}}/>
          </div>
          <button onClick={async()=>{
            if(!manualForm.empId||!manualForm.time)return flash("Selecciona trabajador y hora",false);
            const[h,m]=manualForm.time.split(":");
            const d=new Date(filterDate);d.setHours(+h,+m,0,0);
            const rec={empId:manualForm.empId,type:manualForm.type,time:d.getTime(),photo:null};
            await DB.addClockIn(rec);
            await loadData();
            setAddManual(false);
            setManualForm({empId:'',type:'in',time:''});
            flash("Fichaje añadido");
          }} style={ss.btn(C.accent,"#fff")}>Guardar fichaje</button>
        </div>}

        {/* Per-employee view: one card per person showing entry/exit pair and total */}
        {employees.filter(e=>e.active&&(records[filterDate]||[]).some(r=>r.empId===e.id)).map(emp=>{
          const empRecs=(records[filterDate]||[]).filter(r=>r.empId===emp.id).sort((a,b)=>a.time-b.time);
          const w=getWorked(records,emp.id,filterDate);
          const col=getAvatarColor(emp.id);
          return(<div key={emp.id} style={{...ss.card,padding:12,display:"flex",flexDirection:"column",gap:8}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={ss.avatar(col,34)}>{emp.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:font,fontSize:13,fontWeight:700}}>{emp.name.split(" ")[0]}</div>
                <div style={{fontFamily:font,fontSize:10,color:C.muted}}>{emp.position||""}</div>
              </div>
              <div style={{fontFamily:font,fontSize:14,fontWeight:700,color:C.accent}}>{fmtDur(w)}</div>
            </div>
            {/* Fichajes */}
            <div style={{display:"flex",flexDirection:"column",gap:4,borderTop:`1px solid ${C.border}`,paddingTop:8}}>
              {empRecs.map(r=>(
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:font,fontSize:11,fontWeight:700,color:r.type==="in"?C.green:C.red,minWidth:16}}>{r.type==="in"?"↑":"↓"}</span>
                  <span style={{fontFamily:font,fontSize:12,color:C.accent,minWidth:44}}>{fmtTime(r.time)}</span>
                  <span style={{fontFamily:font,fontSize:11,color:C.muted,flex:1}}>{r.type==="in"?"Entrada":"Salida"}</span>
                  <button onClick={()=>{setEditRecId(editRecId===r.id?null:r.id);setEditTimeVal("");}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>✎</button>
                  <button onClick={async()=>{await DB.deleteClockIn(r.id);setRecords({...records,[filterDate]:(records[filterDate]||[]).filter(x=>x.id!==r.id)});flash("Eliminado");}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ))}
              {editRecId&&empRecs.some(r=>r.id===editRecId)&&<div style={{display:"flex",gap:6,marginTop:4}}>
                <input type="time" value={editTimeVal} onChange={e=>setEditTimeVal(e.target.value)} style={{...ss.input,flex:1}}/>
                <button onClick={async()=>{if(!editTimeVal)return;const[h,m]=editTimeVal.split(":");const r=empRecs.find(x=>x.id===editRecId);const d=new Date(r.time);d.setHours(+h,+m,0);await DB.updateClockIn(editRecId,d.getTime());setRecords({...records,[filterDate]:(records[filterDate]||[]).map(x=>x.id!==editRecId?x:{...x,time:d.getTime()})});setEditRecId(null);flash("Actualizado");}} style={{background:C.accent,border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:font,fontSize:11,fontWeight:700}}>✓</button>
              </div>}
            </div>
          </div>);
        })}
        {!(records[filterDate]||[]).length&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin registros</div>}
      </div>}

      {/* EMPLOYEES */}
      {adminTab==="employees"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
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
        <div style={ss.label}>Equipo</div>
        {employees.map(emp=><div key={emp.id} style={{...ss.statusCard,opacity:emp.active?1:0.5}}>
          <div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{emp.name}{emp.sickLeave&&<span style={{fontFamily:font,fontSize:9,color:C.red,marginLeft:6}}>🏥 BAJA</span>}</div>
            <div style={{fontFamily:font,fontSize:10,color:C.dim}}>{emp.position} · {emp.email}</div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            <button onClick={()=>{setEditEmp(editEmp===emp.id?null:emp.id);setEditEmpForm({name:emp.name,position:emp.position||"",phone:emp.phone||"",email:emp.email||"",pin:"",birthday:emp.birthday||""});}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:"#eff6ff",color:C.blue}}>✎</button>
            <button onClick={async()=>{await DB.updateEmployee(emp.id,{sick_leave:!emp.sickLeave});setEmployees(employees.map(e=>e.id===emp.id?{...e,sickLeave:!e.sickLeave}:e));flash(emp.sickLeave?"Baja quitada":"Marcado de baja");}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:emp.sickLeave?"#fef2f2":"#fff7ed",color:emp.sickLeave?C.red:C.orange}}>{emp.sickLeave?"🏥 Baja":"🏥"}</button>
            <button onClick={async()=>{await DB.updateEmployee(emp.id,{active:!emp.active});setEmployees(employees.map(e=>e.id===emp.id?{...e,active:!e.active}:e));}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:emp.active?"#f0fdf4":"#fef2f2",color:emp.active?C.green:C.red}}>{emp.active?"ON":"OFF"}</button>
            <button onClick={async()=>{if(!window.confirm(`¿Borrar a ${emp.name}?`))return;await DB.deleteEmployee(emp.id);setEmployees(employees.filter(e=>e.id!==emp.id));flash("Trabajador eliminado");}} style={{fontFamily:font,fontSize:8,padding:"4px 6px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,background:"#fef2f2",color:C.red}}>🗑</button>
          </div>
          {editEmp===emp.id&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <div style={{display:"flex",gap:8}}><input placeholder="Nombre completo" value={editEmpForm.name||""} onChange={e=>setEditEmpForm({...editEmpForm,name:e.target.value})} style={{...ss.input,flex:1}}/></div>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Puesto" value={editEmpForm.position||""} onChange={e=>setEditEmpForm({...editEmpForm,position:e.target.value})} style={{...ss.input,flex:1}}/>
              <input placeholder="Teléfono" value={editEmpForm.phone||""} onChange={e=>setEditEmpForm({...editEmpForm,phone:e.target.value})} style={{...ss.input,flex:1}}/>
            </div>
            <input placeholder="Email" value={editEmpForm.email||""} onChange={e=>setEditEmpForm({...editEmpForm,email:e.target.value})} style={ss.input}/>
            <input placeholder="Nuevo PIN (dejar vacío para no cambiar)" type="password" value={editEmpForm.pin||""} onChange={e=>setEditEmpForm({...editEmpForm,pin:e.target.value})} style={ss.input}/>
            <div><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Fecha de nacimiento</div><input type="date" value={editEmpForm.birthday||""} onChange={e=>setEditEmpForm({...editEmpForm,birthday:e.target.value})} style={ss.input}/></div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={async()=>{const fields={name:editEmpForm.name,position:editEmpForm.position,phone:editEmpForm.phone,email:editEmpForm.email,birthday:editEmpForm.birthday};if(editEmpForm.pin)fields.pin=editEmpForm.pin;await DB.updateEmployee(emp.id,fields);setEmployees(employees.map(e=>e.id===emp.id?{...e,...fields,pin:editEmpForm.pin||e.pin}:e));setEditEmp(null);flash("Guardado");}} style={ss.btn(C.accent,"#fff")}>Guardar</button>
              <button onClick={()=>setEditEmp(null)} style={{...ss.btn(C.cardLight,C.muted),border:`1px solid ${C.border}`}}>Cancelar</button>
            </div>
          </div>}
        </div>)}
      </div>}

      {/* ANNOUNCEMENTS */}
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

      {/* MONTHLY CALENDAR */}
      {adminTab==="monthly"&&(()=>{
        const [calMonth,setCalMonth]=[calMonthView,setCalMonthView];
        const year=Math.floor(calMonth/100);const month=calMonth%100;
        const firstDay=new Date(year,month,1);const lastDay=new Date(year,month+1,0);
        const startDow=(firstDay.getDay()+6)%7;
        const daysInMonth=lastDay.getDate();
        const activeEmps=employees.filter(e=>e.active);
        const prevMonth=()=>{const m=month===0?11:month-1;const y=month===0?year-1:year;setCalMonthView(y*100+m);};
        const nextMonth=()=>{const m=month===11?0:month+1;const y=month===11?year+1:year;setCalMonthView(y*100+m);};
        const MONTH_NAMES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const cells=[];
        for(let i=0;i<startDow;i++)cells.push(null);
        for(let d=1;d<=daysInMonth;d++)cells.push(d);
        const getDayData=(day)=>{
          const dk=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const shifts=[];const vacs=[];
          activeEmps.forEach(emp=>{
            const s=schedules[emp.id+"_"+dk];
            if(s)shifts.push({emp,shift:s,color:getAvatarColor(emp.id)});
            vacations.filter(v=>v.empId===emp.id&&(v.status==="approved"||v.status==="pending")&&v.start<=dk&&v.end>=dk).forEach(v=>{vacs.push({emp,vac:v,color:getAvatarColor(emp.id)});});
          });
          return{shifts,vacs,dk};
        };
        return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={prevMonth} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>←</button>
            <div style={{flex:1,textAlign:"center",fontSize:18,fontWeight:700}}>{MONTH_NAMES[month]} {year}</div>
            <button onClick={nextMonth} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>→</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {["L","M","X","J","V","S","D"].map(d=><div key={d} style={{textAlign:"center",fontFamily:font,fontSize:10,color:C.muted,padding:4}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {cells.map((day,i)=>{
              if(!day)return <div key={i}/>;
              const{shifts,vacs,dk}=getDayData(day);
              const isToday=dk===dateKey();
              return(<div key={i} style={{background:isToday?C.accent+"15":C.card,border:`1px solid ${isToday?C.accent+"44":C.border}`,borderRadius:10,padding:"4px 3px",minHeight:64,display:"flex",flexDirection:"column",gap:2}}>
                <div style={{fontFamily:font,fontSize:11,fontWeight:isToday?700:400,color:isToday?C.accent:C.text,textAlign:"center",marginBottom:2}}>{day}</div>
                {shifts.map((s,j)=><div key={"s"+j} style={{background:s.color+"28",borderLeft:`3px solid ${s.color}`,borderRadius:"0 4px 4px 0",padding:"1px 3px",marginBottom:1}}>
                  <div style={{fontFamily:font,fontSize:7,color:s.color,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.emp.name.split(" ")[0]}</div>
                  <div style={{fontFamily:font,fontSize:6,color:s.color+"aa"}}>{s.shift.start}-{s.shift.end}</div>
                </div>)}
                {vacs.map((v,j)=><div key={"v"+j} style={{background:v.vac.status==="approved"?C.green+"22":C.accent+"22",borderLeft:`3px solid ${v.vac.status==="approved"?C.green:C.accent}`,borderRadius:"0 4px 4px 0",padding:"1px 3px"}}>
                  <div style={{fontFamily:font,fontSize:7,color:v.vac.status==="approved"?C.green:C.accent,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🏖 {v.emp.name.split(" ")[0]}</div>
                </div>)}
              </div>);
            })}
          </div>
          <div style={{...ss.card,padding:12}}>
            <div style={{fontFamily:font,fontSize:10,color:C.muted,marginBottom:8}}>Leyenda</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {activeEmps.map(emp=><div key={emp.id} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:12,height:12,borderRadius:3,background:getAvatarColor(emp.id)}}/>
                <span style={{fontFamily:font,fontSize:10,color:C.text}}>{emp.name.split(" ")[0]}</span>
              </div>)}
            </div>
            <div style={{display:"flex",gap:12,marginTop:8}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:C.green+"44",border:`2px solid ${C.green}`}}/><span style={{fontFamily:font,fontSize:9,color:C.muted}}>Vacaciones aprobadas</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:C.accent+"44",border:`2px solid ${C.accent}`}}/><span style={{fontFamily:font,fontSize:9,color:C.muted}}>Vacaciones pendientes</span></div>
            </div>
          </div>
        </div>);
      })()}

      {/* VACATIONS */}
      {adminTab==="vacations"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {vacations.sort((a,b)=>b.id-a.id).map(v=>{const emp=employees.find(e=>e.id===v.empId);const cc={pending:{bg:"#fefce8",c:C.accent},approved:{bg:"#f0fdf4",c:C.green},rejected:{bg:"#fef2f2",c:C.red}}[v.status];return(<div key={v.id} style={{...ss.card,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:600}}>{emp?.name?.split(" ")[0]}</span><span style={{fontFamily:font,fontSize:12}}>{fmtDate(v.start)} → {fmtDate(v.end)}</span><span style={{marginLeft:"auto",fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:cc.bg,color:cc.c}}>{v.status==="pending"?"PENDIENTE":v.status==="approved"?"APROBADA":"RECHAZADA"}</span></div>
          {v.status==="pending"&&<div style={{display:"flex",gap:6}}><button onClick={async()=>{await DB.updateVacation(v.id,"approved");setVacations(vacations.map(x=>x.id===v.id?{...x,status:"approved"}:x));flash("Aprobada");}} style={{...ss.btn(C.green,"#000"),padding:"8px",fontSize:12}}>✓</button><button onClick={async()=>{await DB.updateVacation(v.id,"rejected");setVacations(vacations.map(x=>x.id===v.id?{...x,status:"rejected"}:x));flash("Rechazada");}} style={{...ss.btn(C.red,"#000"),padding:"8px",fontSize:12}}>✕</button></div>}
        </div>);})}
        {!vacations.length&&<div style={{textAlign:"center",padding:20,fontFamily:font,fontSize:12,color:C.dim}}>Sin solicitudes</div>}
      </div>}

      {/* EXPORT */}
      {adminTab==="export"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={ss.card}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Generar informe</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Desde</div><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} style={ss.input}/></div><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hasta</div><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} style={ss.input}/></div></div>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {[{l:"Esta semana",fn:()=>{const n=new Date();const d=n.getDay()||7;const m=new Date(n);m.setDate(n.getDate()-(d-1));setExportFrom(dateKey(m));setExportTo(dateKey());}},{l:"Este mes",fn:()=>{const n=new Date();setExportFrom(n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-01");setExportTo(dateKey());}},{l:"Mes pasado",fn:()=>{const n=new Date();n.setMonth(n.getMonth()-1);setExportFrom(dateKey(new Date(n.getFullYear(),n.getMonth(),1)));setExportTo(dateKey(new Date(n.getFullYear(),n.getMonth()+1,0)));}}].map(r=><button key={r.l} onClick={r.fn} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:10}}>{r.l}</button>)}
          </div>
          <button onClick={()=>{const csv=generateReport(employees,records,schedules,vacations,exportFrom,exportTo);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`ARESO_Informe_${exportFrom}_${exportTo}.csv`;a.click();flash("Descargado");}} style={ss.btn(C.accent,"#000")}>📥 Descargar informe</button>
        </div>
      </div>}

    </div></div>);
  }

  // ═══ EMPLOYEE APP ═══
  if(view!=="app"||!user)return null;
  const lastRec=getLastRec(records,user.id);
  const nextSched=getNextSched(schedules,user.id);
  const bdays=getUpcomingBirthdays(employees);

  return(<div style={ss.page}>{CSS}{Toast}<div style={{maxWidth:480,margin:"0 auto"}}>

    {/* FICHAR */}
    {sub==="fichar"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button>
      <div style={{textAlign:"center"}}><div style={{fontFamily:font,fontSize:40,fontWeight:700,letterSpacing:-2}}>{new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div><div style={{fontFamily:font,fontSize:11,color:C.muted,marginTop:4,textTransform:"capitalize"}}>{fmtDateLong(new Date())}</div></div>
      <div style={{display:"flex",gap:10}}><div style={{...ss.card,padding:"12px 18px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.muted,letterSpacing:1}}>ESTADO</div><div style={{fontFamily:font,fontSize:15,fontWeight:700,color:myStatus==="in"?C.green:C.dim,marginTop:4}}>{myStatus==="in"?"Trabajando":"Fuera"}</div></div><div style={{...ss.card,padding:"12px 18px",textAlign:"center",flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.muted,letterSpacing:1}}>HOY</div><div style={{fontFamily:font,fontSize:15,fontWeight:700,color:C.accent,marginTop:4}}>{fmtDur(myWorked)}</div></div></div>
      {!photo?(<div style={{...ss.card,textAlign:"center",display:"flex",flexDirection:"column",gap:12,padding:20}}><div style={{fontFamily:font,fontSize:11,color:C.muted}}>📸 Foto al reloj para {myStatus==="out"?"entrada":"salida"}</div>{cameraOn?(<><video ref={videoRef} autoPlay playsInline muted/><button onClick={takePhoto} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>📸 Capturar</button><button onClick={stopCamera} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11}}>Cancelar</button></>):(<><button onClick={startCamera} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>📷 Abrir cámara</button><button onClick={()=>fileRef.current?.click()} style={{...ss.btn(C.cardLight,C.muted),border:`1px solid ${C.border}`}}>📁 Subir de galería</button><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/></>)}</div>):(<div style={{display:"flex",flexDirection:"column",gap:12}}><img src={photo} alt="" style={{width:"100%",borderRadius:14,border:`2px solid ${C.border}`}}/><button onClick={confirmFichaje} style={ss.btn(myStatus==="out"?C.green:C.red,"#000")}>✓ Confirmar {myStatus==="out"?"entrada":"salida"}</button><button onClick={()=>setPhoto(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:font,fontSize:11,textAlign:"center"}}>Repetir foto</button></div>)}
    </div>}

    {/* HORARIOS */}
    {sub==="horarios"&&(()=>{
      const [wk,setWk]=[calWeekStart2,setCalWeekStart2];
      const weekDays=[];for(let i=0;i<7;i++){const d=new Date(wk);d.setDate(d.getDate()+i);weekDays.push({date:dateKey(d),label:DAYS[i].slice(0,3),num:d.getDate(),full:DAYS[i]});}
      const shiftWk=(dir)=>{const d=new Date(wk);d.setDate(d.getDate()+(dir*7));setCalWeekStart2(dateKey(d));};
      const myShifts=weekDays.map(d=>({...d,shift:schedules[user.id+"_"+d.date]}));
      const col=getAvatarColor(user.id);
      return(<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
        <button onClick={goHome} style={ss.back}>← Menú</button>
        <div style={{fontSize:20,fontWeight:700}}>Mis horarios</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>shiftWk(-1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontFamily:font,fontSize:13,fontWeight:700}}>{weekDays[0].num} {MONTHS[new Date(weekDays[0].date).getMonth()]} — {weekDays[6].num} {MONTHS[new Date(weekDays[6].date).getMonth()]}</div>
          <button onClick={()=>shiftWk(1)} style={{...ss.btn(C.card,C.muted),width:40,border:`1px solid ${C.border}`,padding:"8px"}}>→</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {myShifts.map(d=>(
            <div key={d.date} style={{...ss.statusCard,background:d.date===dateKey()?C.accent+"11":C.card,borderColor:d.date===dateKey()?C.accent+"44":C.border}}>
              <div style={{minWidth:70}}>
                <div style={{fontFamily:font,fontSize:12,fontWeight:700,color:d.date===dateKey()?C.accent:C.text}}>{d.full.slice(0,3)}</div>
                <div style={{fontFamily:font,fontSize:10,color:C.muted}}>{d.num}</div>
              </div>
              {d.shift?<div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                <div style={{background:col+"22",border:`2px solid ${col}`,borderRadius:10,padding:"8px 14px",flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <span style={{fontFamily:font,fontSize:14,fontWeight:700,color:col}}>{d.shift.start}</span>
                  <span style={{color:C.dim}}>→</span>
                  <span style={{fontFamily:font,fontSize:14,fontWeight:700,color:col}}>{d.shift.end}</span>
                </div>
              </div>:<div style={{flex:1,fontFamily:font,fontSize:12,color:C.dim,textAlign:"center"}}>Libre</div>}
            </div>
          ))}
        </div>
        <div style={ss.secTitle}>Equipo esta semana</div>
        <div style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:`80px repeat(7,1fr)`,gap:2,minWidth:500}}>
            <div/>
            {weekDays.map(d=><div key={d.date} style={{textAlign:"center",padding:4}}><div style={{fontFamily:font,fontSize:9,color:d.date===dateKey()?C.accent:C.muted}}>{d.label}</div><div style={{fontFamily:font,fontSize:12,fontWeight:700,color:d.date===dateKey()?C.accent:C.text}}>{d.num}</div></div>)}
            {employees.filter(e=>e.active).map(emp=>{const ec=getAvatarColor(emp.id);return(<React.Fragment key={emp.id}>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}><div style={ss.avatar(ec,22)}>{emp.name[0]}</div><span style={{fontFamily:font,fontSize:8,color:C.muted}}>{emp.name.split(" ")[0]}</span></div>
              {weekDays.map(d=>{const s=schedules[emp.id+"_"+d.date];return(<div key={d.date} style={{padding:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s?<div style={{background:ec+"33",borderRadius:4,padding:"2px 4px",width:"100%",textAlign:"center"}}><div style={{fontFamily:font,fontSize:8,color:ec,fontWeight:700}}>{s.start}</div></div>:<div style={{fontFamily:font,fontSize:10,color:C.dim}}>·</div>}
              </div>);})}
            </React.Fragment>);})}
          </div>
        </div>
      </div>);
    })()}

    {/* VACACIONES */}
    {sub==="vacaciones"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button><div style={{fontSize:20,fontWeight:700}}>Vacaciones</div>
      <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}><div style={ss.label}>Solicitar</div><div style={{display:"flex",gap:8}}><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Desde</div><input type="date" value={vacForm.start} onChange={e=>setVacForm({...vacForm,start:e.target.value})} style={ss.input}/></div><div style={{flex:1}}><div style={{fontFamily:font,fontSize:9,color:C.dim,marginBottom:4}}>Hasta</div><input type="date" value={vacForm.end} onChange={e=>setVacForm({...vacForm,end:e.target.value})} style={ss.input}/></div></div><input placeholder="Notas" value={vacForm.notes} onChange={e=>setVacForm({...vacForm,notes:e.target.value})} style={ss.input}/><button onClick={async()=>{if(!vacForm.start||!vacForm.end)return flash("Fechas",false);await DB.addVacation({empId:user.id,start:vacForm.start,end:vacForm.end,notes:vacForm.notes});setVacForm({start:"",end:"",notes:""});flash("Enviada");loadData();}} style={ss.btn(C.accent,"#000")}>Enviar</button></div>
      {vacations.filter(v=>v.empId===user.id).sort((a,b)=>b.id-a.id).map(v=>{const cc={pending:{bg:"#fefce8",c:C.accent},approved:{bg:"#f0fdf4",c:C.green},rejected:{bg:"#fef2f2",c:C.red}}[v.status];return(<div key={v.id} style={{...ss.card,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:font,fontSize:12}}>{fmtDate(v.start)} → {fmtDate(v.end)}</span><span style={{marginLeft:"auto",fontFamily:font,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:cc.bg,color:cc.c}}>{v.status==="pending"?"PENDIENTE":v.status==="approved"?"APROBADA":"RECHAZADA"}</span></div>);})}
    </div>}

    {/* DOCS */}
    {sub==="docs"&&<div style={{padding:"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}><button onClick={goHome} style={ss.back}>← Menú</button><div style={{fontSize:20,fontWeight:700}}>Documentos</div>
      <div style={{...ss.card,display:"flex",flexDirection:"column",gap:10}}><select value={docForm.type} onChange={e=>setDocForm({...docForm,type:e.target.value})} style={ss.input}><option value="medical">Justificante médico</option><option value="personal">Personal</option><option value="other">Otro</option></select><input placeholder="Notas" value={docForm.notes} onChange={e=>setDocForm({...docForm,notes:e.target.value})} style={ss.input}/><button onClick={()=>docFileRef.current?.click()} style={{...ss.btn(docFile?C.green:C.cardLight,docFile?"#000":C.muted),border:docFile?"none":`1px solid ${C.border}`}}>{docFile?"✓ Archivo":"📎 Seleccionar"}</button><input ref={docFileRef} type="file" accept="image/*,.pdf" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setDocFile(ev.target.result);r.readAsDataURL(f);e.target.value="";}} style={{display:"none"}}/><button onClick={async()=>{if(!docFile)return flash("Archivo",false);await DB.addDocument({empId:user.id,type:docForm.type,file:docFile,notes:docForm.notes});setDocFile(null);setDocForm({type:"medical",notes:""});flash("Subido");loadData();}} style={ss.btn(C.accent,"#000")}>Subir</button></div>
    </div>}

    {/* COMUNICADOS */}
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

    {/* MENU */}
    {!sub&&page==="menu"&&<>
      <div style={ss.header}><div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:"50%",background:user.photo?"transparent":"#ffffff33",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,fontSize:16,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
          {user.photo ? <img src={user.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : user.name.charAt(0)}
        </div>
        <div><div style={{fontFamily:font,fontSize:10,color:"#ffffffaa",letterSpacing:1}}>Bienvenid@</div><div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{user.name.toUpperCase()}</div></div>
      </div></div>
      <div style={{padding:"0 16px 80px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={ss.statusCard}><div style={{width:4,height:40,borderRadius:2,background:myStatus==="in"?C.green:C.accent,flexShrink:0}}/><div><div style={{fontWeight:600,fontSize:14}}>{myStatus==="in"?"Jornada en curso":"Jornada finalizada"}</div><div style={{fontFamily:font,fontSize:11,color:C.muted}}>{lastRec?`${fmtTime(lastRec.time)} · ${fmtDateLong(new Date())}`:"Sin fichajes hoy"}</div></div>{myWorked>0&&<div style={{marginLeft:"auto",fontFamily:font,fontSize:13,fontWeight:700,color:C.accent}}>{fmtDur(myWorked)}</div>}</div>
        {nextSched&&<div style={ss.statusCard}><div style={{width:4,height:40,borderRadius:2,background:C.blue,flexShrink:0}}/><div><div style={{fontWeight:600,fontSize:14}}>Próximo turno</div><div style={{fontFamily:font,fontSize:11,color:C.muted}}>{nextSched.isToday?"Hoy":nextSched.day}</div></div><div style={{marginLeft:"auto",fontFamily:font,fontSize:13,fontWeight:600,color:C.blue}}>{nextSched.start}-{nextSched.end}</div></div>}
        {employees.filter(e=>e.active&&getStatus(records,e.id)==="in").length>0&&<div style={ss.card}>
          <div style={{fontFamily:font,fontSize:10,color:C.green,letterSpacing:1,marginBottom:10}}>🟢 WHO'S IN</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {employees.filter(e=>e.active&&getStatus(records,e.id)==="in").map(emp=><div key={emp.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,width:50}}>
              <div style={ss.avatar(getAvatarColor(emp.id),36)}>{emp.name[0]}</div>
              <div style={{fontFamily:font,fontSize:8,color:C.text,textAlign:"center"}}>{emp.name.split(" ")[0]}</div>
            </div>)}
          </div>
        </div>}
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
        <div style={ss.secTitle}>Jornada</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("fichar")}>{Ic.clock}<span style={{fontSize:14,fontWeight:600}}>Fichar</span></div>
          <div style={ss.moduleCard} onClick={()=>setSub("horarios")}>{Ic.cal}<span style={{fontSize:14,fontWeight:600}}>Horarios</span></div>
        </div>
        <div style={ss.secTitle}>Comunicación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("comunicados")}>{Ic.megaphone}<span style={{fontSize:14,fontWeight:600}}>Comunicados</span>{unreadAnns>0&&<div style={ss.badge(C.orange,"#fff")}>{unreadAnns}</div>}</div>
        </div>
        <div style={ss.secTitle}>Solicitudes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={ss.moduleCard} onClick={()=>setSub("vacaciones")}>{Ic.vac}<span style={{fontSize:14,fontWeight:600}}>Vacaciones</span></div>
          <div style={ss.moduleCard} onClick={()=>setSub("docs")}>{Ic.doc}<span style={{fontSize:14,fontWeight:600}}>Documentos</span></div>
        </div>
      </div>
    </>}

    {/* PROFILE */}
    {!sub&&page==="profile"&&<>
      <div style={{background:`linear-gradient(135deg,#2d5be3,#1e40af)`,padding:"40px 20px 30px",borderRadius:"0 0 24px 24px",textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:user.photo?"transparent":"#ffffff33",border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontFamily:font,fontSize:28,fontWeight:700,color:"#fff",overflow:"hidden"}}>
          {user.photo ? <img src={user.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : user.name[0]}
        </div>
        <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{user.name.toUpperCase()}</div>
        <div style={{fontFamily:font,fontSize:11,color:"#ffffffaa",marginTop:4}}>Empleado</div>
      </div>
      <div style={{padding:"20px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={ss.card}><div style={{fontWeight:600,fontSize:14,color:C.accent,marginBottom:14}}>Datos Personales</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Email</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.email}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Puesto</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.position||"—"}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Teléfono</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.phone||"—"}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Cumpleaños</div><div style={{fontFamily:font,fontSize:12,color:C.muted}}>{user.birthday||"—"}</div></div></div></div>
        <div style={ss.card}><div style={{fontWeight:600,fontSize:14,color:C.accent,marginBottom:14}}>Resumen</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Horas hoy</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.accent}}>{fmtDur(myWorked)}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Fichajes</div><div style={{fontFamily:font,fontSize:16,fontWeight:700}}>{(records[dateKey()]||[]).filter(r=>r.empId===user.id).length}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Vacaciones</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.green}}>{vacations.filter(v=>v.empId===user.id&&v.status==="approved").length}</div></div><div><div style={{fontFamily:font,fontSize:10,color:C.blue,marginBottom:2}}>Documentos</div><div style={{fontFamily:font,fontSize:16,fontWeight:700,color:C.purple}}>{documents.filter(d=>d.empId===user.id).length}</div></div></div></div>
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