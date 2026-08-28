import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { PLAYERS, type Player } from './data/players';
import { LANGUAGES, type Language } from './i18n';
import { ReplayEngine } from './game/Replay';

function ReplayModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const engine = new ReplayEngine(host.current, player.ovr);
    return () => engine.destroy();
  }, [player]);
  return <div className="replay-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="replay-modal">
      <div className="replay-head">
        <div><small>PERFORMANCE REPLAY</small><h2>{player.name}</h2><span>{player.act} · {player.ovr.toLocaleString()} OVR</span></div>
        <button onClick={onClose}>×</button>
      </div>
      <div ref={host} className="replay-stage" />
      <div className="replay-hud"><span>◉ CINEMATIC CAMERA</span><span>POWER {Math.round(player.ovr / 99 * 100)}%</span><span>OVR-ADAPTIVE PHYSICS</span></div>
      <div className="replay-note">Click another card to compare its performance.</div>
    </div>
  </div>;
}

function ShowcaseCard({ player, onReplay }: { player: Player; onReplay: () => void }) {
  const tier = player.ovr >= 1000000 ? 'UNIVERSE' : player.ovr >= 10000 ? 'REALITY BREAKER' : player.ovr >= 1000 ? 'EXTREME' : player.ovr >= 150 ? 'SUPERHUMAN' : 'ELITE';
  return <button className="showcase-card" onClick={onReplay} aria-label={`Watch ${player.name} replay`}>
    <div className="card-bg"><div className="pitch-glow" /><div className="ball-icon">⚽</div></div>
    <div className="card-info">
      <div className="ovr-number">{player.ovr.toLocaleString()}</div>
      <div className="ovr-label">OVR</div>
      <h2>{player.name}</h2>
      <div className="act">✦ {player.act}</div>
    </div>
    <div className="replay-cta">▶ WATCH REPLAY</div>
    <div className="performance"><b>{tier}</b><span>OVR-adaptive cinematic performance</span></div>
  </button>;
}

function App() {
  const [page, setPage] = useState<'showcase' | 'players' | 'teams'>('showcase');
  const [panel, setPanel] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [data, setData] = useState(PLAYERS);
  const [selected, setSelected] = useState(0);
  const [value, setValue] = useState(99);
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [replay, setReplay] = useState<Player | null>(null);
  const t = LANGUAGES[lang];

  const apply = () => setData(prev => prev.map((p, i) => mode === 'all' || i === selected ? { ...p, ovr: value } : p));
  const selectedName = useMemo(() => data[selected]?.name ?? 'Player', [data, selected]);

  return <div className="app">
    <header><div className="brand">FC <em>POWER</em></div><div className="header-right"><span className="dot" /> POWER ENGINE ONLINE <select value={lang} onChange={e => setLang(e.target.value as Language)}>{Object.entries(LANGUAGES).map(([id, l]) => <option key={id} value={id}>{l.name}</option>)}</select></div></header>
    <nav>
      <button className={page === 'showcase' ? 'active' : ''} onClick={() => setPage('showcase')}>{t.showcase}</button>
      <button className={page === 'players' ? 'active' : ''} onClick={() => setPage('players')}>{t.players}</button>
      <button className={page === 'teams' ? 'active' : ''} onClick={() => setPage('teams')}>{t.teams}</button>
      <button onClick={() => setPanel(x => !x)}>{t.test}</button>
    </nav>
    <main>
      {page === 'showcase' && <>
        <div className="title-row"><div><small>PERFORMANCE LAB</small><h1>{t.showcase}</h1><p>{t.subtitle}</p></div><div className="live"><i /> {t.live}</div></div>
        <div className="showcase-grid">{data.map(p => <ShowcaseCard key={`${p.id}-${p.ovr}`} player={p} onReplay={() => setReplay(p)} />)}</div>
      </>}
      {page === 'players' && <><div className="title-row"><div><small>PLAYER DATABASE</small><h1>{t.players}</h1></div></div><div className="database">{data.map((p, i) => <button className="player-row" key={p.id} onClick={() => { setSelected(i); setValue(p.ovr); setPage('showcase'); }}><span>{p.position}</span><strong>{p.name}</strong><em>{p.nation}</em><b>{p.ovr.toLocaleString()}</b></button>)}</div></>}
      {page === 'teams' && <><div className="title-row"><div><small>CLUB DATABASE</small><h1>{t.teams}</h1></div></div><div className="database">{['Real Madrid','Al Nassr','Manchester City','FC Barcelona','Portugal','Brazil'].map(x => <div className="team-row" key={x}><strong>{x}</strong><span>POWER SQUAD</span></div>)}</div></>}
    </main>
    <aside className={panel ? 'test-panel open' : 'test-panel'}>
      <div className="panel-head"><div><small>CONTROL SYSTEM</small><h2>TESTMENU_1.0</h2></div><button onClick={() => setPanel(false)}>×</button></div>
      <label>{t.ovr}<strong>{value.toLocaleString()}</strong></label>
      <input type="number" min="1" value={value} onChange={e => setValue(Math.max(1, Number(e.target.value) || 1))} />
      <input type="range" min="1" max="9999" value={Math.min(value, 9999)} onChange={e => setValue(Number(e.target.value))} />
      <div className="quick">{[99,150,500,999,9999,1000000].map(x => <button key={x} onClick={() => setValue(x)}>{x >= 1000000 ? '1M' : x}</button>)}</div>
      <label>AFFECT</label><select value={mode} onChange={e => setMode(e.target.value as 'all' | 'selected')}><option value="all">{t.all}</option><option value="selected">{t.selected}: {selectedName}</option></select>
      <button className="apply" onClick={apply}>{t.apply}</button>
      <p>OVR has no 99 cap. Replay speed, shot arc, camera motion, keeper response and effects adapt to power.</p>
    </aside>
    {replay && <ReplayModal player={replay} onClose={() => setReplay(null)} />}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
