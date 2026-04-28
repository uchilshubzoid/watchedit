import React, { useState, useRef, useEffect } from "react";
import { searchTitles } from "../api";
import { getEntries as loadStoredEntries, addEntry, updateEntry, deleteEntry, saveEntries, clearEntries } from "../db/storage";
import { getPreferredTitle } from "../utils/titleUtils";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  bgPrimary:   "#292826", surface:  "#333230", elevated: "#3E3C39",
  amber:       "#EF9F27", amberDeep:"#E8860A", amberSoft:"#FAC775", amberWarm:"#C8854A",
  textPrimary: "#F5F0E8", textMuted:"#9E9B96",
  font: "'Nunito', sans-serif", mono: "'Poppins', sans-serif",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const MOCK_ENTRIES = [
  { id:1,  title:"Frieren: Beyond Journey's End", type:"Anime",   lang:"Japanese", rating:9.0,  date:"Apr 10", status:"watching",  ep:18, total:28,   ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:true,  genre:["Fantasy","Adventure"],   lastWatchedDate:"2 days ago", watchTime:"~7h 12m",  estimated:true  },
  { id:2,  title:"Shōgun",                        type:"TV Show", lang:"English",  rating:null, date:"Apr 8",  status:"watching",  ep:4,  total:10,   ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:false, genre:["Drama","Historical"],    lastWatchedDate:"Yesterday",  watchTime:"~3h 0m",   estimated:true  },
  { id:3,  title:"Dandadan",                      type:"Anime",   lang:"Japanese", rating:8.5,  date:"Apr 9",  status:"watching",  ep:9,  total:null, ongoing:true,  rewatch:false, paused:false, dropped:false, bookmark:false, genre:["Action","Supernatural"], lastWatchedDate:"Today",      watchTime:"~3h 36m",  estimated:true  },
  { id:4,  title:"Oppenheimer",                   type:"Movie",   lang:"English",  rating:9.5,  date:"Apr 8",  status:"watched",   ep:null,total:null,ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:true,  genre:["Drama","Biography"],     finishedDate:"Apr 8, 2026",  watchTime:"3h 1m",    estimated:false },
  { id:5,  title:"Solo Leveling",                 type:"Anime",   lang:"Japanese", rating:7.5,  date:"Apr 5",  status:"watched",   ep:null,total:12, ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:false, genre:["Action","Fantasy"],      finishedDate:"Apr 5, 2026",  watchTime:"~9h 36m",  estimated:true  },
  { id:6,  title:"Severance",                     type:"TV Show", lang:"English",  rating:9.0,  date:"Mar 30",status:"watched",   ep:null,total:20, ongoing:false, rewatch:true,  paused:false, dropped:false, bookmark:true,  genre:["Thriller","Sci-Fi"],     finishedDate:"Mar 30, 2026", watchTime:"~13h 30m", estimated:true  },
  { id:7,  title:"Your Name",                     type:"Anime",   lang:"Japanese", rating:10,   date:"Mar 22",status:"watched",   ep:null,total:null,ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:false, genre:["Romance","Drama"],       finishedDate:"Mar 22, 2026", watchTime:"1h 46m",   estimated:false },
  { id:8,  title:"The Bear",                      type:"TV Show", lang:"English",  rating:8.5,  date:"Mar 18",status:"watched",   ep:null,total:23, ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:true,  genre:["Drama"],                 finishedDate:"Mar 18, 2026", watchTime:"~9h 0m",   estimated:true  },
  { id:9,  title:"Gintama",                       type:"Anime",   lang:"Japanese", rating:7.0,  date:"Feb 10",status:"watching",  ep:67, total:367,  ongoing:false, rewatch:false, paused:true,  dropped:false, bookmark:false, genre:["Comedy","Action"],       lastWatchedDate:"Feb 10",     watchTime:"~26h 48m", estimated:true  },
  { id:10, title:"Vinland Saga",                  type:"Anime",   lang:"Japanese", rating:6.5,  date:"Jan 20",status:"watching",  ep:20, total:24,   ongoing:false, rewatch:false, paused:false, dropped:true,  bookmark:false, genre:["Action","Historical"],   lastWatchedDate:"Jan 20",     watchTime:"~8h 0m",   estimated:true  },
  { id:11, title:"Dune: Part Two",                type:"Movie",   lang:"English",  rating:null, date:"Mar 1",  status:"watchplan", ep:null,total:null,ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:false, genre:["Sci-Fi","Adventure"],    watchTime:"2h 46m",   estimated:false },
  { id:12, title:"Blue Eye Samurai",              type:"TV Show", lang:"English",  rating:null, date:"Feb 14",status:"watchplan", ep:null,total:null,ongoing:false, rewatch:false, paused:false, dropped:false, bookmark:true,  genre:["Action","Historical"],   watchTime:null,       estimated:false },
];

const MOCK_SEARCH = {
  "frieren":    [{id:101,title:"Frieren: Beyond Journey's End",type:"Anime",  year:2023,source:"MAL", lang:"Japanese",episodes:28, runtime:null,epRuntime:24, genre:["Fantasy","Adventure"],  ongoing:false,inLog:false}],
  "severance":  [{id:102,title:"Severance",                   type:"TV Show",year:2022,source:"RT",  lang:"English", episodes:18, runtime:null,epRuntime:45, genre:["Thriller","Sci-Fi"],    ongoing:true, inLog:true }],
  "oppenheimer":[{id:103,title:"Oppenheimer",                 type:"Movie",  year:2023,source:"IMDB",lang:"English", episodes:null,runtime:181,epRuntime:null,genre:["Drama","Biography"],    ongoing:false,inLog:false}],
  "dune":       [{id:104,title:"Dune: Part Two",              type:"Movie",  year:2024,source:"IMDB",lang:"English", episodes:null,runtime:166,epRuntime:null,genre:["Sci-Fi","Adventure"],   ongoing:false,inLog:false},
                 {id:105,title:"Dune",                        type:"Movie",  year:2021,source:"IMDB",lang:"English", episodes:null,runtime:155,epRuntime:null,genre:["Sci-Fi","Adventure"],   ongoing:false,inLog:false}],
  "gintama":    [{id:106,title:"Gintama",                     type:"Anime",  year:2006,source:"MAL", lang:"Japanese",episodes:367,runtime:null,epRuntime:24, genre:["Comedy","Action"],       ongoing:false,inLog:true }],
};

const STATS = { totalWatched:47, watchTimeHours:312, estimated:true, categories:[{label:"Anime",count:21},{label:"Movie",count:14},{label:"TV Show",count:12}] };
const STREAK = 4; // days in a row
const COMMON_LANGUAGES = ["English","Japanese","Korean","Hindi","Tamil","Spanish","French","German","Italian","Mandarin"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(t) { const w=t.trim().split(/\s+/); return w.length===1?w[0].slice(0,2).toUpperCase():(w[0][0]+w[1][0]).toUpperCase(); }
function haptic(ms=10) { try{navigator.vibrate?.(ms);}catch(_){} }
function mockSearch(q) { q=q.toLowerCase().trim(); for(const[k,v]of Object.entries(MOCK_SEARCH)){if(q.includes(k)||k.includes(q))return v;} return q.length>2?[]:null; }

// Parse various date formats and return timestamp for sorting
function parseActivityDate(entry) {
  let dateStr = '';

  if (entry.status === 'watched') {
    dateStr = entry.finishedDate || '';
  } else if (entry.status === 'watching') {
    dateStr = entry.lastWatchedDate || '';
  } else if (entry.status === 'watchplan') {
    dateStr = entry.date || '';
  }

  if (!dateStr) return 0;

  // Handle relative dates
  if (dateStr === 'Today') return Date.now();
  if (dateStr === 'Yesterday') return Date.now() - 24 * 60 * 60 * 1000;

  // Handle "X days ago" format
  const daysAgoMatch = dateStr.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1]);
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  // Handle absolute dates like "Apr 8, 2026" or "Apr 8"
  try {
    // If no year, assume current year
    if (!dateStr.includes(',')) {
      dateStr += ', 2026';
    }
    return new Date(dateStr).getTime();
  } catch (e) {
    // Fallback to ID-based sorting if date parsing fails
    return entry.id;
  }
}

const TYPE_STYLES = {
  "Anime":  {bg:"rgba(239,159,39,0.13)", color:T.amber},
  "Movie":  {bg:"rgba(250,199,117,0.13)",color:T.amberSoft},
  "TV Show":{bg:"rgba(200,133,74,0.15)", color:T.amberWarm},
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = {
  Search:  ({s=20,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>,
  Home:    ({s=20,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  List:    ({s=20,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill={c} stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill={c} stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill={c} stroke="none"/></svg>,
  Profile: ({s=20,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Back:    ({c=T.textPrimary})=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Close:   ({s=18,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   ({s=14,c=T.amber})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Edit:    ({c=T.textMuted})=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Rewatch: ({c=T.textMuted})=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  Trash:   ({c="#C47A7A"})=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Filter:  ({s=14,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Play:    ({c=T.amber})=><svg width="16" height="16" viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Cal:     ({s=18,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Info:    ({s=16,c=T.textMuted})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="2.8"/><line x1="12" y1="11" x2="12" y2="16"/></svg>,
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Poster({title,size=44,url}) {
  const [imgErr,setImgErr]=useState(false);
  const h=Math.round(size*1.4);
  if(url&&!imgErr) return <img src={url} alt={title} onError={()=>setImgErr(true)} style={{width:size,height:h,borderRadius:10,flexShrink:0,objectFit:"cover",boxShadow:"0 3px 8px rgba(0,0,0,0.3)"}}/>;
  return <div style={{width:size,height:h,borderRadius:10,flexShrink:0,background:`linear-gradient(145deg,${T.amber},${T.amberDeep})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 8px rgba(0,0,0,0.3)"}}><span style={{color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:size*0.28}}>{initials(title)}</span></div>;
}
function TypePill({type}) {
  const s=TYPE_STYLES[type]||TYPE_STYLES["TV Show"];
  return <span style={{background:s.bg,color:s.color,fontFamily:T.font,fontWeight:600,fontSize:10,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{type}</span>;
}
function RatingNum({rating}) {
  return rating?<span style={{color:T.amber,fontFamily:T.mono,fontWeight:800,fontSize:16,lineHeight:1}}>{rating}</span>:<span style={{color:"rgba(245,240,232,0.45)",fontFamily:T.mono,fontSize:13}}>—</span>;
}
function TitleCard({e,showPoster=false,date,onClick}) {
  return <div onClick={onClick} style={{display:"flex",gap:12,alignItems:"center",cursor:"pointer"}}>
    {showPoster&&<Poster title={e.title} size={36}/>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</p>
        {e.rewatch&&<span style={{color:T.amberSoft,fontSize:12,flexShrink:0}}>↺</span>}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><TypePill type={e.type}/><span style={{color:T.textMuted,fontFamily:T.font,fontSize:10}}>· {date||e.lang||"—"}</span></div>
    </div>
    <RatingNum rating={e.rating}/>
  </div>;
}
function Card({children,style}) { return <div style={{background:T.surface,borderRadius:18,padding:16,...style}}>{children}</div>; }
function Divider() { return <div style={{height:1,background:"rgba(255,255,255,0.05)"}}/>; }
function SectionLabel({children}) { return <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>{children}</p>; }
function ActionBtn({icon,label,onClick,danger}) {
  return <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,background:T.elevated,border:"none",cursor:"pointer",borderRadius:20,padding:"7px 14px",fontFamily:T.font,fontWeight:600,fontSize:12,color:danger?"#C47A7A":T.textMuted}}>{icon}{label}</button>;
}
function BookmarkBorder() {
  return <div style={{position:"absolute",inset:0,borderRadius:18,pointerEvents:"none",zIndex:0,background:`linear-gradient(${T.surface},${T.surface}) padding-box,linear-gradient(to bottom,${T.amber} 0%,${T.amberDeep} 30%,${T.amber} 60%,rgba(255,255,255,0)) right / 4px 100% no-repeat border-box`,border:"1px solid rgba(239,159,39,0.12)"}}/>;
}
function Toggle({value,onChange,label}) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:14}}>{label}</span><button onClick={()=>onChange(!value)} style={{width:44,height:26,borderRadius:13,border:"none",cursor:"pointer",background:value?T.amber:T.elevated,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:20,height:20,borderRadius:"50%",background:T.textPrimary,position:"absolute",top:3,left:value?21:3,transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/></button></div>;
}
function InlineError({message}) {
  if(!message)return null;
  return <p style={{color:"#C47A7A",fontFamily:T.font,fontSize:12,marginTop:6,fontWeight:600}}>{message}</p>;
}
function Field({label,hint,error,children}) {
  return <div style={{display:"flex",flexDirection:"column",gap:6}}><div style={{display:"flex",justifyContent:"space-between"}}><p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</p>{hint&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{hint}</p>}</div>{children}<InlineError message={error}/></div>;
}
function GlobalRatings({ratings}) {
  const C={MAL:"#6B9BDF",IMDB:"#F5C518",RT:"#FA320A",TMDB:"#01B4E4"};
  const N={MAL:"MyAnimeList",IMDB:"IMDB",RT:"Rotten Tomatoes",TMDB:"TMDB"};
  return <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{ratings.map(({source,rating})=><div key={source} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C[source]||T.textMuted}}/><span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{N[source]||source}</span><span style={{color:T.textPrimary,fontFamily:T.mono,fontSize:12,fontWeight:600}}>{rating}</span></div>)}</div>;
}
function WatchDeets({items}) {
  return <div style={{display:"flex",flexDirection:"column"}}>{items.map((item,i)=><div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",paddingBottom:i<items.length-1?14:0}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",width:24,flexShrink:0}}><span style={{fontSize:14}}>{item.icon}</span>{i<items.length-1&&<div style={{width:1,flex:1,background:"rgba(255,255,255,0.06)",marginTop:6,minHeight:20}}/>}</div><div><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:13}}>{item.label}</p><p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,marginTop:2}}>{item.date}</p></div></div>)}</div>;
}

// ── Blocking popup ─────────────────────────────────────────────────────────────
function BlockingPopup({show,onClose,emoji,title,message,cta,ctaSecondary,onSecondary}) {
  if(!show)return null;
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:201,width:"calc(100% - 48px)",maxWidth:340,background:T.surface,borderRadius:24,padding:"28px 24px 24px",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
      <div style={{fontSize:48,marginBottom:16}}>{emoji}</div>
      <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:19,lineHeight:1.3,marginBottom:10}}>{title}</p>
      <p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,lineHeight:1.6,marginBottom:24}}>{message}</p>
      <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:16,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15}}>{cta}</button>
      {ctaSecondary&&<button onClick={onSecondary} style={{width:"100%",marginTop:10,padding:"12px",borderRadius:16,border:"none",cursor:"pointer",background:T.elevated,color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:14}}>{ctaSecondary}</button>}
    </div>
  </>;
}

function ConfirmModal({show,onClose,title,message,confirmLabel,onConfirm,danger=true}) {
  if(!show)return null;
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)"}}/>
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,maxWidth:430,margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px"}}>
      <div style={{width:36,height:4,background:T.elevated,borderRadius:4,margin:"0 auto 20px"}}/>
      <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:18,marginBottom:8}}>{title}</p>
      <p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,marginBottom:24}}>{message}</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} style={{flex:1,padding:14,background:T.elevated,border:"none",borderRadius:16,color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
        <button onClick={onConfirm} style={{flex:1,padding:14,background:danger?"rgba(196,122,122,0.2)":T.amber,border:danger?"1px solid rgba(196,122,122,0.3)":"none",borderRadius:16,color:danger?"#C47A7A":T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,cursor:"pointer"}}>{confirmLabel}</button>
      </div>
    </div>
  </>;
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({value,onChange}) {
  const stars=[1,2,3,4,5,6,7,8,9,10];
  const rowRef=useRef(null);
  const dragging=useRef(false);
  const lastRating=useRef(null);
  function ratingFromX(clientX) {
    const rect=rowRef.current.getBoundingClientRect();
    const x=Math.max(0,Math.min(clientX-rect.left,rect.width));
    const starW=rect.width/10;
    const idx=Math.floor(x/starW);
    return Math.min(10,x-idx*starW<starW/2?idx+0.5:idx+1);
  }
  function applyRating(r){if(r!==lastRating.current){lastRating.current=r;haptic(8);onChange(r);}}
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div ref={rowRef} onTouchStart={e=>{dragging.current=true;applyRating(ratingFromX(e.touches[0].clientX));}} onTouchMove={e=>{if(!dragging.current)return;e.preventDefault();applyRating(ratingFromX(e.touches[0].clientX));}} onTouchEnd={()=>{dragging.current=false;}} onMouseDown={e=>{dragging.current=true;applyRating(ratingFromX(e.clientX));}} onMouseMove={e=>{if(!dragging.current)return;applyRating(ratingFromX(e.clientX));}} onMouseUp={()=>{dragging.current=false;}} onMouseLeave={()=>{dragging.current=false;}} style={{display:"flex",gap:4,userSelect:"none",touchAction:"none",cursor:"pointer"}}>
        {stars.map(star=>{
          const full=value>=star,half=value>=star-0.5&&value<star;
          return <div key={star} onClick={e=>{if(dragging.current)return;const rect=e.currentTarget.getBoundingClientRect();const r=e.clientX-rect.left<rect.width/2?star-0.5:star;const next=r===value?null:r;if(next!==null)haptic(8);onChange(next);}} style={{flex:1,padding:"4px 2px"}}>
            <svg viewBox="0 0 24 24" style={{width:"100%",height:"auto",display:"block",maxWidth:28}}>
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={T.elevated} stroke="none"/>
              {(full||half)&&<><clipPath id={`c${star}`}><rect x="0" y="0" width={half?"50%":"100%"} height="100%"/></clipPath><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={T.amber} stroke="none" clipPath={`url(#c${star})`}/></>}
            </svg>
          </div>;
        })}
      </div>
      {value?<div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:32,lineHeight:1}}>{value%1===0?value:value.toFixed(1)}</span><span style={{color:T.textMuted,fontFamily:T.font,fontSize:14}}> / 10</span><button onClick={()=>{haptic(5);onChange(null);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontFamily:T.font,fontSize:11,marginLeft:8,padding:0}}>clear</button></div>:<p style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>Tap a star or drag to rate</p>}
    </div>
  );
}

// ── Language dropdown ─────────────────────────────────────────────────────────
function LanguageField({value,onChange}) {
  const [custom,setCustom]=useState(!COMMON_LANGUAGES.includes(value)&&value?value:"");
  const [showCustom,setShowCustom]=useState(!COMMON_LANGUAGES.includes(value)&&!!value);
  function select(lang){onChange(lang);setShowCustom(false);setCustom("");}
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {COMMON_LANGUAGES.map(l=><button key={l} onClick={()=>select(l)} style={{background:value===l?"rgba(239,159,39,0.15)":T.elevated,color:value===l?T.amber:T.textMuted,border:value===l?`1px solid rgba(239,159,39,0.3)`:"1px solid transparent",borderRadius:20,padding:"5px 12px",fontFamily:T.font,fontWeight:600,fontSize:11,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>)}
        <button onClick={()=>{setShowCustom(true);onChange("");}} style={{background:showCustom?"rgba(239,159,39,0.15)":T.elevated,color:showCustom?T.amber:T.textMuted,border:showCustom?`1px solid rgba(239,159,39,0.3)`:"1px solid transparent",borderRadius:20,padding:"5px 12px",fontFamily:T.font,fontWeight:600,fontSize:11,cursor:"pointer"}}>Other</button>
      </div>
      {showCustom&&<input value={custom} onChange={e=>{setCustom(e.target.value);onChange(e.target.value);}} placeholder="Type language..." style={{background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14,width:"100%"}} autoFocus/>}
    </div>
  );
}

// ── Genre editor with inline create ──────────────────────────────────────────
function GenreEditor({tags,onChange}) {
  const [input,setInput]=useState("");
  const [adding,setAdding]=useState(false);
  function add(){const t=input.trim();if(t&&!tags.includes(t)){onChange([...tags,t]);}setInput("");setAdding(false);}
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
      {tags.map(tag=><span key={tag} style={{display:"flex",alignItems:"center",gap:4,background:T.elevated,color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:11,padding:"5px 10px",borderRadius:20}}>{tag}<button onClick={()=>onChange(tags.filter(t=>t!==tag))} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:14,padding:0,lineHeight:1}}>×</button></span>)}
      {adding?(
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape"){setAdding(false);setInput("");}}} placeholder="Tag name..." autoFocus style={{background:T.elevated,border:`1px solid ${T.amber}`,outline:"none",borderRadius:12,padding:"5px 10px",color:T.textPrimary,fontFamily:T.font,fontSize:11,width:100}}/>
          <button onClick={add} style={{background:T.amber,border:"none",cursor:"pointer",borderRadius:10,padding:"5px 10px",color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:11}}>Add</button>
          <button onClick={()=>{setAdding(false);setInput("");}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:16,padding:0}}>×</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(239,159,39,0.08)",border:`1px dashed rgba(239,159,39,0.3)`,borderRadius:20,padding:"5px 12px",cursor:"pointer",color:T.amber,fontFamily:T.font,fontWeight:600,fontSize:11}}>+ Add Tag</button>
      )}
    </div>
  );
}

// ── Episode picker ────────────────────────────────────────────────────────────
function EpisodePicker({total,ongoing,value,onChange}) {
  const count=ongoing?24:(total||24);
  return <div><p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,marginBottom:10}}>{ongoing?"Which episode have you watched up to?":`Select episode (1–${total})`}</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Array.from({length:count},(_,i)=>i+1).map(ep=><button key={ep} onClick={()=>onChange(ep)} style={{width:38,height:38,borderRadius:10,border:value===ep?`1.5px solid ${T.amber}`:"1.5px solid transparent",cursor:"pointer",background:value>=ep?"rgba(239,159,39,0.15)":T.elevated,color:value>=ep?T.amber:T.textMuted,fontFamily:T.mono,fontWeight:value===ep?800:500,fontSize:12}}>{ep}</button>)}</div></div>;
}

function WatchTimeDisplay({epRuntime,episodeCount,isMovie,movieRuntime,isCurrent,epWatched,runtimeMode,customRuntime}) {
  if(isMovie){if(!movieRuntime)return null;return<div style={{background:T.elevated,borderRadius:12,padding:"10px 14px"}}><p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Watch Time</p><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14}}>{Math.floor(movieRuntime/60)}h {movieRuntime%60}m<span style={{color:T.textMuted,fontSize:11,marginLeft:6}}>fetched</span></p></div>;}
  const rt=runtimeMode==="custom"?parseInt(customRuntime):epRuntime;
  if(!rt)return null;
  const eps=isCurrent?epWatched:(parseInt(episodeCount)||0);
  if(eps===0)return null;
  const total=rt*eps;
  return<div style={{background:T.elevated,borderRadius:12,padding:"10px 14px"}}><p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Watch Time</p><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>{rt} min/ep</span><span style={{color:T.elevated,fontSize:12}}>×</span><span style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>{eps} eps</span><span style={{color:T.elevated,fontSize:12}}>=</span><span style={{color:T.amber,fontFamily:T.mono,fontWeight:700,fontSize:15}}>{Math.floor(total/60)>0?`${Math.floor(total/60)}h `:""}{total%60}m</span><span style={{color:T.textMuted,fontFamily:T.font,fontSize:10}}>est.</span></div></div>;
}

// ── Consolidated Filter Sheet ─────────────────────────────────────────────────
const SORT_OPTIONS = ["Most Recent Activity","New to Old","Old to New","Rated High to Low","Rated Low to High","A-Z","Z-A"];
const LANGUAGES_FILTER = ["English","Japanese","Korean","Hindi","Tamil","Spanish","French"];

function FilterSheet({show,onClose,sort,onSort,activeChips,onToggleChip,showPaused,onTogglePaused,tab,language,onLanguage,selectedGenres,onToggleGenre,onClearAll,genres=[],unrated,onToggleUnrated}) {
  const [selectedCategory, setSelectedCategory] = useState('sort');
  if(!show)return null;
  const chips=["Anime","Movie","TV Show","Rewatched","Dropped"];
  const hasActiveFilters = activeChips.length > 0 || language || selectedGenres.length > 0 || unrated || (tab === "watching" && showPaused);

  // Collect all active filters for the top row
  const activeFilters = [];
  if(sort !== "Most Recent Activity") activeFilters.push({type: 'sort', label: sort, onRemove: () => onSort("Most Recent Activity")});
  activeChips.forEach(chip => activeFilters.push({type: 'category', label: chip, onRemove: () => onToggleChip(chip)}));
  if(language) activeFilters.push({type: 'language', label: language, onRemove: () => onLanguage("")});
  selectedGenres.forEach(genre => activeFilters.push({type: 'genre', label: genre, onRemove: () => onToggleGenre(genre)}));
  if(tab === "watching" && showPaused) activeFilters.push({type: 'paused', label: 'Show Paused', onRemove: () => onTogglePaused(false)});
  if(unrated) activeFilters.push({type: 'unrated', label: 'Unrated only', onRemove: () => onToggleUnrated(false)});

  const categories = [
    {id: 'sort', label: 'Sort', icon: '📊'},
    {id: 'category', label: 'Category', icon: '🏷️'},
    {id: 'language', label: 'Language', icon: '🌍'},
    {id: 'genre', label: 'Genre', icon: '🎭'},
    ...(tab === "watching" ? [{id: 'paused', label: 'Paused', icon: '⏸️'}] : [])
  ];

  const renderRightPane = () => {
    switch(selectedCategory) {
      case 'sort':
        return (
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Sort Options</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {SORT_OPTIONS.map(s=><button key={s} onClick={()=>onSort(s)} style={{background:sort===s?T.amber:T.elevated,color:sort===s?T.bgPrimary:T.textMuted,border:"none",cursor:"pointer",borderRadius:12,padding:"12px 16px",fontFamily:T.font,fontWeight:600,fontSize:13,textAlign:"left",transition:"all 0.15s"}}>{s}</button>)}
            </div>
          </div>
        );
      case 'category':
        return (
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Content Types</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {chips.map(chip=>{const active=activeChips.includes(chip);return<button key={chip} onClick={()=>onToggleChip(chip)} style={{background:active?T.amber:T.elevated,color:active?T.bgPrimary:T.textMuted,border:"none",cursor:"pointer",borderRadius:12,padding:"12px 16px",fontFamily:T.font,fontWeight:600,fontSize:13,textAlign:"left",transition:"all 0.15s"}}>{chip}</button>;})}
            </div>
          </div>
        );
      case 'language':
        return (
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Languages</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {LANGUAGES_FILTER.map(l=>{const active=language===l;return<button key={l} onClick={()=>onLanguage(active?"":l)} style={{background:active?T.amber:T.elevated,color:active?T.bgPrimary:T.textMuted,border:"none",cursor:"pointer",borderRadius:12,padding:"12px 16px",fontFamily:T.font,fontWeight:600,fontSize:13,textAlign:"left",transition:"all 0.15s"}}>{l}</button>;})}
            </div>
          </div>
        );
      case 'genre':
        return (
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Genres</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:300,overflowY:"auto"}}>
              {genres.map(g=>{const active=selectedGenres.includes(g);return<button key={g} onClick={()=>onToggleGenre(g)} style={{background:active?T.amber:T.elevated,color:active?T.bgPrimary:T.textMuted,border:"none",cursor:"pointer",borderRadius:12,padding:"12px 16px",fontFamily:T.font,fontWeight:600,fontSize:13,textAlign:"left",transition:"all 0.15s"}}>{g}</button>;})}
            </div>
          </div>
        );
      case 'paused':
        return (
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Watching Options</p>
            <div style={{padding:"16px 0"}}>
              <Toggle value={showPaused} onChange={onTogglePaused} label="Show Paused entries"/>
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:80,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,maxWidth:430,margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",height:"85vh",display:"flex",flexDirection:"column"}} className="hs">
      <div style={{width:36,height:4,background:T.elevated,borderRadius:4,margin:"0 auto 20px"}}/>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:18}}>Filter & Sort</p>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {hasActiveFilters && <button onClick={onClearAll} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:14,padding:0}}>Clear all</button>}
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ico.Close/></button>
        </div>
      </div>

      {/* Active Filters Row */}
      {activeFilters.length > 0 && (
        <div style={{marginBottom:24}}>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Active Filters</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activeFilters.map((filter, index) => (
              <div key={index} style={{display:"flex",alignItems:"center",gap:6,background:T.elevated,borderRadius:20,padding:"6px 12px 6px 16px"}}>
                <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{filter.label}</span>
                <button onClick={filter.onRemove} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:16,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{display:"flex",flex:1,minHeight:0,gap:20}}>
        {/* Left Column - Categories */}
        <div style={{width:120,borderRight:"1px solid rgba(255,255,255,0.1)",paddingRight:16}}>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Filters</p>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:8,
                  background:selectedCategory===cat.id?T.elevated:"transparent",
                  color:selectedCategory===cat.id?T.amber:T.textMuted,
                  border:selectedCategory===cat.id?`1px solid rgba(239,159,39,0.3)`:"1px solid transparent",
                  borderRadius:8,
                  padding:"8px 12px",
                  fontFamily:T.font,
                  fontWeight:selectedCategory===cat.id?600:500,
                  fontSize:13,
                  cursor:"pointer",
                  textAlign:"left",
                  transition:"all 0.15s"
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Options */}
        <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
          {renderRightPane()}
        </div>
      </div>

      <div style={{marginTop:24,borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:20}}>
        <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Completeness</p>
        <div style={{background:T.elevated,borderRadius:18,padding:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div style={{flex:1}}><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14}}>Unrated only</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:4}}>Show only watched entries that still need a rating.</p></div>
          <Toggle value={unrated} onChange={onToggleUnrated} label=""/>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <button onClick={onClose} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:16,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15}}>Apply</button>
      </div>
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── WATCH TOWER ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const STREAK_COPY = {
  2: ["On a roll 🎬","2 days in a row"],
  3: ["Building momentum ⚡","3 days straight!"],
  4: ["4 days running 🔥","Remember to stretch"],
  7: ["A whole week! 🏆","Incredible dedication"],
  14:["Two weeks straight 👀","We're not judging"],
};
function getStreakCopy(n) {
  const keys=Object.keys(STREAK_COPY).map(Number).sort((a,b)=>b-a);
  const k=keys.find(k=>n>=k);
  return k?STREAK_COPY[k]:null;
}

function WatchTower({entries,onNavigate,onOpenDetail}) {
  const [streakDismissed,setStreakDismissed]=useState(false);
  const watching=entries.filter(e=>e.status==="watching"&&!e.paused&&!e.dropped);
  const recent=entries.filter(e=>e.status==="watched").slice(0,3); // 3 only
  const flaggedCount=entries.filter(e=>e.status==="watched"&&!e.rating).length;
  const streakCopy=getStreakCopy(STREAK);

  return <div style={{display:"flex",flexDirection:"column",gap:24,paddingBottom:8}}>
    {/* Stats */}
    <Card style={{position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(239,159,39,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{textAlign:"center",position:"relative"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:T.elevated,borderRadius:20,padding:"4px 12px",marginBottom:14}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:T.amber}}/><span style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.08em"}}>Last 30 days</span>
        </div>
        <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Titles Watched</p>
        <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:80,lineHeight:1}}>{STATS.totalWatched}</p>
        <p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,marginTop:8}}>{STATS.estimated?"~":""}{STATS.watchTimeHours}h watched</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16,flexWrap:"wrap"}}>
          {STATS.categories.map(({label,count})=><div key={label} style={{background:T.elevated,borderRadius:22,padding:"6px 14px",display:"flex",gap:6,alignItems:"center"}}><span style={{color:T.textMuted,fontFamily:T.font,fontWeight:500,fontSize:11}}>{label}</span><span style={{color:T.amber,fontFamily:T.mono,fontWeight:600,fontSize:11}}>{count}</span></div>)}
        </div>
        <button onClick={()=>onNavigate("stats")} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:12,marginTop:14,padding:0,textDecoration:"underline",textUnderlineOffset:3}}>See your stats →</button>
      </div>
    </Card>

    {/* Flagged rating nudge */}
    {flaggedCount>0&&(
      <div style={{background:"rgba(239,159,39,0.08)",border:"1px solid rgba(239,159,39,0.15)",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:18,flexShrink:0}}>⭐</span>
        <div style={{flex:1}}>
          <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14}}>{flaggedCount} watches without a rating</p>
          <button onClick={()=>onNavigate("watchlist",{subTab:"watched",unrated:true})} style={{background:"none",border:"none",cursor:"pointer",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:12,padding:0,textAlign:"left"}}>How did they land? Rate them →</button>
        </div>
      </div>
    )}

    {/* Streak banner — commented out, re-enable when streak feature is built
    {STREAK>=2&&!streakDismissed&&streakCopy&&(
      <div style={{background:"rgba(239,159,39,0.1)",border:`1px solid rgba(239,159,39,0.2)`,borderRadius:16,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24,flexShrink:0}}>🔥</span>
        <div style={{flex:1}}>
          <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:14}}>{streakCopy[0]}</p>
          <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,marginTop:2}}>{streakCopy[1]} · <span style={{color:T.amberSoft,fontFamily:T.mono,fontWeight:600}}>{STREAK} day streak</span></p>
        </div>
        <button onClick={()=>setStreakDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:4,flexShrink:0}}><Ico.Close s={14}/></button>
      </div>
    )}
    */}

    {/* Currently Watching — more prominent */}
    <div>
      <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:17,letterSpacing:"-0.01em",marginBottom:12}}>Currently Watching</p>
      <div className="hs" style={{display:"flex",gap:12,overflowX:"auto",margin:"0 -16px",padding:"0 16px 4px"}}>
        {watching.map(e=><div key={e.id} onClick={()=>onOpenDetail(e)} style={{width:190,flexShrink:0,background:T.surface,borderRadius:18,padding:"14px",display:"flex",flexDirection:"column",gap:10,cursor:"pointer"}}>
          <div style={{display:"flex",gap:10}}>
            <Poster title={e.title} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <TypePill type={e.type}/>
              <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:13,lineHeight:1.35,height:35,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginTop:6}}>{e.title}</p>
            </div>
          </div>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10}}>{e.ongoing?`${e.ep} eps · Ongoing`:`Ep ${e.ep} of ${e.total}`}</p>
          <p style={{color:T.textMuted,fontFamily:T.font,fontSize:10}}>Last: <span style={{color:T.textPrimary,fontWeight:600}}>{e.lastWatchedDate}</span></p>
        </div>)}
      </div>
    </div>

    {/* Recently Watched — 3 only */}
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:17,letterSpacing:"-0.01em"}}>Recently Watched</p>
        <button onClick={()=>onNavigate("watchlist",{subTab:"watched"})} style={{background:"none",border:"none",cursor:"pointer",color:T.amber,fontFamily:T.font,fontWeight:600,fontSize:12,padding:0}}>View all →</button>
      </div>
      <Card>
        {recent.map((e,i)=><><div key={e.id} style={{paddingBottom:i<recent.length-1?14:0,marginBottom:i<recent.length-1?14:0,borderBottom:i<recent.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}><TitleCard e={e} date={formatDateWithYear(e.finishedDate||e.date)} onClick={()=>onOpenDetail(e)}/></div></> )}
      </Card>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── WATCHLIST ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TABS=[{id:"all",label:"All"},{id:"watching",label:"Watching"},{id:"watched",label:"Watched"},{id:"watchplan",label:"Watch Plan"},{id:"bookmarks",label:"Bookmarks"}];

function statusColor(e) {
  if(e.dropped) return "#C47A7A";
  if(e.paused)  return "#8BA3C4";
  if(e.status==="watching")  return T.amber;
  if(e.status==="watched")   return T.amberDeep;
  if(e.status==="watchplan") return T.amberSoft;
  return T.textMuted;
}

// ── WatchCardA — 3-line design ────────────────────────────────────────────────
function formatDateWithYear(dateStr) {
  if(!dateStr) return dateStr;
  if(/\d{4}/.test(dateStr)) return dateStr;
  return `${dateStr}, 2026`;
}

function WatchCardA({e,isBookmarked,onBookmark,onOpenDetail,onRate}) {
  const dateLine=(()=>{
    if(e.status==="watchplan")  return "Yet to watch";
    if(e.dropped)               return `Dropped on ${e.date}`;
    if(e.paused)                return `Paused on ${e.lastWatchedDate||e.date}`;
    if(e.status==="watching")   return e.lastWatchedDate?`Last watched ${e.lastWatchedDate}`:e.date;
    if(e.status==="watched")    return formatDateWithYear(e.finishedDate||e.date);
    return e.finishedDate||e.date;
  })();
  const progressLine=(()=>{
    if(e.dropped)              return e.ongoing?`${e.ep} eps · Ongoing`:`${e.ep} of ${e.total} eps watched`;
    if(e.paused)               return e.ongoing?`${e.ep} eps · Ongoing`:`${e.ep} of ${e.total} eps watched`;
    if(e.status==="watching")  return e.ongoing?`${e.ep} eps · Ongoing`:`${e.ep} of ${e.total} eps watched`;
    if(e.status==="watched"){
      if(e.type==="Movie")     return e.watchTime||null;
      return e.total?`${e.total} episodes`:null;
    }
    return null;
  })();
  return (
    <div onClick={()=>onOpenDetail?.(e)} style={{background:T.surface,borderRadius:16,position:"relative",cursor:"pointer",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:statusColor(e)}}/>
      <div style={{padding:"12px 14px 12px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
        <Poster title={e.title} size={42}/>
        {/* text + right column share a stretch wrapper so they size against each other, not the poster */}
        <div style={{flex:1,minWidth:0,display:"flex",alignItems:"stretch",gap:8}}>
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:3}}>
            <p style={{margin:0,color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:16,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</p>
            <p style={{margin:0,color:T.textPrimary,fontFamily:T.font,fontWeight:500,fontSize:12}}>{dateLine}{e.rewatch&&<span style={{color:T.amberSoft,fontSize:14,marginLeft:6}}>↺</span>}</p>
            <p style={{margin:0,color:T.textMuted,fontFamily:T.font,fontSize:10}}>{e.type}{progressLine&&<><span style={{opacity:0.4}}> · </span><span style={{fontFamily:T.mono,fontWeight:600}}>{progressLine}</span></>}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",alignItems:"center",flexShrink:0,minWidth:24}}>
            <RatingNum rating={e.rating}/>
            <div onClick={ev=>{ev.stopPropagation();onBookmark?.(e.id);}} style={{cursor:"pointer",lineHeight:0}}>
              <svg width="12" height="18" viewBox="0 0 12 18">
                <path d="M 0,0 L 12,0 L 12,18 L 6,13 L 0,18 Z" fill={isBookmarked?T.amber:"transparent"} stroke={isBookmarked?T.amber:"rgba(239,159,39,0.4)"} strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {e.status==="watched"&&!e.rating&&onRate&&(
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"8px 14px 8px 18px",display:"flex",justifyContent:"flex-end"}}>
          <button onClick={ev=>{ev.stopPropagation();onRate(e);}} style={{background:"rgba(239,159,39,0.12)",border:"none",cursor:"pointer",borderRadius:20,padding:"5px 12px",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:11}}>Rate it ★</button>
        </div>
      )}
    </div>
  );
}


function WatchList({entries,onOpenDetail,onUpdateEntry,initialTab="all",initialUnrated=false}) {
  const [tab,setTab]=useState(initialTab);
  const [ratingEntry,setRatingEntry]=useState(null);
  const [chips,setChips]=useState([]);
  const [selectedGenres,setSelectedGenres]=useState([]);
  const [sort,setSort]=useState("Most Recent Activity");
  const [showPaused,setShowPaused]=useState(false);
  const [language,setLanguage]=useState("");
  const [search,setSearch]=useState("");
  const [filterOpen,setFilterOpen]=useState(false);
  const [bookmarkedIds,setBookmarkedIds]=useState(new Set());
  const [unrated,setUnrated]=useState(initialUnrated);
  useEffect(()=>{setBookmarkedIds(new Set(entries.filter(e=>e.bookmark).map(e=>e.id)));},[entries]);
  function toggleBookmark(id){setBookmarkedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});}

  const activeFilterCount=[...chips,language?1:0,selectedGenres.length,unrated?1:0,showPaused&&tab==="watching"?1:0].filter(Boolean).length;

  useEffect(()=>{setTab(initialTab);setUnrated(initialUnrated);},[initialTab,initialUnrated]);

  function filterEntries() {
    let list=[...entries];
    if(tab==="watching")  list=list.filter(e=>e.status==="watching"&&!e.dropped);
    if(tab==="watched")   list=list.filter(e=>e.status==="watched");
    if(tab==="watchplan") list=list.filter(e=>e.status==="watchplan");
    if(tab==="bookmarks") list=list.filter(e=>bookmarkedIds.has(e.id));
    if(tab==="watching"&&!showPaused) list=list.filter(e=>!e.paused);
    const activeTypeChips=chips.filter(c=>["Anime","Movie","TV Show"].includes(c));
    if(activeTypeChips.length) list=list.filter(e=>activeTypeChips.includes(e.type));
    if(chips.includes("Rewatched")) list=list.filter(e=>e.rewatch);
    if(chips.includes("Dropped"))   list=list.filter(e=>e.dropped);
    if(language) list=list.filter(e=>e.lang===language);
    if(selectedGenres.length) list=list.filter(e=>selectedGenres.some(g=>(e.genre||[]).includes(g)));
    if(unrated) list=list.filter(e=>e.status==="watched"&&!e.rating);
    if(search.trim()){const q=search.toLowerCase();list=list.filter(e=>e.title.toLowerCase().includes(q)||e.type.toLowerCase().includes(q)||(e.lang||"").toLowerCase().includes(q)||(e.genre||[]).some(g=>g.toLowerCase().includes(q)));}
    if(sort==="Most Recent Activity") list.sort((a,b)=>parseActivityDate(b)-parseActivityDate(a));
    if(sort==="New to Old")        list.sort((a,b)=>b.id-a.id);
    if(sort==="Old to New")        list.sort((a,b)=>a.id-b.id);
    if(sort==="Rated High to Low") list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    if(sort==="Rated Low to High") list.sort((a,b)=>(a.rating||0)-(b.rating||0));
    if(sort==="A-Z")               list.sort((a,b)=>a.title.localeCompare(b.title));
    if(sort==="Z-A")               list.sort((a,b)=>b.title.localeCompare(a.title));
    return list;
  }
  const filtered=filterEntries();
  const genresFilter=Array.from(new Set(entries.flatMap(e=>e.genre||[]))).sort();

  return <div style={{display:"flex",flexDirection:"column"}}>
    {/* Sticky header */}
    <div style={{position:"sticky",top:52,zIndex:20,background:"rgba(41,40,38,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      {/* Search */}
      <div style={{padding:"10px 16px 8px"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",background:T.surface,borderRadius:14,padding:"9px 14px"}}>
          <Ico.Search s={15}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles, genres, languages..." style={{flex:1,background:"none",border:"none",outline:"none",color:T.textPrimary,fontFamily:T.font,fontSize:13}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18,padding:0,lineHeight:1}}>×</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="hs" style={{display:"flex",overflowX:"auto",padding:"0 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        {TABS.map(t=>{const active=tab===t.id;return<button key={t.id} onClick={()=>{setTab(t.id);setChips([]);setLanguage("");setSelectedGenres([]);}} style={{background:"none",border:"none",cursor:"pointer",padding:"10px 14px",whiteSpace:"nowrap",fontFamily:T.font,fontWeight:active?700:500,fontSize:13,color:active?T.amber:T.textMuted,borderBottom:active?`2px solid ${T.amber}`:"2px solid transparent",marginBottom:-1,transition:"color 0.15s"}}>{t.label}</button>;})}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px 12px",overflow:"hidden"}}>
        <div style={{display:"flex",gap:10,overflowX:"auto",flex:1,WebkitOverflowScrolling:"touch",paddingBottom:2,scrollbarWidth:"none"}}>
          {["Anime","Movie","TV Show"].map(type => {
            const active=chips.includes(type);
            return <button key={type} onClick={()=>setChips(prev=>{
              const typeGroup=["Anime","Movie","TV Show"];
              return prev.includes(type)
                ? prev.filter(c=>c!==type)
                : [...prev.filter(c=>!typeGroup.includes(c)),type];
            })} style={{flexShrink:0,border:"none",cursor:"pointer",borderRadius:999,padding:"8px 14px",fontFamily:T.font,fontSize:12,fontWeight:600,color:active?T.bgPrimary:T.textMuted,background:active?T.amber:"rgba(255,255,255,0.05)",boxShadow:active?"0 0 0 1px rgba(239,159,39,0.18)":"none",transition:"all 0.15s"}}>{type}</button>;
          })}
        </div>
        <button onClick={()=>setFilterOpen(true)} style={{position:"relative",width:44,height:44,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:18,border:"1px solid rgba(255,255,255,0.08)",background:T.elevated,cursor:"pointer",color:activeFilterCount>0?T.amber:T.textMuted,transition:"all 0.15s"}} aria-label="Open filters">
          <Ico.Filter s={18} c={activeFilterCount>0?T.amber:T.textMuted}/>
          {activeFilterCount>0&&<span style={{position:"absolute",top:6,right:6,minWidth:16,height:16,padding:"0 4px",borderRadius:999,background:T.amber,color:T.bgPrimary,fontFamily:T.mono,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeFilterCount}</span>}
        </button>
      </div>
    </div>

    {/* Count */}
    <div style={{padding:"12px 16px 8px"}}>
      <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>{filtered.length} {filtered.length===1?"title":"titles"}</p>
    </div>

    {/* List */}
    <div style={{padding:"10px 16px 100px",display:"flex",flexDirection:"column",gap:8}}>
      {filtered.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{color:T.textMuted,fontFamily:T.font,fontSize:13}}>Nothing here yet. Go watch something.</p></div>:filtered.map(e=><WatchCardA key={e.id} e={e} isBookmarked={bookmarkedIds.has(e.id)} onBookmark={toggleBookmark} onOpenDetail={onOpenDetail} onRate={onUpdateEntry?setRatingEntry:null}/>)}
    </div>

    <FilterSheet show={filterOpen} onClose={()=>setFilterOpen(false)} sort={sort} onSort={s=>{setSort(s);}} activeChips={chips} onToggleChip={chip=>setChips(p=>p.includes(chip)?p.filter(c=>c!==chip):[...p,chip])} showPaused={showPaused} onTogglePaused={()=>setShowPaused(p=>!p)} tab={tab} language={language} onLanguage={setLanguage} selectedGenres={selectedGenres} onToggleGenre={genre=>setSelectedGenres(p=>p.includes(genre)?p.filter(g=>g!==genre):[...p,genre])} onClearAll={()=>{setChips([]);setLanguage("");setSelectedGenres([]);setShowPaused(false);setUnrated(false);}} genres={genresFilter} unrated={unrated} onToggleUnrated={setUnrated}/>
    {ratingEntry&&<RatingSheet entry={ratingEntry} show onClose={()=>setRatingEntry(null)} onSave={updated=>{onUpdateEntry?.(updated);}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DETAIL VIEW ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function DetailView({entry,onBack,onOpenLogIt,onUpdateEntry,onDeleteEntry}) {
  const [modal,setModal]=useState(null);
  const [ratingOpen,setRatingOpen]=useState(false);
  const [epListExpanded,setEpListExpanded]=useState(false);
  const [seshOpen,setSeshOpen]=useState(false);
  const [seshMarkAll,setSeshMarkAll]=useState(false);
  const [editingNoteEp,setEditingNoteEp]=useState(null);
  const [noteInput,setNoteInput]=useState("");
  const isWatched  = entry.status==="watched";
  const isWatching = entry.status==="watching" && !entry.dropped;
  const isDropped  = entry.dropped;
  const isPlan     = entry.status==="watchplan";
  const isMovie    = entry.type==="Movie";

  const globalRatings=[
    ...(entry.malRating?[{source:"MAL",rating:entry.malRating}]:[{source:"MAL",rating:9.0}]),
    {source:"IMDB",rating:8.6},
  ];

  // Build Watch Deets from real session data when available, fall back to mock timeline
  const sessions = entry.watch_sessions || [];
  const sessionDeets = [...sessions].reverse().map(s=>({
    icon:"🎬",
    label: s.ep_from===s.ep_to ? `Log a Sesh · Ep ${s.ep_from}` : `Log a Sesh · Ep ${s.ep_from}–${s.ep_to}`,
    date: s.date_display || s.date,
  }));
  const hasSessions = sessions.length > 0;

  const DEETS_WATCHED  = hasSessions
    ? [{icon:"✅",label:"Finished",date:entry.finishedDate||entry.date}, ...sessionDeets, {icon:"▶️",label:"Started Watching",date:entry.date}]
    : [{icon:"✅",label:"Finished",date:entry.finishedDate||"Apr 10, 2026"},{icon:"▶️",label:"Started Watching",date:"Mar 15, 2026"},{icon:"📌",label:"Added to Watch Plan",date:"Mar 1, 2026"}];
  const DEETS_WATCHING = hasSessions
    ? [...sessionDeets, {icon:"▶️",label:"Started Watching",date:entry.date}]
    : [{icon:"🎬",label:"Log a Sesh · Ep 3–4",date:"Apr 8, 2026"},{icon:"🎬",label:"Log a Sesh · Ep 1–2",date:"Apr 1, 2026"},{icon:"▶️",label:"Started Watching",date:"Apr 1, 2026"}];
  const DEETS_DROPPED  = hasSessions
    ? [{icon:"✕",label:"Dropped",date:entry.date}, ...sessionDeets, {icon:"▶️",label:"Started Watching",date:entry.date}]
    : [{icon:"✕",label:"Dropped",date:"Jan 20, 2026"},{icon:"🎬",label:"Log a Sesh · Ep 15–20",date:"Jan 15, 2026"},{icon:"▶️",label:"Started Watching",date:"Dec 1, 2025"}];
  const DEETS_PLAN     =[{icon:"📌",label:"Added to Watch Plan",date:entry.addedDate||entry.date}];

  const deets = isWatched?DEETS_WATCHED:isDropped?DEETS_DROPPED:isWatching?DEETS_WATCHING:DEETS_PLAN;

  const epNotes=entry.episode_notes||{};
  const epTotal=entry.total||10;
  const epCurrent=entry.ep||0;
  const MOCK_EPS=Array.from({length:epTotal},(_,i)=>({n:i+1,state:i<epCurrent?"watched":i===epCurrent?"next":"unwatched",notes:epNotes[i+1]||null}));

  return <div style={{display:"flex",flexDirection:"column",gap:14,paddingBottom:40}}>
    {/* Top bar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><Ico.Back/></button>
      <div style={{display:"flex",gap:8}}>
        {isWatched&&<ActionBtn icon={<Ico.Rewatch/>} label="Rewatch" onClick={()=>onOpenLogIt({title:entry.title,type:entry.type,lang:entry.lang,genre:entry.genre||[],episodes:entry.ep,runtime:entry.runtime,epRuntime:entry.epRuntime||(entry.type==="TV Show"?45:(entry.type==="Anime"?24:null)),ongoing:entry.ongoing,bookmark:entry.bookmark}, true)}/> }
        <ActionBtn icon={<Ico.Edit/>} label="Edit" onClick={()=>onOpenLogIt(entry,false,true)}/>
        <ActionBtn icon={<Ico.Trash/>} label={isPlan?"Remove":"Unwatch"} danger onClick={()=>setModal("remove")}/>
      </div>
    </div>

    {/* Hero */}
    <Card>
      <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
        <Poster title={entry.title} size={80} url={entry.poster_url}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:800,fontSize:18,lineHeight:1.25}}>{entry.title}</p>
          <div style={{display:"flex",gap:6,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
            <span style={{color:T.amber,fontFamily:T.font,fontWeight:600,fontSize:11}}>{entry.type}</span>
            <span style={{color:T.textMuted,fontSize:10}}>·</span>
            <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{entry.lang}</span>
            {entry.watchTime&&<><span style={{color:T.textMuted,fontSize:10}}>·</span><span style={{color:T.textMuted,fontFamily:T.mono,fontSize:11}}>{entry.watchTime}{entry.estimated?" est.":""}</span></>}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
            {entry.genre.map(g=><span key={g} style={{background:T.elevated,color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:10,padding:"3px 10px",borderRadius:20}}>{g}</span>)}
          </div>
        </div>
      </div>

      {/* CTAs based on state */}
      {isWatching&&(
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>{setSeshMarkAll(false);setSeshOpen(true);}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",background:T.elevated,color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>Log a Sesh</button>
          <button onClick={()=>{setSeshMarkAll(true);setSeshOpen(true);}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>{entry.ongoing?"Mark as Finished":"Mark All Watched"}</button>
        </div>
      )}
      {/* Dropped — Continue Watching CTA */}
      {isDropped&&(
        <div style={{marginTop:16}}>
          <div style={{background:"rgba(196,122,122,0.08)",border:"1px solid rgba(196,122,122,0.2)",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
            <p style={{color:"#C47A7A",fontFamily:T.font,fontWeight:700,fontSize:12}}>✕ Dropped on {entry.date}</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2}}>Changed your mind? Pick it back up.</p>
          </div>
          <button onClick={()=>setModal("continue")} style={{width:"100%",padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Ico.Play c={T.bgPrimary}/>Continue Watching
          </button>
        </div>
      )}
      {isPlan&&(
        <div style={{display:"flex",gap:10,marginTop:16}}>
          {isMovie?(
            // Movie — single Mark Watched CTA → opens rating sheet
            <button onClick={()=>setRatingOpen(true)} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15}}>Mark Watched ✓</button>
          ):(
            // TV / Anime — Log a Sesh or jump straight to Mark All Watched
            <>
              <button onClick={()=>{setSeshMarkAll(false);setSeshOpen(true);}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",background:T.elevated,color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>Log a Sesh</button>
              <button onClick={()=>{setSeshMarkAll(true);setSeshOpen(true);}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>{entry.ongoing?"Mark as Finished":"Mark All Watched"}</button>
            </>
          )}
        </div>
      )}
    </Card>

    {/* When */}
    {(()=>{
      const firstSesh = sessions[0];
      const lastSesh  = sessions[sessions.length - 1];
      const startDate = firstSesh?.date_display || null;
      const endDate   = isWatched
        ? (entry.finishedDate || lastSesh?.date_display || entry.date)
        : (lastSesh?.date_display || entry.lastWatched || entry.date);
      const sameDay   = startDate && startDate === endDate;
      return (
        <Card>
          <SectionLabel>{isPlan?"Added On":"When I Watched It"}</SectionLabel>
          {isWatched&&(
            hasSessions ? (
              sameDay
                ? <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:14}}>{endDate}</p>
                : <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:16}}>
                    {startDate} <span style={{color:T.textMuted,fontFamily:T.font,fontWeight:400}}>→</span> <span style={{color:T.amber}}>{endDate}</span>
                  </p>
            ) : (
              <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:14}}>{entry.finishedDate}</p>
            )
          )}
          {(isWatching||isDropped)&&(
            hasSessions ? (
              <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:16}}>
                {startDate} <span style={{color:T.textMuted,fontFamily:T.font,fontWeight:400}}>→</span> <span style={{color:T.amber}}>{endDate}</span>
              </p>
            ) : (
              <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:14}}>{entry.lastWatched||entry.date}</p>
            )
          )}
          {isPlan&&<><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:14}}>{entry.addedDate||entry.date}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,marginTop:4}}>Not counted in stats until watched</p></>}
        </Card>
      );
    })()}

    {/* What I thought */}
    {!isPlan&&(
      <Card>
        <SectionLabel>What I Thought</SectionLabel>
        <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:14}}>
          {/* Your rating */}
          <div style={{flex:"0 0 auto"}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Your Rating</p>
            {entry.rating?(
              <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
                <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:48,lineHeight:1}}>{entry.rating}</p>
                <button onClick={()=>setRatingOpen(true)} style={{background:"none",border:`1px solid rgba(239,159,39,0.3)`,cursor:"pointer",borderRadius:10,padding:"4px 10px",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:11,marginBottom:6}}>Edit</button>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <p style={{color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:15}}>Not rated yet</p>
                <button onClick={()=>setRatingOpen(true)} style={{alignSelf:"flex-start",background:"none",border:"none",cursor:"pointer",padding:0,color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:12,textDecoration:"underline",textDecorationColor:"rgba(239,159,39,0.4)",textUnderlineOffset:3}}>Rate it ★</button>
              </div>
            )}
          </div>

          {/* Global ratings — stacked vertically */}
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Global</p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {globalRatings.map(({source,rating})=>{
                const C={MAL:"#6B9BDF",IMDB:"#F5C518",RT:"#FA320A",TMDB:"#01B4E4"};
                const N={MAL:"MyAnimeList",IMDB:"IMDB",RT:"Rotten Tomatoes",TMDB:"TMDB"};
                return(
                  <div key={source} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:C[source]||T.textMuted,flexShrink:0}}/>
                    <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11,flex:1}}>{N[source]||source}</span>
                    <span style={{color:T.textPrimary,fontFamily:T.mono,fontSize:12,fontWeight:600}}>{rating}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {entry.rating&&<p style={{color:T.textPrimary,fontFamily:T.font,fontSize:13,lineHeight:1.6,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:14}}>"A genuinely moving watch. Every quiet scene earned its space."</p>}
        {isWatched&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><span style={{background:"rgba(239,159,39,0.12)",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:20}}>✅ Watched</span><span style={{background:"rgba(250,199,117,0.12)",color:T.amberSoft,fontFamily:T.font,fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:20}}>👍 Recommended</span>{entry.bookmark&&<span style={{background:"rgba(200,133,74,0.12)",color:T.amberWarm,fontFamily:T.font,fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:20}}>🔖 Bookmarked</span>}</div>}
      </Card>
    )}

    {/* Others think — watch plan */}
    {isPlan&&<Card><SectionLabel>What Others Think</SectionLabel><GlobalRatings ratings={globalRatings}/></Card>}

    {/* Episode tracker */}
    {(isWatching||isDropped)&&!isMovie&&(
      <Card>
        <SectionLabel>Episode Tracker</SectionLabel>

        {/* Progress summary — always visible */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:15}}>
            {entry.ongoing?`${entry.ep||0} eps watched`:`${entry.ep||4} of ${entry.total||10} episodes`}
          </p>
          {!entry.ongoing&&<span style={{color:T.amber,fontFamily:T.mono,fontWeight:800,fontSize:20}}>{Math.round((entry.ep||4)/(entry.total||10)*100)}%</span>}
        </div>

        {/* Progress bar — always visible */}
        {!entry.ongoing&&(
          <div style={{background:T.elevated,borderRadius:6,height:6,overflow:"hidden",marginBottom:14}}>
            <div style={{width:`${Math.round((entry.ep||4)/(entry.total||10)*100)}%`,height:"100%",background:`linear-gradient(90deg,${T.amber},${T.amberSoft})`}}/>
          </div>
        )}

        {/* Expand / collapse CTA */}
        <button
          onClick={()=>setEpListExpanded(v=>!v)}
          style={{width:"100%",padding:"9px",background:T.elevated,border:"none",cursor:"pointer",borderRadius:12,color:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
        >
          {epListExpanded?"Hide episode list ▲":"Show episode list ▼"}
        </button>

        {/* Episode list — revealed on expand */}
        {epListExpanded&&(
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:12}}>
            {MOCK_EPS.map(ep=>{
              const isEditingNote=editingNoteEp===ep.n;
              return(
                <div key={ep.n} style={{background:ep.state==="next"?"rgba(239,159,39,0.06)":T.elevated,borderRadius:12,padding:"10px 12px",border:ep.state==="next"?`1px solid rgba(239,159,39,0.25)`:"1px solid transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:ep.state==="watched"?"rgba(239,159,39,0.15)":ep.state==="next"?"rgba(239,159,39,0.1)":"rgba(255,255,255,0.05)",border:ep.state==="next"?`1.5px solid ${T.amber}`:"1.5px solid transparent"}}>
                      {ep.state==="watched"&&<Ico.Check s={11}/>}
                      {ep.state==="next"&&<div style={{width:6,height:6,borderRadius:"50%",background:T.amber}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{color:ep.state==="watched"?T.textPrimary:ep.state==="next"?T.amberSoft:T.textMuted,fontFamily:T.font,fontWeight:ep.state==="next"?700:500,fontSize:13}}>
                        Episode {ep.n}{ep.state==="next"&&<span style={{color:T.amber,fontFamily:T.mono,fontSize:10,marginLeft:8}}>UP NEXT</span>}
                      </p>
                      {ep.notes&&!isEditingNote&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2,whiteSpace:"pre-wrap"}}>{ep.notes}</p>}
                    </div>
                    {!isEditingNote&&(
                      <button
                        onClick={()=>{setEditingNoteEp(ep.n);setNoteInput(ep.notes||"");}}
                        style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontFamily:T.font,fontSize:11,padding:"2px 6px",flexShrink:0,opacity:0.7}}
                      >{ep.notes?"Edit note":"+ Note"}</button>
                    )}
                  </div>
                  {isEditingNote&&(
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                      <textarea
                        value={noteInput}
                        onChange={e=>setNoteInput(e.target.value.slice(0,200))}
                        placeholder="Your thoughts on this episode..."
                        autoFocus
                        rows={2}
                        style={{width:"100%",background:T.bgPrimary,border:`1px solid rgba(239,159,39,0.3)`,outline:"none",borderRadius:10,padding:"8px 10px",color:T.textPrimary,fontFamily:T.font,fontSize:12,resize:"none",lineHeight:1.5}}
                      />
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>setEditingNoteEp(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontFamily:T.font,fontSize:12,padding:"4px 8px"}}>Cancel</button>
                        <button onClick={()=>{
                          const updated={...entry,episode_notes:{...epNotes,[ep.n]:noteInput.trim()||undefined}};
                          // remove key if note cleared
                          if(!noteInput.trim())delete updated.episode_notes[ep.n];
                          onUpdateEntry?.(updated);
                          setEditingNoteEp(null);
                        }} style={{background:T.amber,border:"none",cursor:"pointer",borderRadius:10,padding:"4px 14px",color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:12}}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    )}

    {/* Watch Deets */}
    <Card><SectionLabel>Watch Deets</SectionLabel><WatchDeets items={deets}/></Card>

    {/* Modals */}
    <ConfirmModal show={modal==="remove"} onClose={()=>setModal(null)} title={isPlan?"Remove from WatchList?":"Remove from WatchLog?"} message={isPlan?"This title will be removed from your Watch Plan.":"This will remove all watch history for this title."} confirmLabel="Remove" onConfirm={()=>{setModal(null);onDeleteEntry?.(entry.id);}}/>
    <ConfirmModal show={modal==="continue"} onClose={()=>setModal(null)} title="Continue watching?" message="We'll move this back to Currently Watching and log the date you resumed." confirmLabel="Let's go" danger={false} onConfirm={()=>{setModal(null);}}/>
    {ratingOpen&&<RatingSheet entry={entry} show onClose={()=>setRatingOpen(false)} onSave={updated=>{
      // If opening from Watch Plan, also flip status to watched
      const finalEntry = isPlan
        ? {...updated, status:"watched", finishedDate:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
        : updated;
      onUpdateEntry?.(finalEntry);
    }}/>}
    {seshOpen&&<LogSeshSheet entry={entry} markAll={seshMarkAll} onClose={()=>{setSeshOpen(false);setSeshMarkAll(false);}} onUpdate={updated=>{onUpdateEntry?.(updated);}}/>}
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── LOG IT ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// SearchPreviewModal — shown when the ⓘ icon is tapped on a search tile.
// Auto-closes after 3 s. Hold anywhere on the card to pause the countdown.
const PREVIEW_DURATION = 10000;
function SearchPreviewModal({ result, onClose }) {
  // Countdown state — driven by a 50 ms interval so the bar is smooth
  const remainingRef = useRef(PREVIEW_DURATION);
  const [remaining,   setRemaining]  = useState(PREVIEW_DURATION);
  const pausedRef     = useRef(false);
  const [held,        setHeld]       = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      remainingRef.current = Math.max(0, remainingRef.current - 50);
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) onClose();
    }, 50);
    return () => clearInterval(iv);
  }, [onClose]);

  function hold()    { pausedRef.current = true;  setHeld(true);  }
  function release() { pausedRef.current = false; setHeld(false); }

  const pct        = (remaining / PREVIEW_DURATION) * 100;
  const secsLeft   = Math.ceil(remaining / 1000);

  const [imgExpanded, setImgExpanded] = useState(false);

  const r        = result;
  const isMovie  = r.content_type === "Movie";
  const isOngoing= r.is_ongoing;

  const meta = [];
  if (r.year)                              meta.push({ label:"Year",     value: r.year });
  if (!isMovie && r.episode_count)         meta.push({ label:"Episodes", value: String(r.episode_count) });
  if (!isMovie && isOngoing != null)       meta.push({ label:"Status",   value: isOngoing ? "Ongoing" : "Completed" });
  if (!isMovie && r.episode_runtime_mins)  meta.push({ label:"Runtime",  value: `${r.episode_runtime_mins} min / ep` });
  if (isMovie  && r.episode_runtime_mins)  meta.push({ label:"Runtime",  value: `${r.episode_runtime_mins} min` });
  if (r.language)                          meta.push({ label:"Language", value: r.language });
  if (r.global_rating)                     meta.push({ label:"Rating",   value: `★ ${r.global_rating}` });

  return <>
    {/* Backdrop — tap to close */}
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:80,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)"}}/>

    {/* Card — hold anywhere to pause */}
    <div
      onMouseDown={hold}   onMouseUp={release} onMouseLeave={release}
      onTouchStart={hold}  onTouchEnd={release} onTouchCancel={release}
      style={{position:"fixed",top:"50%",left:"50%",transform:`translate(-50%,${imgExpanded?"-40%":"-50%"})`,zIndex:81,width:"calc(100% - 40px)",maxWidth:390,background:T.surface,borderRadius:24,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",userSelect:"none",WebkitUserSelect:"none",maxHeight:"90vh",overflowY:"auto"}}
    >
      {/* Poster banner */}
      {r.poster_url ? (
        <div style={{
          width:"100%",
          background:T.bgPrimary,
          position:"relative",
          overflow:"hidden",
          // Collapsed: fixed 180px cropped banner. Expanded: natural 2:3 poster ratio.
          height: imgExpanded ? "auto" : 180,
        }}>
          <img
            src={r.poster_url} alt={r.title}
            style={{
              width:"100%",
              display:"block",
              objectFit: imgExpanded ? "contain" : "cover",
              objectPosition: "top",
              height: imgExpanded ? "auto" : "100%",
              maxHeight: imgExpanded ? 420 : "none",
            }}
          />
          {/* Gradient — only in cropped mode */}
          {!imgExpanded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent 40%, rgba(41,40,38,0.9) 100%)"}}/>}
          {/* Expand / collapse toggle */}
          <button
            onMouseDown={e=>e.stopPropagation()}
            onTouchStart={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation();setImgExpanded(v=>!v);}}
            style={{
              position:"absolute", bottom:8, right:8,
              background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
              border:"none", cursor:"pointer", borderRadius:8,
              padding:"5px 8px", display:"flex", alignItems:"center", gap:5,
              color:T.textPrimary, fontFamily:T.font, fontWeight:700, fontSize:11,
            }}
          >
            {imgExpanded
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> Collapse</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg> Full poster</>
            }
          </button>
        </div>
      ) : (
        <div style={{width:"100%",height:140,background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:48}}>{(r.title||"?")[0]}</span>
        </div>
      )}

      {/* Content */}
      <div style={{padding:"16px 18px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {/* Title + pills */}
        <div>
          <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:17,lineHeight:1.3,marginBottom:4}}>{r.title}</p>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <TypePill type={r.content_type}/>
            {r.genre_tags?.slice(0,2).map(g=>(
              <span key={g} style={{background:T.elevated,color:T.textMuted,fontFamily:T.font,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{g}</span>
            ))}
          </div>
        </div>

        {/* Meta grid */}
        {meta.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px"}}>
            {meta.map(({label,value})=>(
              <div key={label}>
                <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2}}>{label}</p>
                <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:13}}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Status line + close */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:2}}>
          <p style={{color:held?T.amberSoft:T.textMuted,fontFamily:T.font,fontSize:11,lineHeight:1.4,transition:"color 0.15s"}}>
            {held
              ? "Holding... let go when you're done 👌"
              : `Auto-closing in ${secsLeft}s · hold to pause`}
          </p>
          <button
            onMouseDown={e=>e.stopPropagation()}
            onClick={onClose}
            style={{background:"none",border:`1px solid rgba(255,255,255,0.12)`,cursor:"pointer",borderRadius:10,padding:"5px 14px",color:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,flexShrink:0,marginLeft:10}}
          >Close</button>
        </div>

        {/* Progress bar */}
        <div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:4,overflow:"hidden",marginTop:-4}}>
          <div style={{height:"100%",background:held?T.amberSoft:T.amber,borderRadius:4,width:`${pct}%`,transition:"background 0.2s"}}/>
        </div>
      </div>
    </div>
  </>;
}

function SourceBadge({source}) {
  const colors={MAL:"#6B9BDF",RT:"#FA320A",IMDB:"#F5C518",TMDB:"#01B4E4"};
  return <span style={{background:`${colors[source]||T.textMuted}20`,color:colors[source]||T.textMuted,fontFamily:T.mono,fontWeight:600,fontSize:9,padding:"2px 7px",borderRadius:20}}>{source}</span>;
}

function LogItSearch({entries,onSelect,onManual,onClose,onNavigate}) {
  const [query,setQuery]=useState("");
  const [results,setResults]=useState(null);
  const [loading,setLoading]=useState(false);
  const titleLangPref=localStorage.getItem(TITLE_LANG_KEY)||"en";
  const dt=r=>getPreferredTitle(r,titleLangPref);
  const [addedIds,setAddedIds]=useState(new Set());
  const [searchError,setSearchError]=useState(null);
  const [sourceFilter,setSourceFilter]=useState("All");
  const [previewItem,setPreviewItem]=useState(null);
  const inputRef=useRef(null);
  useEffect(()=>{inputRef.current?.focus();},[]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    setSourceFilter("All");
    try {
      const { combined, bySource } = await searchTitles(query, entries);
      setResults({ combined, bySource });
    } catch (err) {
      setSearchError("Search failed. Falling back to local data.");
      console.warn("[LogItSearch] searchTitles failed:", err.message);
      const mock = mockSearch(query) ?? [];
      setResults({ combined: mock, bySource: { MAL: [], TMDB: mock, OMDB: [] } });
    } finally {
      setLoading(false);
    }
  }
  const SOURCE_FILTERS=["All","MAL","TMDB","OMDB"];
  const combined=results?.combined??null;
  const bySource=results?.bySource??{MAL:[],TMDB:[],OMDB:[]};
  const filteredResults=combined===null?null:sourceFilter==="All"?combined:bySource[sourceFilter]??[];
  const singleRewatch=filteredResults?.length===1&&filteredResults[0].inLog;

  return <div style={{display:"flex",flexDirection:"column",gap:0}}>
    <div style={{width:36,height:4,background:T.elevated,borderRadius:4,margin:"0 auto 20px"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"0 20px"}}>
      <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:22}}>Log It</p>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><Ico.Close/></button>
    </div>
    <div style={{padding:"0 20px",marginBottom:16}}>
      <div style={{display:"flex",gap:10,alignItems:"center",background:T.elevated,borderRadius:16,padding:"11px 14px"}}>
        <Ico.Search s={16} c={T.textMuted}/>
        <input ref={inputRef} value={query} onChange={e=>{setQuery(e.target.value);setResults(null);}} onKeyDown={e=>e.key==="Enter"&&handleSearch()} placeholder="What did you watch?" style={{flex:1,background:"none",border:"none",outline:"none",color:T.textPrimary,fontFamily:T.font,fontSize:15,fontWeight:600}}/>
        {query&&<button onClick={()=>{setQuery("");setResults(null);}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Ico.Close s={14}/></button>}
      </div>
      <button onClick={handleSearch} disabled={!query.trim()||loading} style={{width:"100%",marginTop:10,padding:"13px",background:query.trim()?`linear-gradient(135deg,${T.amber},${T.amberDeep})`:T.elevated,border:"none",cursor:query.trim()?"pointer":"default",borderRadius:16,color:query.trim()?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:800,fontSize:15,transition:"all 0.2s"}}>{loading?"Searching...":"Search"}</button>
      {searchError && <div style={{marginTop:12,background:"rgba(196,122,122,0.12)",border:`1px solid rgba(196,122,122,0.25)`,borderRadius:16,padding:"12px 14px"}}><p style={{color:T.amberSoft,fontFamily:T.font,fontWeight:700,fontSize:12,marginBottom:4}}>API search notice</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,lineHeight:1.5}}>{searchError}</p></div>}
      <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,textAlign:"center",marginTop:8}}>Searches MyAnimeList · TMDB · OMDB</p>
    </div>
    {combined!==null&&<div style={{padding:"0 20px 0",marginBottom:10}}>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
        {SOURCE_FILTERS.map(s=>{
          const count=s==="All"?combined.length:(bySource[s]?.length??0);
          const active=sourceFilter===s;
          return<button key={s} onClick={()=>setSourceFilter(s)} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:active?`1px solid ${T.amber}`:`1px solid rgba(255,255,255,0.08)`,background:active?"rgba(239,159,39,0.12)":T.elevated,cursor:"pointer",color:active?T.amber:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6}}>
            {s}
            <span style={{background:active?"rgba(239,159,39,0.2)":"rgba(255,255,255,0.08)",borderRadius:10,padding:"1px 6px",fontSize:10,color:active?T.amber:T.textMuted,fontFamily:T.mono}}>{count}</span>
          </button>;
        })}
      </div>
    </div>}
    {filteredResults!==null&&<div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:10}}>
      {filteredResults.length===0&&<div style={{background:T.elevated,borderRadius:16,padding:"18px 16px",textAlign:"center"}}>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:15,marginBottom:6}}>Woah you've gone niche! 🎭</p>
        <p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,marginBottom:16,lineHeight:1.5}}>No results found online... add manually to log?</p>
        <button onClick={()=>onManual(query.trim()||"Untitled")} style={{background:T.surface,border:`1px solid ${T.amber}`,cursor:"pointer",borderRadius:14,padding:"10px 24px",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:13}}>Add Manually</button>
      </div>}
      {singleRewatch&&<div style={{display:"flex",flexDirection:"column",gap:0}}>
        <div style={{background:T.elevated,borderRadius:"16px 16px 0 0",padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
          <Poster title={dt(filteredResults[0])} size={40} url={filteredResults[0].poster_url}/>
          <div style={{flex:1,minWidth:0}}><p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dt(filteredResults[0])}</p><div style={{display:"flex",gap:6,marginTop:3}}><SourceBadge source={filteredResults[0].source}/><span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{filteredResults[0].content_type||filteredResults[0].type} · {filteredResults[0].year}</span></div></div>
        </div>
        <div style={{background:"rgba(239,159,39,0.08)",border:`1px solid rgba(239,159,39,0.2)`,borderRadius:"0 0 16px 16px",padding:"14px 16px"}}>
          <p style={{color:T.amberSoft,fontFamily:T.font,fontWeight:700,fontSize:13,marginBottom:4}}>🔁 You've watched this before</p>
          <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,marginBottom:12,lineHeight:1.5}}>Log a rewatch? We'll carry over all show info.</p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onSelect({...filteredResults[0],isRewatch:true})} style={{flex:1,padding:"10px",background:T.amber,border:"none",cursor:"pointer",borderRadius:12,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>Log Rewatch</button>
            <button onClick={()=>onSelect({...filteredResults[0],isRewatch:false})} style={{flex:1,padding:"10px",background:T.elevated,border:"none",cursor:"pointer",borderRadius:12,color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:13}}>New Entry</button>
          </div>
        </div>
      </div>}
      {!singleRewatch&&filteredResults.length>0&&<>
        {filteredResults.map(r=>{const wasAdded=addedIds.has(r.id);return<div key={r.id} style={{background:T.elevated,borderRadius:16,overflow:"hidden"}}>
          <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px"}}>
            <Poster title={dt(r)} size={40} url={r.poster_url}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dt(r)}</p>
              <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                <SourceBadge source={r.source}/>
                <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{r.content_type} · {r.year}</span>
                {r.global_rating&&<span style={{color:T.amberSoft,fontFamily:T.mono,fontWeight:600,fontSize:10}}>★ {r.global_rating}</span>}
              </div>
            </div>
            <button
              onClick={e=>{e.stopPropagation();setPreviewItem(r);}}
              style={{background:"none",border:"none",cursor:"pointer",padding:6,flexShrink:0,opacity:0.6}}
              title="View details"
            ><Ico.Info s={18} c={T.textMuted}/></button>
          </div>
          {r.inLog?(
            <div style={{background:"rgba(239,159,39,0.08)",borderTop:"1px solid rgba(239,159,39,0.15)",padding:"12px 14px"}}>
              <p style={{color:T.amberSoft,fontFamily:T.font,fontWeight:700,fontSize:12,marginBottom:8}}>🔁 You've watched this before</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onSelect({...r,isRewatch:true})} style={{flex:1,padding:"9px",background:T.amber,border:"none",cursor:"pointer",borderRadius:12,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:12}}>Log Rewatch</button>
                <button onClick={()=>onSelect({...r,isRewatch:false})} style={{flex:1,padding:"9px",background:T.surface,border:"none",cursor:"pointer",borderRadius:12,color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:12}}>New Entry</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",gap:8,padding:"0 14px 12px"}}>
              {wasAdded?(
                <div style={{flex:1,padding:"9px 12px",background:"rgba(239,159,39,0.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:12}}>✓ Added to Watch Plan</span>
                  <button onClick={()=>onNavigate("watchlist",{subTab:"watchplan"})} style={{background:"none",border:"none",cursor:"pointer",color:T.amberSoft,fontFamily:T.font,fontWeight:600,fontSize:11,padding:0}}>View here →</button>
                </div>
              ):(
                <>
                  <button onClick={()=>{addEntry({id:Date.now(),title:dt(r),type:r.content_type,lang:r.language||"",rating:null,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),status:"watchplan",ep:null,total:r.episode_count||null,ongoing:r.is_ongoing||false,rewatch:false,paused:false,dropped:false,bookmark:false,genre:r.genre_tags||[],reaction:"",recommend:false,watchTime:null,estimated:false,poster_url:r.poster_url||null,malRating:r.global_rating||null,watch_start_date:null,watch_end_date:null,logged_at:new Date().toISOString()});setAddedIds(prev=>new Set([...prev,r.id]));}} style={{flex:1,padding:"9px 12px",background:T.surface,border:`1px solid rgba(255,255,255,0.08)`,cursor:"pointer",borderRadius:12,color:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12}}>+ Watch Plan</button>
                  <button onClick={()=>onSelect({...r,isRewatch:false})} style={{flex:1,padding:"9px 12px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:12,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:12}}>WatchedIt →</button>
                </>
              )}
            </div>
          )}
        </div>;})}
      </>}
    </div>}
    <div style={{height:32}}/>
    {previewItem&&<SearchPreviewModal result={previewItem} onClose={()=>setPreviewItem(null)}/>}
  </div>;
}

function LogItDetails({show,isRewatch,isManual,isEdit=false,onBack,onSubmit}) {
  const [contentType,setContentType]=useState(show?.content_type||show?.type||"Movie");
  const [language,setLanguage]=useState(show?.language||show?.lang||"");
  const [genre,setGenre]=useState(show?.genre_tags||show?.genre||[]);
  const [episodeCount,setEpisodeCount]=useState((show?.episode_count??show?.episodes??show?.total)?.toString()||"");
  const _resolvedType=show?.content_type||show?.type;
  const [epRuntime,setEpRuntime]=useState(show?.episode_runtime_mins||show?.epRuntime||(_resolvedType==="TV Show"?45:_resolvedType==="Anime"?24:null));
  const [customRuntime,setCustomRuntime]=useState("");
  const [runtimeMode,setRuntimeMode]=useState("preset");
  const [movieRuntime,setMovieRuntime]=useState(show?.runtime?.toString()||"");
  const [ongoing,setOngoing]=useState(show?.is_ongoing||show?.ongoing||false);
  const [watchStatus,setWatchStatus]=useState(isEdit?(show?.status||"watched"):"watched");
  const [epWatched,setEpWatched]=useState(isEdit?(show?.ep||0):0);
  const [rating,setRating]=useState(isEdit?(show?.rating??null):null);
  const [reaction,setReaction]=useState(isEdit?(show?.reaction||""):"");
  const [recommend,setRecommend]=useState(isEdit?(show?.recommend||false):false);
  const [bookmark,setBookmark]=useState(show?.bookmark||false);
  const [errors,setErrors]=useState({});
  const [moviePopup,setMoviePopup]=useState(false);
  const [ratingPopup,setRatingPopup]=useState(false);
  const ratingRef=useRef(null);
  const todayISO=new Date().toISOString().split("T")[0];
  const [watch_start_date,setWatchStartDate]=useState("");
  const [watch_end_date,setWatchEndDate]=useState(todayISO);
  const isMovie=contentType==="Movie";
  const isTV=!isMovie;

  // Alternative title management
  const [currentTitle, setCurrentTitle] = useState(show?.title || "");
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  // Get all available titles (original + alternatives)
  const allTitles = React.useMemo(() => {
    const titles = [{ title: show?.title || "", type: "original" }];
    if (show?.alternativeTitles && show.alternativeTitles.length > 0) {
      titles.push(...show.alternativeTitles.map(title => ({ title, type: "alternative" })));
    }
    return titles;
  }, [show?.title, show?.alternativeTitles]);

  const totalEpisodes = parseInt(episodeCount, 10) || null;
  const resolvedRuntime = runtimeMode === "custom" ? parseInt(customRuntime, 10) || epRuntime : epRuntime;
  const estimatedTotalMinutes = totalEpisodes && resolvedRuntime ? totalEpisodes * resolvedRuntime : null;
  const movieRuntimeValue = parseInt(movieRuntime, 10) || 0;
  const summaryParts = [contentType, language || "Unknown"];
  if (isTV) {
    if (totalEpisodes) summaryParts.push(`${totalEpisodes} eps`);
    if (resolvedRuntime) summaryParts.push(`${resolvedRuntime} min/ep`);
    if (estimatedTotalMinutes) summaryParts.push(`~${Math.floor(estimatedTotalMinutes / 60)}h ${estimatedTotalMinutes % 60}m est.`);
  } else if (movieRuntimeValue) {
    summaryParts.push(`${Math.floor(movieRuntimeValue / 60)}h ${movieRuntimeValue % 60}m`);
  }
  const headerLine1 = [contentType, language || "Unknown"].filter(Boolean).join(" · ");
  const headerLine2 = isTV
    ? [totalEpisodes ? `${totalEpisodes} eps` : null, resolvedRuntime ? `${resolvedRuntime} min/ep` : null, estimatedTotalMinutes ? `~${Math.floor(estimatedTotalMinutes / 60)}h ${estimatedTotalMinutes % 60}m est.` : null].filter(Boolean).join(" · ")
    : movieRuntimeValue
      ? `${Math.floor(movieRuntimeValue / 60)}h ${movieRuntimeValue % 60}m`
      : "";
  const missingDetails = isTV ? (!show?.episodes || !show?.epRuntime) : isMovie ? !show?.runtime : false;
  const isCurrent = watchStatus === "watching";
  const isPlan = watchStatus === "watchplan";

  useEffect(()=>{
    if(isRewatch){
      setRating(null);
      setTimeout(()=>{ratingRef.current?.scrollIntoView({behavior:"smooth",block:"center"});},0);
    }
  },[isRewatch]);

  // State transition rules
  function handleStatusChange(s) {
    if(s==="watching"&&isMovie){setMoviePopup(true);return;}
    setWatchStatus(s);
    if(s==="watching"&&!watch_start_date) setWatchStartDate(todayISO);
  }

  // Watch Plan only allows watched or watching (if TV)
  const statusOptions=[
    {id:"watched",label:"Watched"},
    ...(isTV?[{id:"watching",label:"Watching"}]:[]),
    {id:"watchplan",label:"Watch Plan"},
  ];

  function handleSubmit(){
    const errs={};
    if(!language.trim())errs.language="Language is required";
    if(watchStatus==="watched"&&!rating){setRatingPopup(true);return;}
    if(Object.keys(errs).length>0){setErrors(errs);return;}
    onSubmit({contentType,language,genre,watchStatus,rating,reaction,recommend,bookmark,episodeCount,epRuntime:runtimeMode==="custom"?parseInt(customRuntime)||epRuntime:epRuntime,ongoing,movieRuntime,epWatched,currentTitle,watch_start_date,watch_end_date});
  }

  return <div style={{display:"flex",flexDirection:"column"}}>
    {/* Sticky top bar */}
    <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(51,50,48,0.97)",backdropFilter:"blur(12px)",padding:"14px 20px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",padding:4,flexShrink:0}}><Ico.Back/></button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{position:"relative", flex:1, minWidth:0}}>
              <input
                value={currentTitle}
                onChange={e=>setCurrentTitle(e.target.value)}
                onClick={() => allTitles.length > 1 && setShowTitleDropdown(true)}
                placeholder="Untitled"
                style={{
                  width:"100%",
                  background:"none",
                  border:"none",
                  outline:"none",
                  color:T.amberDeep,
                  fontFamily:T.font,
                  fontWeight:800,
                  fontSize:16,
                  cursor:"text",
                  padding:0,
                  minWidth:0
                }}
              />
              {allTitles.length > 1 && (
                <button
                  onClick={() => setShowTitleDropdown(v => !v)}
                  style={{position:"absolute",right:0,top:2,border:"none",background:"none",color:T.textMuted,cursor:"pointer",fontSize:12,padding:0}}
                >
                  {showTitleDropdown ? "▲" : "▼"}
                </button>
              )}
              {showTitleDropdown && allTitles.length > 1 && (
                <div style={{
                  position:"absolute",
                  top:"100%",
                  left:0,
                  right:0,
                  marginTop:8,
                  background:T.surface,
                  border:`1px solid ${T.elevated}`,
                  borderRadius:8,
                  zIndex:100,
                  maxHeight:140,
                  overflowY:"auto",
                  boxShadow:"0 4px 12px rgba(0,0,0,0.3)"
                }}>
                  {allTitles.map((titleObj, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentTitle(titleObj.title);
                        setShowTitleDropdown(false);
                      }}
                      style={{
                        width:"100%",
                        padding:"10px 12px",
                        background:"none",
                        border:"none",
                        cursor:"pointer",
                        textAlign:"left",
                        color: titleObj.title === currentTitle ? T.amber : T.textPrimary,
                        fontFamily:T.font,
                        fontSize:14,
                        fontWeight: titleObj.title === currentTitle ? 700 : 500,
                        borderBottom: index < allTitles.length - 1 ? `1px solid ${T.elevated}` : "none"
                      }}
                    >
                      {titleObj.title}
                      {titleObj.type === "alternative" && (
                        <span style={{marginLeft:8, fontSize:11, color:T.textMuted, fontFamily:T.mono}}>
                          ALT
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isManual&&<span style={{background:"rgba(158,155,150,0.15)",color:T.textMuted,fontFamily:T.mono,fontSize:9,padding:"2px 7px",borderRadius:20,flexShrink:0}}>Manual</span>}
            {isRewatch&&<span style={{background:"rgba(239,159,39,0.12)",color:T.amberSoft,fontFamily:T.mono,fontSize:9,padding:"2px 7px",borderRadius:20,flexShrink:0}}>↺ Rewatch</span>}
          </div>
        </div>
        <Poster title={currentTitle || show?.title || "?"} size={36} url={show?.poster_url}/>
      </div>
    </div>

    <div style={{padding:"20px 20px 120px",display:"flex",flexDirection:"column",gap:20}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
              <span style={{color:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12}}>{headerLine1}</span>
            </div>
            {headerLine2 ? <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:0}}>{headerLine2}</p> : <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:0}}>Tap Edit to add episodes/runtime details</p>}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {genre.length>0 ? genre.map(g=><span key={g} style={{background:T.elevated,color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:11,padding:"6px 12px",borderRadius:20}}>{g}</span>) : <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11,background:T.elevated,padding:"6px 12px",borderRadius:20}}>No genres yet</span>}
            </div>
            {missingDetails && !detailsExpanded && <p style={{color:T.amberSoft,fontFamily:T.font,fontSize:12,margin:0}}>Some details missing — tap Edit to complete</p>}
          </div>
          <button onClick={()=>setDetailsExpanded(v=>!v)} style={{background:T.elevated,border:"none",cursor:"pointer",borderRadius:16,padding:"10px 16px",color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:12,flexShrink:0}}>{detailsExpanded?"Done ✓":"✏️ Edit"}</button>
        </div>

        {detailsExpanded && <>
          <Divider/>
          <div style={{display:"flex",flexDirection:"column",gap:20,paddingTop:4}}>
            <Field label="Content Type">
              <div style={{display:"flex",gap:8}}>{["Movie","TV Show","Anime"].map(t=><button key={t} onClick={()=>setContentType(t)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:"none",cursor:"pointer",background:contentType===t?T.amber:T.elevated,color:contentType===t?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,transition:"all 0.15s"}}>{t}</button>)}</div>
            </Field>
            <Field label="Language" error={errors.language}>
              <LanguageField value={language} onChange={v=>{setLanguage(v);setErrors(p=>({...p,language:null}));}}/>
            </Field>
            <Field label="Genre Tags">
              <GenreEditor tags={genre} onChange={setGenre}/>
            </Field>
            {isTV&&<>
              <Field label="Episodes" hint={ongoing?"Ongoing":""}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <input value={episodeCount} onChange={e=>setEpisodeCount(e.target.value)} placeholder={ongoing?"Unknown":"Total episodes"} disabled={ongoing} type="number" style={{flex:1,background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:ongoing?T.textMuted:T.textPrimary,fontFamily:T.font,fontSize:14,opacity:ongoing?0.5:1}}/>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>Ongoing</span>
                    <button onClick={()=>setOngoing(o=>!o)} style={{width:38,height:22,borderRadius:11,border:"none",cursor:"pointer",background:ongoing?T.amber:T.elevated,position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:"50%",background:T.textPrimary,position:"absolute",top:3,left:ongoing?19:3,transition:"left 0.2s"}}/></button>
                  </div>
                </div>
              </Field>
              <Field label="Episode Runtime">
                <div style={{display:"flex",gap:8,marginBottom:runtimeMode==="custom"?8:0}}>
                  {[{label:"24 min",val:24},{label:"45 min",val:45}].map(opt=><button key={opt.val} onClick={()=>{setEpRuntime(opt.val);setRuntimeMode("preset");}} style={{flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:runtimeMode==="preset"&&epRuntime===opt.val?T.amber:T.elevated,color:runtimeMode==="preset"&&epRuntime===opt.val?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:13,transition:"all 0.15s"}}>{opt.label}</button>)}
                  <button onClick={()=>setRuntimeMode("custom")} style={{flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:runtimeMode==="custom"?T.amber:T.elevated,color:runtimeMode==="custom"?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:13,transition:"all 0.15s"}}>Custom</button>
                </div>
                {runtimeMode==="custom"&&<input value={customRuntime} onChange={e=>setCustomRuntime(e.target.value)} placeholder="Minutes per episode" type="number" style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14}}/>}
              </Field>
              <WatchTimeDisplay epRuntime={epRuntime} episodeCount={episodeCount} isMovie={false} isCurrent={isCurrent} epWatched={epWatched} runtimeMode={runtimeMode} customRuntime={customRuntime}/>
            </>}
            {isMovie&&<>
              {show?.runtime?<WatchTimeDisplay isMovie movieRuntime={show.runtime}/>:<Field label="Runtime" hint="Optional"><input value={movieRuntime} onChange={e=>setMovieRuntime(e.target.value)} placeholder="How long was it? (mins)" type="number" style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14}}/></Field>}
            </>}
          </div>
        </>}
      </Card>

      <Card>
        <SectionLabel>Watch Status</SectionLabel>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {statusOptions.map(s=><button key={s.id} onClick={()=>handleStatusChange(s.id)} style={{flex:1,minWidth:90,padding:"10px 12px",borderRadius:22,border:"none",cursor:"pointer",background:watchStatus===s.id?T.amber:T.elevated,color:watchStatus===s.id?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,transition:"all 0.15s"}}>{s.label}</button>)}
        </div>
      </Card>

      {!isPlan && isCurrent && isTV && <Card>
        <SectionLabel>Episode Progress</SectionLabel>
        {ongoing || totalEpisodes > 50 || !totalEpisodes ? (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Watched up to episode:">
              <input value={epWatched || ""} onChange={e=>setEpWatched(parseInt(e.target.value,10) || 0)} placeholder="Episode" type="number" style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14}}/>
            </Field>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:0}}>{epWatched ? `${epWatched} eps watched · Ongoing` : "Tap a number to set progress"}</p>
          </div>
        ) : (
          <>
            <EpisodePicker total={totalEpisodes} ongoing={ongoing} value={epWatched} onChange={v=>setEpWatched(v)}/>
            <Field label="Watched up to episode:">
              <input value={epWatched || ""} onChange={e=>setEpWatched(parseInt(e.target.value,10) || 0)} placeholder="Episode" type="number" style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14}}/>
            </Field>
          </>
        )}
      </Card>}

      {!isPlan && <Card>
        <SectionLabel>{isCurrent?"Rating So Far":"Your Rating"}</SectionLabel>
        <Field hint={isCurrent?"Optional":"Required"}>
          <StarRating value={rating} onChange={setRating}/>
          {!rating && watchStatus==="watched" && <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:8,fontStyle:"italic"}}>Rating later? Your verdict will mean more when you've slept on it.</p>}
        </Field>
        <Divider/>
        <Field label="How Was It?" hint={`${reaction.length}/500`}>
          <textarea value={reaction} onChange={e=>setReaction(e.target.value.slice(0,500))} placeholder="Your thoughts, feelings, hot takes... emojis welcome 🔥" rows={3} style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14,resize:"none",lineHeight:1.5}}/>
          {!reaction&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:4,fontStyle:"italic"}}>This is yours forever. Future you will thank present you.</p>}
        </Field>
        <Divider/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 6px"}}>
          <div>
            <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,margin:0}}>Recommend</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:"4px 0 0"}}>Worth telling friends about?</p>
          </div>
          <button onClick={()=>setRecommend(r=>!r)} style={{width:44,height:26,borderRadius:13,border:"none",cursor:"pointer",background:recommend?T.amber:T.elevated,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:recommend?T.bgPrimary:T.textPrimary,position:"absolute",top:3,left:recommend?21:3,transition:"all 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
          </button>
        </div>
        <Divider/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 6px"}}>
          <div>
            <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,margin:0}}>Bookmark</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:"4px 0 0"}}>Highlight this in your WatchLog</p>
          </div>
          <button onClick={()=>setBookmark(b=>!b)} style={{width:44,height:26,borderRadius:13,border:"none",cursor:"pointer",background:bookmark?T.amber:T.elevated,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:bookmark?T.bgPrimary:T.textPrimary,position:"absolute",top:3,left:bookmark?21:3,transition:"all 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
          </button>
        </div>
      </Card>}
    </div>

    {/* Sticky submit */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",background:"rgba(51,50,48,0.97)",backdropFilter:"blur(12px)",padding:"14px 20px 32px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
      <button onClick={handleSubmit} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:18,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:16,boxShadow:"0 3px 8px rgba(0,0,0,0.35)"}}>Log It ✓</button>
    </div>

    <BlockingPopup show={moviePopup} onClose={()=>setMoviePopup(false)} emoji="🍿" title="Finish the movie first!" message="It'll be over in a few hours. Come back and log it when you're done — we'll be here." cta="Lol faine, I'll finish it" ctaSecondary="Actually I'm done" onSecondary={()=>{setMoviePopup(false);setWatchStatus("watched");}}/>
    <BlockingPopup show={ratingPopup} onClose={()=>setRatingPopup(false)} emoji="⭐" title="C'mon, you know what you felt" message="Every watch deserves a rating. Even a 1 counts — we don't judge." cta="Okay okay, I'll rate it"/>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SEARCH ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function SearchScreen({entries,onOpenDetail}) {
  const [query,setQuery]=useState("");
  const results=query.trim()?entries.filter(e=>e.title.toLowerCase().includes(query.toLowerCase())||(e.genre||[]).some(g=>g.toLowerCase().includes(query.toLowerCase()))||(e.lang||"").toLowerCase().includes(query.toLowerCase())):[];
  return <div>
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",gap:10,alignItems:"center",background:T.surface,borderRadius:14,padding:"11px 14px"}}>
        <Ico.Search s={16} c={T.textMuted}/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your WatchLog..." autoFocus style={{flex:1,background:"none",border:"none",outline:"none",color:T.textPrimary,fontFamily:T.font,fontSize:14}}/>
        {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18,padding:0}}>×</button>}
      </div>
    </div>
    {!query.trim()&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,textAlign:"center",marginTop:40}}>Search by title, genre or language</p>}
    {query.trim()&&results.length===0&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,textAlign:"center",marginTop:40}}>No results for "{query}"</p>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {results.map(e=><div key={e.id} onClick={()=>onOpenDetail(e)} style={{background:T.surface,borderRadius:14,padding:"12px 14px"}}>
        <TitleCard e={e} showPoster={true} date={e.lang} onClick={()=>onOpenDetail(e)}/>
      </div>)}
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── STATISTICS ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const STAT_ENTRIES=[
  {id:1,title:"Frieren: Beyond Journey's End",type:"Anime",  rating:9.0, hours:11.2,genre:["Fantasy","Adventure"],date:"2026-04-10"},
  {id:2,title:"Shōgun",                       type:"TV Show",rating:null,hours:3.0, genre:["Drama","Historical"],  date:"2026-04-08"},
  {id:4,title:"Oppenheimer",                  type:"Movie",  rating:9.5, hours:3.0, genre:["Drama","Biography"],   date:"2026-04-08"},
  {id:5,title:"Solo Leveling",                type:"Anime",  rating:7.5, hours:9.6, genre:["Action","Fantasy"],    date:"2026-04-05"},
  {id:6,title:"Severance",                    type:"TV Show",rating:9.0, hours:13.5,genre:["Thriller","Sci-Fi"],   date:"2026-03-30"},
  {id:7,title:"Your Name",                    type:"Anime",  rating:10,  hours:1.8, genre:["Romance","Drama"],     date:"2026-03-22"},
  {id:8,title:"The Bear",                     type:"TV Show",rating:8.5, hours:9.0, genre:["Drama"],               date:"2026-03-18"},
  {id:3,title:"Dandadan",                     type:"Anime",  rating:8.5, hours:3.6, genre:["Action","Supernatural"],date:"2026-04-09"},
];
const PREV_ENTRIES=[
  {title:"Attack on Titan",type:"Anime",  hours:14.0,genre:["Action","Fantasy"],  date:"2026-03-05"},
  {title:"Parasite",       type:"Movie",  hours:2.2, genre:["Thriller","Drama"],  date:"2026-03-02"},
  {title:"Dark",           type:"TV Show",hours:7.5, genre:["Thriller","Sci-Fi"], date:"2026-02-28"},
];

function StatBreakdownRow({c, entries, allEntries=[], onTitleTap}) {
  const [exp, setExp] = useState(false);
  const TC = {Anime:T.amber, Movie:T.amberSoft, "TV Show":T.amberWarm};
  const color = TC[c.type] || T.amber;
  return (
    <div style={{borderRadius:14,overflow:"hidden",background:T.elevated}}>
      <button onClick={()=>setExp(e=>!e)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"13px 14px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
        <div style={{flex:1}}>
          <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14}}>{c.type}</p>
          <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2}}>{c.count} titles · {c.hours}h{c.avg?` · avg ${c.avg} ★`:""}</p>
        </div>
        <span style={{color,fontFamily:T.mono,fontWeight:700,fontSize:18}}>{c.count}</span>
        <span style={{color:T.textMuted,fontSize:16,transform:exp?"rotate(180deg)":"none",transition:"transform 0.2s"}}>⌄</span>
      </button>
      {exp && (
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          {entries.map((e,i)=>{
            const mockEntry=allEntries.find(me=>me.id===e.id);
            return <button key={e.id||e.title} onClick={()=>onTitleTap&&onTitleTap(mockEntry||e)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"10px 14px 10px 34px",display:"flex",alignItems:"center",gap:10,borderBottom:i<entries.length-1?"1px solid rgba(255,255,255,0.04)":"none",textAlign:"left"}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</p>
                <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:1}}>{e.hours}h watched</p>
              </div>
              {e.rating&&<span style={{color:T.amber,fontFamily:T.mono,fontWeight:700,fontSize:13,flexShrink:0}}>★ {e.rating}</span>}
              <span style={{color:T.textMuted,fontSize:12,flexShrink:0}}>›</span>
            </button>;
          })}
        </div>
      )}
    </div>
  );
}

function StatsScreen({entries,onTitleTap,onNavigate}) {
  const [timeFilter,setTimeFilter]=useState("30 Days");
  const [cat,setCat]=useState("All");
  const [view,setView]=useState("summary");
  const [metric,setMetric]=useState("titles");
  const [showComp,setShowComp]=useState(false);

  const now=new Date("2026-04-12");
  function filterPeriod(entries,filter){
    if(filter==="7 Days")  return entries.filter(e=>(now-new Date(e.date))/86400000<=7);
    if(filter==="30 Days") return entries.filter(e=>(now-new Date(e.date))/86400000<=30);
    if(filter==="90 Days") return entries.filter(e=>(now-new Date(e.date))/86400000<=90);
    return entries;
  }

  const statsEntries=filterPeriod(STAT_ENTRIES,timeFilter).filter(e=>cat==="All"||e.type===cat);
  const prev=filterPeriod(PREV_ENTRIES,timeFilter);
  const totalHrs=Math.round(statsEntries.reduce((s,e)=>s+e.hours,0)*10)/10;
  const totalDays=Math.round(totalHrs/24*10)/10;
  const prevHrs=Math.round(prev.reduce((s,e)=>s+e.hours,0)*10)/10;
  const titlesDelta=statsEntries.length-prev.length;
  const hoursDelta=Math.round((totalHrs-prevHrs)*10)/10;
  const flaggedCount=(entries||[]).filter(e=>e.status==="watched"&&!e.rating).length;

  // Per-category stats
  const catStats=["Anime","Movie","TV Show"].map(c=>{
    const es=filterPeriod(STAT_ENTRIES,timeFilter).filter(e=>e.type===c);
    const rated=es.filter(e=>e.rating);
    const avg=rated.length?Math.round(rated.reduce((s,e)=>s+e.rating,0)/rated.length*10)/10:null;
    return {type:c,count:es.length,hours:Math.round(es.reduce((s,e)=>s+e.hours,0)*10)/10,avg};
  }).filter(c=>c.count>0);

  // Hardest rated genre
  const genreRatings={};
  filterPeriod(STAT_ENTRIES,timeFilter).forEach(e=>{if(e.rating)e.genre.forEach(g=>{if(!genreRatings[g])genreRatings[g]=[];genreRatings[g].push(e.rating);});});
  const genreAvgs=Object.entries(genreRatings).map(([g,rs])=>({genre:g,avg:Math.round(rs.reduce((s,r)=>s+r,0)/rs.length*10)/10})).sort((a,b)=>a.avg-b.avg);
  const hardest=genreAvgs[0];

  // Timeline data
  const days=timeFilter==="7 Days"?7:30;
  const isMonthly=timeFilter==="90 Days"||timeFilter==="All Time";
  const timePoints=isMonthly?
    ["Jan","Feb","Mar","Apr"].map(m=>({label:m,titles:entries.filter(e=>new Date(e.date).toLocaleString("default",{month:"short"})===m).length,hours:Math.round(entries.filter(e=>new Date(e.date).toLocaleString("default",{month:"short"})===m).reduce((s,e)=>s+e.hours,0))})):
    Array.from({length:days},(_,i)=>{const d=new Date("2026-04-12");d.setDate(d.getDate()-(days-1-i));const ds=d.toISOString().split("T")[0];return{label:`${d.getMonth()+1}/${d.getDate()}`,titles:STAT_ENTRIES.filter(e=>e.date===ds).length,hours:Math.round(STAT_ENTRIES.filter(e=>e.date===ds).reduce((s,e)=>s+e.hours,0))};});
  const prevPoints=timePoints.map((_,i)=>({titles:i===1?2:i===3?1:0,hours:i===1?3:i===3?2:0}));

  const maxVal=Math.max(...timePoints.map(p=>p[metric]),showComp?Math.max(...prevPoints.map(p=>p[metric])):0,1);
  const svgW=340,svgH=120,padL=28,padB=24,padT=10,padR=12;
  const chartW=svgW-padL-padR,chartH=svgH-padT-padB,n=timePoints.length;
  const barW=Math.max(2,chartW/n-3);
  function bx(i){return padL+(i/n)*chartW+(chartW/n-barW)/2;}
  function bh(v){return(v/maxVal)*chartH;}
  function by(v){return padT+chartH-bh(v);}

  // Radar chart data — genre distribution
  const genreList=["Fantasy","Action","Drama","Thriller","Romance","Comedy","Sci-Fi"];
  const radarCounts=genreList.map(g=>({genre:g,count:filterPeriod(STAT_ENTRIES,timeFilter).filter(e=>e.genre.includes(g)).length}));
  const maxCount=Math.max(...radarCounts.map(r=>r.count),1);
  const cx=120,cy=100,r=70;
  function radarPoint(i,val){
    const angle=(i/genreList.length)*Math.PI*2-Math.PI/2;
    const radius=(val/maxCount)*r;
    return{x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle)};
  }
  const radarPath=radarCounts.map((rc,i)=>{const p=radarPoint(i,rc.count);return`${i===0?"M":"L"}${p.x},${p.y}`;}).join(" ")+"Z";

  const TIME_FILTERS=["7 Days","30 Days","90 Days","All Time"];
  const CATS=["All","Anime","Movie","TV Show"];

  return <div style={{display:"flex",flexDirection:"column",gap:0}}>
    {/* Time filter */}
    <div className="hs" style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:16,marginBottom:4}}>
      {TIME_FILTERS.map(f=><button key={f} onClick={()=>setTimeFilter(f)} style={{background:timeFilter===f?T.amber:T.elevated,color:timeFilter===f?T.bgPrimary:T.textMuted,border:"none",cursor:"pointer",borderRadius:20,padding:"7px 14px",fontFamily:T.font,fontWeight:700,fontSize:12,whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{f}</button>)}
    </div>

    {/* Category chips */}
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?"rgba(239,159,39,0.15)":T.elevated,color:cat===c?T.amber:T.textMuted,border:cat===c?`1px solid rgba(239,159,39,0.3)`:"1px solid transparent",cursor:"pointer",borderRadius:20,padding:"5px 12px",fontFamily:T.font,fontWeight:600,fontSize:11,transition:"all 0.15s"}}>{c}</button>)}
    </div>

    {/* View toggle */}
    <div style={{display:"flex",background:T.elevated,borderRadius:14,padding:4,marginBottom:20}}>
      {["summary","timeline"].map(v=><button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"9px",borderRadius:11,border:"none",cursor:"pointer",background:view===v?T.surface:"none",color:view===v?T.textPrimary:T.textMuted,fontFamily:T.font,fontWeight:view===v?700:500,fontSize:13,textTransform:"capitalize",transition:"all 0.15s"}}>{v}</button>)}
    </div>

    {/* ── SUMMARY ── */}
    {view==="summary"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
        <div style={{background:T.surface,borderRadius:18,padding:"18px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:48,lineHeight:1}}>{entries.length}</p>
          <div style={{textAlign:"right",minWidth:0}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Titles Watched</p>
          </div>
        </div>

        <div style={{background:T.surface,borderRadius:18,padding:"18px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:48,lineHeight:1}}>{totalDays}</p>
          <div style={{textAlign:"right",minWidth:0}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Days Watched</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:4}}>{totalHrs}h watched</p>
          </div>
        </div>

        <div style={{background:T.surface,borderRadius:18,padding:"18px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:48,lineHeight:1}}>{entries.filter(e=>e.rating).length?Math.round(entries.filter(e=>e.rating).reduce((s,e)=>s+e.rating,0)/entries.filter(e=>e.rating).length*10)/10:"—"}</p>
          <div style={{textAlign:"right",minWidth:0}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Avg Rating</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:4}}>/ 10</p>
          </div>
        </div>

        <div style={{background:T.surface,borderRadius:18,padding:"18px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:48,lineHeight:1}}>{STREAK}</p>
          <div style={{textAlign:"right",minWidth:0}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Day Streak</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:4}}>Keep it rolling</p>
          </div>
        </div>
      </div>

      {flaggedCount>0&&(
        <div style={{background:"rgba(239,159,39,0.08)",border:"1px solid rgba(239,159,39,0.15)",borderRadius:18,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,marginBottom:12}}>
          <div style={{flex:1}}>
            <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,marginBottom:4}}>{flaggedCount} watched titles still need a rating</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,margin:0}}>They count in your watch history, but not yet in your average.</p>
          </div>
          <button onClick={()=>onNavigate("watchlist",{subTab:"watched",unrated:true})} style={{background:"none",border:"none",cursor:"pointer",color:T.amber,fontFamily:T.font,fontWeight:700,fontSize:12,padding:0,textAlign:"right"}}>Rate them now →</button>
        </div>
      )}

      <Card>
        <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>By Category</p>
        {catStats.map((c,i)=>{
          const TC={Anime:T.amber,Movie:T.amberSoft,"TV Show":T.amberWarm};
          return <div key={c.type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,paddingBottom:i<catStats.length-1?16:0,marginBottom:i<catStats.length-1?16:0,borderBottom:i<catStats.length-1?"1px solid rgba(255,255,255,0.08)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0,flex:1}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:TC[c.type],flexShrink:0}}/>
              <div style={{minWidth:0}}>
                <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:15,lineHeight:1.2,marginBottom:4}}>{c.type}</p>
                <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,margin:0}}>{c.count} titles watched</p>
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{background:T.elevated,borderRadius:16,padding:"10px 12px",minWidth:96,textAlign:"center"}}>
                <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:16,margin:0}}>{c.hours}h</p>
                <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,margin:0,marginTop:4}}>watch time</p>
              </div>
              <div style={{background:T.elevated,borderRadius:16,padding:"10px 12px",minWidth:96,textAlign:"center"}}>
                <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:16,margin:0}}>{c.avg?c.avg:"—"}</p>
                <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,margin:0,marginTop:4}}>avg rating</p>
              </div>
            </div>
          </div>;
        })}
      </Card>

      {/* Hardest rated callout */}
      {hardest&&<div style={{background:"rgba(239,159,39,0.08)",border:`1px solid rgba(239,159,39,0.15)`,borderRadius:16,padding:"13px 14px"}}>
        <p style={{color:T.amberSoft,fontFamily:T.font,fontWeight:700,fontSize:13,marginBottom:3}}>🎯 Your hardest-rated genre</p>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:16}}>{hardest.genre} <span style={{color:T.amber,fontFamily:T.mono}}>(avg {hardest.avg} ★)</span></p>
        <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12,marginTop:3}}>You don't give that genre an easy ride.</p>
      </div>}

      {/* vs previous */}
      <Card>
        <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>vs Previous Period</p>
        <div style={{display:"flex",gap:20}}>
          <div><p style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>Titles</p><p style={{color:T.textPrimary,fontFamily:T.mono,fontWeight:700,fontSize:16,marginTop:2}}>{prev.length} <span style={{color:titlesDelta>=0?"#6BAA6B":"#C47A7A",fontSize:12}}>{titlesDelta>=0?`+${titlesDelta}`:titlesDelta}</span></p></div>
          <div><p style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>Hours</p><p style={{color:T.textPrimary,fontFamily:T.mono,fontWeight:700,fontSize:16,marginTop:2}}>{prevHrs}h <span style={{color:hoursDelta>=0?"#6BAA6B":"#C47A7A",fontSize:12}}>{hoursDelta>=0?`+${hoursDelta}`:hoursDelta}</span></p></div>
        </div>
      </Card>
    </div>}

    {/* ── TIMELINE ── */}
    {view==="timeline"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",background:T.elevated,borderRadius:12,padding:3}}>
          {[{id:"titles",label:"Titles"},{id:"hours",label:"Hours"}].map(m=><button key={m.id} onClick={()=>setMetric(m.id)} style={{padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",background:metric===m.id?T.surface:"none",color:metric===m.id?T.textPrimary:T.textMuted,fontFamily:T.font,fontWeight:metric===m.id?700:500,fontSize:12,transition:"all 0.15s"}}>{m.label}</button>)}
        </div>
        <button onClick={()=>setShowComp(c=>!c)} style={{display:"flex",alignItems:"center",gap:6,background:showComp?"rgba(239,159,39,0.12)":T.elevated,border:showComp?`1px solid rgba(239,159,39,0.3)`:"1px solid transparent",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontFamily:T.font,fontWeight:600,fontSize:11,color:showComp?T.amber:T.textMuted,transition:"all 0.15s"}}>
          <div style={{width:8,height:8,borderRadius:2,background:showComp?"rgba(158,155,150,0.5)":T.elevated}}/>Compare
        </button>
      </div>

      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase"}}>{metric==="titles"?"Titles watched":"Hours watched"}</p>
            <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:28,lineHeight:1,marginTop:4}}>{metric==="titles"?entries.length:totalHrs}<span style={{color:T.textMuted,fontFamily:T.font,fontWeight:400,fontSize:13}}>{metric==="titles"?" titles":"h"}</span></p>
          </div>
          {showComp&&<div style={{textAlign:"right"}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:9,textTransform:"uppercase"}}>Prev period</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:18,marginTop:4}}>{metric==="titles"?prev.length:prevHrs}<span style={{color:metric==="titles"?(titlesDelta>=0?"#6BAA6B":"#C47A7A"):(hoursDelta>=0?"#6BAA6B":"#C47A7A"),fontFamily:T.mono,fontSize:12,marginLeft:6}}>{metric==="titles"?(titlesDelta>=0?`+${titlesDelta}`:titlesDelta):(hoursDelta>=0?`+${hoursDelta}`:hoursDelta)}</span></p>
          </div>}
        </div>
        {showComp&&<div style={{display:"flex",gap:14,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:T.amber}}/><span style={{color:T.textMuted,fontFamily:T.font,fontSize:10}}>This period</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(158,155,150,0.35)"}}/><span style={{color:T.textMuted,fontFamily:T.font,fontSize:10}}>Previous</span></div>
        </div>}
        <div className="hs" style={{overflowX:"auto",marginLeft:-4}}>
          <div style={{minWidth:n>14?n*16:"100%"}}>
            <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{overflow:"visible"}}>
              {[0,Math.round(maxVal/2),maxVal].map((v,i)=>{const y=padT+chartH-(v/maxVal)*chartH;return<g key={i}><line x1={padL} y1={y} x2={svgW-padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/><text x={padL-4} y={y+4} textAnchor="end" fill={T.textMuted} fontSize="8" fontFamily={T.mono}>{v}</text></g>;})}
              {showComp&&prevPoints.map((p,i)=><rect key={`p${i}`} x={bx(i)} y={by(p[metric])} width={barW} height={bh(p[metric])} fill="rgba(158,155,150,0.2)" rx="2"/>)}
              {timePoints.map((p,i)=><rect key={`c${i}`} x={bx(i)} y={by(p[metric])} width={barW} height={bh(p[metric])} fill={p[metric]>0?T.amber:T.elevated} rx="2" opacity={p[metric]>0?1:0.3}/>)}
              {timePoints.map((p,i)=>{if(i%(n<=7?1:5)!==0&&i!==n-1)return null;const x=padL+(i/n)*chartW+chartW/n/2;return<text key={i} x={x} y={svgH-6} textAnchor="middle" fill={T.textMuted} fontSize="8" fontFamily={T.mono}>{p.label}</text>;})}
            </svg>
          </div>
        </div>
      </Card>
    </div>}

    {/* ── RADAR CHART ── */}
    <div style={{marginTop:24}}>
      <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Genre Distribution</p>
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <svg width={cx*2} height={cy*2+20} style={{flexShrink:0}}>
            {/* Grid rings */}
            {[0.33,0.66,1].map((s,i)=>{
              const gPath=genreList.map((_,j)=>{const a=(j/genreList.length)*Math.PI*2-Math.PI/2;const rad=s*r;return`${j===0?"M":"L"}${cx+rad*Math.cos(a)},${cy+rad*Math.sin(a)}`;}).join(" ")+"Z";
              return<path key={i} d={gPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>;
            })}
            {/* Spokes */}
            {genreList.map((_,i)=>{const a=(i/genreList.length)*Math.PI*2-Math.PI/2;return<line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>;} )}
            {/* Data */}
            <path d={radarPath} fill={`${T.amber}25`} stroke={T.amber} strokeWidth="1.5"/>
            {/* Labels */}
            {genreList.map((g,i)=>{const a=(i/genreList.length)*Math.PI*2-Math.PI/2;const lx=cx+(r+14)*Math.cos(a);const ly=cy+(r+14)*Math.sin(a);return<text key={g} x={lx} y={ly+4} textAnchor="middle" fill={T.textMuted} fontSize="8" fontFamily={T.mono}>{g}</text>;})}
          </svg>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            {radarCounts.filter(r=>r.count>0).sort((a,b)=>b.count-a.count).map(rc=><div key={rc.genre} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>{rc.genre}</span>
              <span style={{color:T.amber,fontFamily:T.mono,fontWeight:600,fontSize:11}}>{rc.count}</span>
            </div>)}
          </div>
        </div>
      </Card>
    </div>

    {/* Breakdown list */}
    <div style={{marginTop:24}}>
      <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Breakdown by Category</p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {catStats.map(c=><StatBreakdownRow key={c.type} c={c} entries={filterPeriod(STAT_ENTRIES,timeFilter).filter(e=>e.type===c.type)} allEntries={STAT_ENTRIES} onTitleTap={onTitleTap}/>)}
      </div>
    </div>

    {/* Sharing coming soon */}
    <div style={{marginTop:20,padding:"14px 16px",background:T.surface,borderRadius:16,textAlign:"center"}}>
      <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>📤 Share your stats with friends — <span style={{color:T.amberSoft,fontWeight:600}}>coming when we build the friends module</span></p>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MINI CALENDAR ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const _CAL_DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const _CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function MiniCalendar({ value, max, onChange }) {
  const selected = value ? new Date(value + "T12:00:00") : new Date();
  const maxDate  = max   ? new Date(max   + "T12:00:00") : new Date();

  const [viewYear,  setViewYear]  = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); }
    else setViewMonth(m=>m-1);
  }
  function nextMonth() {
    const ny = viewMonth===11 ? viewYear+1 : viewYear;
    const nm = viewMonth===11 ? 0 : viewMonth+1;
    if (ny > maxDate.getFullYear() || (ny===maxDate.getFullYear() && nm>maxDate.getMonth())) return;
    setViewYear(ny); setViewMonth(nm);
  }

  const atMaxMonth = viewYear===maxDate.getFullYear() && viewMonth===maxDate.getMonth();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = [];
  for (let i=0; i<firstDayOfWeek; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  function selectDay(d) {
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const c = new Date(viewYear, viewMonth, d);
    const mx = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (c > mx) return;
    onChange(iso);
  }

  function isSelected(d) {
    return selected.getFullYear()===viewYear && selected.getMonth()===viewMonth && selected.getDate()===d;
  }
  function isToday(d) {
    const t=new Date(); return t.getFullYear()===viewYear && t.getMonth()===viewMonth && t.getDate()===d;
  }
  function isFuture(d) {
    const c=new Date(viewYear,viewMonth,d), mx=new Date(maxDate.getFullYear(),maxDate.getMonth(),maxDate.getDate());
    return c>mx;
  }

  return (
    <div style={{background:T.bgPrimary,borderRadius:16,padding:"16px 12px",border:`1px solid rgba(255,255,255,0.07)`}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",cursor:"pointer",padding:"6px 10px",color:T.textMuted,fontSize:20,lineHeight:1,borderRadius:8}}>‹</button>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:14,letterSpacing:"0.01em"}}>
          {_CAL_MONTHS[viewMonth]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          style={{background:"none",border:"none",cursor:atMaxMonth?"default":"pointer",padding:"6px 10px",color:atMaxMonth?"rgba(255,255,255,0.1)":T.textMuted,fontSize:20,lineHeight:1,borderRadius:8}}
        >›</button>
      </div>

      {/* Day-of-week row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6}}>
        {_CAL_DAYS.map(d=>(
          <p key={d} style={{textAlign:"center",color:T.textMuted,fontFamily:T.mono,fontSize:9,letterSpacing:"0.08em",padding:"2px 0"}}>{d}</p>
        ))}
      </div>

      {/* Day grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px 2px"}}>
        {cells.map((d,i)=> d===null ? <div key={`e${i}`}/> : (
          <button
            key={d}
            onClick={()=>selectDay(d)}
            style={{
              aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:"50%",border:"none",
              cursor:isFuture(d)?"default":"pointer",
              background: isSelected(d)?T.amber : isToday(d)?"rgba(239,159,39,0.15)" : "none",
              color: isSelected(d)?T.bgPrimary : isFuture(d)?"rgba(255,255,255,0.18)" : isToday(d)?T.amber : T.textPrimary,
              fontFamily:T.font,
              fontWeight: isSelected(d)||isToday(d) ? 800 : 400,
              fontSize:13,
            }}
          >{d}</button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── LOG SESH SHEET ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function LogSeshSheet({entry, onClose, onUpdate, markAll=false}) {
  const todayISO = new Date().toISOString().split("T")[0];
  const currentEp = entry?.ep || 0;
  const total     = entry?.total || null;
  const ongoing   = entry?.ongoing || false;

  const [epFrom,    setEpFrom]    = useState(String(currentEp + 1));
  const [epTo,      setEpTo]      = useState(markAll && total ? String(total) : "");
  const [date,      setDate]      = useState(todayISO);
  const [errors,    setErrors]    = useState({});
  const [rating,    setRating]    = useState(null);
  const [reaction,  setReaction]  = useState("");
  const [calOpen,   setCalOpen]   = useState(false);

  // Format ISO → "Apr 25, 2026" for the text field
  function isoToDisplay(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
  }
  // Parse a user-typed date string → ISO "YYYY-MM-DD", or null if unparseable / in future
  function parseToISO(text) {
    const parsed = new Date(text);
    if (isNaN(parsed.getTime())) return null;
    const max = new Date(todayISO + "T23:59:59");
    if (parsed > max) return null;
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const [dateText, setDateText] = useState(isoToDisplay(todayISO));

  const epFromNum = parseInt(epFrom) || 0;
  // If ep_to is blank, treat as single-episode sesh (ep_to = ep_from)
  const epToNum   = epTo.trim() === "" ? epFromNum : (parseInt(epTo) || 0);
  // markAllOngoing = user is declaring an ongoing show as finished (no known total)
  const markAllOngoing = markAll && ongoing;
  const isComplete = markAllOngoing
    ? (epToNum > 0)                          // ongoing finish — valid as long as ep entered
    : (!ongoing && total && epToNum === total); // finite finish — ep_to hit the total

  // Format ISO date for display: "2026-04-25" → "Apr 25"
  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", {month:"short", day:"numeric"});
  }

  function validate() {
    const errs = {};
    if (markAllOngoing) {
      // Ongoing finish — just need a valid ep number and a rating
      if (!epTo.trim() || epToNum <= 0)  errs.epTo   = "Enter the last episode you watched";
      else if (epToNum <= currentEp)     errs.epTo   = "You're already past that episode";
      if (!rating)                       errs.rating = "Rate it before marking it done";
    } else {
      // Normal sesh or finite mark-all
      if (epToNum <= currentEp)                      errs.epTo   = "You're already past that episode";
      else if (!ongoing && total && epToNum > total)  errs.epTo  = `Only ${total} episodes in this show`;
      if (epFromNum > epToNum)                        errs.epFrom = "Can't start after the ending episode";
      if (isComplete && !rating)                      errs.rating = "Rate it before marking it complete";
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const from = epFromNum;
    const to   = epToNum;
    const newSession = { ep_from: from, ep_to: to, date, date_display: fmtDate(date) };

    const updated = {
      ...entry,
      ep: to,
      watch_sessions: [...(entry.watch_sessions || []), newSession],
    };

    if (isComplete) {
      updated.status         = "watched";
      updated.rating         = rating;
      updated.reaction       = reaction.trim() || undefined;
      updated.finishedDate   = fmtDate(date);
      updated.watch_end_date = date;
      updated.paused         = false;
      updated.dropped        = false;
      if (markAllOngoing) {
        // Lock in the final episode count and mark as no longer ongoing
        updated.total   = to;
        updated.ongoing = false;
      }
    } else {
      // Partial sesh — move to Currently Watching regardless of previous status
      updated.status          = "watching";
      updated.paused          = false;
      updated.dropped         = false;
      updated.lastWatchedDate = fmtDate(date);
      // Recalculate watch time estimate from episodes watched × runtime
      const rt  = entry.epRuntime || (entry.type === "Anime" ? 24 : 45);
      const eps = to;
      if (eps > 0) {
        const mins = rt * eps;
        updated.watchTime  = `~${Math.floor(mins / 60)}h ${mins % 60}m`;
        updated.estimated  = true;
      }
    }

    onUpdate(updated);
    onClose();
  }

  const infoLine = ongoing
    ? `${currentEp} eps watched · Ongoing`
    : total
      ? `Currently on Ep ${currentEp} of ${total}`
      : `Currently on Ep ${currentEp}`;

  return <>
    {/* Backdrop */}
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,0.5)"}}/>

    {/* Sheet */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:61,background:T.surface,borderRadius:"24px 24px 0 0",paddingTop:16,boxShadow:"0 -8px 40px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column"}}>

      {/* Drag handle */}
      <div onClick={onClose} style={{cursor:"pointer",paddingBottom:16,display:"flex",justifyContent:"center"}}>
        <div style={{width:36,height:4,background:T.elevated,borderRadius:4}}/>
      </div>

      <div style={{padding:"0 20px 40px",display:"flex",flexDirection:"column",gap:20}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:18,marginBottom:4}}>{markAllOngoing?"Mark as Finished":markAll?"Mark All Watched":"Log a Sesh"}</p>
            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:13}}>{infoLine}</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.textMuted}}><Ico.Close/></button>
        </div>

        {/* Ongoing finish — single "final episode" input */}
        {markAllOngoing&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase"}}>Final Episode Watched</p>
            <input
              type="number" min={currentEp+1} value={epTo} autoFocus
              onChange={e=>{setEpTo(e.target.value);setErrors(p=>({...p,epTo:null,rating:null}));}}
              placeholder={currentEp>0?String(currentEp+1):"e.g. 47"}
              style={{width:"100%",background:T.elevated,border:errors.epTo?`1.5px solid #C47A7A`:epToNum>currentEp?`1.5px solid ${T.amber}`:"1.5px solid transparent",outline:"none",borderRadius:12,padding:"12px 14px",color:epToNum>currentEp?T.amber:T.textPrimary,fontFamily:T.mono,fontWeight:700,fontSize:22,textAlign:"center"}}
            />
            {errors.epTo&&<p style={{color:"#C47A7A",fontFamily:T.font,fontSize:11}}>{errors.epTo}</p>}
            {!errors.epTo&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>How many episodes total did you watch?</p>}
          </div>
        )}

        {/* Episode range — hidden in mark-all mode, locked values handle themselves */}
        {!markAll&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:0}}>Episodes Watched</p>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            {/* ep_from */}
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>From</p>
              <input
                type="number" min={1} max={total||undefined} value={epFrom}
                onChange={e=>{setEpFrom(e.target.value);setErrors(p=>({...p,epFrom:null}));}}
                style={{width:"100%",background:T.elevated,border:errors.epFrom?`1.5px solid #C47A7A`:"1.5px solid transparent",outline:"none",borderRadius:12,padding:"12px 14px",color:T.textPrimary,fontFamily:T.mono,fontWeight:700,fontSize:18,textAlign:"center"}}
              />
              {errors.epFrom&&<p style={{color:"#C47A7A",fontFamily:T.font,fontSize:11}}>{errors.epFrom}</p>}
            </div>

            <p style={{color:T.textMuted,fontFamily:T.font,fontSize:18,paddingTop:28}}>→</p>

            {/* ep_to */}
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              <p style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>To</p>
              <input
                type="number" min={currentEp+1} max={total||undefined} value={epTo}
                onChange={e=>{setEpTo(e.target.value);setErrors(p=>({...p,epTo:null,rating:null}));}}
                placeholder="—"
                autoFocus
                style={{width:"100%",background:T.elevated,border:errors.epTo?`1.5px solid #C47A7A`:`1.5px solid ${epToNum>currentEp?T.amber:"transparent"}`,outline:"none",borderRadius:12,padding:"12px 14px",color:epToNum>currentEp?T.amber:T.textPrimary,fontFamily:T.mono,fontWeight:700,fontSize:18,textAlign:"center"}}
              />
              {errors.epTo&&<p style={{color:"#C47A7A",fontFamily:T.font,fontSize:11}}>{errors.epTo}</p>}
              {!errors.epTo&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11}}>Leave blank for one ep</p>}
            </div>
          </div>
        </div>}

        {/* Date */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase"}}>Date Watched</p>

          {/* Text field + calendar icon toggle */}
          <div style={{display:"flex",alignItems:"center",background:T.elevated,borderRadius:12,overflow:"hidden"}}>
            <input
              value={dateText}
              onChange={e=>setDateText(e.target.value)}
              onBlur={()=>{
                const iso=parseToISO(dateText);
                if(iso){setDate(iso);setDateText(isoToDisplay(iso));}
                else setDateText(isoToDisplay(date));
              }}
              placeholder="Apr 25, 2026"
              style={{flex:1,background:"transparent",border:"none",outline:"none",padding:"12px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14}}
            />
            <button
              onClick={()=>setCalOpen(o=>!o)}
              style={{background:"none",border:"none",cursor:"pointer",padding:"10px 14px",display:"flex",alignItems:"center",borderLeft:`1px solid rgba(255,255,255,0.06)`}}
            >
              <Ico.Cal s={18} c={calOpen?T.amber:T.textMuted}/>
            </button>
          </div>

          {/* Calendar dropdown */}
          {calOpen&&(
            <MiniCalendar
              value={date}
              max={todayISO}
              onChange={iso=>{
                setDate(iso);
                setDateText(isoToDisplay(iso));
                setCalOpen(false);
              }}
            />
          )}
        </div>

        {/* Auto-complete inline section */}
        {isComplete&&(
          <div style={{background:"rgba(239,159,39,0.08)",border:`1px solid rgba(239,159,39,0.2)`,borderRadius:16,padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:15,marginBottom:4}}>{markAllOngoing?"That's a wrap! Rate it 🎬":"You finished it! Rate it 😄"}</p>
              <p style={{color:T.textMuted,fontFamily:T.font,fontSize:12}}>{markAllOngoing?"This will mark the show as Watched and lock in your final episode count.":"This will mark the show as Watched."}</p>
            </div>
            <div style={{background:T.surface,borderRadius:12,padding:"14px 12px"}}>
              <StarRating value={rating} onChange={v=>{setRating(v);setErrors(p=>({...p,rating:null}));}}/>
            </div>
            {errors.rating&&<p style={{color:"#C47A7A",fontFamily:T.font,fontSize:12,marginTop:-6}}>{errors.rating}</p>}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>Your reaction (optional)</p>
                <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10}}>{reaction.length}/500</p>
              </div>
              <textarea
                value={reaction}
                onChange={e=>setReaction(e.target.value.slice(0,500))}
                placeholder="Your thoughts, feelings, hot takes... 🔥"
                rows={3}
                style={{width:"100%",background:T.surface,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14,resize:"none",lineHeight:1.5,boxSizing:"border-box"}}
              />
              {!reaction&&<p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,fontStyle:"italic"}}>This is yours forever. Future you will thank present you.</p>}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:18,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:16,boxShadow:"0 3px 8px rgba(0,0,0,0.35)"}}
        >
          Log Sesh ✓
        </button>

      </div>
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── RATING SHEET ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function RatingSheet({entry, show, onClose, onSave}) {
  const [rating,setRating]=useState(entry?.rating??null);
  const [reaction,setReaction]=useState(entry?.reaction??"");
  function handleSave(){onSave({...entry,rating,reaction});onClose();}
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,0.4)"}}/>
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:61,background:T.surface,borderRadius:"24px 24px 0 0",paddingTop:16,boxShadow:"0 -8px 40px rgba(0,0,0,0.5)"}}>
      <div onClick={onClose} style={{cursor:"pointer",paddingBottom:20,display:"flex",justifyContent:"center"}}>
        <div style={{width:36,height:4,background:T.elevated,borderRadius:4}}/>
      </div>
      <div style={{padding:"0 20px 44px",display:"flex",flexDirection:"column",gap:20}}>
        <p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:700,fontSize:17}}>How did <span style={{color:T.amberDeep}}>{entry?.title}</span> land?</p>
        <StarRating value={rating} onChange={setRating}/>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>Add a reaction? (optional)</p>
            <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10}}>{reaction.length}/500</p>
          </div>
          <textarea value={reaction} onChange={e=>setReaction(e.target.value.slice(0,500))} placeholder="Your thoughts..." rows={3} style={{width:"100%",background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14,resize:"none",lineHeight:1.5}}/>
        </div>
        <button onClick={handleSave} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:16,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15}}>Save Rating</button>
      </div>
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── WATCHER ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TITLE_LANG_KEY = "watchedit_title_language_pref";

function WatcherScreen({entries,onClearData}) {
  const [editMode,setEditMode]=useState(false);
  const [name,setName]=useState("Akhil Kumar");
  const [email]=useState("akhil@watchedit.app");
  const [tempName,setTempName]=useState(name);
  const [logoutModal,setLogoutModal]=useState(false);
  const [clearModal,setClearModal]=useState(false);
  const [titleLangPref,setTitleLangPref]=useState("en");
  useEffect(()=>{const s=localStorage.getItem(TITLE_LANG_KEY);if(s)setTitleLangPref(s);},[]);
  function saveTitleLangPref(v){setTitleLangPref(v);localStorage.setItem(TITLE_LANG_KEY,v);}
  function getInitials(n){const w=n.trim().split(" ");return w.length===1?w[0].slice(0,2).toUpperCase():(w[0][0]+w[w.length-1][0]).toUpperCase();}
  const recs=entries.filter((_,i)=>i%3===0).slice(0,4);

  return <div style={{display:"flex",flexDirection:"column",gap:24,paddingBottom:20}}>
    {/* Identity */}
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,paddingTop:8}}>
      <div style={{width:76,height:76,borderRadius:"50%",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 20px rgba(0,0,0,0.3)"}}><span style={{color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:26}}>{getInitials(name)}</span></div>
      {!editMode?<>
        <div style={{textAlign:"center"}}><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:20}}>{name}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:13,marginTop:4}}>{email}</p></div>
        <button onClick={()=>{setTempName(name);setEditMode(true);}} style={{background:T.elevated,border:"none",cursor:"pointer",borderRadius:20,padding:"8px 20px",color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:13}}>Edit Profile</button>
      </>:<div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
        <input value={tempName} onChange={e=>setTempName(e.target.value)} style={{background:T.elevated,border:"none",outline:"none",borderRadius:12,padding:"10px 14px",color:T.textPrimary,fontFamily:T.font,fontSize:14,width:"100%",textAlign:"center"}}/>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setEditMode(false)} style={{flex:1,padding:"10px",background:T.elevated,border:"none",cursor:"pointer",borderRadius:14,color:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:13}}>Cancel</button>
          <button onClick={()=>{setName(tempName);setEditMode(false);}} style={{flex:1,padding:"10px",background:T.amber,border:"none",cursor:"pointer",borderRadius:14,color:T.bgPrimary,fontFamily:T.font,fontWeight:700,fontSize:13}}>Save</button>
        </div>
      </div>}
    </div>

    {/* Quick stats */}
    <div style={{display:"flex",gap:8}}>
      {[{label:"Watched",val:47},{label:"Hours",val:"312h"},{label:"Avg Rating",val:"8.4"}].map(s=><div key={s.label} style={{flex:1,background:T.surface,borderRadius:14,padding:"12px 10px",textAlign:"center"}}><p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:20,lineHeight:1}}>{s.val}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:10,marginTop:4}}>{s.label}</p></div>)}
    </div>

    {/* My Recommendations */}
    <div>
      <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>My Recommendations</p>
      <div style={{background:T.surface,borderRadius:18,overflow:"hidden"}}>
        {recs.map((e,i)=><div key={e.id} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",borderBottom:i<recs.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
          <div style={{width:36,height:50,borderRadius:8,background:`linear-gradient(145deg,${T.amber},${T.amberDeep})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:10}}>{initials(e.title)}</span></div>
          <div style={{flex:1,minWidth:0}}><p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2}}>{e.type}</p></div>
          <span style={{color:T.amber,fontFamily:T.mono,fontWeight:700,fontSize:13,flexShrink:0}}>★ {e.rating}</span>
        </div>)}
        <button style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"12px 14px",color:T.amber,fontFamily:T.font,fontWeight:600,fontSize:13,textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.05)"}}>View all →</button>
      </div>
    </div>

    {/* Manage */}
    <div>
      <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Manage</p>
      <div style={{background:T.surface,borderRadius:18,overflow:"hidden"}}>
        {[{icon:"🏷️",label:"Manage Tags & Categories",sub:"Add, remove or rename your genre tags"},
          {icon:"🎨",label:"App Preferences",sub:"Theme and display settings"}
        ].map((item,i)=><button key={item.label} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 16px",textAlign:"left",display:"flex",gap:12,alignItems:"center",borderBottom:i===0?"1px solid rgba(255,255,255,0.05)":"none"}}>
          <span style={{fontSize:18}}>{item.icon}</span>
          <div style={{flex:1}}><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:13}}>{item.label}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2}}>{item.sub}</p></div>
          <span style={{color:T.textMuted}}>›</span>
        </button>)}
        <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Preferred Title Language</p>
          <div style={{display:"flex",gap:8}}>
            {[{id:"en",label:"English"},{id:"romaji",label:"Romanised"},{id:"ja",label:"Japanese"}].map(opt=><button key={opt.id} onClick={()=>saveTitleLangPref(opt.id)} style={{flex:1,padding:"8px 4px",borderRadius:20,border:"none",cursor:"pointer",background:titleLangPref===opt.id?T.amber:T.elevated,color:titleLangPref===opt.id?T.bgPrimary:T.textMuted,fontFamily:T.font,fontWeight:700,fontSize:12,transition:"all 0.15s"}}>{opt.label}</button>)}
          </div>
        </div>
      </div>
    </div>

    {/* Data & Connections — Stage 3 */}
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <p style={{color:T.textMuted,fontFamily:T.mono,fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase"}}>Data & Connections</p>
        <span style={{background:"rgba(239,159,39,0.1)",color:T.amberSoft,fontFamily:T.mono,fontSize:9,padding:"2px 7px",borderRadius:20}}>Stage 3</span>
      </div>
      <div style={{background:T.surface,borderRadius:18,overflow:"hidden"}}>
        {[{icon:"🔗",label:"Connect MyAnimeList",sub:"Import anime history + sync new watches"},
          {icon:"📥",label:"Import Netflix History",sub:"Upload your Netflix watch history CSV"},
          {icon:"📬",label:"Review to Log Queue",sub:"Review auto-detected watches before logging"},
          {icon:"📤",label:"Export My Data",sub:"Download your full WatchLog as JSON or CSV"},
        ].map((item,i)=><div key={item.label} style={{padding:"13px 16px",display:"flex",gap:12,alignItems:"center",borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none",opacity:0.5}}>
          <span style={{fontSize:18}}>{item.icon}</span>
          <div style={{flex:1}}><p style={{color:T.textPrimary,fontFamily:T.font,fontWeight:600,fontSize:13}}>{item.label}</p><p style={{color:T.textMuted,fontFamily:T.font,fontSize:11,marginTop:2}}>{item.sub}</p></div>
          <span style={{color:T.textMuted,fontFamily:T.mono,fontSize:10}}>🔒</span>
        </div>)}
      </div>
    </div>

    {/* Dev: Clear data */}
    <button onClick={()=>setClearModal(true)} style={{width:"100%",background:T.elevated,border:"1px dashed rgba(196,122,122,0.3)",cursor:"pointer",borderRadius:18,padding:"12px 16px",color:"rgba(196,122,122,0.7)",fontFamily:T.mono,fontWeight:600,fontSize:12,textAlign:"center",letterSpacing:"0.04em"}}>Clear all data</button>

    {/* Log out */}
    <button onClick={()=>setLogoutModal(true)} style={{width:"100%",background:T.surface,border:"none",cursor:"pointer",borderRadius:18,padding:"14px 16px",color:"#C47A7A",fontFamily:T.font,fontWeight:700,fontSize:14,textAlign:"center"}}>Log Out</button>

    <ConfirmModal show={logoutModal} onClose={()=>setLogoutModal(false)} title="Log out?" message="You'll need to sign back in. Your WatchLog stays safe." confirmLabel="Log Out" onConfirm={()=>setLogoutModal(false)}/>
    <ConfirmModal show={clearModal} onClose={()=>setClearModal(false)} title="Clear all data?" message="This will wipe your entire WatchLog. Useful for testing. Cannot be undone." confirmLabel="Clear It" onConfirm={()=>{setClearModal(false);onClearData?.();}}/>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── APP SHELL ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const NAV=[
  {id:"home",   label:"Watch Tower",Icon:Ico.Home},
  {id:"watchlist",label:"WatchList",Icon:Ico.List},
  {id:"plus",   label:"",           Icon:null},
  {id:"search", label:"Search",     Icon:Ico.Search},
  {id:"profile",label:"Watcher",    Icon:Ico.Profile},
];

export default function WatchedItApp() {
  const [tab,setTab]=useState("home");
  const [watchListTab,setWatchListTab]=useState("all");
  const [logStep,setLogStep]=useState(null);
  const [logShow,setLogShow]=useState(null);
  const [logRewatch,setLogRewatch]=useState(false);
  const [logManual,setLogManual]=useState(false);
  const [logIsEdit,setLogIsEdit]=useState(false);
  const [logEditId,setLogEditId]=useState(null);
  const [detail,setDetail]=useState(null);
  const [entries,setEntries]=useState([]);

  useEffect(()=>{
    let stored=loadStoredEntries();
    if(stored.length===0){stored=[...MOCK_ENTRIES];saveEntries(stored);}
    setEntries(stored);
  },[]);

  function openLogIt(show=null,isRewatch=false,isEdit=false){
    // Handle case where show is an event object (from onClick handler)
    if(show && typeof show === 'object' && show.target && show.preventDefault){
      show = null;
    }
    if(show && typeof show === 'object' && Object.keys(show).length > 0){
      setLogShow(show);
      setLogRewatch(isRewatch);
      setLogManual(false);
      setLogIsEdit(isEdit);
      setLogEditId(isEdit ? (show.id ?? null) : null);
      setLogStep("details");
      return;
    }
    // Always go to search when no valid show data is provided
    setLogShow(null);
    setLogRewatch(false);
    setLogManual(false);
    setLogIsEdit(false);
    setLogEditId(null);
    setLogStep("search");
  }
  function closeLogIt(){setLogStep(null);setLogShow(null);setLogRewatch(false);setLogManual(false);setLogIsEdit(false);setLogEditId(null);}
  function handleSelect({isRewatch,...data}){setLogShow(data);setLogRewatch(isRewatch);setLogManual(false);setLogStep("details");}
  function handleManual(title){setLogShow({title,type:"Movie",lang:"",genre:[],episodes:null,runtime:null,epRuntime:null,ongoing:false});setLogRewatch(false);setLogManual(true);setLogStep("details");}
  function handleLogSubmit(formData){
    const {contentType,language,genre,watchStatus,rating,reaction,recommend,bookmark,episodeCount,epRuntime,ongoing,movieRuntime,epWatched,currentTitle,watch_start_date,watch_end_date}=formData;
    const now=new Date();
    const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayShort=`${MONTHS[now.getMonth()]} ${now.getDate()}`;
    const todayFull=`${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    let watchTime=null,estimated=false;
    if(contentType==="Movie"&&movieRuntime){
      const mins=parseInt(movieRuntime)||0;
      if(mins>0){watchTime=`${Math.floor(mins/60)}h ${mins%60}m`;estimated=false;}
    } else if(contentType!=="Movie"){
      const rt=epRuntime||24;
      const eps=watchStatus==="watching"?epWatched:(parseInt(episodeCount)||0);
      if(eps>0){const t=rt*eps;watchTime=`~${Math.floor(t/60)}h ${t%60}m`;estimated=true;}
    }
    const entry={
      id:Date.now(),
      title:currentTitle || logShow?.title,
      type:contentType,
      lang:language,
      rating,
      date:todayShort,
      status:watchStatus,
      ep:watchStatus==="watching"?epWatched:null,
      total:contentType!=="Movie"?(parseInt(episodeCount)||null):null,
      ongoing:contentType!=="Movie"?ongoing:false,
      rewatch:logRewatch,
      paused:false,
      dropped:false,
      bookmark,
      genre,
      reaction,
      recommend,
      lastWatchedDate:watchStatus==="watching"?"Today":null,
      finishedDate:watchStatus==="watched"?todayFull:null,
      watchTime,
      estimated,
      poster_url:logShow?.poster_url??null,
      malRating:logShow?.malRating??null,
      watch_start_date:watch_start_date||null,
      watch_end_date:watchStatus==="watched"?(watch_end_date||null):null,
      logged_at:new Date().toISOString(),
    };
    if(logIsEdit && logEditId!=null){
      // Edit mode — preserve immutable fields and merge changes onto existing entry
      const existing=entries.find(e=>e.id===logEditId)||{};
      const updatedEntry={
        ...existing,
        title:currentTitle||logShow?.title,
        type:contentType,
        lang:language,
        rating,
        status:watchStatus,
        ep:watchStatus==="watching"?epWatched:(existing.ep??null),
        total:contentType!=="Movie"?(parseInt(episodeCount)||existing.total||null):null,
        ongoing:contentType!=="Movie"?ongoing:false,
        bookmark,
        genre,
        reaction,
        recommend,
        watchTime,
        estimated,
        finishedDate:watchStatus==="watched"?(existing.finishedDate||todayFull):existing.finishedDate||null,
        watch_end_date:watchStatus==="watched"?(existing.watch_end_date||watch_end_date||null):null,
      };
      handleUpdateEntry(updatedEntry);
      closeLogIt();
      return;
    }
    addEntry(entry);
    setEntries(loadStoredEntries());
    // Update logShow with the final title for success screen
    setLogShow(prev => ({ ...prev, title: currentTitle || prev?.title }));
    setLogStep("success");
  }
  function handleClearData(){clearEntries();setEntries([]);}
  function handleLogDone(){closeLogIt();}
  function handleUpdateEntry(updated){updateEntry(updated);setEntries(loadStoredEntries());if(detail&&detail.id===updated.id)setDetail(updated);}
  function handleDeleteEntry(id){deleteEntry(id);setEntries(loadStoredEntries());setDetail(null);}
  const [watchListUnrated,setWatchListUnrated]=useState(false);
  function navigateTab(id, options={}){setDetail(null);setTab(id);if(id==="watchlist"){setWatchListTab(options.subTab||"all");setWatchListUnrated(!!options.unrated);} }

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Inconsolata:wght@400;500;600&family=Poppins:wght@400;500;600;700;800&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{background:${T.bgPrimary};-webkit-font-smoothing:antialiased;overflow-x:hidden;}
      input,textarea{box-sizing:border-box;}
      input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      input::placeholder,textarea::placeholder{color:${T.textMuted};}
      button{-webkit-tap-highlight-color:transparent;}
      .hs::-webkit-scrollbar{display:none;}
      .hs{-ms-overflow-style:none;scrollbar-width:none;}
    `}</style>

    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:T.bgPrimary}}>
      {/* Top bar */}
      <div style={{position:"sticky",top:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 16px",background:"rgba(41,40,38,0.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <button onClick={(e)=>{e.preventDefault();openLogIt();}} style={{border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,borderRadius:22,padding:"8px 22px",display:"inline-flex",alignItems:"center",boxShadow:"0 3px 6px rgba(0,0,0,0.35)"}}>
          <span style={{color:T.textPrimary,fontFamily:T.font,fontWeight:500,fontSize:15,opacity:0.9}}>Watched</span>
          <span style={{color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15}}>It</span>
          <span style={{color:T.textPrimary,fontFamily:T.font,fontWeight:800,fontSize:16,marginLeft:6,opacity:0.7}}>•</span>
        </button>
      </div>

      {/* Content */}
      <div style={{padding:"20px 16px 110px"}}>
        {!detail&&tab==="home"      &&<WatchTower entries={entries} onNavigate={navigateTab} onOpenDetail={setDetail}/>}
        {!detail&&tab==="watchlist" &&<WatchList entries={entries} onOpenDetail={setDetail} onUpdateEntry={handleUpdateEntry} initialTab={watchListTab} initialUnrated={watchListUnrated}/> }
        {!detail&&tab==="search"    &&<SearchScreen entries={entries} onOpenDetail={setDetail}/>}
        {!detail&&tab==="stats"     &&<StatsScreen entries={entries} onTitleTap={e=>{const m=entries.find(en=>en.title===e.title);if(m)setDetail(m);}} onNavigate={navigateTab}/>}
        {!detail&&tab==="profile"   &&<WatcherScreen entries={entries} onClearData={handleClearData}/>}
        {detail&&<DetailView entry={detail} onBack={()=>setDetail(null)} onOpenLogIt={openLogIt} onUpdateEntry={handleUpdateEntry} onDeleteEntry={handleDeleteEntry}/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"10px 8px 24px",background:"rgba(41,40,38,0.95)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        {NAV.map(({id,label,Icon})=>{
          if(id==="plus")return<button key="plus" onClick={(e)=>{e.preventDefault();openLogIt();}} style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:T.bgPrimary,fontWeight:800,marginTop:-20,boxShadow:"0 4px 10px rgba(0,0,0,0.45)"}}>+</button>;
          const active=tab===id&&!detail;
          const color=active?T.amber:T.textMuted;
          return<button key={id} onClick={()=>navigateTab(id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 6px"}}>
            <Icon s={20} c={color}/>
            <span style={{fontFamily:"'Poppins', sans-serif",fontSize:8,fontWeight:active?700:500,letterSpacing:"0.03em",color,whiteSpace:"nowrap"}}>{label}</span>
          </button>;
        })}
      </div>

      {/* Log It — search sheet */}
      {logStep==="search"&&<>
        <div style={{position:"fixed",inset:0,zIndex:40,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(3px)"}}/>
        <div className="hs" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,maxWidth:430,margin:"0 auto",background:T.surface,borderRadius:"24px 24px 0 0",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.5)",paddingTop:16}}>
          <LogItSearch entries={entries} onSelect={handleSelect} onManual={handleManual} onClose={closeLogIt} onNavigate={(id,opts)=>{closeLogIt();navigateTab(id,opts);}}/>
        </div>
      </>}

      {/* Log It — details full screen */}
      {logStep==="details"&&<div className="hs" style={{position:"fixed",inset:0,zIndex:50,maxWidth:430,margin:"0 auto",background:T.surface,overflowY:"auto"}}>
        <LogItDetails show={logShow} isRewatch={logRewatch} isManual={logManual} isEdit={logIsEdit} onBack={logIsEdit?closeLogIt:()=>setLogStep("search")} onSubmit={handleLogSubmit}/>
      </div>}

      {/* Log It — success */}
      {logStep==="success"&&<div style={{position:"fixed",inset:0,zIndex:50,maxWidth:430,margin:"0 auto",background:T.surface,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"40px 20px",textAlign:"center"}}>
        <div style={{fontSize:56}}>✅</div>
        <p style={{color:T.amber,fontFamily:T.font,fontWeight:800,fontSize:26}}>WatchedIt!</p>
        <p style={{color:T.amberDeep,fontFamily:T.font,fontWeight:700,fontSize:18}}>{logShow?.title}</p>
        <p style={{color:T.textMuted,fontFamily:T.font,fontSize:14}}>Added to your WatchLog</p>
        <button onClick={handleLogDone} style={{marginTop:16,padding:"13px 32px",background:`linear-gradient(135deg,${T.amber},${T.amberDeep})`,border:"none",cursor:"pointer",borderRadius:22,color:T.bgPrimary,fontFamily:T.font,fontWeight:800,fontSize:15,boxShadow:"0 3px 8px rgba(0,0,0,0.3)"}}>Done</button>
      </div>}
    </div>
  </>;
}