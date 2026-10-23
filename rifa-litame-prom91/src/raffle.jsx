import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const live = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_PROJECT'));
const supabase = live ? createClient(supabaseUrl, supabaseKey) : null;
const STORE = 'litame-prom91-raffle-demo-v1';
const emptyTickets = () => Object.fromEntries(Array.from({ length: 100 }, (_, n) => [n, { number: n, status: 'available', name: '', phone: '' }]));

function App() {
  const [tickets, setTickets] = useState(emptyTickets);
  const [adminDetails, setAdminDetails] = useState({});
  const [selected, setSelected] = useState([]);
  const [buyer, setBuyer] = useState({ name: '', phone: '' });
  const [notice, setNotice] = useState('');
  const [admin, setAdmin] = useState(() => sessionStorage.getItem('litame-admin-token') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const syncLocal = (next) => {
    setTickets(next);
    localStorage.setItem(STORE, JSON.stringify(next));
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('litame-raffle'); channel.postMessage(next); channel.close();
    }
  };
  const load = async () => {
    if (!live) {
      try { const saved = JSON.parse(localStorage.getItem(STORE) || 'null'); setTickets(saved || emptyTickets()); }
      catch { setTickets(emptyTickets()); }
      return;
    }
    const { data, error } = await supabase.from('raffle_tickets').select('number,status').order('number');
    if (error) setNotice('No se pudieron cargar las boletas. Revisa la configuración de Supabase.');
    else setTickets(Object.fromEntries((data || []).map(t => [t.number, t])));
  };
  const loadAdminDetails = async (token = admin) => {
    if (!live || !token || token === 'demo') return;
    const r = await fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (r.ok) setAdminDetails(Object.fromEntries((d.tickets || []).map(t => [t.number, t])));
  };
  useEffect(() => {
    load();
    if (!live) {
      const onStorage = (e) => { if (e.key === STORE && e.newValue) setTickets(JSON.parse(e.newValue)); };
      window.addEventListener('storage', onStorage);
      let channel;
      if ('BroadcastChannel' in window) { channel = new BroadcastChannel('litame-raffle'); channel.onmessage = e => setTickets(e.data); }
      return () => { window.removeEventListener('storage', onStorage); channel?.close(); };
    }
    const channel = supabase.channel('raffle-tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_tickets' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  useEffect(() => { if (admin) loadAdminDetails(admin); }, [admin, tickets]);

  const counts = useMemo(() => Object.values(tickets).reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}), [tickets]);
  const choose = (n) => {
    const t = tickets[n]; if (!t || t.status !== 'available') return;
    setSelected(prev => prev.includes(n) ? prev.filter(i => i !== n) : [...prev, n].sort((a,b) => a-b));
  };
  const reserve = async (e) => {
    e.preventDefault(); if (!selected.length || !buyer.name.trim() || !buyer.phone.trim()) return;
    setLoading(true); setNotice('');
    try {
      if (!live) {
        const next = { ...tickets };
        for (const n of selected) { if (next[n].status !== 'available') throw new Error(`La boleta ${String(n).padStart(2,'0')} acaba de ser tomada.`); next[n] = { ...next[n], status: 'held', name: buyer.name.trim(), phone: buyer.phone.trim() }; }
        syncLocal(next);
      } else {
        const response = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: selected, name: buyer.name.trim(), phone: buyer.phone.trim() }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No fue posible reservar.'); await load();
      }
      setNotice(`¡Listo! Separaste las boletas ${selected.map(n => String(n).padStart(2,'0')).join(', ')}. Envía el pago por Nequi a @3133264421 y comparte el comprobante.`);
      setSelected([]); setBuyer({ name: '', phone: '' });
    } catch (err) { setNotice(err.message || 'Ocurrió un error. Intenta de nuevo.'); await load(); }
    finally { setLoading(false); }
  };
  const login = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (!live) { if (password !== 'demo123') throw new Error('Clave incorrecta. En modo demo usa demo123.'); setAdmin('demo'); sessionStorage.setItem('litame-admin-token','demo'); }
      else { const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password}) }); const d=await r.json(); if(!r.ok) throw new Error(d.error || 'No se pudo ingresar.'); setAdmin(d.token); sessionStorage.setItem('litame-admin-token',d.token); }
      setPassword(''); setNotice('Panel de administración activado.');
    } catch(err) { setNotice(err.message); } finally { setLoading(false); }
  };
  const setStatus = async (n, status) => {
    setLoading(true); setNotice('');
    try {
      if (!live) { const next={...tickets,[n]:{...tickets[n],status,...(status==='available'?{name:'',phone:''}:{})}}; syncLocal(next); }
      else { const r=await fetch(`/api/admin/tickets/${n}`, {method:'PATCH',headers:{'Content-Type':'application/json','Authorization':`Bearer ${admin}`},body:JSON.stringify({status})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'No se pudo actualizar.'); await load(); }
      setNotice(`Boleta ${String(n).padStart(2,'0')}: ${status==='paid'?'marcada como pagada':'liberada'}.`);
    } catch(err) { setNotice(err.message); } finally { setLoading(false); }
  };
  const logout = () => { setAdmin(''); sessionStorage.removeItem('litame-admin-token'); };

  return <main className="page">
    <header className="hero">
      <div className="hero-top"><span className="ball" aria-hidden="true">⚽</span><div className="eyebrow">JUNTOS POR UN GRAN OBJETIVO</div><span className="ball" aria-hidden="true">⚽</span></div>
      <div className="hero-title"><div className="bono">BONO</div><div className="solidario">SOLIDARIO</div></div>
      <div className="team">EQUIPO FÚTBOL <span>LITAME PROM91</span></div>
      <div className="event-cards">
        <div className="event-card blue"><span className="event-icon">🎟️</span><div><small>VALOR DE LA BOLETA</small><strong>$10.000</strong><small>PESOS</small></div></div>
        <div className="event-card yellow"><span className="event-icon">🏆</span><div><small>PREMIO</small><strong>$250.000</strong><small>PESOS</small></div></div>
        <div className="event-card blue payment"><span className="event-icon">📲</span><div><small>PAGO POR NEQUI</small><strong className="key">@3133264421</strong><small>Envía el comprobante al organizador</small></div></div>
      </div>
    </header>

    <section className="board-section">
      <div className="section-head"><div><p className="kicker">ELIGE TU NÚMERO</p><h1>Tablero de boletas</h1></div><span className={`live-pill ${live?'connected':'demo'}`}><i />{live?'En vivo':'Modo demostración'}</span></div>
      <div className="legend"><span><i className="legend-dot available" />Disponible <b>{counts.available ?? 100}</b></span><span><i className="legend-dot held" />Separada <b>{counts.held ?? 0}</b></span><span><i className="legend-dot paid" />Pagada <b>{counts.paid ?? 0}</b></span></div>
      <div className="grid" aria-label="Boletas del 00 al 99">{Array.from({length:100},(_,n)=>{ const t=tickets[n] || {status:'available'}; return <button key={n} className={`ticket ${t.status} ${selected.includes(n)?'selected':''}`} onClick={()=>choose(n)} disabled={t.status!=='available'} aria-label={`Boleta ${String(n).padStart(2,'0')}: ${t.status==='available'?'disponible':t.status==='held'?'separada':'pagada'}`} title={t.status==='available'?'Seleccionar':t.status==='held'?'Separada':'Pagada'}>{String(n).padStart(2,'0')}</button>; })}</div>
      <p className="grid-note">Toca una o varias boletas disponibles para separarlas. El tablero se actualiza para todos en tiempo real.</p>
    </section>

    <section className="booking" id="reserva">
      <div className="booking-copy"><p className="kicker">TU APOYO HACE LA DIFERENCIA</p><h2>{selected.length ? `Vas a separar ${selected.length} ${selected.length===1?'boleta':'boletas'}` : 'Separa tus boletas'}</h2><p>Escribe tus datos y los números quedarán reservados para ti.</p>{selected.length>0&&<div className="chosen">{selected.map(n=><span key={n}>{String(n).padStart(2,'0')}</span>)}</div>}</div>
      <form className="booking-form" onSubmit={reserve}><label>Nombre completo<input required maxLength="80" value={buyer.name} onChange={e=>setBuyer({...buyer,name:e.target.value})} placeholder="¿Cómo te llamas?" /></label><label>Teléfono / WhatsApp<input required maxLength="30" value={buyer.phone} onChange={e=>setBuyer({...buyer,phone:e.target.value})} placeholder="Tu número de contacto" /></label><button className="primary" disabled={!selected.length||loading}>{loading?'Procesando…':`Separar ${selected.length||''} ${selected.length===1?'boleta':'boletas'}`}</button><small>Después de reservar, realiza el pago de $10.000 por cada boleta a <b>@3133264421</b>.</small></form>
    </section>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Cerrar">×</button></div>}

    <footer><div className="thanks">¡Gracias por tu apoyo! <span>♡</span></div><p>Unidos por el Equipo Fútbol Litame PROM91</p><button className="admin-toggle" onClick={()=>setAdminOpen(v=>!v)}>{admin?'Administrar boletas':adminOpen?'Cerrar administración':'Acceso del organizador'}</button>
      {adminOpen&&<div className="admin-panel">{!admin?<form className="admin-login" onSubmit={login}><strong>Panel del organizador</strong><label>Clave de administración<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresa tu clave" /></label><button className="primary" disabled={loading}>Ingresar</button>{!live&&<small>En modo demostración, la clave es <b>demo123</b>.</small>}</form>:<><div className="admin-head"><strong>Boletas separadas y pagadas</strong><button className="text-button" onClick={logout}>Cerrar sesión</button></div><div className="admin-list">{Object.values(tickets).filter(t=>t.status!=='available').sort((a,b)=>a.number-b.number).map(t=>{const details=adminDetails[t.number]||t;return <div className="admin-row" key={t.number}><span className={`mini-ticket ${t.status}`}>{String(t.number).padStart(2,'0')}</span><div className="buyer-info"><b>{details.name||'Cargando datos…'}</b><small>{details.phone||''} · {t.status==='held'?'Separada':'Pagada'}</small></div>{t.status==='held'&&<button className="paid-button" onClick={()=>setStatus(t.number,'paid')} disabled={loading}>Marcar pagada</button>}<button className="release-button" onClick={()=>setStatus(t.number,'available')} disabled={loading}>Liberar</button></div>})}{!Object.values(tickets).some(t=>t.status!=='available')&&<p className="empty">Todavía no hay boletas separadas.</p>}</div></>}</div>}
    </footer>
  </main>;
}

export default App;
