import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, CheckCircle2, Grid3X3, BarChart3, CalendarDays,
  Target, Trophy, Settings as SettingsIcon, Flame, Zap, ChevronLeft, ChevronRight,
  CircleCheck, Volume2, Plus, Trash2, Pencil, RotateCcw,
  X, Check, Minus, TrendingUp, Award, Dumbbell, CandlestickChart,
  Download, Upload, Bell, BellOff, Power, Eye, EyeOff, Save, DatabaseBackup, Sun, Moon, FolderOpen, Cloud, CloudOff, RefreshCw, CheckCircle
} from 'lucide-react';
import './tracker.css';

const tabs = [
  ['dashboard','Dashboard',LayoutDashboard], ['today','Today',CheckCircle2],
  ['matrix','365 Matrix',Grid3X3], ['analytics','Analytics',BarChart3],
  ['calendar','Calendar',CalendarDays], ['goals','Goals & Missions',Target],
  ['achievements','Achievements',Trophy], ['settings','Settings',SettingsIcon]
];

const STORAGE_KEY = 'habittracker-pro-personal-v20';
const LEGACY_STORAGE_KEYS = ['habittracker-pro-personal-v19','habittracker-pro-personal-v18','habittracker-pro-personal-v17','habittracker-pro-personal-v9','habittracker-pro-personal-v8','habittracker-pro-personal-v7','habittracker-pro-personal-v6','habittracker-pro-personal-v5'];
const APP_STATE_VERSION = 20;
const DEFAULT_HABITS = [
  {id:'study',name:'2 Hour Study (HND)',xp:40,active:true},
  {id:'steps',name:'Walking Steps',xp:25,active:true},
  {id:'gaming',name:'Limit Gaming',xp:20,active:true},
  {id:'exercise',name:'1 Hour Exercise / Workout',xp:35,active:true},
  {id:'social',name:'No Social Media',xp:30,active:true},
  {id:'body',name:'Build Body',xp:30,active:true},
  {id:'phone',name:'No Morning Phone',xp:20,active:true},
  {id:'trading',name:'Trading Rules Maintained (Risk Mgmt)',xp:40,active:true},
];

const DEFAULT_GOALS = [
  {id:'challenge',title:'Complete 365-day challenge',target:365,value:0},
  {id:'trading',title:'Build consistent trading discipline',target:30,value:0},
];

function pad2(n){return String(n).padStart(2,'0');}
function dateKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function dateFromKey(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d);}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function uid(){return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;}
function defaultStart(){const d=new Date();d.setHours(0,0,0,0);return dateKey(d);}
const DB_NAME='HabitTrackerProDB';
const DB_STORE='app';
async function tauriInvoke(command,args={}){return null;}
function isDesktop(){return Boolean(window.__TAURI_INTERNALS__);}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window))return resolve(null);const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbGet(key){
  if(key==='state' && isDesktop()){const value=await tauriInvoke('load_state'); if(value){try{return JSON.parse(value);}catch{return null}}}
  try{const db=await openDB();if(!db)return null;return await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}catch{return null}
}
async function dbSet(key,value){
  if(key==='state' && isDesktop()){await tauriInvoke('save_state',{snapshot:JSON.stringify(value)}); return;}
  try{const db=await openDB();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}catch{}
}

function normalizeState(s){
  return {
    habits:Array.isArray(s?.habits)&&s.habits.length?s.habits:DEFAULT_HABITS,
    logs:s?.logs||{}, dailyNotes:s?.dailyNotes||{}, goals:Array.isArray(s?.goals)?s.goals:DEFAULT_GOALS,
    sound:s?.sound!==false,target:Number.isFinite(Number(s?.target))?Number(s.target):75,
    challengeStart:s?.challengeStart||defaultStart(),
    reminders:{enabled:Boolean(s?.reminders?.enabled),morning:String(s?.reminders?.morning||'09:00'),evening:String(s?.reminders?.evening||'20:00'),dailyReview:Boolean(s?.reminders?.dailyReview)},
    routine:s?.routine||{},
    theme:s?.theme==='light'?'light':'dark',
    oneDriveBackup:{enabled:Boolean(s?.oneDriveBackup?.enabled),folderName:String(s?.oneDriveBackup?.folderName||''),folderPath:String(s?.oneDriveBackup?.folderPath||''),lastBackupAt:Number(s?.oneDriveBackup?.lastBackupAt)||0,intervalMinutes:[1,5,10,15,30].includes(Number(s?.oneDriveBackup?.intervalMinutes))?Number(s.oneDriveBackup.intervalMinutes):5},
    startWithWindows:s?.startWithWindows!==false, version:APP_STATE_VERSION,updatedAt:Number(s?.updatedAt)||0
  };
}

function readLocalSnapshot(){
  const keys=[STORAGE_KEY,...LEGACY_STORAGE_KEYS];
  for(const key of keys){
    try{
      const raw=localStorage.getItem(key);
      if(!raw) continue;
      const parsed=normalizeState(JSON.parse(raw));
      if(parsed.updatedAt||key===STORAGE_KEY) return parsed;
    }catch(e){ console.warn('Local snapshot load failed',e); }
  }
  return normalizeState({});
}

function loadState(){
  const s=readLocalSnapshot();
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...s,version:APP_STATE_VERSION,updatedAt:s.updatedAt||Date.now()}));}catch{}
  return s;
}

function PathName(path){return String(path||'').split(/\\|\//).filter(Boolean).pop()||'OneDrive';}
function backupSummary(root,meta={}){
  const logs=root?.logs&&typeof root.logs==='object'?root.logs:{};
  const habits=Array.isArray(root?.habits)?root.habits:[];
  const goals=Array.isArray(root?.goals)?root.goals:[];
  const logDays=Object.keys(logs).length;
  const statuses=Object.values(logs).reduce((n,l)=>n+Object.values(l||{}).filter(Boolean).length,0);
  const xp=Object.values(logs).reduce((sum,l)=>sum+habits.reduce((s,h)=>s+(l?.[h.id]==='done'?Number(h.xp||0):l?.[h.id]==='partial'?Math.round(Number(h.xp||0)/2):0),0),0);
  return {name:meta.name||'Backup',backedUpAt:root?.backedUpAt||'',backupSchema:root?.backupSchema||'legacy',habits:habits.length,logDays,statuses,goals:goals.length,totalXp:xp,hasDb:Boolean(meta.hasDb),sizeBytes:Number(meta.sizeBytes)||0};
}
function formatBackupDate(value){if(!value)return 'Unknown time';const d=new Date(value);return Number.isNaN(d.getTime())?'Unknown time':d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'});}

function App(){
  const [state,setState]=useState(loadState);
  const stateRef=useRef(state);
  stateRef.current=state;
  useEffect(()=>{document.documentElement.dataset.theme=state.theme==='light'?'light':'dark';},[state.theme]);
  const [active,setActive]=useState('dashboard');
  const [transition,setTransition]=useState(false);
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [notice,setNotice]=useState('');
  const [xpFlash,setXpFlash]=useState(null);
  const [celebrate,setCelebrate]=useState(false);
  const [selectedHabit,setSelectedHabit]=useState(null);
  const [installPrompt,setInstallPrompt]=useState(null);
  const [storageReady,setStorageReady]=useState(false);
  const [lastSaved,setLastSaved]=useState(0);
  const [dbInfo,setDbInfo]=useState(null);
  const timer=useRef(null);
  const saveTimer=useRef(null);
  const switchTabRef=useRef(null);
  const channelRef=useRef(null);
  const oneDriveRef=useRef(null);
  const backupBusyRef=useRef(false);
  const backupTimerRef=useRef(null);
  const hydratedRef=useRef(false);
  const [recovery,setRecovery]=useState({open:false,loading:false,restoring:false,folder:'',folderName:'',backups:[],selected:'',summary:null,error:''});

  const saveHandle=async(handle)=>{ try{ await dbSet('oneDriveHandle',handle); }catch(e){ console.warn('OneDrive handle save failed',e); } };
  const loadHandle=async()=>{ try{return await dbGet('oneDriveHandle');}catch{return null} };
  const writeOneDriveBackup=async(manual=false)=>{
    const cfg=stateRef.current?.oneDriveBackup;
    if(!cfg?.enabled || backupBusyRef.current) return false;
    backupBusyRef.current=true;
    try{
      const snap=normalizeState({...stateRef.current,updatedAt:Date.now()});
      const json=JSON.stringify({...snap,backupType:'OneDrive automatic backup',backedUpAt:new Date().toISOString()},null,2);
      if(isDesktop() && cfg.folderPath){
        const archive=await tauriInvoke('backup_to_folder',{folder:cfg.folderPath,snapshot:json});
        if(!archive) throw new Error('Native backup failed');
      }else{
        if(!oneDriveRef.current) throw new Error('OneDrive folder is not connected');
        let perm='prompt';
        if(oneDriveRef.current.queryPermission) perm=await oneDriveRef.current.queryPermission({mode:'readwrite'});
        if(perm!=='granted'){
          if(oneDriveRef.current.requestPermission) perm=await oneDriveRef.current.requestPermission({mode:'readwrite'});
          if(perm!=='granted') throw new Error('OneDrive folder permission is not granted');
        }
        const backupFolder=await oneDriveRef.current.getDirectoryHandle('HabitTrackerPro_Backups',{create:true});
        const latest=await backupFolder.getFileHandle('HabitTrackerPro_Latest.json',{create:true});
        const stream=await latest.createWritable(); await stream.write(json); await stream.close();
        const now=new Date();
        const stamp=`${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
        const snapshotFile=await backupFolder.getFileHandle(`HabitTrackerPro_${stamp}.json`,{create:true});
        const snapStream=await snapshotFile.createWritable(); await snapStream.write(json); await snapStream.close();
      }
      const ts=Date.now();
      setState(prev=>({...prev,oneDriveBackup:{...(prev.oneDriveBackup||cfg),lastBackupAt:ts}}));
      setNotice(manual?'OneDrive backup completed':'OneDrive backup saved');
      window.setTimeout(()=>setNotice(''),1800);
      playSound('success');
      return true;
    }catch(e){
      console.warn('OneDrive backup failed',e);
      setNotice('OneDrive backup needs a valid OneDrive folder');
      window.setTimeout(()=>setNotice(''),2200);
      return false;
    }finally{ backupBusyRef.current=false; }
  };
  const chooseOneDriveFolder=async()=>{
    if(isDesktop()){
      try{
        const detected=await tauriInvoke('detect_onedrive');
        if(!detected) throw new Error('OneDrive folder not found');
        const cleaned=String(detected).trim();
        const name=cleaned.split(/\\|\//).filter(Boolean).pop()||'OneDrive';
        oneDriveRef.current={desktop:true,path:cleaned};
        setState(prev=>({...prev,oneDriveBackup:{...(prev.oneDriveBackup||{}),folderName:name,folderPath:cleaned,enabled:true,intervalMinutes:Number(prev.oneDriveBackup?.intervalMinutes)||5}}));
        setNotice('OneDrive folder connected'); window.setTimeout(()=>setNotice(''),1800);
        window.setTimeout(()=>writeOneDriveBackup(true),80);
      }catch(e){
        console.warn('OneDrive detection failed',e);
        setNotice('OneDrive folder was not found. Make sure OneDrive is installed and signed in.');
        window.setTimeout(()=>setNotice(''),3000);
      }
      return;
    }
    if(!('showDirectoryPicker' in window)){
      setNotice('Folder backup needs a Chromium-based browser'); window.setTimeout(()=>setNotice(''),2400); return;
    }
    try{
      const handle=await window.showDirectoryPicker({mode:'readwrite'});
      oneDriveRef.current=handle; await saveHandle(handle);
      const name=handle.name||'OneDrive folder';
      setState(prev=>({...prev,oneDriveBackup:{...(prev.oneDriveBackup||{}),folderName:name,folderPath:'',enabled:true,intervalMinutes:Number(prev.oneDriveBackup?.intervalMinutes)||5}}));
      setNotice('OneDrive folder connected'); window.setTimeout(()=>setNotice(''),1800);
      await writeOneDriveBackup(true);
    }catch(e){ if(e?.name!=='AbortError') setNotice('Could not connect folder'); window.setTimeout(()=>setNotice(''),1800); }
  };
  const disableOneDrive=()=>{
    oneDriveRef.current=null;
    setState(prev=>({...prev,oneDriveBackup:{...(prev.oneDriveBackup||{}),enabled:false}}));
    setNotice('OneDrive automatic backup disabled'); window.setTimeout(()=>setNotice(''),1800);
  };
  const persistNow=useMemo(()=> (snapshot)=>{
    const next=normalizeState({...snapshot,updatedAt:Number(snapshot?.updatedAt)||Date.now()});
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}
    catch(e){console.warn('Local save failed',e);}
    clearTimeout(saveTimer.current);
    setLastSaved(next.updatedAt);
    saveTimer.current=window.setTimeout(()=>dbSet('state',next),80);
    try{channelRef.current?.postMessage(next);}catch{}
  },[]);

  useEffect(()=>{
    if(!hydratedRef.current) return;
    const next=normalizeState({...state,updatedAt:Date.now()});
    if(next.updatedAt===state.updatedAt && state.updatedAt) return;
    persistNow(next);
  },[state,persistNow]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const local=readLocalSnapshot();
      const stored=await dbGet('state');
      let initialized=false;
      let detectedOneDrive='';
      let detectedBackups=[];
      if(isDesktop()){
        try{ initialized=Boolean(await tauriInvoke('database_initialized')); }catch{}
        try{ detectedOneDrive=String(await tauriInvoke('detect_onedrive')||'').trim(); }catch{}
        if(detectedOneDrive){
          try{ detectedBackups=await tauriInvoke('list_onedrive_backups',{folder:detectedOneDrive})||[]; }catch{detectedBackups=[];}
        }
      }
      if(isDesktop()){
        try{ const info=await tauriInvoke('database_info'); if(info) setDbInfo(info); }catch{}
      }
      if(cancelled)return;
      const localTs=Number(local?.updatedAt)||0;
      const dbTs=Number(stored?.updatedAt)||0;
      let effectiveState;
      if(stored && dbTs>=localTs){
        effectiveState=normalizeState(stored);
        effectiveState={...effectiveState,version:APP_STATE_VERSION,updatedAt:Math.max(dbTs,localTs,Date.now())};
        setState(effectiveState);
        try{localStorage.setItem(STORAGE_KEY,JSON.stringify(effectiveState));}catch{}
        if((Number(stored?.version)||0)!==APP_STATE_VERSION){ try{await dbSet('state',effectiveState);}catch{} }
      }else{
        effectiveState=normalizeState({...local,updatedAt:localTs||0});
        if(effectiveState.updatedAt){ try{await dbSet('state',effectiveState);}catch{} }
        try{localStorage.setItem(STORAGE_KEY,JSON.stringify(effectiveState));}catch{}
        setState(effectiveState);
      }

      const freshDesktop=!stored && !initialized && !localTs;
      if(isDesktop() && detectedOneDrive && effectiveState.oneDriveBackup?.enabled){
        try{
          const storedPath=String(effectiveState.oneDriveBackup?.folderPath||'');
          const nextPath=detectedOneDrive;
          if(storedPath!==nextPath){
            effectiveState={...effectiveState,oneDriveBackup:{...effectiveState.oneDriveBackup,folderPath:nextPath,folderName:PathName(nextPath)}};
            oneDriveRef.current={desktop:true,path:nextPath};
            setState(effectiveState);
            await dbSet('state',effectiveState);
          }else oneDriveRef.current={desktop:true,path:nextPath};
        }catch{}
      }

      if(isDesktop() && freshDesktop && detectedOneDrive && detectedBackups.length){
        const latest=detectedBackups[0];
        oneDriveRef.current={desktop:true,path:detectedOneDrive};
        setRecovery({open:true,loading:false,restoring:false,folder:detectedOneDrive,folderName:PathName(detectedOneDrive),backups:detectedBackups,selected:latest.name||'',summary:null,error:''});
        try{
          const raw=await tauriInvoke('read_onedrive_backup',{folder:detectedOneDrive,fileName:latest.name});
          if(raw){ const root=JSON.parse(raw); setRecovery(r=>({...r,summary:backupSummary(root,latest)})); }
        }catch(e){ setRecovery(r=>({...r,error:'Could not read the latest backup.'})); }
      }

      try{navigator.storage?.persist?.();}catch{}
      if(isDesktop()){
        try{ const a=await tauriInvoke('autostart_status'); if(typeof a==='boolean') effectiveState={...effectiveState,startWithWindows:a}; setState(effectiveState); }catch{}
      }
      hydratedRef.current=true;
      setStorageReady(true);
    })();
    if('BroadcastChannel' in window){
      try{
        const ch=new BroadcastChannel('habittracker-pro-sync-v20');
        channelRef.current=ch;
        ch.onmessage=(event)=>{
          const incoming=normalizeState(event.data);
          const currentTs=Number(stateRef.current?.updatedAt)||0;
          if(incoming.updatedAt>currentTs) setState(incoming);
        };
      }catch{}
    }
    const onStorage=(event)=>{
      if(event.key!==STORAGE_KEY||!event.newValue)return;
      try{
        const incoming=normalizeState(JSON.parse(event.newValue));
        if(incoming.updatedAt>(Number(stateRef.current?.updatedAt)||0)) setState(incoming);
      }catch{}
    };
    const flush=()=>{
      const latest=normalizeState({...stateRef.current,updatedAt:Date.now()});
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(latest));}catch{}
      if(hydratedRef.current) dbSet('state',latest);
    };
    window.addEventListener('storage',onStorage);
    window.addEventListener('pagehide',flush);
    window.addEventListener('beforeunload',flush);
    const onVisibility=()=>{if(document.visibilityState==='hidden'){flush(); writeOneDriveBackup(false);}};
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',()=>{writeOneDriveBackup(false)});
    return ()=>{cancelled=true;window.removeEventListener('storage',onStorage);window.removeEventListener('pagehide',flush);window.removeEventListener('beforeunload',flush);document.removeEventListener('visibilitychange',onVisibility);try{channelRef.current?.close();}catch{}};
  },[]);

  useEffect(()=>{
    clearInterval(backupTimerRef.current);
    const mins=Math.max(1,Number(state.oneDriveBackup?.intervalMinutes)||5);
    if(!isDesktop() && state.oneDriveBackup?.enabled && Boolean(oneDriveRef.current)){
      backupTimerRef.current=window.setInterval(()=>writeOneDriveBackup(false),mins*60*1000);
    }
    return()=>clearInterval(backupTimerRef.current);
  },[state.oneDriveBackup?.enabled,state.oneDriveBackup?.intervalMinutes]);

  useEffect(()=>{
    const handler=e=>{if(e.key==='Tab'||e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;const n=Number(e.key);if(n>=1&&n<=8){e.preventDefault();const id=tabs[n-1][0];switchTabRef.current?.(id);}};
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[]);

  useEffect(()=>{
    const h=e=>{e.preventDefault();setInstallPrompt(e)};window.addEventListener('beforeinstallprompt',h);
    if('serviceWorker' in navigator && !['localhost','127.0.0.1'].includes(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(()=>{});
    return()=>window.removeEventListener('beforeinstallprompt',h);
  },[]);

  const today=dateKey();
  const activeHabits=useMemo(()=>state.habits.filter(h=>h.active),[state.habits]);
  const todayLog=state.logs[today]||{};
  const completed=activeHabits.filter(h=>todayLog[h.id]==='done').length;
  const partial=activeHabits.filter(h=>todayLog[h.id]==='partial').length;
  const progress=activeHabits.length?Math.round((completed+partial*.5)/activeHabits.length*100):0;
  const totalXp=useMemo(()=>Object.values(state.logs).reduce((sum,log)=>sum+state.habits.reduce((s,h)=>s+(log[h.id]==='done'?h.xp:log[h.id]==='partial'?Math.round(h.xp/2):0),0),0),[state.logs,state.habits]);
  const level=clamp(1+Math.floor(totalXp/300),1,20);
  const levelInto=totalXp%300;
  const levelPct=level===20?100:Math.round(levelInto/300*100);
  const currentStreak=streakFor(state.logs,today,activeHabits);
  const best=bestStreak(state.logs,today,activeHabits);
  const challengeCompletedDays=completedChallengeDays(state.logs,state.challengeStart,today,activeHabits);
  const challengeDay=Math.max(1,Math.min(365,Math.floor((dateFromKey(today)-dateFromKey(state.challengeStart))/86400000)+1));

  const playSound=(kind='click')=>{
    if(!state.sound)return;
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const ctx=new C();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
      const cfg={click:[520,.05,'sine'],success:[740,.10,'triangle'],level:[440,.18,'sawtooth'],error:[180,.10,'square'],notify:[620,.08,'sine']}[kind]||[520,.05,'sine'];
      o.type=cfg[2];o.frequency.value=cfg[0];g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+cfg[1]);o.start();o.stop(ctx.currentTime+cfg[1]+.02);
    }catch(e){}
  };

  useEffect(()=>{
    if(isDesktop()) return; // native Tauri worker owns reminders in desktop builds
    const check=()=>{
      if(!state.reminders?.enabled || typeof Notification==='undefined' || Notification.permission!=='granted') return;
      const now=new Date(); const hm=`${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const key=`habittracker-reminder-${dateKey(now)}-${hm}`;
      if(window.__habitReminderLast===key) return;
      const reminders=[['morning',state.reminders?.morning,"Good morning — start today\'s challenge."],['evening',state.reminders?.evening,'Evening review — complete your habits before the day ends.']];
      const hit=reminders.find(([,time])=>time===hm);
      if(hit){ window.__habitReminderLast=key; if(isDesktop()){ sendNativeNotification('HabitTracker Pro',hit[2]); } else { try{ new Notification('HabitTracker Pro',{body:hit[2]}); }catch(e){} } playSound('notify'); }
    };
    check();
    const id=window.setInterval(check,10000);
    return ()=>window.clearInterval(id);
  },[state.reminders,state.sound]);

  const switchTab=(id)=>{
    if(id===active||transition)return;
    playSound('click');
    window.requestAnimationFrame(()=>{
      setTransition(true);
      setActive(id);
      clearTimeout(timer.current);
      timer.current=window.setTimeout(()=>setTransition(false),150);
    });
  };
  switchTabRef.current=switchTab;
  const installApp=async()=>{if(!installPrompt)return;const p=installPrompt;setInstallPrompt(null);try{await p.prompt();await p.userChoice}catch{}};
  const sendNativeNotification=async(title,body)=>{ try{ if(typeof Notification==='undefined') return false; if(Notification.permission!=='granted'){const p=await Notification.requestPermission(); if(p!=='granted') return false;} new Notification(title,{body}); return true; }catch(e){ return false; } };
  const syncLatest=async()=>{
    const stored=await dbGet('state');
      if(isDesktop()){ try{ const info=await tauriInvoke('database_info'); if(info) setDbInfo(info); }catch{} }
    const currentTs=Number(stateRef.current?.updatedAt)||0;
    const dbTs=Number(stored?.updatedAt)||0;
    if(stored && dbTs>currentTs){setState(normalizeState(stored));setNotice('Latest local data loaded');}
    else {const latest=normalizeState({...stateRef.current,updatedAt:Date.now()});persistNow(latest);setState(latest);setNotice('Local data saved');}
    window.setTimeout(()=>setNotice(''),1600);
  };

  const setStatus=(habitId,status)=>{
    let nextStatus=status;
    setState(s=>{
      const current=s.logs?.[today]?.[habitId]||'';
      nextStatus=current===status?'':status;
      const logs={...s.logs,[today]:{...(s.logs[today]||{})}};
      if(nextStatus) logs[today][habitId]=nextStatus; else delete logs[today][habitId];
      return {...s,logs};
    });
    const h=state.habits.find(x=>x.id===habitId);
    const earned=nextStatus==='done'?Number(h?.xp||0):nextStatus==='partial'?Math.round(Number(h?.xp||0)/2):0;
    if(earned>0){
      setXpFlash({id:Date.now(),value:`+${earned} XP`,kind:nextStatus});
      window.setTimeout(()=>setXpFlash(null),850);
    }
    if(nextStatus) playSound(nextStatus==='done'?'success':'click'); else playSound('click');
    if(nextStatus==='done'){
      const log=state.logs?.[today]||{};
      const doneAfter=activeHabits.filter(x=>x.id===habitId?true:log[x.id]==='done').length;
      if(activeHabits.length>0 && doneAfter===activeHabits.length){
        setCelebrate(true); playSound('success'); window.setTimeout(()=>setCelebrate(false),1200);
      }
    }
  };
  const completeAll=()=>{
    if(!activeHabits.length)return;
    setState(s=>({...s,logs:{...s.logs,[today]:{...(s.logs[today]||{}),...Object.fromEntries(activeHabits.map(h=>[h.id,'done']))}}}));
    setXpFlash({id:Date.now(),value:`+${activeHabits.reduce((a,h)=>a+h.xp,0)} XP`,kind:'done'});
    setCelebrate(true); playSound('success'); window.setTimeout(()=>{setXpFlash(null);setCelebrate(false)},1200);
  };
  const resetToday=()=>{setState(s=>({...s,logs:{...s.logs,[today]:{}}}));setXpFlash(null);setCelebrate(false);playSound('click');};
  const addHabit=(name,xp)=>setState(s=>({...s,habits:[...s.habits,{id:uid(),name,xp:Number(xp)||20,active:true}]}));
  const updateHabit=(id,patch)=>setState(s=>({...s,habits:s.habits.map(h=>h.id===id?{...h,...patch}:h)}));
  const removeHabit=(id)=>setState(s=>({...s,habits:s.habits.filter(h=>h.id!==id)}));
  const toggleHabit=(id)=>setState(s=>({...s,habits:s.habits.map(h=>h.id===id?{...h,active:!h.active}:h)}));
  const addGoal=(title,target)=>setState(s=>({...s,goals:[...s.goals,{id:uid(),title:title.trim(),target:Math.max(1,Number(target)||1),value:0}]}));
  const updateGoal=(id,patch)=>setState(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,...patch}:g)}));
  const removeGoal=(id)=>setState(s=>({...s,goals:s.goals.filter(g=>g.id!==id)}));

  const inspectRecoveryBackup=async(fileName)=>{
    if(!recovery.folder||!fileName)return;
    setRecovery(r=>({...r,selected:fileName,loading:true,error:'',summary:null}));
    try{
      const raw=await tauriInvoke('read_onedrive_backup',{folder:recovery.folder,fileName});
      if(!raw)throw new Error('Backup file could not be read');
      const root=JSON.parse(raw);
      const meta=recovery.backups.find(b=>b.name===fileName)||{};
      setRecovery(r=>({...r,loading:false,summary:backupSummary(root,meta)}));
    }catch(e){setRecovery(r=>({...r,loading:false,error:'This backup could not be read or is invalid.',summary:null}));}
  };
  const closeRecovery=async()=>{
    setRecovery(r=>({...r,open:false}));
    if(isDesktop() && recovery.folder && !hydratedRef.current){
      const clean=normalizeState({...stateRef.current,oneDriveBackup:{...(stateRef.current.oneDriveBackup||{}),enabled:false,folderPath:'',folderName:''},updatedAt:Date.now()});
      hydratedRef.current=true; setState(clean); await dbSet('state',clean);
    }else if(isDesktop() && recovery.folder){
      const clean=normalizeState({...stateRef.current,updatedAt:Date.now()}); setState(clean); await dbSet('state',clean);
    }
  };
  const restoreSelectedBackup=async()=>{
    if(!recovery.folder||!recovery.selected||recovery.restoring)return;
    setRecovery(r=>({...r,restoring:true,error:''}));
    try{
      const raw=await tauriInvoke('read_onedrive_backup',{folder:recovery.folder,fileName:recovery.selected});
      if(!raw)throw new Error('Backup read failed');
      const root=JSON.parse(raw);
      const meta=recovery.backups.find(b=>b.name===recovery.selected)||{};
      const restored=normalizeState({...root,version:APP_STATE_VERSION,oneDriveBackup:{...(root.oneDriveBackup||{}),enabled:true,folderPath:recovery.folder,folderName:recovery.folderName||PathName(recovery.folder),lastBackupAt:Number(root?.oneDriveBackup?.lastBackupAt)||0},updatedAt:Date.now(),recoveryWizardCompleted:true});
      const info=await tauriInvoke('restore_state_snapshot',{snapshot:JSON.stringify(restored)});
      if(!info)throw new Error('Restore failed');
      hydratedRef.current=true;
      oneDriveRef.current={desktop:true,path:recovery.folder};
      setState(restored); setDbInfo(info); setRecovery({open:false,loading:false,restoring:false,folder:'',folderName:'',backups:[],selected:'',summary:null,error:''});
      setNotice(`Restored ${meta.isLatest?'latest':'selected'} backup successfully`); window.setTimeout(()=>setNotice(''),2600); playSound('success');
      window.setTimeout(()=>writeOneDriveBackup(false),500);
    }catch(e){setRecovery(r=>({...r,restoring:false,error:String(e?.message||'Restore failed. The backup was not applied.')}));}
  };

  const exportBackup=()=>{
    const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`HabitTrackerPro_Backup_${today}.json`;a.click();URL.revokeObjectURL(a.href);setNotice('Backup exported');setTimeout(()=>setNotice(''),1800);playSound('success');
  };
  const importBackup=(file)=>{
    const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);if(!s.habits||!s.logs)throw new Error('Invalid backup');setState({...loadState(),...s,version:APP_STATE_VERSION,updatedAt:Date.now()});setNotice('Backup restored');playSound('success');setTimeout(()=>setNotice(''),1800);}catch(e){setNotice('Invalid backup file');playSound('error');setTimeout(()=>setNotice(''),1800);}};r.readAsText(file);
  };

  return <div className={`app-shell ${state.theme==='light'?'theme-light':'theme-dark'}`}>
    <div className="ambient a1"/><div className="ambient a2"/>
    <header className="topbar">
      <div><div className="brand-title">365-DAY HABIT &amp; CONSISTENCY CHALLENGE</div><div className="brand-sub"><b>HabitTracker Pro</b><span>• Web Edition</span></div></div>
      <div className="top-actions"><a className="theme-quick site-link" href="/" title="Back to website">Home</a><button className="theme-quick" aria-label="Toggle light and dark mode" title="Toggle theme" onClick={()=>setState(s=>({...s,theme:s.theme==='light'?'dark':'light'}))}>{state.theme==='light'?<Sun size={15}/>:<Moon size={15}/>}<span>{state.theme==='light'?'Light':'Dark'}</span></button><div className="save-pill" title={lastSaved?`Last saved ${new Date(lastSaved).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Preparing local save'}><span className={`save-dot ${storageReady?'ready':''}`}></span><span>{storageReady?'Saved locally':'Saving…'}</span></div><div className="status-pill"><Zap size={14}/> LEVEL {pad2(level)} <span>• {totalXp} XP</span></div></div>
    </header>
    <nav className="tabs">{tabs.map(([id,label,Icon])=><button key={id} type="button" className={`tab ${active===id?'active':''}`} aria-current={active===id?'page':undefined} onClick={()=>switchTab(id)}><Icon size={16}/><span>{label}</span></button>)}</nav>
    <main className="viewport"><div className={`page-frame ${transition?'is-transition':''}`}><PageContent active={active} state={state} setState={setState} activeHabits={activeHabits} today={today} completed={completed} partial={partial} progress={progress} totalXp={totalXp} level={level} levelPct={levelPct} currentStreak={currentStreak} best={best} challengeDay={challengeDay} challengeCompletedDays={challengeCompletedDays} setStatus={setStatus} resetToday={resetToday} addHabit={addHabit} updateHabit={updateHabit} removeHabit={removeHabit} toggleHabit={toggleHabit} addGoal={addGoal} updateGoal={updateGoal} removeGoal={removeGoal} playSound={playSound} editing={editing} setEditing={setEditing} showAdd={showAdd} setShowAdd={setShowAdd} selectedHabit={selectedHabit} setSelectedHabit={setSelectedHabit} exportBackup={exportBackup} importBackup={importBackup} installApp={installApp} canInstall={!!installPrompt} storageReady={storageReady} notice={notice} chooseOneDriveFolder={chooseOneDriveFolder} disableOneDrive={disableOneDrive} writeOneDriveBackup={writeOneDriveBackup} syncLatest={syncLatest} sendNativeNotification={sendNativeNotification} lastSaved={lastSaved} dbInfo={dbInfo} setNotice={setNotice}/></div></main>
    {recovery.open&&<RecoveryWizard recovery={recovery} onSelect={inspectRecoveryBackup} onRestore={restoreSelectedBackup} onSkip={closeRecovery}/>}
  </div>;
}

function RecoveryWizard({recovery,onSelect,onRestore,onSkip}){
  const latest=recovery.backups?.[0];
  return <div className="modal-backdrop recovery-backdrop">
    <div className="modal modal-wide recovery-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><b>Welcome back — restore your HabitTracker data</b><span className="modal-sub">A HabitTracker Pro backup was found in your OneDrive folder.</span></div><Cloud size={22}/></div>
      <div className="recovery-callout"><DatabaseBackup size={18}/><div><b>Your existing data is protected</b><span>The app found a backup before saving a new empty database. Restore a backup to continue where you left off.</span></div></div>
      <label className="field"><span>Choose a backup</span><select value={recovery.selected||''} onChange={e=>onSelect(e.target.value)} disabled={recovery.loading||recovery.restoring}>{(recovery.backups||[]).map(b=><option key={b.name} value={b.name}>{b.isLatest?'Latest backup':b.name.replace('HabitTrackerPro_','').replace('.json','')} · {formatBackupDate(b.backedUpAt||b.modifiedMs)}</option>)}</select></label>
      {recovery.loading&&<div className="recovery-loading">Reading backup…</div>}
      {recovery.summary&&<div className="recovery-summary">
        <div><strong>{formatBackupDate(recovery.summary.backedUpAt)}</strong><span>Backup time</span></div>
        <div><strong>{recovery.summary.habits}</strong><span>Habits</span></div>
        <div><strong>{recovery.summary.logDays}</strong><span>Logged days</span></div>
        <div><strong>{recovery.summary.totalXp}</strong><span>XP</span></div>
        <div><strong>{recovery.summary.goals}</strong><span>Goals</span></div>
        <div><strong>{recovery.summary.hasDb?'Yes':'No'}</strong><span>SQLite archive</span></div>
      </div>}
      <div className="recovery-notes"><span>✓ A safety copy is created before restore.</span><span>✓ The selected JSON backup rebuilds the local SQLite database.</span><span>✓ Your OneDrive connection is kept for future backups.</span></div>
      {recovery.error&&<div className="recovery-error">{recovery.error}</div>}
      <div className="modal-actions recovery-actions"><button className="secondary" type="button" onClick={onSkip} disabled={recovery.restoring}>Start fresh</button><button className="primary" type="button" onClick={onRestore} disabled={!recovery.summary||recovery.loading||recovery.restoring}>{recovery.restoring?'Restoring…':'Restore selected backup'}</button></div>
    </div>
  </div>;
}

function PageContent(props){switch(props.active){case'dashboard':return <Dashboard {...props}/>;case'today':return <Today {...props}/>;case'matrix':return <Matrix {...props}/>;case'analytics':return <Analytics {...props}/>;case'calendar':return <CalendarPage {...props}/>;case'goals':return <Goals {...props}/>;case'achievements':return <Achievements {...props}/>;default:return <SettingsPage {...props}/>;}}
function Card({title,children,className=''}){return <div className={`card ${className}`}><div className="card-title">{title}</div>{children}</div>}
function Metric({label,value,meta,tone=''}){return <div className={`metric ${tone}`}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-meta">{meta}</div></div>}
function Progress({value}){return <div className="progress"><i style={{width:`${clamp(value,0,100)}%`}}/></div>}

function pctForLogs(activeHabits, logs, key){
  const l=logs?.[key]||{};
  if(!activeHabits.length)return 0;
  return Math.round(activeHabits.reduce((sum,h)=>sum+(l[h.id]==='done'?1:l[h.id]==='partial'?0.5:0),0)/activeHabits.length*100);
}
function calcDayScore(activeHabits, logs, d){return pctForLogs(activeHabits,logs,dateKey(d));}
function Dashboard({activeHabits,state,today,progress,totalXp,level,levelPct,currentStreak,best,challengeDay}){
 const weekly=Array.from({length:7},(_,i)=>{const d=dateFromKey(today);d.setDate(d.getDate()-(6-i));return {label:d.toLocaleDateString('en-US',{weekday:'short'}),value:calcDayScore(activeHabits,state.logs,d)}});
 const monthly=Array.from({length:12},(_,i)=>{const d=dateFromKey(today);d.setDate(1);d.setMonth(d.getMonth()-(11-i));const month=d.getMonth();const year=d.getFullYear();const days=new Date(year,month+1,0).getDate();let sum=0,count=0;for(let day=1;day<=days;day++){const x=new Date(year,month,day);if(x>dateFromKey(today))continue;sum+=calcDayScore(activeHabits,state.logs,x);count++;}return {label:d.toLocaleDateString('en-US',{month:'short'}),value:count?Math.round(sum/count):0}});
 const health=activeHabits.map(h=>{let earned=0;let possible=0;let doneDays=0;const last14=[];for(let i=13;i>=0;i--){const d=dateFromKey(today);d.setDate(d.getDate()-i);const v=state.logs[dateKey(d)]?.[h.id]||'';last14.push(v);if(v==='done'){earned++;doneDays++;}else if(v==='partial'){earned+=.5;}possible++;}return {...h,score:Math.round(earned/possible*100),doneDays,last14}}).sort((a,b)=>b.score-a.score);
 const xpInLevel=Math.min(300,totalXp%300);
 const trend=weekly.map(x=>x.value); const trendPath=trend.map((v,i)=>`${i===0?'M':'L'} ${8+(i*84/6)} ${96-(v*0.72)}`).join(' ');
 return <div className="grid dashboard-grid dashboard-pro">
  <div className="metrics">
   <Metric label="Challenge Day" value={`${challengeDay}/365`} meta={`${Math.round(challengeDay/365*100)}% of challenge`}/>
   <Metric label="Today's Score" value={`${progress}%`} meta={`${countDone(state.logs[today])}/${activeHabits.length} done`} tone="green"/>
   <Metric label="Current Streak" value={currentStreak} meta={`Best: ${best} days`} tone="yellow"/>
   <Metric label="Monthly Avg" value={`${monthly[monthly.length-1]?.value||0}%`} meta="Current month" tone="green"/>
   <Metric label="Total XP" value={totalXp} meta={`Level ${pad2(level)} • ${xpInLevel}/300 XP`} tone="violet"/>
   <Metric label="Active Habits" value={activeHabits.length} meta={`${state.habits.length-activeHabits.length} paused`}/>
  </div>
  <Card title="Weekly Performance" className="span-7 dashboard-chart-card">
   <div className="chart-head"><div><b>{Math.round(weekly.reduce((a,x)=>a+x.value,0)/weekly.length)}%</b><span>7-day average</span></div><div className="trend-badge">{weekly.at(-1).value>=weekly[0].value?'↗ Improving':'→ Steady'}</div></div>
   <div className="weekly-chart"><svg viewBox="0 0 520 120" preserveAspectRatio="none"><defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".24"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path className="area" d={`${trendPath} L 512 112 L 8 112 Z`}/><path className="line" d={trendPath}/>{trend.map((v,i)=><circle key={i} cx={8+(i*84)} cy={96-(v*.72)} r="4"/>)}</svg><div className="chart-labels">{weekly.map(x=><span key={x.label}>{x.label}</span>)}</div></div>
  </Card>
  <Card title="Streak Visualization" className="span-5">
    <div className="streak-hero"><div className="streak-number">{currentStreak}<small>days</small></div><div><b>Current streak</b><span>Keep today complete to extend it.</span></div></div>
    <div className="streak-track">{Array.from({length:14},(_,i)=>{const d=dateFromKey(today);d.setDate(d.getDate()-(13-i));const v=state.logs[dateKey(d)];const done=activeHabits.length&&activeHabits.every(h=>v?.[h.id]==='done');return <i key={i} className={done?'hot':v&&Object.values(v).some(x=>x==='done'||x==='partial')?'warm':''} title={dateKey(d)}/>})}</div>
    <div className="streak-legend"><span>14-day activity</span><b>Best {best}d</b></div>
  </Card>
  <Card title="Monthly Trend" className="span-7">
    <div className="monthly-bars">{monthly.map((x,i)=><div className="month-col" key={`${x.label}-${i}`}><span>{x.value}%</span><i style={{height:`${Math.max(6,x.value)}%`}}/><small>{x.label}</small></div>)}</div>
  </Card>
  <Card title="XP Progression" className="span-5">
    <div className="xp-level-row"><div className="xp-level">LEVEL {pad2(level)}</div><div className="xp-value">{totalXp.toLocaleString()} XP</div></div><Progress value={levelPct}/><div className="xp-foot"><span>{xpInLevel}/300 XP</span><span>{level<20?`${300-xpInLevel} XP to next`:'MAX LEVEL'}</span></div><div className="xp-pills"><span>Daily habits XP</span><b>+{activeHabits.reduce((a,h)=>a+h.xp,0)}</b></div></Card>
  <Card title="Habit Health" className="span-12">
    <div className="health-pro-grid">{health.map(h=><div className="health-pro" key={h.id}><div className="health-top"><div><b>{h.name}</b><span>{h.doneDays}/14 days completed</span></div><strong>{h.score}%</strong></div><div className="health-bar"><i style={{width:`${h.score}%`}}/></div><div className="health-dots">{h.last14.map((v,i)=><i key={i} className={v||'empty'}/>)}</div></div>)}</div>
  </Card>
  <Card title="Quick Focus" className="span-12"><div className="quick-grid"><div><Flame/><b>Build streak</b><span>Complete today's habits before sleep.</span></div><div><CandlestickChart/><b>Protect trading rules</b><span>Risk first. Profit second.</span></div><div><Dumbbell/><b>Build body</b><span>Move consistently every week.</span></div></div></Card>
 </div>
}

function RoutineCard({state,today,setState,progress,pending}){
 const items=[
  ['morning','Morning focus','Start the day without phone distraction.'],
  ['habits','Habit block',pending>0?`Finish ${pending} remaining habit${pending===1?'':'s'}.`:'All active habits are complete.'],
  ['review','Evening review',progress>=75?'Review today and protect the streak.':'Review misses and plan tomorrow.']
 ];
 const done=state.routine?.[today]||{};
 const toggle=id=>setState(s=>({...s,routine:{...(s.routine||{}),[today]:{...(s.routine?.[today]||{}),[id]:!s.routine?.[today]?.[id]}}}));
 const finished=items.filter(([id])=>done[id]).length;
 return <Card title="Daily Routine"><div className="routine-head"><div><b>{finished}/{items.length} routine steps</b><span>Simple checkpoints for a consistent day.</span></div><strong>{Math.round(finished/items.length*100)}%</strong></div><div className="routine-list">{items.map(([id,title,desc],i)=><button type="button" key={id} className={`routine-item ${done[id]?'done':''}`} onClick={()=>toggle(id)}><span className="routine-check">{done[id]?'✓':i+1}</span><span className="routine-copy"><b>{title}</b><small>{desc}</small></span><span className="routine-status">{done[id]?'DONE':'OPEN'}</span></button>)}</div></Card>
}

function Today({activeHabits,today,completed,partial,progress,setStatus,completeAll,resetToday,addHabit,updateHabit,removeHabit,toggleHabit,editing,setEditing,state,setState,selectedHabit,setSelectedHabit,xpFlash,celebrate,updateTodayNote}){
 const [name,setName]=useState('');const[xp,setXp]=useState(25);const[note,setNote]=useState(state.dailyNotes?.[today]||'');
 useEffect(()=>setNote(state.dailyNotes?.[today]||''),[today,state.dailyNotes]);
 const save=()=>{if(!name.trim())return;addHabit(name.trim(),xp);setName('');setXp(25);};
 const pending=Math.max(0,activeHabits.length-completed-partial);
 return <div className={`stack today-page ${celebrate?'celebrate':''}`}>
  {xpFlash&&<div key={xpFlash.id} className="xp-float" data-kind={xpFlash.kind}>{xpFlash.value}</div>}
  {celebrate&&<div className="complete-burst"><span>✓</span><b>DAY COMPLETE</b><small>Great work. Keep the streak alive.</small></div>}
  <div className="today-hero card"><div><div className="eyebrow">TODAY • {new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</div><h1>Build momentum, one habit at a time.</h1><p>{completed} done • {partial} partial • {pending} pending</p></div><div className="ring"><b>{progress}%</b><span>{completed}/{activeHabits.length}</span></div></div>
  <RoutineCard state={state} today={today} setState={setState} progress={progress} pending={pending}/>
  <Card title="Daily Habits"><div className="today-toolbar"><div><b>{completed}/{activeHabits.length} complete</b><span>Partial counts as 50% toward today's progress.</span></div><div className="today-actions"><button className="primary" onClick={completeAll} disabled={!activeHabits.length||completed===activeHabits.length}><Check size={15}/> Complete All</button><button className="secondary" onClick={resetToday}><RotateCcw size={15}/> Reset</button></div></div><div className="habit-list">{activeHabits.map(h=><HabitRow key={h.id} habit={h} state={state} today={today} onStatus={setStatus} onEdit={()=>setEditing(h.id)} onRemove={()=>removeHabit(h.id)} onToggle={()=>toggleHabit(h.id)} onInspect={()=>setSelectedHabit(h)}/>)}</div></Card>
  <Card title="Today's Note"><div className="daily-note-wrap"><textarea className="daily-note" value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>updateTodayNote(note)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){updateTodayNote(note);e.currentTarget.blur()}}} placeholder="Write a quick note about today's focus, wins, obstacles, or trading discipline..."/><div className="note-footer"><span>{note.length} characters</span><button className="secondary" onClick={()=>updateTodayNote(note)}><Save size={14}/> Save note</button></div></div></Card>
  <Card title="Habit Insights"><div className="insight-grid">{activeHabits.map(h=><HabitInsight key={h.id} habit={h} logs={state.logs} today={today} onOpen={()=>setSelectedHabit(h)}/>)}</div></Card>
  <Card title="Add Habit"><div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="Habit name"/><input type="number" min="1" max="200" value={xp} onChange={e=>setXp(e.target.value)}/><button className="primary" onClick={save}><Plus size={16}/> Add habit</button></div></Card>
  <Card title="Habit Management"><div className="habit-list compact">{state.habits.map(h=><div className={`manage-row ${h.active?'':'is-off'}`} key={h.id}><div><b>{h.name}</b><span>+{h.xp} XP • {h.active?'ACTIVE':'PAUSED'}</span></div><button className={`switch ${h.active?'on':''}`} onClick={()=>toggleHabit(h.id)}><span/></button></div>)}</div></Card>
  {editing&&<EditHabit habit={state.habits.find(h=>h.id===editing)} onClose={()=>setEditing(null)} onSave={(patch)=>{updateHabit(editing,patch);setEditing(null)}}/>}
  {selectedHabit&&<HabitDetails habit={selectedHabit} logs={state.logs} today={today} onClose={()=>setSelectedHabit(null)}/>}</div>;
}
function HabitRow({habit,onStatus,onEdit,onRemove,onInspect,onToggle,state,today}){const st=state?.logs?.[today]?.[habit.id]||'';return <div className={`habit-row ${st?`state-${st}`:''}`}><button className="habit-open" onClick={onInspect}><span className="habit-icon"><CircleCheck size={20}/></span><span className="habit-name">{habit.name}</span></button><span className="xp">+{habit.xp} XP</span><div className="status-buttons"><button className={`mini-btn done-btn ${st==='done'?'selected':''}`} aria-label="Done" aria-pressed={st==='done'} onClick={()=>onStatus(habit.id,'done')}><Check size={14}/></button><button className={`mini-btn partial-btn ${st==='partial'?'selected':''}`} aria-label="Partial" aria-pressed={st==='partial'} onClick={()=>onStatus(habit.id,'partial')}><Minus size={14}/></button><button className={`mini-btn miss-btn ${st==='missed'?'selected':''}`} aria-label="Missed" aria-pressed={st==='missed'} onClick={()=>onStatus(habit.id,'missed')}><X size={14}/></button></div><button className="icon-btn" onClick={onEdit}><Pencil size={15}/></button><button className="icon-btn" title="Toggle active" onClick={onToggle}><Power size={15}/></button><button className="icon-btn danger" onClick={onRemove}><Trash2 size={15}/></button></div>}

function HabitInsight({habit,logs,today,onOpen}){const xp=habitXP(logs,habit);const lvl=clamp(1+Math.floor(xp/300),1,20);const rate=habitRate(logs,habit);const cur=habitStreak(logs,habit,today);return <button className="insight-card" onClick={onOpen}><div><b>{habit.name}</b><span>LEVEL {pad2(lvl)} • {rate}% completion</span></div><div className="insight-right"><strong>{xp} XP</strong><small>{cur} day streak</small></div></button>}
function HabitDetails({habit,logs,today,onClose}){const xp=habitXP(logs,habit),lvl=clamp(1+Math.floor(xp/300),1,20),rate=habitRate(logs,habit),cur=habitStreak(logs,habit,today),best=habitBestStreak(logs,habit,today);return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal modal-wide" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><b>{habit.name}</b><span className="modal-sub">Habit performance profile</span></div><button className="icon-btn" onClick={onClose}><X size={17}/></button></div><div className="profile-grid"><Stat value={`LEVEL ${pad2(lvl)}`} label="Level"/><Stat value={`${xp} XP`} label="Total XP"/><Stat value={`${rate}%`} label="Completion"/><Stat value={cur} label="Current streak"/><Stat value={best} label="Best streak"/><Stat value={`+${habit.xp}`} label="XP when done"/></div><div className="habit-history"><b>Recent 14 days</b><div className="history-strip">{Array.from({length:14},(_,i)=>{const d=dateFromKey(today);d.setDate(d.getDate()-(13-i));const v=logs[dateKey(d)]?.[habit.id]||'';return <i key={i} className={v==='done'?'done':v==='partial'?'partial':v==='missed'?'missed':''} title={`${dateKey(d)} • ${v||'not logged'}`}/>})}</div></div></div></div>}
function EditHabit({habit,onClose,onSave}){const[name,setName]=useState(habit?.name||'');const[xp,setXp]=useState(habit?.xp||20);if(!habit)return null;return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><b>Edit habit</b><button className="icon-btn" onClick={onClose}><X size={17}/></button></div><input value={name} onChange={e=>setName(e.target.value)}/><input className="num" type="number" value={xp} onChange={e=>setXp(e.target.value)}/><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave({name:name.trim()||habit.name,xp:Number(xp)||habit.xp})}><Check size={15}/> Save</button></div></div></div>}

function Matrix({state,activeHabits}){
 const startKey=state.challengeStart||dateKey();
 const todayKey=dateKey();
 const startDate=dateFromKey(startKey);
 const days=Array.from({length:365},(_,i)=>{
   const d=new Date(startDate); d.setDate(d.getDate()+i);
   const k=dateKey(d); const l=state.logs?.[k]||{};
   const counts={done:0,partial:0,missed:0,pending:0};
   activeHabits.forEach(h=>{const v=l[h.id]; if(v==='done')counts.done++; else if(v==='partial')counts.partial++; else if(v==='missed')counts.missed++; else counts.pending++;});
   const v=activeHabits.length?Math.round((counts.done+counts.partial*.5)/activeHabits.length*100):0;
   const isFuture=k>todayKey, isToday=k===todayKey;
   let kind='empty';
   if(isFuture) kind='future';
   else if(activeHabits.length && counts.done===activeHabits.length) kind='complete';
   else if(counts.done||counts.partial) kind='partial';
   else if(counts.missed===activeHabits.length && activeHabits.length) kind='missed';
   return {k,v,counts,kind,isFuture,isToday};
 });
 const [selected,setSelected]=useState(null);
 const completedDays=days.filter(d=>!d.isFuture && d.v>=75).length;
 const perfectDays=days.filter(d=>!d.isFuture && d.kind==='complete').length;
 const missedDays=days.filter(d=>!d.isFuture && d.kind==='missed').length;
 const openDay=d=>{if(d.isFuture)return;setSelected(d);};
 return <div className="stack matrix-pro">
   <div className="matrix-summary">
     <Metric label="Challenge progress" value={`${completedDays}/365`} meta="Days at 75%+" tone="green"/>
     <Metric label="Perfect days" value={perfectDays} meta="100% completed" tone="violet"/>
     <Metric label="Missed days" value={missedDays} meta="Explicitly missed" tone="yellow"/>
     <Metric label="Current day" value={`${Math.min(365,Math.max(1,Math.floor((dateFromKey(todayKey)-startDate)/86400000)+1))}`} meta={todayKey} />
   </div>
   <Card title="365-Day Discipline Matrix">
     <div className="matrix-pro-head">
       <div><b>Challenge timeline</b><span>{startKey} → {dateKey(new Date(startDate.getFullYear(),startDate.getMonth(),startDate.getDate()+364))}</span></div>
       <div className="matrix-pro-tools"><span className="matrix-count">{completedDays} days at 75%+</span></div>
     </div>
     <div className="matrix-calendar-head"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
     <div className="matrix365-pro">
       {days.map((d,i)=><button key={d.k} type="button" disabled={d.isFuture} onClick={()=>openDay(d)} className={`matrix-cell-pro ${d.kind} ${d.isToday?'today':''}`} title={d.isFuture?`${d.k} • Future`:`${d.k} • ${d.v}% • ${d.counts.done} done, ${d.counts.partial} partial, ${d.counts.missed} missed`}>
         <span>{i+1}</span>
       </button>)}
     </div>
     <div className="matrix-progress-row"><span>{startKey}</span><div><i style={{width:`${Math.min(100,(days.filter(d=>!d.isFuture).length/365)*100)}%`}}/></div><span>Day 365</span></div>
   </Card>
   <Card title="Legend & Challenge Rules">
     <div className="legend matrix-legend">
       <span><i className="l done"/>100% Complete</span>
       <span><i className="l mid"/>Partial / 1+ completed</span>
       <span><i className="l miss"/>Missed</span>
       <span><i className="l future"/>Future</span>
       <span><i className="l today"/>Today</span>
     </div>
     <p className="matrix-rule">A challenge day counts toward progress when the overall day score reaches <b>75% or higher</b>. Click any completed/current/past cell to inspect that day's habit status and XP.</p>
   </Card>
   {selected&&<MatrixDayModal day={selected} activeHabits={activeHabits} logs={state.logs||{}} onClose={()=>setSelected(null)}/>} 
 </div>
}
function MatrixDayModal({day,activeHabits,logs,onClose}){
 const log=logs?.[day.k]||{};
 const earnedXp=activeHabits.reduce((sum,h)=>sum+(log[h.id]==='done'?Number(h.xp||0):log[h.id]==='partial'?Math.round(Number(h.xp||0)/2):0),0);
 return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal modal-wide matrix-day-modal" onMouseDown={e=>e.stopPropagation()}>
   <div className="modal-head"><div><b>{day.k}</b><span className="modal-sub">Day score {day.v}% • +{earnedXp} XP</span></div><button className="icon-btn" onClick={onClose}><X size={17}/></button></div>
   <div className="matrix-day-summary"><Stat value={`${day.v}%`} label="Day score"/><Stat value={`+${earnedXp}`} label="XP earned"/><Stat value={day.counts.done} label="Done"/><Stat value={day.counts.partial} label="Partial"/><Stat value={day.counts.missed} label="Missed"/></div>
   <div className="matrix-habit-list">{activeHabits.map(h=><MatrixHabitStatus key={h.id} habit={h} status={log[h.id]||''}/>)}</div>
 </div></div>
}
function MatrixHabitStatus({habit,status}){
 const cls=status==='done'?'done':status==='partial'?'partial':status==='missed'?'missed':'pending';
 const label=status||'not logged';
 return <div className="matrix-habit-status"><div><b>{habit.name}</b><span>{status==='done'?`+${habit.xp} XP`:status==='partial'?`+${Math.round(Number(habit.xp||0)/2)} XP`:'No XP'}</span></div><strong className={cls}>{label.toUpperCase()}</strong></div>
}
function Analytics({state,activeHabits,totalXp,progress}){const data=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));const l=state.logs[dateKey(d)]||{};return activeHabits.length?Math.round(activeHabits.reduce((s,h)=>s+(l[h.id]==='done'?1:l[h.id]==='partial'?.5:0),0)/activeHabits.length*100):0});const avg=Math.round(data.reduce((a,b)=>a+b,0)/data.length);const done=Object.values(state.logs).reduce((n,l)=>n+Object.values(l).filter(v=>v==='done').length,0);return <div className="grid two"><Card title="Performance Overview"><div className="stats-row"><Stat value={`${progress}%`} label="Today"/><Stat value={`${avg}%`} label="30-day average"/><Stat value={totalXp} label="Total XP"/></div><div className="big-chart"><span>Consistency trend</span><div className="line-chart">{data.map((v,i)=><i key={i} style={{height:`${Math.max(8,v)}%`}}/>)}</div></div></Card><Card title="Activity Summary"><div className="dist"><div><span>Completed habit checks</span><b>{done}</b></div><div><span>Tracked days</span><b>{Object.keys(state.logs).length}</b></div><div><span>Active habits</span><b>{activeHabits.length}</b></div></div></Card></div>}
function Stat({value,label}){return <div className="stat"><b>{value}</b><span>{label}</span></div>}

function CalendarPage({state,activeHabits}){const[month,setMonth]=useState(new Date());const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,total=new Date(y,m+1,0).getDate();const cells=[];for(let i=0;i<start;i++)cells.push(<div key={'e'+i} className="day empty"/>);for(let d=1;d<=total;d++){const k=dateKey(new Date(y,m,d));const l=state.logs[k]||{};const v=activeHabits.length?activeHabits.reduce((s,h)=>s+(l[h.id]==='done'?1:l[h.id]==='partial'?.5:0),0)/activeHabits.length:0;cells.push(<div key={d} className={`day ${v>=.8?'done':v>0?'partial':''}`}><b>{d}</b><small>{Math.round(v*100)}%</small></div>)}return <Card title={month.toLocaleString('en-US',{month:'long',year:'numeric'})}><div className="calendar-toolbar"><button className="secondary" onClick={()=>setMonth(new Date(y,m-1,1))}><ChevronLeft size={15}/></button><button className="secondary" onClick={()=>setMonth(new Date())}>Today</button><button className="secondary" onClick={()=>setMonth(new Date(y,m+1,1))}><ChevronRight size={15}/></button></div><div className="calendar-grid">{['M','T','W','T','F','S','S'].map((d,i)=><div className="dow" key={i}>{d}</div>)}{cells}</div></Card>}

function Goals({state,setState,progress,totalXp,challengeCompletedDays,addGoal,updateGoal,removeGoal}){
 const [title,setTitle]=useState(''); const [target,setTarget]=useState(30);
 const saveGoal=()=>{if(!title.trim())return;addGoal(title,target);setTitle('');setTarget(30);};
 const bump=(id)=>setState(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,value:Math.min(g.target,g.value+1)}:g)}));
 return <div className="stack"><div className="grid two"><Card title="Goals"><div className="goal-list">{state.goals.map(g=>{const value=g.id==='challenge'?challengeCompletedDays:g.value;return <div className="goal-item" key={g.id}><div className="goal-top"><div><b>{g.title}</b><span>{value} / {g.target}</span></div><div className="goal-actions">{g.id!=='challenge'&&<><button className="mini-btn done-btn" title="Add 1" onClick={()=>bump(g.id)}><Plus size={14}/></button><button className="icon-btn danger" title="Delete goal" onClick={()=>removeGoal(g.id)}><Trash2 size={14}/></button></>}</div></div><Progress value={value/g.target*100}/></div>})}</div></Card><Card title="Daily Missions"><Mission icon={<CircleCheck/>} title="Complete today habits" xp="+50 XP" done={progress>=75}/><Mission icon={<Dumbbell/>} title="Exercise session" xp="+30 XP" done={progress>=50}/><Mission icon={<CandlestickChart/>} title="Review trading rules" xp="+25 XP" done={totalXp>0}/></Card></div><Card title="Create Personal Goal"><div className="inline-form"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Goal title"/><input type="number" min="1" max="10000" value={target} onChange={e=>setTarget(e.target.value)}/><button className="primary" onClick={saveGoal}><Plus size={15}/> Add goal</button></div></Card></div>}

function Mission({icon,title,xp,done}){return <div className="mission">{icon}<span>{title}</span><b>{done?'DONE':xp}</b></div>}

function Achievements({state,totalXp,level,best,currentStreak}){const a=[['First Step','Complete your first habit',Object.values(state.logs).some(l=>Object.values(l).includes('done')),Award],['7 Day Flame','Reach a 7-day streak',Math.max(best,currentStreak)>=7,Flame],['XP Hunter','Earn 1000 XP',totalXp>=1000,Zap],['Disciplined','Reach Level 5',level>=5,Trophy],['Elite','Reach Level 10',level>=10,Trophy],['Unbreakable','Reach Level 20',level>=20,Trophy]];return <div className="grid three">{a.map(([t,d,on,I])=><div className={`achievement ${on?'unlocked':''}`} key={t}><div className="trophy"><I size={22}/></div><b>{t}</b><span>{d}</span><small>{on?'UNLOCKED':'LOCKED'}</small></div>)}</div>}

function SettingsPage(props){
  const {
    state={}, setState=()=>{}, playSound=()=>{}, exportBackup=()=>{}, importBackup=()=>{},
    installApp=async()=>{}, canInstall=false, storageReady=false,
    chooseOneDriveFolder=async()=>{}, disableOneDrive=()=>{}, writeOneDriveBackup=async()=>{},
    syncLatest=async()=>{}, sendNativeNotification=async()=>false, lastSaved=0, dbInfo=null, setNotice=()=>{}
  } = props;
  const fileRef=useRef(null);
  const reminders=state.reminders||{enabled:false,morning:'09:00',evening:'20:00'};
  const oneDrive=state.oneDriveBackup||{enabled:false,folderName:'',lastBackupAt:0,intervalMinutes:5};
  const [permission,setPermission]=useState('unsupported');
  useEffect(()=>{
    setPermission(typeof window!=='undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported');
  },[]);
  const ask=async()=>{
    try{
      if(!('Notification' in window)) return;
      const p=await window.Notification.requestPermission();
      setPermission(p);
      if(p==='granted') new window.Notification('HabitTracker Pro',{body:'Notifications are enabled.'});
    }catch(e){ setPermission('denied'); }
  };
  const testReminder=()=>{ try{ if(typeof Notification!=='undefined' && Notification.permission==='granted') new Notification('HabitTracker Pro',{body:'This is a reminder test — your daily routine notifications are working.'}); else setPermission('not enabled'); playSound('notify'); }catch(e){} };
  const testNativeReminder=async()=>{const ok=await sendNativeNotification('HabitTracker Pro','Native Windows notifications are working.'); if(!ok) setPermission('not enabled'); playSound('notify');};
  const setTheme=(theme)=>setState(s=>({...s,theme}));
  return <div className="grid two">
    <Card title="Appearance">
      <div className="setting-row"><div><b>Browser App</b><span>{storageReady?'Local browser storage is ready — your data stays in this browser.':'Preparing local browser storage…'}</span></div>{canInstall?<button className="secondary" onClick={installApp}>Install</button>:<span className="on">READY</span>}</div>
      <div className="setting-row"><div><b>Modern smooth UI</b><span>Hardware-friendly transform and opacity motion.</span></div><span className="on">ON</span></div>
      <div className="setting-row"><div><b>Rounded glass UI</b><span>Modern dark surfaces and soft depth.</span></div><span className="on">ON</span></div>
      <div className="setting-row"><div><b>Installable PWA</b><span>Install the tracker from a supported browser for a focused app-like window.</span></div>{canInstall?<button className="secondary" onClick={installApp}>Install</button>:<span className="on">READY</span>}</div>
      <div className="setting-row">
        <div><b>Appearance</b><span>Switch between dark and soft light mode. Your choice is saved locally.</span></div>
        <div className="theme-switcher" role="group" aria-label="Appearance theme">
          <button type="button" className={state.theme==='dark'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('dark')}><Moon size={15}/> Dark</button>
          <button type="button" className={state.theme==='light'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('light')}><Sun size={15}/> Light</button>
        </div>
      </div>
      <div className="kbd-hint">Quick navigation: press <kbd>1</kbd>–<kbd>8</kbd> to switch tabs.</div>
    </Card>
    <Card title="Sound">
      <div className="setting-row"><div><b>UI Sounds</b><span>Click and completion feedback.</span></div><button type="button" className={`switch ${state.sound?'on':''}`} onClick={()=>setState(s=>({...s,sound:!s.sound}))} aria-pressed={!!state.sound}><span/></button></div>
      <button className="primary" type="button" onClick={()=>playSound('success')}><Volume2 size={17}/> Test Sound</button>
    </Card>
    <Card title="Challenge & Reminders">
      <div className="setting-row"><div><b>365-day challenge start</b><span>Day 1 is calculated from this date.</span></div><input type="date" value={state.challengeStart||''} onChange={e=>setState(s=>({...s,challengeStart:e.target.value}))}/></div>
      <div className="setting-row"><div><b>Daily reminders</b><span>Notify at your selected morning/evening times while this app is open.</span></div><button type="button" className={`switch ${reminders.enabled?'on':''}`} onClick={()=>setState(s=>({...s,reminders:{...(s.reminders||reminders),enabled:!((s.reminders||reminders).enabled)}}))} aria-pressed={!!reminders.enabled}><span/></button></div>
      <div className="setting-row"><div><b>{typeof window!=='undefined' && isDesktop() ? 'Windows notifications' : 'Browser notifications'}</b><span>{permission==='granted'?'Permission granted':permission==='denied'?'Blocked':permission==='unsupported'?'Not supported':'Not enabled'}</span></div><div className="setting-actions"><button type="button" className="secondary" onClick={ask}><Bell size={15}/> Enable</button><button type="button" className="secondary" onClick={isDesktop()?testNativeReminder:testReminder}><Bell size={15}/> Test notification</button></div></div>
      <div className="setting-row"><div><b>Daily review reminder</b><span>Use the evening notification as a dedicated review prompt.</span></div><button type="button" className={`switch ${reminders.dailyReview?'on':''}`} onClick={()=>setState(s=>({...s,reminders:{...(s.reminders||reminders),dailyReview:!((s.reminders||reminders).dailyReview)}}))}><span/></button></div>
      <div className="inline-form"><label className="field"><span>Morning</span><input type="time" value={reminders.morning||'09:00'} onChange={e=>setState(s=>({...s,reminders:{...(s.reminders||reminders),morning:e.target.value}}))}/></label><label className="field"><span>Evening</span><input type="time" value={reminders.evening||'20:00'} onChange={e=>setState(s=>({...s,reminders:{...(s.reminders||reminders),evening:e.target.value}}))}/></label></div>
    </Card>
    <Card title="Data & Backup">
      <div className="backup-grid">
        <button className="secondary" type="button" onClick={exportBackup}><Download size={15}/> Export backup</button>
        <button className="secondary" type="button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Restore backup</button>
        <button className="secondary" type="button" onClick={()=>syncLatest()}><DatabaseBackup size={15}/> Sync local data</button>
        <button className="secondary" type="button" onClick={()=>writeOneDriveBackup(true)} disabled={!oneDrive.enabled}><RefreshCw size={15}/> Backup now</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.currentTarget.value='';}}/>
      </div>
      <div className="storage-status"><span className={storageReady?'status-dot ready':'status-dot'}></span><span>{storageReady?'Browser persistence ready':'Preparing local persistence'}</span>{lastSaved>0&&<small>Last saved {new Date(lastSaved).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>}</div>
      <div className="onedrive-box">
        <div className="onedrive-head"><div><b><Cloud size={15}/> OneDrive automatic backup</b><span>Backs up to a folder inside your local OneDrive sync directory.</span></div><span className={oneDrive.enabled?'on':'off'}>{oneDrive.enabled?'AUTO ON':'OFF'}</span></div>
        <div className="onedrive-actions"><button type="button" className="secondary" onClick={chooseOneDriveFolder}><FolderOpen size={15}/> {oneDrive.folderName?'Change OneDrive folder':'Choose OneDrive folder'}</button>{oneDrive.enabled&&<button type="button" className="secondary danger-action-inline" onClick={disableOneDrive}><CloudOff size={15}/> Disable</button>}</div>
        {oneDrive.enabled&&<>
          <div className="onedrive-meta"><span>Folder: <b>{oneDrive.folderName||'Connected'}</b></span><span>Every <b>{Math.max(1,Number(oneDrive.intervalMinutes)||5)} min</b></span><span>{oneDrive.lastBackupAt?`Last backup ${new Date(oneDrive.lastBackupAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Waiting for first backup'}</span></div>
          <label className="field inline-field"><span>Backup interval</span><select value={oneDrive.intervalMinutes||5} onChange={e=>setState(s=>({...s,oneDriveBackup:{...(s.oneDriveBackup||oneDrive),intervalMinutes:Number(e.target.value)}}))}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select></label>
          <p className="muted-note">Choose a synced OneDrive folder in a Chromium-based browser to store JSON backups locally. Browser folder permissions depend on your browser and operating system.</p>
        </>}
      </div>
      <button type="button" className="secondary danger-action" onClick={()=>{if(window.confirm('Reset all local data?')){localStorage.removeItem(STORAGE_KEY);dbSet('state',null).finally(()=>window.location.reload());}}}><RotateCcw size={15}/> Reset all local data</button>
    </Card>
  </div>;
}

function dayScore(log,habits){if(!habits.length)return 0;return habits.reduce((s,h)=>s+(log?.[h.id]==='done'?1:log?.[h.id]==='partial'?.5:0),0)/habits.length;}
function completedChallengeDays(logs,start,today,habits){const a=dateFromKey(start),b=dateFromKey(today);if(b<a)return 0;let n=0;const end=Math.min(365,Math.floor((b-a)/86400000)+1);for(let i=0;i<end;i++){const d=new Date(a);d.setDate(d.getDate()+i);if(dayScore(logs[dateKey(d)]||{},habits)>=.75)n++;}return n;}
function habitXP(logs,h){return Object.values(logs).reduce((s,l)=>s+(l?.[h.id]==='done'?h.xp:l?.[h.id]==='partial'?Math.round(h.xp/2):0),0);}
function habitRate(logs,h){let tracked=0,good=0;for(const l of Object.values(logs)){const v=l?.[h.id];if(v){tracked++;if(v==='done')good++;}}return tracked?Math.round(good/tracked*100):0;}
function habitStreak(logs,h,today){let n=0;const d=dateFromKey(today);for(let i=0;i<365;i++){if(logs[dateKey(d)]?.[h.id]==='done')n++;else break;d.setDate(d.getDate()-1);}return n;}
function habitBestStreak(logs,h,today){let best=0,cur=0;for(let i=364;i>=0;i--){const d=dateFromKey(today);d.setDate(d.getDate()-i);if(logs[dateKey(d)]?.[h.id]==='done'){cur++;best=Math.max(best,cur)}else cur=0;}return best;}

function countDone(log={}){return Object.values(log).filter(v=>v==='done').length;}
function streakFor(logs,today,habits){let n=0;const d=dateFromKey(today);for(let i=0;i<365;i++){const k=dateKey(d);const l=logs[k]||{};if(habits.length&&habits.every(h=>l[h.id]==='done'))n++;else break;d.setDate(d.getDate()-1)}return n;}
function bestStreak(logs,today,habits){let best=0,cur=0;for(let i=364;i>=0;i--){const d=dateFromKey(today);d.setDate(d.getDate()-i);const l=logs[dateKey(d)]||{};if(habits.length&&habits.every(h=>l[h.id]==='done')){cur++;best=Math.max(best,cur)}else cur=0;}return best;}
function habitLevel(logs,h,today){let xp=0;for(const log of Object.values(logs))xp+=log[h.id]==='done'?h.xp:log[h.id]==='partial'?Math.round(h.xp/2):0;return clamp(1+Math.floor(xp/300),1,20);}

createRoot(document.getElementById('root')).render(<App/>);
