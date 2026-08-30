import React,{useEffect,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import'./style.css';
import{FootballGame,type Difficulty,type FormationName}from'./game/Game';
import{ShowcaseEngine}from'./game/Showcase';

const DIFF:Difficulty[]=['Beginner','Amateur','Semi-Pro','Professional','World Class','Legendary'];
const FORMS:FormationName[]=['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'];

type Page='home'|'match'|'showcase'|'stats'|'settings';
const getPage=():Page=>{const p=location.hash.replace('#/','');return(['home','match','showcase','stats','settings']as string[]).includes(p)?p as Page:'home'};

function Match({difficulty,formation,onExit}:{difficulty:Difficulty;formation:FormationName;onExit:()=>void}){
 const host=useRef<HTMLDivElement>(null);
 const[s,setS]=useState<any>({score:[0,0],time:'00:00',half:1,event:'KICK OFF',player:'',stamina:100,poss:[50,50],shots:[0,0],powerup:''});
 useEffect(()=>{
  if(!host.current)return;
  const g=new FootballGame(host.current,difficulty,formation);
  const off=g.onState(setS);
  const arrows:Record<string,string>={ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'};
  const down=(e:KeyboardEvent)=>{const k=arrows[e.key];if(k){e.preventDefault();window.dispatchEvent(new KeyboardEvent('keydown',{key:k}))}};
  const up=(e:KeyboardEvent)=>{const k=arrows[e.key];if(k){e.preventDefault();window.dispatchEvent(new KeyboardEvent('keyup',{key:k}))}};
  addEventListener('keydown',down);addEventListener('keyup',up);
  return()=>{off();removeEventListener('keydown',down);removeEventListener('keyup',up);g.destroy()}
 },[difficulty,formation]);
 return <div className="match">
  <div className="stadium-crowd crowd-top">●　●　●　●　●　●　●　●　●　●　●　●　●　●　●　●</div>
  <div className="stadium-crowd crowd-bottom">●　●　●　●　●　●　●　●　●　●　●　●　●　●　●　●</div>
  <div className="ref-badge">⚑ REFEREE <span>ACTIVE</span></div>
  <div ref={host}className="game-canvas"/>
  <div className="scorebar"><button onClick={onExit}>MENU</button><b>BLUE {s.score[0]} — {s.score[1]} RED</b><span>{s.time} · H{s.half}</span></div>
  <div className="match-event">{s.event}</div>
  <div className="controls"><b>WASD / ARROWS</b> Move　<b>SHIFT</b> Sprint　<b>SPACE</b> Switch　<b>J</b> Pass　<b>K</b> Through　<b>L</b> Shoot　<b>P</b> Chip　<b>O</b> Tackle</div>
  <div className="player-hud"><strong>{s.player}</strong><span>STAMINA {s.stamina}%</span>{s.powerup&&<em>⚡ {s.powerup}</em>}</div>
 </div>
}

function Showcase(){const host=useRef<HTMLDivElement>(null);useEffect(()=>{if(!host.current)return;const e=new ShowcaseEngine(host.current,99,0);return()=>e.destroy()},[]);return <div className="fullpage"><div ref={host}className="showcase-canvas"/><div className="page-card"><small>NODE.SOCCER</small><h2>PLAYER POWER SHOWCASE</h2><p>Real-time ball physics, lighting and particle presentation.</p><button onClick={()=>location.hash='#/home'}>BACK</button></div></div>}
function Stats(){return <div className="fullpage static-page"><div className="page-card"><small>MATCH CENTER</small><h2>FOOTBALL SYSTEMS</h2><div className="stat-grid"><span>11v11 AI</span><span>BALL PHYSICS</span><span>GOALKEEPERS</span><span>POWER-UPS</span><span>CAMERA FOLLOW</span><span>GOAL JUICE</span><span>REFEREE LAYER</span><span>CROWD PRESENTATION</span></div><button onClick={()=>location.hash='#/home'}>BACK</button></div></div>}
function Settings({difficulty,setDifficulty,formation,setFormation}:{difficulty:Difficulty;setDifficulty:(x:Difficulty)=>void;formation:FormationName;setFormation:(x:FormationName)=>void}){return <div className="fullpage static-page"><div className="page-card"><small>GAME SETTINGS</small><h2>CONFIGURATION</h2><label>DIFFICULTY<select value={difficulty}onChange={e=>setDifficulty(e.target.value as Difficulty)}>{DIFF.map(x=><option key={x}>{x}</option>)}</select></label><label>FORMATION<select value={formation}onChange={e=>setFormation(e.target.value as FormationName)}>{FORMS.map(x=><option key={x}>{x}</option>)}</select></label><button onClick={()=>location.hash='#/home'}>BACK</button></div></div>}
function Home({difficulty,formation}:{difficulty:Difficulty;formation:FormationName}){return <div className="menu"><div className="menu-glow"/><main><small>NODE.SOCCER • FC POWER SHOWCASE</small><h1>POWER <i>FOOTBALL</i></h1><p>Playable 11v11 match engine · active AI · ball physics · broadcast presentation</p><section><button className="play" onClick={()=>location.hash='#/match'}>▶ QUICK MATCH</button><button className="secondary" onClick={()=>location.hash='#/showcase'}>✦ PLAYER SHOWCASE</button></section><nav><button onClick={()=>location.hash='#/stats'}>MATCH CENTER</button><button onClick={()=>location.hash='#/settings'}>SETTINGS</button></nav><div className="features"><span>11v11 AI</span><span>PHYSICS</span><span>GOALKEEPERS</span><span>POWER-UPS</span><span>CAMERA</span><span>STADIUM</span></div><div className="current">{difficulty} · {formation}</div></main></div>}
function App(){const[page,setPage]=useState<Page>(getPage());const[difficulty,setDifficulty]=useState<Difficulty>('Amateur');const[formation,setFormation]=useState<FormationName>('4-3-3');useEffect(()=>{const f=()=>setPage(getPage());addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);if(page==='match')return <Match difficulty={difficulty}formation={formation}onExit={()=>location.hash='#/home'}/>;if(page==='showcase')return <Showcase/>;if(page==='stats')return <Stats/>;if(page==='settings')return <Settings difficulty={difficulty}setDifficulty={setDifficulty}formation={formation}setFormation={setFormation}/>;return <Home difficulty={difficulty}formation={formation}/>}
createRoot(document.getElementById('root')!).render(<App/>);
