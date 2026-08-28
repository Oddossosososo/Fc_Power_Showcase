import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import './style.css';

type Player = { name: string; ovr: number; act: string; nation: string; position: string };

const players: Player[] = [
  { name: 'Cristiano Ronaldo', ovr: 99, act: 'Rocket Free Kick', nation: 'Portugal', position: 'ST' },
  { name: 'Lionel Messi', ovr: 99, act: 'Impossible Curl', nation: 'Argentina', position: 'RW' },
  { name: 'Kylian Mbappé', ovr: 98, act: 'Lightning Run', nation: 'France', position: 'ST' },
  { name: 'Erling Haaland', ovr: 98, act: 'Thunder Strike', nation: 'Norway', position: 'ST' },
  { name: 'Neymar', ovr: 97, act: 'Skill Master', nation: 'Brazil', position: 'LW' },
  { name: 'Kevin De Bruyne', ovr: 96, act: 'Laser Pass', nation: 'Belgium', position: 'CM' },
];

const copy = {
  en: { showcase: 'POWER SHOWCASE', players: 'PLAYERS', teams: 'TEAMS', test: 'TESTMENU_1.0', live: 'LIVE', subtitle: 'Signature performances driven by player power.', all: 'All Players', selected: 'Selected Player', apply: 'APPLY POWER', ovr: 'OVR', performance: 'PERFORMANCE' },
  es: { showcase: 'EXHIBICIÓN DE PODER', players: 'JUGADORES', teams: 'EQUIPOS', test: 'TESTMENU_1.0', live: 'EN VIVO', subtitle: 'Actuaciones impulsadas por el poder del jugador.', all: 'Todos', selected: 'Jugador seleccionado', apply: 'APLICAR PODER', ovr: 'GRL', performance: 'RENDIMIENTO' },
  fr: { showcase: 'VITRINE DE PUISSANCE', players: 'JOUEURS', teams: 'ÉQUIPES', test: 'TESTMENU_1.0', live: 'EN DIRECT', subtitle: 'Performances emblématiques pilotées par la puissance.', all: 'Tous', selected: 'Joueur sélectionné', apply: 'APPLIQUER', ovr: 'GEN', performance: 'PERFORMANCE' },
  de: { showcase: 'POWER-SHOWCASE', players: 'SPIELER', teams: 'TEAMS', test: 'TESTMENU_1.0', live: 'LIVE', subtitle: 'Signature-Moves, angetrieben von der Spieler-Power.', all: 'Alle Spieler', selected: 'Ausgewählter Spieler', apply: 'POWER ANWENDEN', ovr: 'GES', performance: 'LEISTUNG' },
  pt: { showcase: 'SHOWCASE DE PODER', players: 'JOGADORES', teams: 'EQUIPES', test: 'TESTMENU_1.0', live: 'AO VIVO', subtitle: 'Performances de assinatura movidas pelo poder.', all: 'Todos', selected: 'Jogador selecionado', apply: 'APLICAR PODER', ovr: 'GER', performance: 'DESEMPENHO' },
  ja: { showcase: 'パワーショーケース', players: '選手', teams: 'チーム', test: 'TESTMENU_1.0', live: 'ライブ', subtitle: '選手パワーで進化するシグネチャーパフォーマンス。', all: '全選手', selected: '選択した選手', apply: 'パワーを適用', ovr: 'OVR', performance: 'パフォーマンス' },
  ko: { showcase: '파워 쇼케이스', players: '선수', teams: '팀', test: 'TESTMENU_1.0', live: 'LIVE', subtitle: '선수 파워에 따라 변화하는 시그니처 퍼포먼스.', all: '모든 선수', selected: '선택한 선수', apply: '파워 적용', ovr: 'OVR', performance: '퍼포먼스' },
} as const;

type Lang = keyof typeof copy;

function Showcase({ player, index }: { player: Player; index: number }) {
  const mount = useRef<HTMLDivElement>(null);
  const power = Math.max(1, player.ovr / 99);

  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07100e');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.2, 7.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x7affd8, 1.7);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight(0x55ffcc, 16, 15);
    rim.position.set(-4, 2, 2);
    scene.add(rim);

    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 9),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.88, metalness: 0.05 })
    );
    field.rotation.x = -Math.PI / 2;
    field.position.y = -1.25;
    field.receiveShadow = true;
    scene.add(field);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0xf4f7f5, roughness: 0.48 })
    );
    ball.castShadow = true;
    scene.add(ball);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x66ffd1, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.21;
    scene.add(ring);

    const particleCount = Math.min(900, Math.floor(55 + power * 35));
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 4 - 1.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8effdf, size: 0.025 + Math.min(power, 10) * 0.002, transparent: true, opacity: 0.8 }));
    scene.add(points);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      const t = clock.getElapsedTime();
      const speed = 0.85 + Math.min(power, 40) * 0.08;
      const phase = (t * speed + index * 0.21) % 2;
      const s = phase <= 1 ? phase : 2 - phase;
      const curve = Math.sin(s * Math.PI);
      ball.position.set(-3.0 + s * 6.0, -0.8 + curve * (1.1 + Math.min(power, 20) * 0.025), 0.1 + Math.sin(s * Math.PI) * 0.5);
      ball.rotation.x += 0.12 * speed;
      ball.rotation.z += 0.18 * speed;
      ring.scale.setScalar(1 + curve * (0.2 + Math.min(power, 30) * 0.01));
      ring.rotation.z = t * 0.35;
      points.rotation.y = t * 0.025;
      camera.position.x = Math.sin(t * 0.28) * (0.12 + Math.min(power, 20) * 0.012);
      camera.lookAt(0, -0.25, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [player.ovr, index]);

  const tier = player.ovr >= 1000000 ? 'UNIVERSE' : player.ovr >= 10000 ? 'REALITY BREAKER' : player.ovr >= 1000 ? 'EXTREME' : player.ovr >= 150 ? 'SUPERHUMAN' : 'ELITE';

  return <article className={`showcase-card tier-${tier.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="card-info">
      <div className="ovr-number">{player.ovr.toLocaleString()}</div>
      <div className="ovr-label">{copy.en.ovr}</div>
      <h2>{player.name}</h2>
      <div className="act">✦ {player.act}</div>
    </div>
    <div ref={mount} className="three-stage" />
    <div className="performance"><b>{tier}</b><span>Signature performance</span></div>
  </article>;
}

function App() {
  const [page, setPage] = useState<'showcase' | 'players' | 'teams'>('showcase');
  const [panel, setPanel] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [data, setData] = useState(players);
  const [selected, setSelected] = useState(0);
  const [value, setValue] = useState(99);
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const t = copy[lang];

  const nav = (p: typeof page) => setPage(p);
  const apply = () => {
    setData(prev => prev.map((p, i) => mode === 'all' || i === selected ? { ...p, ovr: value } : p));
  };

  const selectedName = useMemo(() => data[selected]?.name ?? 'Player', [data, selected]);

  return <div className="app">
    <header>
      <div className="brand">FC <em>POWER</em></div>
      <div className="header-right"><span className="dot" /> POWER ENGINE ONLINE <select value={lang} onChange={e => setLang(e.target.value as Lang)}>{Object.keys(copy).map(x => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select></div>
    </header>
    <nav>
      <button className={page === 'showcase' ? 'active' : ''} onClick={() => nav('showcase')}>{t.showcase}</button>
      <button className={page === 'players' ? 'active' : ''} onClick={() => nav('players')}>{t.players}</button>
      <button className={page === 'teams' ? 'active' : ''} onClick={() => nav('teams')}>{t.teams}</button>
      <button onClick={() => setPanel(x => !x)}>{t.test}</button>
    </nav>

    <main>
      {page === 'showcase' && <>
        <div className="title-row"><div><small>PERFORMANCE LAB</small><h1>{t.showcase}</h1><p>{t.subtitle}</p></div><div className="live"><i /> {t.live}</div></div>
        <div className="showcase-grid">{data.map((p, i) => <Showcase key={`${p.name}-${p.ovr}`} player={p} index={i} />)}</div>
      </>}

      {page === 'players' && <><div className="title-row"><div><small>PLAYER DATABASE</small><h1>{t.players}</h1></div></div><div className="database">{data.map((p, i) => <button className="player-row" key={p.name} onClick={() => { setSelected(i); setValue(p.ovr); setPage('showcase'); }}><span>{p.position}</span><strong>{p.name}</strong><em>{p.nation}</em><b>{p.ovr.toLocaleString()}</b></button>)}</div></>}

      {page === 'teams' && <><div className="title-row"><div><small>CLUB DATABASE</small><h1>{t.teams}</h1></div></div><div className="database">{['Real Madrid','Al Nassr','Manchester City','FC Barcelona','Portugal','Brazil'].map(x => <div className="team-row" key={x}><strong>{x}</strong><span>POWER SQUAD</span></div>)}</div></>}
    </main>

    <aside className={panel ? 'test-panel open' : 'test-panel'}>
      <div className="panel-head"><div><small>CONTROL SYSTEM</small><h2>TESTMENU_1.0</h2></div><button onClick={() => setPanel(false)}>×</button></div>
      <label>{t.ovr}<strong>{value.toLocaleString()}</strong></label>
      <input type="number" min="1" value={value} onChange={e => setValue(Math.max(1, Number(e.target.value) || 1))} />
      <input type="range" min="1" max="9999" value={Math.min(value, 9999)} onChange={e => setValue(Number(e.target.value))} />
      <div className="quick">{[99,150,500,999,9999,1000000].map(x => <button key={x} onClick={() => setValue(x)}>{x >= 1000000 ? '1M' : x}</button>)}</div>
      <label>AFFECT</label>
      <select value={mode} onChange={e => setMode(e.target.value as 'all' | 'selected')}><option value="all">{t.all}</option><option value="selected">{t.selected}: {selectedName}</option></select>
      <button className="apply" onClick={apply}>{t.apply}</button>
      <p>OVR has no 99 cap. Performance intensity scales continuously with power.</p>
    </aside>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
