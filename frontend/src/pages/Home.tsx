
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────
   FONT TOKEN
───────────────────────────────────────── */
const FONT = "'Plus Jakarta Sans', sans-serif";

/* ─────────────────────────────────────────
   RESPONSIVE HOOK
   isMobile  : < 768 px
   isTablet  : 768 – 1023 px
   isDesktop : ≥ 1024 px
───────────────────────────────────────── */
function useBreakpoint() {
  const get = () => ({
    isMobile:  window.innerWidth < 768,
    isTablet:  window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    w: window.innerWidth,
  });
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const handle = () => setBp(get());
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return bp;
}

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const STATS = [
  { value: '10+',   label: 'Stagiaires gérés' },
  { value: '98%',      label: 'Taux de satisfaction' },
  { value: '5+',      label: 'Entreprises partenaires' },
  { value: '3 fraude', label: 'Détectée avec QR dynamique' },
];

const STEPS = [
  { num:'01', color:'indigo',  icon:'🎓', title:'Inscription',
    text:'Formulaire multi-étapes en ligne ou import CSV/Excel en masse. Upload de documents, choix de période de stage, confirmation par e-mail automatique.',
    tags:['En ligne','Présentiel','Import masse'] },
  { num:'02', color:'emerald', icon:'✅', title:'Validation & intégration',
    text:"Le RH examine le dossier, attribue un tuteur et un département. Génération automatique des identifiants, badge numérique et QR Code personnel.",
    tags:['Workflow automatisé','Notifications'] },
  { num:'03', color:'amber',   icon:'📊', title:'Suivi quotidien',
    text:"Tâches en Kanban, rapports journaliers obligatoires, présences via QR rafraîchi toutes les 60 s. Alertes tuteur en cas de retard ou d'absence.",
    tags:['Temps réel','Kanban','Rapports'] },
  { num:'04', color:'violet',  icon:'💳', title:'Paiement & gratification',
    text:'Planification mensuelle ou en fin de stage. Paiement en masse via Excel, fiches de paie PDF automatiques, tableau de bord budgétaire.',
    tags:['Paiement groupé','Export PDF'] },
  { num:'05', color:'rose',    icon:'🏆', title:'Notation & attestation',
    text:"Grille multi-critères pondérée (présence, tâches, rapports, comportement). Attestation numérique avec QR de vérification d'authenticité.",
    tags:['Grille pondérée','QR authenticité'] },
];

const MODULES = [
  { icon:'📡', title:'Présences QR anti-fraude',  desc:'Code rafraîchi, vérif. géo + IP, scan mobile sur réseau entreprise.',   color:'#6366F1' },
  { icon:'🗂️', title:'Kanban des tâches',         desc:'À faire → En cours → Révision → Terminé, deadlines et alertes retard.', color:'#10B981' },
  { icon:'📝', title:'Rapports journaliers',       desc:'Formulaire quotidien, validation annotée, historique et alertes.',        color:'#F59E0B' },
  { icon:'💰', title:'Paiements & gratifications', desc:'Import masse, fiches PDF, tableau budgétaire, statuts de paiement.',      color:'#8B5CF6' },
  { icon:'👥', title:'Gestion des rôles',          desc:'Super Admin, RH, Tuteur, Stagiaire — accès cloisonnés et tracés.',       color:'#0EA5E9' },
  { icon:'🏅', title:'Notation & attestations',    desc:'Grille pondérée, mention automatique, attestation avec QR.',             color:'#EF4444' },
  { icon:'💬', title:'Messagerie interne',         desc:'Chat stagiaire ↔ tuteur ↔ admin avec pièces jointes.',                 color:'#14B8A6' },
  { icon:'📤', title:'Import en masse',            desc:'Excel/CSV pour inscriptions et paiements groupés, avec validation.',      color:'#F97316' },
  { icon:'🔍', title:"Journal d'audit",            desc:'Traçabilité complète de chaque action sensible dans le système.',         color:'#84CC16' },
];

const ROLES = {
  admin: {
    label:'Super Admin', desc:'Accès total à toutes les fonctionnalités',
    emoji:'🛡️', color:'#6366F1', bg:'#EEF2FF',
    perms:[
      { icon:'⚙️', text:'Configuration globale du système',             badge:'Complet'  },
      { icon:'👤', text:'Création et gestion des comptes (tous rôles)', badge:'Global'   },
      { icon:'📊', text:'Tableaux de bord analytiques KPI',              badge:'Global'   },
      { icon:'📁', text:'Export de données PDF / Excel / CSV',          badge:'Illimité' },
      { icon:'📋', text:"Journal d'audit et logs de sécurité",          badge:'Lecture'  },
    ],
  },
  rh: {
    label:'Admin RH', desc:'Gestion des stagiaires de son périmètre',
    emoji:'🏢', color:'#0EA5E9', bg:'#E0F2FE',
    perms:[
      { icon:'✅', text:'Validation et refus des inscriptions',          badge:'Périmètre'    },
      { icon:'💰', text:'Gestion des paiements & gratifications',        badge:'Complet'      },
      { icon:'📅', text:'Planification des périodes de stage',           badge:'Complet'      },
      { icon:'🏅', text:'Génération et signature des attestations',      badge:'Signataire'   },
      { icon:'🔔', text:'Gestion des alertes et absences',               badge:'Notification' },
    ],
  },
  tuteur: {
    label:'Tuteur / Encadreur', desc:'Accès limité à ses propres stagiaires',
    emoji:'⭐', color:'#10B981', bg:'#ECFDF5',
    perms:[
      { icon:'🗂️', text:'Gestion du Kanban des tâches',                 badge:'Ses stagiaires' },
      { icon:'📝', text:'Validation des rapports journaliers',           badge:'Annotation'     },
      { icon:'🌟', text:'Notation intermédiaire pondérée',               badge:'Pondéré'        },
      { icon:'💬', text:'Messagerie interne',                            badge:'Ses stagiaires' },
      { icon:'⏰', text:'Consultation des présences',                    badge:'Lecture'        },
    ],
  },
  stagiaire: {
    label:'Stagiaire (Apprenant)', desc:'Tableau de bord personnel et soumissions',
    emoji:'🎓', color:'#F59E0B', bg:'#FFFBEB',
    perms:[
      { icon:'📡', text:'Pointage via QR Code dynamique',                badge:'Quotidien'   },
      { icon:'📝', text:'Soumission des rapports journaliers',           badge:'Obligatoire' },
      { icon:'📈', text:'Consultation de sa progression',                badge:'Lecture'     },
      { icon:'📥', text:'Téléchargement ressources & attestation',       badge:'Disponible'  },
      { icon:'💬', text:'Messagerie avec le tuteur',                     badge:'Limité'      },
    ],
  },
};

const TESTIMONIALS = [
  { initials:'SM', name:'Stéphanie Mbog',  role:'DRH, TechCorp Douala',      bg:'#E0F2FE', color:'#0369A1',
    text:'"Avant SGS, nous gérions tout sur Excel. Maintenant chaque stagiaire est suivi en temps réel. Le QR dynamique a mis fin aux abus de présence."' },
  { initials:'JT', name:'Jean Tchouaket', role:'Tuteur, Banque Centrale',     bg:'#ECFDF5', color:'#065F46',
    text:'"Le Kanban et les rapports journaliers me donnent une visibilité totale sur mes stagiaires sans réunions inutiles. Validation en un clic."' },
  { initials:'AF', name:'Awa Fofana',     role:'Stagiaire, Marketing digital', bg:'#FFFBEB', color:'#92400E',
    text:"\"Mon tableau de bord m'indique exactement où j'en suis. Mes tâches, mes présences, ma note et mon attestation téléchargeable. Impeccable.\"" },
];

const COLOR_MAP = {
  indigo:  { bg:'#EEF2FF', text:'#4338CA', border:'#C7D2FE' },
  emerald: { bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0' },
  amber:   { bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' },
  violet:  { bg:'#F5F3FF', text:'#5B21B6', border:'#DDD6FE' },
  rose:    { bg:'#FFF1F2', text:'#9F1239', border:'#FECDD3' },
};

/* ─────────────────────────────────────────
   HOOKS
───────────────────────────────────────── */
function useQrTimer(initial = 90) {
  const [sec, setSec] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setSec(s => (s <= 1 ? 120 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return sec;
}

function useCountUp(target: string | number, duration = 1500) {
  const [val, setVal] = useState<string | number>(0);
  const ref = useRef<number | null>(null); // Correction ligne 158 : Précise que le ref contient un number (l'ID de l'animation) ou null

  useEffect(() => {
    const targetStr = String(target);
    const num = parseInt(targetStr.replace(/\D/g, ''), 10);
    if (isNaN(num)) { setVal(targetStr); return; }
    
    const start = performance.now();
    
    const tick = (now: number) => { // Correction lignes 148 & 155 : Ajout du type 'number' à 'now'
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * num));
      if (p < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    };
    
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current !== null) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  const targetStr = String(target);
  return typeof val === 'number' ? targetStr.replace(/\d+/, String(val)) : val;
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
function StatCard({ value, label }) {
  const animated = useCountUp(value);
  return (
    <div style={{ textAlign:'center', padding:'20px 12px' }}>
      <div style={{ fontSize:24, fontWeight:800, color:'#4F46E5', fontFamily:FONT }}>{animated}</div>
      <div style={{ fontSize:12, color:'#6B7280', marginTop:4, fontWeight:500, fontFamily:FONT }}>{label}</div>
    </div>
  );
}

function StepCard({ step, index }) {
  const c = COLOR_MAP[step.color];
  return (
    <div style={{
      display:'flex', gap:16, padding:'18px 20px',
      background:'#fff', border:'1px solid #F3F4F6',
      borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)',
      animation:'slideUp 0.4s ease both',
      animationDelay:`${index * 0.07}s`,
    }}>
      <div style={{
        minWidth:44, height:44, borderRadius:10,
        background:c.bg, border:`1px solid ${c.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, flexShrink:0,
      }}>{step.icon}</div>
      <div>
        <span style={{ fontSize:10, fontWeight:700, color:c.text, letterSpacing:'.06em', fontFamily:FONT }}>
          ÉTAPE {step.num}
        </span>
        <div style={{ fontSize:14, fontWeight:700, color:'#111827', margin:'4px 0 5px', fontFamily:FONT }}>{step.title}</div>
        <div style={{ fontSize:13, fontWeight:400, color:'#6B7280', lineHeight:1.6, marginBottom:8, fontFamily:FONT }}>{step.text}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {step.tags.map(t => (
            <span key={t} style={{
              fontSize:10, padding:'2px 8px', borderRadius:999,
              background:c.bg, color:c.text, fontWeight:600, fontFamily:FONT,
              border:`1px solid ${c.border}`,
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// À insérer juste au-dessus de ModuleCard
interface ModuleType {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

function ModuleCard({ mod }: { mod: ModuleType }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding:'16px 14px', borderRadius:12,
        background: hov ? '#fff' : '#F9FAFB',
        border:`1px solid ${hov ? mod.color + '40' : '#F3F4F6'}`,
        transition:'all .2s',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 24px ${mod.color}18` : 'none',
      }}
    >
      <div style={{ fontSize:22, marginBottom:8 }}>{mod.icon}</div>
      <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:4, fontFamily:FONT }}>{mod.title}</div>
      <div style={{ fontSize:12, fontWeight:400, color:'#6B7280', lineHeight:1.6, fontFamily:FONT }}>{mod.desc}</div>
    </div>
  );
}

function QrTimer() {
  const sec = useQrTimer(87);
  const pct = (sec / 120) * 100;
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:76, height:76 }}>
        <svg width="76" height="76" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
          <circle cx="38" cy="38" r={r} fill="none"
            stroke={sec > 30 ? '#4F46E5' : '#EF4444'} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition:'stroke-dashoffset .8s ease, stroke .3s' }}
          />
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:800, fontFamily:FONT,
          color: sec > 30 ? '#4F46E5' : '#EF4444',
        }}>{sec}s</div>
      </div>
      <span style={{ fontSize:10, color:'#6B7280', textAlign:'center', fontFamily:FONT, fontWeight:500 }}>
        Régénération auto
      </span>
    </div>
  );
}

function RolePanel({ active, onSelect }) {
  const r = ROLES[active];
  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {Object.entries(ROLES).map(([key, val]) => (
          <button key={key} onClick={() => onSelect(key)} style={{
            padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:600,
            fontFamily:FONT, cursor:'pointer', border:'1.5px solid',
            borderColor: active === key ? val.color : '#E5E7EB',
            background: active === key ? val.color : '#fff',
            color: active === key ? '#fff' : '#6B7280',
            transition:'all .15s',
          }}>
            {val.emoji} {val.label}
          </button>
        ))}
      </div>
      <div style={{
        background:r.bg, border:`1px solid ${r.color}30`,
        borderRadius:14, padding:20, animation:'fadeIn .25s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{
            width:40, height:40, borderRadius:10,
            background:r.color + '20',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
          }}>{r.emoji}</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827', fontFamily:FONT }}>{r.label}</div>
            <div style={{ fontSize:12, fontWeight:400, color:'#6B7280', fontFamily:FONT }}>{r.desc}</div>
          </div>
        </div>
        {r.perms.map((p, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:10, padding:'9px 0',
            borderBottom: i < r.perms.length - 1 ? `1px solid ${r.color}20` : 'none',
          }}>
            <span style={{ fontSize:15 }}>{p.icon}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:400, color:'#374151', fontFamily:FONT }}>{p.text}</span>
            <span style={{
              fontSize:10, padding:'3px 9px', borderRadius:999,
              background:r.color + '20', color:r.color, fontWeight:700, fontFamily:FONT,
              whiteSpace:'nowrap',
            }}>{p.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   CONTACT FORM
───────────────────────────────────────── */
function ContactForm() {
  const [form, setForm] = useState({ nom:'', email:'', sujet:'', message:'' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(null);
  const { isMobile } = useBreakpoint();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const fieldStyle = (name) => ({
    width:'100%', padding:'10px 13px',
    fontSize:14, fontFamily:FONT, fontWeight:400, color:'#111827', background:'#fff',
    border:`1.5px solid ${focused === name ? '#4F46E5' : '#E5E7EB'}`,
    borderRadius:10, outline:'none',
    boxShadow: focused === name ? '0 0 0 3px rgba(79,70,229,.1)' : 'none',
    transition:'border-color .15s, box-shadow .15s',
  });

  const submit = async (e) => {
    e.preventDefault(); setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSending(false); setSent(true);
  };

  if (sent) return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:14, padding:'40px 24px', textAlign:'center',
      background:'#ECFDF5', border:'1.5px solid #A7F3D0',
      borderRadius:18, animation:'fadeIn .4s ease',
    }}>
      <div style={{ fontSize:48 }}>✅</div>
      <div style={{ fontSize:17, fontWeight:800, color:'#065F46', fontFamily:FONT }}>Message envoyé !</div>
      <div style={{ fontSize:13, fontWeight:400, color:'#047857', lineHeight:1.7, fontFamily:FONT }}>
        Merci <strong>{form.nom || 'pour votre message'}</strong>. Notre équipe vous contactera
        sous 24 h ouvrées à <strong>{form.email}</strong>.
      </div>
      <button onClick={() => { setSent(false); setForm({ nom:'', email:'', sujet:'', message:'' }); }} style={{
        padding:'8px 18px', borderRadius:10, border:'1.5px solid #10B981',
        background:'transparent', color:'#065F46', fontSize:13, fontWeight:600,
        cursor:'pointer', fontFamily:FONT,
      }}>Nouveau message</button>
    </div>
  );

  return (
    <form onSubmit={submit} style={{
      background:'#fff', border:'1px solid #F3F4F6',
      borderRadius:18, padding:'24px 22px 20px',
      boxShadow:'0 4px 24px rgba(79,70,229,.06)',
    }}>
      <div style={{ fontSize:15, fontWeight:800, color:'#111827', marginBottom:3, fontFamily:FONT }}>
        Envoyer un message
      </div>
      <div style={{ fontSize:12, fontWeight:400, color:'#9CA3AF', marginBottom:18, fontFamily:FONT }}>
        Champs marqués <span style={{ color:'#EF4444' }}>*</span> obligatoires
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap:12, marginBottom:12,
      }}>
        {[
          { k:'nom',   label:'Nom complet',    type:'text',  ph:'Alima Larousse' },
          { k:'email', label:'Adresse email',  type:'email', ph:'vous@exemple.cm' },
        ].map(f => (
          <div key={f.k}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4, fontFamily:FONT }}>
              {f.label} <span style={{ color:'#EF4444' }}>*</span>
            </label>
            <input required type={f.type} value={form[f.k]} onChange={set(f.k)}
              placeholder={f.ph} style={fieldStyle(f.k)}
              onFocus={() => setFocused(f.k)} onBlur={() => setFocused(null)} />
          </div>
        ))}
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4, fontFamily:FONT }}>
          Sujet <span style={{ color:'#EF4444' }}>*</span>
        </label>
        <select required value={form.sujet} onChange={set('sujet')} style={{ ...fieldStyle('sujet'), cursor:'pointer' }}
          onFocus={() => setFocused('sujet')} onBlur={() => setFocused(null)}>
          <option value="">— Choisissez un sujet —</option>
          <option value="demo">Demande de démo</option>
          <option value="tarif">Informations tarifaires</option>
          <option value="integration">Intégration / API</option>
          <option value="support">Support technique</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4, fontFamily:FONT }}>
          Message <span style={{ color:'#EF4444' }}>*</span>
        </label>
        <textarea required rows={4} value={form.message} onChange={set('message')}
          placeholder="Décrivez votre besoin, le nombre de stagiaires…"
          style={{ ...fieldStyle('message'), resize:'vertical', verticalAlign:'top' }}
          onFocus={() => setFocused('message')} onBlur={() => setFocused(null)} />
      </div>

      <div style={{
        display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
        background:'#F9FAFB', border:'1px solid #F3F4F6',
        borderRadius:10, marginBottom:16,
      }}>
        <span>🔒</span>
        <span style={{ fontSize:11, fontWeight:400, color:'#6B7280', lineHeight:1.5, fontFamily:FONT }}>
          Vos données sont traitées de manière confidentielle et ne sont jamais partagées.
        </span>
      </div>

      <button type="submit" disabled={sending} style={{
        width:'100%', padding:'12px 20px', borderRadius:11, border:'none',
        background: sending ? '#6366F1' : '#4F46E5', color:'#fff',
        fontSize:14, fontWeight:700, fontFamily:FONT,
        cursor: sending ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        transition:'background .15s',
      }}
        onMouseEnter={e => { if (!sending) e.currentTarget.style.background = '#4338CA'; }}
        onMouseLeave={e => { if (!sending) e.currentTarget.style.background = '#4F46E5'; }}
      >
        {sending ? (
          <>
            <span style={{
              width:13, height:13, border:'2px solid rgba(255,255,255,.4)',
              borderTopColor:'#fff', borderRadius:'50%',
              animation:'spin .6s linear infinite', display:'inline-block',
            }} />
            Envoi…
          </>
        ) : '📨 Envoyer le message'}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────
   MOBILE MENU
───────────────────────────────────────── */
function MobileMenu({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99,
      background:'rgba(15,23,42,.5)', backdropFilter:'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        position:'absolute', top:0, right:0, bottom:0,
        width:'75vw', maxWidth:280,
        background:'#fff', padding:'24px 20px',
        display:'flex', flexDirection:'column', gap:4,
        boxShadow:'-4px 0 32px rgba(0,0,0,.12)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:30, height:30, borderRadius:8, background:'#4F46E5',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
            }}>🎓</div>
            <span style={{ fontWeight:800, fontSize:14, fontFamily:FONT }}>SGS</span>
          </div>
          <button onClick={onClose} style={{
            width:30, height:30, border:'none', background:'#F3F4F6',
            borderRadius:8, cursor:'pointer', fontSize:16, fontFamily:FONT,
          }}>✕</button>
        </div>
        {[
          { label:'Fonctionnalités', href:'#fonctionnalites' },
          { label:'Parcours',        href:'#parcours'        },
          { label:'Sécurité',        href:'#securite'        },
          { label:'Rôles',           href:'#roles'           },
          { label:'Contact',         href:'#contact'         },
        ].map(l => (
          <a key={l.label} href={l.href} onClick={onClose} style={{
            padding:'12px 14px', borderRadius:10, fontSize:14, fontWeight:500,
            color:'#374151', fontFamily:FONT, textDecoration:'none',
            transition:'background .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >{l.label}</a>
        ))}
        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          <Link to="/login" onClick={onClose}>
            <button style={{
              width:'100%', padding:'10px', borderRadius:10,
              border:'1.5px solid #E5E7EB', background:'transparent',
              fontSize:14, fontWeight:600, fontFamily:FONT, cursor:'pointer',
            }}>Connexion</button>
          </Link>
          <Link to="/inscription" onClick={onClose}>
            <button style={{
              width:'100%', padding:'10px', borderRadius:10,
              border:'none', background:'#4F46E5', color:'#fff',
              fontSize:14, fontWeight:600, fontFamily:FONT, cursor:'pointer',
            }}>Candidater →</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────── */
export default function Home() {
  const [activeRole, setActiveRole] = useState('admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const px = isMobile ? 16 : isTablet ? 24 : 32;
  const sectionPy = isMobile ? 40 : 64;

  return (
    <div style={{ fontFamily:FONT, background:'#fff', color:'#111827' }}>

      {/* FONT */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes slideUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulseGrn { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        a    { text-decoration:none; color:inherit; }
        button { font-family:inherit; }
        .btn-p {
          display:inline-flex; align-items:center; gap:7px;
          padding:11px 20px; border-radius:11px; border:none;
          font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;
          background:#4F46E5; color:#fff; cursor:pointer;
          transition:background .15s, transform .1s;
          white-space:nowrap;
        }
        .btn-p:hover { background:#4338CA; transform:translateY(-1px); }
        .btn-g {
          display:inline-flex; align-items:center; gap:7px;
          padding:11px 20px; border-radius:11px;
          border:1.5px solid #E5E7EB;
          font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;
          background:transparent; color:#374151; cursor:pointer;
          transition:border-color .15s, background .15s;
          white-space:nowrap;
        }
        .btn-g:hover { border-color:#4F46E5; background:#F5F3FF; }
        .nav-a {
          font-size:14px; font-weight:500; color:#6B7280;
          font-family:'Plus Jakarta Sans',sans-serif;
          transition:color .15s; padding:4px 0;
        }
        .nav-a:hover { color:#4F46E5; }
        .pdot { width:8px; height:8px; border-radius:50%; background:#10B981; animation:pulseGrn 2s infinite; }
        .sec-lbl {
          font-size:11px; font-weight:700; letter-spacing:.1em;
          text-transform:uppercase; color:#4F46E5; margin-bottom:8px;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        .sec-ttl {
          font-size:26px; font-weight:800; color:#111827;
          font-family:'Plus Jakarta Sans',sans-serif; line-height:1.2; margin-bottom:8px;
        }
        .sec-sub {
          font-size:14px; font-weight:400; color:#6B7280; line-height:1.7;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        .mpbar { height:4px; background:#F3F4F6; border-radius:999px; overflow:hidden; margin-top:5px; }
        .mpfill { height:100%; border-radius:999px; background:linear-gradient(90deg,#4F46E5,#818CF8); }
        @media(max-width:767px){
          .sec-ttl { font-size:22px !important; }
          .sec-sub  { font-size:13px !important; }
        }
      `}</style>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ══ NAVBAR ══ */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(255,255,255,.92)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid #F3F4F6',
      }}>
        <div style={{
          maxWidth:1100, margin:'0 auto', padding:`0 ${px}px`,
          height:60, display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎓</div>
            <div>
              <span style={{ fontWeight:800, fontSize:15, color:'#111827', fontFamily:FONT }}>SGS</span>
              {!isMobile && <span style={{ display:'block', fontSize:10, color:'#9CA3AF', marginTop:-2, fontFamily:FONT }}>Gestion des Stagiaires</span>}
            </div>
          </div>

          {/* Desktop nav */}
          {isDesktop && (
            <nav style={{ display:'flex', alignItems:'center', gap:24 }}>
              {['#fonctionnalites:Fonctionnalités','#parcours:Parcours','#securite:Sécurité','#roles:Rôles','#contact:Contact'].map(s => {
                const [href, label] = s.split(':');
                return <a key={href} href={href} className="nav-a">{label}</a>;
              })}
            </nav>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isDesktop ? (
              <>
                <Link to="/login"><button className="btn-g" style={{ padding:'8px 16px', fontSize:13 }}>Connexion</button></Link>
                <Link to="/inscription"><button className="btn-p" style={{ padding:'8px 16px', fontSize:13 }}>Candidater →</button></Link>
              </>
            ) : (
              <button onClick={() => setMenuOpen(true)} style={{
                width:36, height:36, border:'1.5px solid #E5E7EB', borderRadius:9,
                background:'#fff', cursor:'pointer', fontSize:18, fontFamily:FONT,
              }}>☰</button>
            )}
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section style={{ background:'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{
          maxWidth:1100, margin:'0 auto', padding:`${isMobile ? 40 : 64}px ${px}px ${isMobile ? 36 : 52}px`,
          display:'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
          gap: isMobile ? 32 : 40,
          alignItems:'center',
        }}>
          {/* Left */}
          <div style={{ animation:'slideUp .5s ease both' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              padding:'5px 12px', borderRadius:999,
              background:'#EEF2FF', border:'1px solid #C7D2FE', marginBottom:20,
            }}>
              <span className="pdot" />
              <span style={{ fontSize:12, fontWeight:600, color:'#4338CA', fontFamily:FONT }}>Plateforme active · v2.0</span>
            </div>

            <h1 style={{
              fontFamily:FONT, fontSize: isMobile ? 30 : isTablet ? 36 : 42,
              fontWeight:800, lineHeight:1.15, color:'#0F172A', marginBottom:16,
            }}>
              Gérez vos stagiaires<br />
              de <span style={{ color:'#4F46E5' }}>A à Z</span>,<br />
              sans friction.
            </h1>

            <p style={{
              fontSize: isMobile ? 14 : 15, fontWeight:400, color:'#6B7280',
              lineHeight:1.75, marginBottom:24, fontFamily:FONT,
              maxWidth: isDesktop ? 400 : '100%',
            }}>
              Inscription, présences QR anti-fraude, suivi des tâches, rapports journaliers,
              paiements et notation finale — centralisés en une seule plateforme.
            </p>

            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:28 }}>
              <Link to="/inscription"><button className="btn-p">🎓 Déposer ma candidature</button></Link>
              <Link to="/login"><button className="btn-g">🏢 Espace entreprise</button></Link>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex' }}>
                {['#E0F2FE','#ECFDF5','#FFFBEB','#EEF2FF'].map((bg, i) => (
                  <div key={i} style={{
                    width:28, height:28, borderRadius:'50%',
                    background:bg, border:'2px solid #fff',
                    marginLeft: i > 0 ? -8 : 0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700, fontFamily:FONT,
                    color:['#0369A1','#065F46','#92400E','#4338CA'][i],
                  }}>{['MK','AB','CB','DT'][i]}</div>
                ))}
              </div>
              <span style={{ fontSize:12, fontWeight:400, color:'#6B7280', fontFamily:FONT }}>
                <strong style={{ color:'#111827', fontWeight:700 }}>1 200+</strong> stagiaires gérés
              </span>
            </div>
          </div>

          {/* Right — mini dashboard (hidden on mobile) */}
          {!isMobile && (
            <div style={{
              background:'#fff', border:'1px solid #E5E7EB',
              borderRadius:18, padding: isTablet ? 18 : 22,
              boxShadow:'0 20px 60px rgba(79,70,229,.08)',
              animation:'slideUp .5s ease .1s both',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#111827', fontFamily:FONT }}>Tableau de bord</div>
                <span style={{ fontSize:10, color:'#9CA3AF', fontFamily:FONT }}>08 Juin 2026</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                {[
                  { label:'Stagiaires actifs', val:'48', color:'#4F46E5', bg:'#EEF2FF' },
                  { label:'Présents',          val:'41', color:'#10B981', bg:'#ECFDF5' },
                  { label:'En attente',        val:'7',  color:'#F59E0B', bg:'#FFFBEB' },
                ].map(k => (
                  <div key={k.label} style={{ background:k.bg, borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:500, color:'#6B7280', marginBottom:3, fontFamily:FONT }}>{k.label}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:k.color, fontFamily:FONT }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {[
                { initials:'AL', name:'Alima Larousse', dept:'Dév. web',      week:'3/8', pct:37, status:'Présente', sc:'#065F46', sb:'#ECFDF5', ac:'#E0F2FE', tc:'#0369A1' },
                { initials:'BN', name:'Bruno Ndongo',   dept:'Finance',       week:'6/8', pct:75, status:'Absent',   sc:'#9F1239', sb:'#FFF1F2', ac:'#EEF2FF', tc:'#4338CA' },
                { initials:'CF', name:'Clara Foka',     dept:'Comptabilité',  week:'5/8', pct:62, status:'Présente', sc:'#065F46', sb:'#ECFDF5', ac:'#ECFDF5', tc:'#065F46' },
              ].map((s, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 0',
                  borderBottom: i < 2 ? '1px solid #F9FAFB' : 'none',
                }}>
                  <div style={{
                    width:30, height:30, borderRadius:'50%',
                    background:s.ac, color:s.tc, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700, fontFamily:FONT,
                  }}>{s.initials}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#111827', fontFamily:FONT }}>{s.name}</div>
                    <div style={{ fontSize:10, fontWeight:400, color:'#9CA3AF', fontFamily:FONT }}>{s.dept} · Sem. {s.week}</div>
                    <div className="mpbar"><div className="mpfill" style={{ width:s.pct+'%' }} /></div>
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:700, fontFamily:FONT,
                    padding:'2px 8px', borderRadius:999,
                    background:s.sb, color:s.sc, whiteSpace:'nowrap',
                  }}>{s.status}</span>
                </div>
              ))}
              <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontWeight:400, color:'#6B7280', fontFamily:FONT }}>Présence globale</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#4F46E5', fontFamily:FONT }}>85,4%</span>
              </div>
              <div className="mpbar"><div className="mpfill" style={{ width:'85%' }} /></div>
            </div>
          )}
        </div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section style={{ borderBottom:'1px solid #F3F4F6', background:'#fff' }}>
        <div style={{
          maxWidth:1100, margin:'0 auto',
          display:'grid',
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid #F3F4F6' : 'none')
                : (i < 3 ? '1px solid #F3F4F6' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid #F3F4F6' : 'none',
            }}>
              <StatCard {...s} />
            </div>
          ))}
        </div>
      </section>

      {/* ══ PARCOURS ══ */}
      <section id="parcours" style={{ background:'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div className="sec-lbl">Parcours complet</div>
          <div className="sec-ttl">De la candidature<br />à l'attestation</div>
          <div className="sec-sub" style={{ marginBottom:28 }}>
            Chaque étape est tracée, validée et horodatée automatiquement par le système.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {STEPS.map((s, i) => <StepCard key={s.num} step={s} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ MODULES ══ */}
      <section id="fonctionnalites" style={{ background:'#fff', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div className="sec-lbl">Modules</div>
          <div className="sec-ttl">Tout ce dont vous avez besoin</div>
          <div className="sec-sub" style={{ marginBottom:28 }}>
            Chaque module est indépendant et communique avec les autres en temps réel.
          </div>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
            gap:10,
          }}>
            {MODULES.map(m => <ModuleCard key={m.title} mod={m} />)}
          </div>
        </div>
      </section>

      {/* ══ QR SÉCURITÉ ══ */}
      <section id="securite" style={{ background:'#F5F3FF', borderBottom:'1px solid #DDD6FE' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div style={{
            display:'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap: isMobile ? 28 : 40,
            alignItems:'center',
          }}>
            <div>
              <div className="sec-lbl" style={{ color:'#7C3AED' }}>Sécurité des présences</div>
              <div className="sec-ttl">Le QR dynamique qui rend<br />la fraude impossible</div>
              <div className="sec-sub" style={{ marginBottom:20 }}>
                Un nouveau code est généré toutes les 60 à 120 secondes, affiché à l'entrée.
                Sans scan en temps réel sur le réseau de l'entreprise, aucun accès n'est validé.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  'Rafraîchissement automatique toutes les 60 s',
                  'Vérification IP (réseau entreprise uniquement)',
                  'Géolocalisation + horodatage crypté',
                  'Tentatives frauduleuses journalisées & alertées',
                  'Mode télétravail avec validation tuteur requise',
                ].map(txt => (
                  <div key={txt} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:20, height:20, borderRadius:'50%', background:'#10B981',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, color:'#fff', fontWeight:700, flexShrink:0,
                    }}>✓</div>
                    <span style={{ fontSize:13, fontWeight:400, color:'#374151', fontFamily:FONT }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background:'#fff', border:'1px solid #DDD6FE',
              borderRadius:18, overflow:'hidden',
              boxShadow:'0 20px 60px rgba(124,58,237,.1)',
            }}>
              <div style={{ padding:'18px 20px', borderBottom:'1px solid #F3F4F6' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#111827', fontFamily:FONT }}>Pointage du jour</span>
                  <span style={{ fontSize:10, fontWeight:700, fontFamily:FONT, padding:'2px 9px', borderRadius:999, background:'#ECFDF5', color:'#065F46' }}>● Actif</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <QrTimer />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#111827', marginBottom:3, fontFamily:FONT }}>Scannez pour pointer</div>
                    <div style={{ fontSize:12, fontWeight:400, color:'#6B7280', lineHeight:1.5, fontFamily:FONT }}>
                      Depuis votre navigateur mobile sur le réseau Wi-Fi de l'entreprise.
                    </div>
                    <div style={{ marginTop:10, padding:8, background:'#F9FAFB', borderRadius:8, display:'inline-block', border:'1px solid #E5E7EB' }}>
                      <svg width="52" height="52" viewBox="0 0 52 52" fill="#374151">
                        <rect x="2"  y="2"  width="20" height="20" rx="2" fill="none" stroke="#374151" strokeWidth="2"/>
                        <rect x="7"  y="7"  width="10" height="10" rx="1"/>
                        <rect x="30" y="2"  width="20" height="20" rx="2" fill="none" stroke="#374151" strokeWidth="2"/>
                        <rect x="35" y="7"  width="10" height="10" rx="1"/>
                        <rect x="2"  y="30" width="20" height="20" rx="2" fill="none" stroke="#374151" strokeWidth="2"/>
                        <rect x="7"  y="35" width="10" height="10" rx="1"/>
                        <rect x="30" y="30" width="5" height="5"/><rect x="38" y="30" width="5" height="5"/>
                        <rect x="30" y="38" width="5" height="5"/><rect x="38" y="38" width="5" height="5"/>
                        <rect x="46" y="30" width="4" height="4"/><rect x="30" y="46" width="4" height="4"/>
                        <rect x="46" y="46" width="4" height="4"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, padding:16 }}>
                {[
                  { val:'41 / 48', label:"Présents aujourd'hui", color:'#4F46E5' },
                  { val:'3',       label:'En retard',            color:'#F59E0B' },
                  { val:'4',       label:'Absences injustifiées',color:'#EF4444' },
                  { val:'0',       label:'Tentatives de fraude', color:'#10B981' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#F9FAFB', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:16, fontWeight:800, color:s.color, fontFamily:FONT }}>{s.val}</div>
                    <div style={{ fontSize:10, fontWeight:500, color:'#6B7280', marginTop:2, fontFamily:FONT }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RÔLES ══ */}
      <section id="roles" style={{ background:'#fff', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div className="sec-lbl">Contrôle d'accès</div>
          <div className="sec-ttl">Un rôle adapté à chaque acteur</div>
          <div className="sec-sub" style={{ marginBottom:24 }}>
            Chaque profil dispose d'un espace personnalisé avec des permissions précises et cloisonnées.
          </div>
          <RolePanel active={activeRole} onSelect={setActiveRole} />
        </div>
      </section>

      {/* ══ TÉMOIGNAGES ══ */}
      <section style={{ background:'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div className="sec-lbl">Témoignages</div>
          <div className="sec-ttl">Ce que disent nos utilisateurs</div>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
            gap:14, marginTop:28,
          }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background:'#fff', border:'1px solid #F3F4F6',
                borderRadius:14, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.04)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%',
                    background:t.bg, color:t.color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:700, fontFamily:FONT,
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#111827', fontFamily:FONT }}>{t.name}</div>
                    <div style={{ fontSize:11, fontWeight:400, color:'#9CA3AF', fontFamily:FONT }}>{t.role}</div>
                  </div>
                </div>
                <p style={{ fontSize:12, fontWeight:400, color:'#4B5563', lineHeight:1.7, marginBottom:12, fontFamily:FONT }}>{t.text}</p>
                <div style={{ color:'#F59E0B', fontSize:13, letterSpacing:2 }}>★★★★★</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section id="contact" style={{ background:'#fff', borderBottom:'1px solid #F3F4F6' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:`${sectionPy}px ${px}px` }}>
          <div style={{
            display:'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap: isMobile ? 32 : 48,
            alignItems:'start',
          }}>
            <div>
              <div className="sec-lbl">Contact</div>
              <div className="sec-ttl">Parlons de votre projet</div>
              <div className="sec-sub" style={{ marginBottom:28 }}>
                Une question, une demande de démo ou un projet d&apos;intégration ?
                Notre équipe répond sous 24 h ouvrées.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>
                {[
                  { icon:'📍', label:'Adresse',      value:'Bafoussam, Cameroun'     },
                  { icon:'📞', label:'Téléphone',    value:'+237 6XX XXX XXX'        },
                  { icon:'✉️', label:'Email',        value:'contact@sgs-platform.cm' },
                  { icon:'🕐', label:'Disponibilité',value:'Lun – Ven, 08h – 18h'   },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{
                      width:40, height:40, borderRadius:10,
                      background:'#EEF2FF', border:'1px solid #C7D2FE',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:17, flexShrink:0,
                    }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2, fontFamily:FONT }}>{item.label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#111827', fontFamily:FONT }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding:'14px 18px', background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#5B21B6', marginBottom:3, fontFamily:FONT }}>⚡ Réponse rapide garantie</div>
                <div style={{ fontSize:12, fontWeight:400, color:'#7C3AED', lineHeight:1.6, fontFamily:FONT }}>
                  Chaque demande de démo traitée en moins de 4 h ouvrées.
                  Pas de script commercial — une vraie discussion sur vos besoins.
                </div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background:'#4F46E5' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:`${isMobile ? 48 : 68}px ${px}px`, textAlign:'center' }}>
          <div style={{
            width:56, height:56, borderRadius:14,
            background:'rgba(255,255,255,.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, margin:'0 auto 18px',
            animation:'float 3s ease-in-out infinite',
          }}>🚀</div>
          <h2 style={{ fontFamily:FONT, fontSize: isMobile ? 24 : 30, fontWeight:800, color:'#fff', marginBottom:10 }}>
            Prêt à digitaliser vos stages ?
          </h2>
          <p style={{
            fontSize: isMobile ? 13 : 15, fontWeight:400, color:'rgba(255,255,255,.8)',
            lineHeight:1.7, marginBottom:28, maxWidth:420, margin:'0 auto 28px', fontFamily:FONT,
          }}>
            Rejoignez les 50+ entreprises qui font confiance à SGS pour une gestion
            sans papier, sans fraude et sans friction.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/inscription">
              <button style={{
                display:'inline-flex', alignItems:'center', gap:7,
                padding:'11px 24px', borderRadius:11, border:'none',
                fontSize:14, fontWeight:700, fontFamily:FONT,
                cursor:'pointer', background:'#fff', color:'#4F46E5',
                transition:'transform .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              >🎓 Candidater maintenant</button>
            </Link>
            <a href="#contact">
              <button style={{
                display:'inline-flex', alignItems:'center', gap:7,
                padding:'11px 24px', borderRadius:11,
                border:'1.5px solid rgba(255,255,255,.35)',
                fontSize:14, fontWeight:700, fontFamily:FONT,
                cursor:'pointer', background:'transparent', color:'#fff',
                transition:'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >💬 Nous contacter</button>
            </a>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:'#0F172A', borderTop:'1px solid #1E293B', padding:`20px ${px}px` }}>
        <div style={{
          maxWidth:1100, margin:'0 auto',
          display:'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent:'space-between', gap: isMobile ? 16 : 0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'#4F46E5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🎓</div>
            <span style={{ fontWeight:700, color:'#fff', fontSize:14, fontFamily:FONT }}>SGS</span>
            <span style={{ color:'#475569', fontSize:12, fontFamily:FONT }}>© 2026 — Tous droits réservés</span>
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {['Confidentialité','CGU','Contact'].map(lnk => (
              <a key={lnk} href={lnk === 'Contact' ? '#contact' : '#'}
                style={{ fontSize:12, fontWeight:500, color:'#475569', fontFamily:FONT, transition:'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
              >{lnk}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
