import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const PAARS = "#42145f";
const PAARS_LICHT = "#f5eefa";
const PAARS_HOVER = "#350f4c";
const PAARS_MID = "#6b2d8b";
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const VENDOR_COLORS = {
  "Leerhuis Informatiehuishouding": "#42145f",
  KIA: "#007bc7",
  RADIO: "#d52b1e",
  "Informatie Academie": "#e17000",
  "Nationaal Archief": "#c8922a",
};

const ALL_WERKVORMEN = ["E-learning","Training","Webinar","Workshop","Podcast","Netwerkborrel","Bijeenkomst","Congres","Spreekuur","Leerkring","Handreiking"];
const ALL_THEMAS = ["Archiveren en beheren","Meten en verbeteren","Openbaar maken","Organisatiecultuur en gedragsverandering","Professionele vaardigheden"];
const ALL_DOELGROEPEN = ["Informatieprofessional","Leidinggevende","Rijksmedewerker"];

// ─── Lex SVG Avatar ───────────────────────────────────────────────────────────
function LexAvatar({ size = 40, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: "50%", flexShrink: 0, ...style }}>
      <circle cx="40" cy="40" r="40" fill="#42145f" />
      {/* Haar */}
      <ellipse cx="40" cy="20" rx="17" ry="11" fill="#1a0a00" />
      <rect x="23" y="18" width="34" height="10" rx="3" fill="#1a0a00" />
      {/* Gezicht */}
      <ellipse cx="40" cy="37" rx="16" ry="18" fill="#FDDBB4" />
      {/* Oren */}
      <ellipse cx="24" cy="37" rx="3" ry="4" fill="#FDDBB4" />
      <ellipse cx="56" cy="37" rx="3" ry="4" fill="#FDDBB4" />
      {/* Bril montuur */}
      <rect x="27" y="32" width="10" height="7" rx="3.5" stroke="#42145f" strokeWidth="1.8" fill="rgba(200,220,255,0.3)" />
      <rect x="43" y="32" width="10" height="7" rx="3.5" stroke="#42145f" strokeWidth="1.8" fill="rgba(200,220,255,0.3)" />
      <line x1="37" y1="35.5" x2="43" y2="35.5" stroke="#42145f" strokeWidth="1.5" />
      <line x1="24" y1="35.5" x2="27" y2="35.5" stroke="#42145f" strokeWidth="1.5" />
      <line x1="53" y1="35.5" x2="56" y2="35.5" stroke="#42145f" strokeWidth="1.5" />
      {/* Ogen */}
      <ellipse cx="32" cy="35.5" rx="2.5" ry="2.8" fill="#2C1810" />
      <ellipse cx="48" cy="35.5" rx="2.5" ry="2.8" fill="#2C1810" />
      <circle cx="33" cy="34.5" r="0.9" fill="white" />
      <circle cx="49" cy="34.5" r="0.9" fill="white" />
      {/* Neus */}
      <ellipse cx="40" cy="41" rx="1.5" ry="1" fill="#d4956a" />
      {/* Glimlach */}
      <path d="M34.5 45 Q40 50 45.5 45" stroke="#b06040" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Shirt / kraag */}
      <path d="M24 60 Q31 53 40 55 Q49 53 56 60 L58 80 H22 Z" fill="white" />
      <path d="M40 55 L37 63 L40 61 L43 63 Z" fill="#42145f" />
      {/* Sjaal accent */}
      <path d="M29 57 Q34 54 40 55 Q46 54 51 57" stroke="#e8c840" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Lex Chat Widget ──────────────────────────────────────────────────────────
function LexWidget({ courses }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hoi! Ik ben **Lex**, jouw leerwijzer. 👋\n\nVertel me wat je wilt leren of waar je tegenaan loopt — dan zoek ik de beste leeractiviteiten voor jou.\n\nWaar wil jij mee aan de slag?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!dismissed) setShowBubble(true); }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages, open]);

  function openChat() { setOpen(true); setShowBubble(false); }
  function dismiss() { setShowBubble(false); setDismissed(true); }

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);

    const courseSummary = courses.map(c =>
      `- "${c.title}" | Aanbieder: ${c.vendor} | Thema: ${c.topic || "?"} | Werkvorm: ${c.werkvorm || "?"} | Doelgroep: ${c.doelgroep || "?"} | ${c.is_free ? "Gratis" : "Betaald"} | URL: ${c.enroll_url || "geen link"}`
    ).join("\n");

    const systemPrompt = `Je bent Lex, een vriendelijke en deskundige leerwijzer voor medewerkers van de Nederlandse Rijksoverheid. Je helpt mensen bij het achterhalen van hun leervraag en het vinden van passende leeractiviteiten op het gebied van informatiehuishouding en digitalisering.

Je beschikt over het volgende actuele leeraanbod van Leerhuis XL:

${courseSummary}

Werkwijze:
1. Stel maximaal 2 gerichte vragen om de leervraag te begrijpen (rol, uitdaging, voorkeur werkvorm).
2. Als je genoeg weet, geef 2-4 concrete aanbevelingen uit het bovenstaande aanbod.
3. Leg kort uit WAAROM elke aanbeveling past bij de leervraag.
4. Vermeld de directe URL naar de leeractiviteit.

Het aanbod bevat ook handreikingen van het Nationaal Archief (werkvorm: Handreiking). Dit zijn praktische kennisdocumenten — geen cursussen, maar naslagwerken. Verwijs er naar als iemand op zoek is naar concrete richtlijnen of normen voor archivering.
Houd je ALTIJD aan het beschikbare aanbod. Verzin geen cursussen die er niet in staan.
Schrijf in informeel maar professioneel Nederlands. Gebruik spaarzaam emoji. Wees bondig en concreet.
Gebruik **vetgedrukt** voor titels van aanbevolen activiteiten.`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, er ging iets mis. Probeer het opnieuw.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Er is een verbindingsfout. Probeer het opnieuw." }]);
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function renderText(text) {
    // Splits op markdown links [tekst](url), bold **tekst**, en gewone URLs
    const parts = text.split(/(\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);
    return parts.filter((_, i) => i % 4 === 0 || i % 4 === 1).map((part, i) => {
      if (!part) return null;
      // Markdown link [tekst](url)
      const mdLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/);
      if (mdLink) return <a key={i} href={mdLink[2]} target="_blank" rel="noopener noreferrer" style={{ color: PAARS, textDecoration: "underline", fontWeight: 600 }}>{mdLink[1]}</a>;
      // Bold
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      // Kale URL
      if (part.match(/^https?:\/\//)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: PAARS, textDecoration: "underline", wordBreak: "break-all" }}>{part}</a>;
      return part;
    });
  }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounceTyping {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Popup bubble */}
      {showBubble && !open && (
        <div className="lex-bubble" style={{
          position: "fixed", bottom: 96, right: 20, zIndex: 999,
          background: "white", borderRadius: 14, padding: "14px 16px",
          boxShadow: "0 6px 28px rgba(0,0,0,0.16)", maxWidth: 272,
          border: `2px solid ${PAARS}`,
          animation: "popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
        }}>
          {/* Pijltje naar FAB */}
          <div style={{
            position: "absolute", bottom: -10, right: 28,
            width: 0, height: 0,
            borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
            borderTop: `10px solid ${PAARS}`,
          }} />
          <button onClick={dismiss} style={{ position: "absolute", top: 7, right: 10, background: "none", border: "none", color: "#aaa", fontSize: 15, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 12 }}>
            <LexAvatar size={32} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: PAARS, marginBottom: 3 }}>Lex — leerwijzer</div>
              <div style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>Weet je niet waar te beginnen? Ik help je op weg! 🎓</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={openChat} style={{ flex: 1, background: PAARS, color: "white", border: "none", padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 6 }}>Ja, help me!</button>
            <button onClick={dismiss} style={{ flex: 1, background: "#f0f0f0", color: "#555", border: "none", padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 6 }}>Ik kijk zelf even rond</button>
          </div>
        </div>
      )}

      {/* FAB knop */}
      {!open && (
        <button className="lex-fab" onClick={openChat} title="Vraag Lex om advies" style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1000,
          background: PAARS, border: `3px solid white`, borderRadius: "50%",
          width: 64, height: 64, cursor: "pointer", padding: 0, overflow: "hidden",
          boxShadow: "0 4px 20px rgba(66,20,95,0.5)",
          transition: "transform 0.15s, box-shadow 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.07)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(66,20,95,0.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(66,20,95,0.5)"; }}
        >
          <LexAvatar size={52} />
        </button>
      )}

      {/* Chat venster */}
      {open && (
        <div className="lex-chat" style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1000,
          width: expanded ? "min(680px, calc(100vw - 24px))" : "min(390px, calc(100vw - 24px))",
          height: expanded ? "min(780px, calc(100vh - 40px))" : "min(580px, calc(100vh - 40px))",
          background: "white", display: "flex", flexDirection: "column",
          boxShadow: "0 10px 48px rgba(0,0,0,0.24)",
          borderRadius: 18, overflow: "hidden",
          border: `2px solid ${PAARS}`,
          transition: "width 0.2s ease, height 0.2s ease",
          animation: "slideUp 0.25s ease",
        }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${PAARS} 0%, ${PAARS_MID} 100%)`, color: "white", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <LexAvatar size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Lex</div>
              <div style={{ fontSize: 11, opacity: 0.82 }}>Leerwijzer · Leerhuis XL</div>
            </div>
            <button onClick={() => setExpanded(e => !e)} title={expanded ? "Verkleinen" : "Vergroten"} style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: "white",
              width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 4,
            }}>{expanded ? "⊡" : "⊞"}</button>
            <button onClick={() => setOpen(false)} style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: "white",
              width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
              fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>

          {/* Berichten */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                {m.role === "assistant" && <LexAvatar size={24} style={{ marginBottom: 2 }} />}
                <div style={{
                  maxWidth: "84%", padding: "9px 13px", fontSize: 13, lineHeight: 1.6,
                  background: m.role === "user" ? PAARS : "#f2f2f2",
                  color: m.role === "user" ? "white" : "#222",
                  borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {renderText(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <LexAvatar size={24} />
                <div style={{ background: "#f2f2f2", borderRadius: "14px 14px 14px 3px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: PAARS_MID, animation: `bounceTyping 1s ease ${i*0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #ebebeb", padding: "10px 12px", display: "flex", gap: 8, flexShrink: 0, background: "white" }}>
            <textarea
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Stel je vraag aan Lex..."
              rows={2} disabled={loading}
              style={{
                flex: 1, padding: "8px 10px", border: "1.5px solid #e0e0e0", borderRadius: 10,
                fontSize: 13, resize: "none", outline: "none", color: "#222",
                fontFamily: "inherit", lineHeight: 1.5, transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = PAARS}
              onBlur={e => e.target.style.borderColor = "#e0e0e0"}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              background: input.trim() && !loading ? PAARS : "#e0e0e0",
              color: "white", border: "none", borderRadius: 10,
              width: 40, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontSize: 15, flexShrink: 0, transition: "background 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Hoofdapp ─────────────────────────────────────────────────────────────────
export default function LeerhuisXL() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Alle thema's");
  const [selectedVendor, setSelectedVendor] = useState("Alle aanbieders");
  const [selectedWerkvorm, setSelectedWerkvorm] = useState("Alle leervormen");
  const [selectedDoelgroep, setSelectedDoelgroep] = useState("Alle doelgroepen");
  const [loading, setLoading] = useState(true);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [formSent, setFormSent] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installState, setInstallState] = useState("idle"); // idle | installing | done

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { setInstallState("done"); setDeferredPrompt(null); }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const [activeTab, setActiveTab] = useState(window.location.pathname === '/install' ? 'install' : 'courses');
  const [visibleCount, setVisibleCount] = useState(6);
  const [topModuleEnabled, setTopModuleEnabled] = useState(false);
  const [topModulePosition, setTopModulePosition] = useState("boven");

  useEffect(() => { fetchData(); fetchTopModuleSettings(); }, []);

  async function fetchData() {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("courses").select("*")
      .or(`expiry_date.is.null,expiry_date.gte.${today}`).order("title");
    setCourses(data || []);
    setLoading(false);
  }

  async function fetchTopModuleSettings() {
    const { data } = await supabase.from("site_settings").select("*").in("key", ["top_module_enabled", "top_module_position"]);
    if (data) {
      const enabled = data.find(d => d.key === "top_module_enabled");
      const position = data.find(d => d.key === "top_module_position");
      if (enabled) setTopModuleEnabled(enabled.value === "true");
      if (position) setTopModulePosition(position.value);
    }
  }

  async function trackClick(courseId) {
    await supabase.rpc("increment_click_count", { course_id: courseId });
  }

  const activeWerkvormen = ["Alle leervormen", ...ALL_WERKVORMEN.filter(w => courses.some(c => c.werkvorm?.toLowerCase().includes(w.toLowerCase())))];
  const activeThemas = ["Alle thema's", ...ALL_THEMAS.filter(t => courses.some(c => c.topic === t))];
  const activeDoelgroepen = ["Alle doelgroepen", ...ALL_DOELGROEPEN.filter(d => courses.some(c => c.doelgroep?.includes(d)))];
  const activeVendors = ["Alle aanbieders", ...Object.keys(VENDOR_COLORS).filter(v => courses.some(c => c.vendor === v))];

  function countFor(field, value) {
    return courses.filter(c => {
      const ms = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
      const mt = field === "topic" ? (value === "Alle thema's" || c.topic === value) : (selectedTopic === "Alle thema's" || c.topic === selectedTopic);
      const mv = field === "vendor" ? (value === "Alle aanbieders" || c.vendor === value) : (selectedVendor === "Alle aanbieders" || c.vendor === selectedVendor);
      const mw = field === "werkvorm" ? (value === "Alle leervormen" || c.werkvorm?.toLowerCase().includes(value.toLowerCase())) : (selectedWerkvorm === "Alle leervormen" || c.werkvorm?.toLowerCase().includes(selectedWerkvorm.toLowerCase()));
      const md = field === "doelgroep" ? (value === "Alle doelgroepen" || c.doelgroep?.includes(value)) : (selectedDoelgroep === "Alle doelgroepen" || c.doelgroep?.includes(selectedDoelgroep));
      return ms && mt && mv && mw && md;
    }).length;
  }

  const filtered = courses.filter(c => {
    const ms = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const mt = selectedTopic === "Alle thema's" || c.topic === selectedTopic;
    const mv = selectedVendor === "Alle aanbieders" || c.vendor === selectedVendor;
    const mw = selectedWerkvorm === "Alle leervormen" || c.werkvorm?.toLowerCase().includes(selectedWerkvorm.toLowerCase());
    const md = selectedDoelgroep === "Alle doelgroepen" || c.doelgroep?.includes(selectedDoelgroep);
    return ms && mt && mv && mw && md;
  });

  function resetFilters() {
    setSearch(""); setSelectedTopic("Alle thema's"); setSelectedVendor("Alle aanbieders");
    setSelectedWerkvorm("Alle leervormen"); setSelectedDoelgroep("Alle doelgroepen");
    setVisibleCount(6);
  }

  const hasFilters = search || selectedTopic !== "Alle thema's" || selectedVendor !== "Alle aanbieders" ||
    selectedWerkvorm !== "Alle leervormen" || selectedDoelgroep !== "Alle doelgroepen";

  async function handleContactSubmit() {
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    await supabase.from("contact_requests").insert([contactForm]);
    setFormSent(true);
    setContactForm({ name: "", email: "", message: "" });
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: "100vh", background: "#f3f3f3", color: "#222" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        select { -webkit-appearance: none; appearance: none; }
        @media (max-width: 700px) {
          .hero-banner { height: 220px !important; }
          /* Logo balk: kleiner op mobiel, nooit hoger dan scherm */
          .rijkswapen-balk { height: auto !important; }
          .rijkswapen-balk .logo-xl-img { height: 44px !important; }
          .rijkswapen-balk .rijkswapen-img { height: 44px !important; position: static !important; transform: none !important; }
          .rijkswapen-balk .logo-inner { padding: 8px 16px !important; justify-content: space-between !important; }
          /* Titelbalk: kleiner lettertype, nav scrollbaar */
          .titelbalk-inner { padding: 0 12px !important; flex-wrap: nowrap !important; }
          .titelbalk-title { font-size: 22px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          .titelbalk-nav { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; flex-shrink: 1 !important; }
          .titelbalk-nav::-webkit-scrollbar { display: none !important; }
          .titelbalk-nav button { padding: 0 12px !important; font-size: 13px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          /* Filters */
          .filter-bar-inner { flex-direction: column !important; gap: 6px !important; }
          .filter-bar-inner > div { width: 100% !important; min-width: unset !important; max-width: unset !important; flex: unset !important; }
          .filter-bar-inner select { width: 100% !important; min-width: unset !important; }
          .filter-bar-inner input { width: 100% !important; max-width: unset !important; }
          .stats-bar { flex-direction: column !important; align-items: flex-start !important; }
          .main-pad { padding: 10px 10px 80px !important; }
          .card-grid { grid-template-columns: 1fr !important; }
          .nieuwsbrief-knop { font-size: 12px !important; padding: 8px 14px !important; bottom: 12px !important; left: 12px !important; }
          /* Lex: netjes in beeld */
          .lex-fab { bottom: 80px !important; right: 16px !important; }
          .lex-bubble { bottom: 156px !important; right: 16px !important; }
          .lex-chat { bottom: 16px !important; right: 8px !important; left: 8px !important; width: calc(100vw - 16px) !important; max-width: unset !important; }
        }
        @media (max-width: 900px) {
          .card-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }
          .hero-banner { height: 260px !important; }
        }
      `}</style>

      {/* ── Logo balk ── */}
      <div className="rijkswapen-balk" style={{ background: "white", borderBottom: "3px solid #42145f", margin: 0, overflow: "hidden" }}>
        <div className="logo-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 32px", display: "flex", alignItems: "center", position: "relative" }}>
          {/* Leerhuis XL logo links */}
          <img
            className="logo-xl-img"
            src="/logo-xl.png"
            alt="Leerhuis XL"
            style={{ height: 64, display: "block", cursor: "pointer", zIndex: 1, flexShrink: 0 }}
            onClick={() => setActiveTab("courses")}
          />
          {/* Rijkswapen exact gecentreerd op desktop, rechts op mobiel */}
          <img
            className="rijkswapen-img"
            src="https://www.leerhuisinformatiehuishouding.nl/themes/rijksoverheid/header-logo.svg"
            alt="Rijksoverheid"
            style={{ height: 72, display: "block", position: "absolute", left: "50%", transform: "translateX(-50%)" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* ── Paarse titelbalk — exact 96px hoog, 24px padding, zoals referentiesite ── */}
      <div style={{ background: PAARS, width: "100%", minHeight: 96 }}>
        <div className="titelbalk-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "stretch", justifyContent: "space-between", minHeight: 96 }}>
          <span className="titelbalk-title" style={{ color: "white", fontSize: 40, fontWeight: 700, letterSpacing: "-0.3px", padding: "24px 0", lineHeight: 1 }}>Leerhuis XL</span>
          <nav className="titelbalk-nav" style={{ display: "flex", alignItems: "stretch" }}>
            {[
              { key: "courses", label: "Leeraanbod" },
              { key: "about", label: "Over ons" },
              { key: "contact", label: "Contact" },
              { key: "install", label: "📲 App" }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: activeTab === tab.key ? "rgba(0,0,0,0.25)" : "transparent",
                border: "none",
                borderBottom: activeTab === tab.key ? "3px solid rgba(255,255,255,0.7)" : "3px solid transparent",
                borderTop: "3px solid transparent",
                color: "white",
                padding: "0 20px",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: activeTab === tab.key ? 700 : 400,
                opacity: activeTab === tab.key ? 1 : 0.85,
                transition: "background 0.15s, opacity 0.15s",
              }}
                onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.background = "rgba(0,0,0,0.15)"; }}
                onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.background = "transparent"; }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Hero fotobanner (alleen op Leeraanbod) ── */}
      {activeTab === "courses" && (
        <>
          <div className="hero-banner" style={{ position: "relative", width: "100%", height: 340, overflow: "hidden", fontSize: 0, lineHeight: 0, display: "block", background: "#c8a882" }}>
            <img
              src="/hero.jpg"
              alt="Rijksoverheid medewerkers leren samen"
              style={{ width: "100%", height: "101%", objectFit: "cover", objectPosition: "center 65%", display: "block", verticalAlign: "bottom" }}
            />
            {/* Nieuwsbrief knop */}
            <a
              className="nieuwsbrief-knop"
              href="https://leerhuis-informatiehuishouding.email-provider.eu/memberforms/subscribe/standalone/form/?a=7aotlshhrm&l=f6ncftu5fm"
              target="_blank" rel="noopener noreferrer"
              style={{
                position: "absolute", bottom: 24, left: 32,
                background: PAARS, color: "white",
                padding: "12px 24px", fontSize: 14, fontWeight: 700,
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                letterSpacing: "0.2px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = PAARS_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = PAARS}
            >
              ✉ Meld je aan voor de nieuwsbrief
            </a>
          </div>

          {/* ── Zoek + filters balk ── */}
          <div style={{ background: "white", borderTop: `4px solid ${PAARS}`, padding: "14px 16px", marginTop: -4 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div className="filter-bar-inner" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {/* Zoekbalk */}
                <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 13 }}>🔍</span>
                  <input
                    type="text" placeholder="Zoek op titel of omschrijving..."
                    value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(6); }}
                    style={{ width: "100%", padding: "8px 10px 8px 30px", fontSize: 13, border: "1.5px solid #ccc", outline: "none", color: "#222", background: "white" }}
                    onFocus={e => e.target.style.borderColor = PAARS}
                    onBlur={e => e.target.style.borderColor = "#ccc"}
                  />
                </div>
                {/* Dropdowns */}
                {[
                  { value: selectedTopic, setter: setSelectedTopic, options: activeThemas, field: "topic" },
                  { value: selectedVendor, setter: setSelectedVendor, options: activeVendors, field: "vendor" },
                  { value: selectedWerkvorm, setter: setSelectedWerkvorm, options: activeWerkvormen, field: "werkvorm" },
                  { value: selectedDoelgroep, setter: setSelectedDoelgroep, options: activeDoelgroepen, field: "doelgroep" },
                ].map((f, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <select value={f.value} onChange={e => { f.setter(e.target.value); setVisibleCount(6); }} style={{
                      padding: "8px 26px 8px 10px", border: "1.5px solid #ccc",
                      fontSize: 13, cursor: "pointer", background: "white",
                      color: "#222", outline: "none", minWidth: 150,
                    }}>
                      {f.options.map(o => {
                        const isAll = o.startsWith("Alle");
                        const count = countFor(f.field, o);
                        return <option key={o} value={o}>{o}{!isAll ? ` (${count})` : ""}</option>;
                      })}
                    </select>
                    <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 9, color: "#666" }}>▼</span>
                  </div>
                ))}
                {hasFilters && (
                  <button onClick={resetFilters} style={{ padding: "8px 12px", background: "white", border: "1.5px solid #ccc", color: "#555", cursor: "pointer", fontSize: 13 }}>
                    ✕ Wis filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main */}
      <main className="main-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px" }}>
        {activeTab === "courses" && (
          <>
            <div className="stats-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
                {loading ? "Laden..." : `${filtered.length} leeractiviteit${filtered.length !== 1 ? "en" : ""} gevonden`}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ label: "Aanbieders", value: activeVendors.length - 1 }, { label: "Thema's", value: activeThemas.length - 1 }].map(s => (
                  <div key={s.label} style={{ background: "white", border: "1px solid #d4d4d4", padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ color: PAARS, fontSize: 15 }}>{s.value}</strong>
                    <span style={{ fontSize: 12, color: "#666" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888", fontSize: 14 }}>Laden...</div>
            ) : filtered.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #d4d4d4", padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <strong style={{ color: PAARS }}>Geen resultaten gevonden</strong>
                <p style={{ color: "#666", marginTop: 6, fontSize: 13 }}>Probeer andere zoektermen of filters.</p>
                <button onClick={resetFilters} style={{ marginTop: 12, background: PAARS, color: "white", border: "none", padding: "9px 22px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Wis filters</button>
              </div>
            ) : (
              <>
                {topModuleEnabled && topModulePosition === "boven" && <TopModule courses={courses} />}
                <div className="card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 2 }}>
                  {filtered.slice(0, visibleCount).map(course => <CourseCard key={course.id} course={course} onClickTrack={trackClick} />)}
                </div>
                {visibleCount < filtered.length && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "28px 0 8px" }}>
                    <button
                      onClick={() => setVisibleCount(v => v + 6)}
                      style={{ background: PAARS, color: "white", border: "none", padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = PAARS_HOVER}
                      onMouseLeave={e => e.currentTarget.style.background = PAARS}
                    >
                      Toon meer ({Math.min(6, filtered.length - visibleCount)} van {filtered.length - visibleCount} resterend)
                    </button>
                    <button
                      onClick={() => setVisibleCount(filtered.length)}
                      style={{ background: "white", color: PAARS, border: `2px solid ${PAARS}`, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = PAARS; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = PAARS; }}
                    >
                      Toon alles ({filtered.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {topModuleEnabled && topModulePosition === "onder" && activeTab === "courses" && !loading && <TopModule courses={courses} />}

        {activeTab === "about" && (
          <div style={{ maxWidth: 860 }}>
            {/* Intro */}
            <div style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `5px solid ${PAARS}`, padding: "32px 36px", marginBottom: 3 }}>
              <h2 style={{ color: PAARS, marginTop: 0, fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Over Leerhuis XL</h2>
              <p style={{ color: "#333", lineHeight: 1.8, fontSize: 15, margin: "0 0 14px" }}>
                Leerhuis XL is hét centrale leerplatform voor medewerkers van de Rijksoverheid die werken aan informatiebeheer, digitalisering en openbaarmaking. Op één plek vind je het complete leeraanbod van vijf gespecialiseerde aanbieders — van e-learnings en podcasts tot workshops, netwerkbijeenkomsten en praktische kennisdocumenten van het Nationaal Archief.
              </p>
              <p style={{ color: "#333", lineHeight: 1.8, fontSize: 15, margin: 0 }}>
                Of je nu net begint of al jaren ervaring hebt: Leerhuis XL helpt jou en jouw organisatie om de informatiehuishouding op orde te brengen én te houden.
              </p>
            </div>

            {/* Aanbieders */}
            <h3 style={{ color: PAARS, fontSize: 16, fontWeight: 700, margin: "28px 0 10px", paddingLeft: 4 }}>Aangesloten aanbieders</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                {
                  name: "Leerhuis Informatiehuishouding",
                  color: "#42145f",
                  url: "https://www.leerhuisinformatiehuishouding.nl",
                  tagline: "De thuisbasis voor leren over informatiehuishouding",
                  description: "Het Leerhuis Informatiehuishouding is opgericht door het Ministerie van Binnenlandse Zaken en Koninkrijksrelaties. Het biedt een breed en gratis leeraanbod voor rijksmedewerkers: van korte e-learnings en podcasts tot meerdaagse trainingen en webinars. De focus ligt op de basisprincipes van goed informatiebeheer — archiveren, openbaarmaking, waardering en selectie — en op gedragsverandering binnen organisaties.",
                  stats: ["Gratis voor rijksmedewerkers", "E-learning, training, podcast", "Ontwikkeld door BZK"],
                },
                {
                  name: "KIA — Kennis en Informatiecentrum Archieven",
                  color: "#007bc7",
                  url: "https://kia.pleio.nl",
                  tagline: "Kennisnetwerk voor archief- en informatieprofessionals",
                  description: "KIA is het kennis- en informatiecentrum voor iedereen die werkt met archieven en informatiebeheer bij de Rijksoverheid. KIA organiseert bijeenkomsten, leerkringen en spreekuren waar informatieprofessionals kennis uitwisselen, actuele vraagstukken bespreken en van elkaar leren. Naast klassikaal leren biedt KIA ook toegang tot vakliteratuur, beleidsdocumenten en praktijkgerichte tools.",
                  stats: ["Bijeenkomsten & spreekuren", "Leerkringen & netwerk", "Gericht op professionals"],
                },
                {
                  name: "RADIO — Rijksacademie voor Digitalisering en Informatisering Overheid",
                  color: "#d52b1e",
                  url: "https://radio.rijksoverheid.nl",
                  tagline: "Leren over digitalisering en informatisering",
                  description: "RADIO is de Rijksacademie voor Digitalisering en Informatisering Overheid en richt zich op het versterken van digitale kennis en vaardigheden binnen de Rijksoverheid. Het aanbod omvat trainingen op het snijvlak van informatiehuishouding, data, AI en digitale transformatie. RADIO werkt samen met kennisinstellingen en overheidsdiensten om actueel en praktijkgericht onderwijs te bieden aan rijksambtenaren op alle niveaus.",
                  stats: ["Digitalisering & data", "Training & e-learning", "Rijksbreed"],
                },
                {
                  name: "Informatie Academie",
                  color: "#e17000",
                  url: "https://www.informatieacademie.nl",
                  tagline: "Professionele ontwikkeling voor informatieprofessionals",
                  description: "De Informatie Academie is een commerciële opleider gespecialiseerd in informatiemanagement, archivistiek en documentaire informatievoorziening. Zij bieden zowel open inschrijvingscursussen als maatwerkopdrachten voor overheden en organisaties. Het aanbod loopt uiteen van introductietrainingen voor nieuwe medewerkers tot verdiepende masterclasses en netwerkevenementen zoals de Open Donderdagen.",
                  stats: ["Open inschrijving & maatwerk", "Breed opleidingsaanbod", "Commerciële aanbieder"],
                },
                {
                  name: "Nationaal Archief",
                  color: "#c8922a",
                  url: "https://www.nationaalarchief.nl/archiveren/kennisbank",
                  tagline: "Kennispartner voor archivering en informatiebeheer",
                  description: "Het Nationaal Archief is de grootste archiefinstelling van Nederland en de kennisautoriteit op het gebied van archivering en duurzame toegankelijkheid van overheidsinformatie. Via de kennisbank bieden zij praktische handreikingen, richtlijnen en normen die overheidsorganisaties helpen bij het inrichten van goed informatiebeheer. Op Leerhuis XL zijn de handreikingen van het Nationaal Archief beschikbaar als kennisdocumenten.",
                  stats: ["Kennisdocumenten & handreikingen", "Gratis raadpleegbaar", "Geactualiseerd per kwartaal"],
                },
              ].map(vendor => (
                <div key={vendor.name} style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `5px solid ${vendor.color}`, padding: "24px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#111" }}>{vendor.name}</h4>
                      <p style={{ margin: 0, fontSize: 13, color: vendor.color, fontStyle: "italic" }}>{vendor.tagline}</p>
                    </div>
                    <a href={vendor.url} target="_blank" rel="noopener noreferrer" style={{
                      color: vendor.color, fontSize: 12, fontWeight: 700, textDecoration: "none",
                      border: `1.5px solid ${vendor.color}`, padding: "5px 12px", whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = vendor.color; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = vendor.color; }}
                    >
                      Bekijk website →
                    </a>
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#444", lineHeight: 1.75 }}>{vendor.description}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {vendor.stats.map(s => (
                      <span key={s} style={{ fontSize: 11, background: "#f5f5f5", border: "1px solid #e0e0e0", color: "#555", padding: "3px 10px", borderRadius: 2 }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Meedoen */}
            <div style={{ background: PAARS_LICHT, border: `1px solid #d4b8e8`, padding: "24px 28px", marginTop: 3 }}>
              <h3 style={{ color: PAARS, margin: "0 0 10px", fontSize: 16 }}>Aanbieder aansluiten of aanbod aanleveren?</h3>
              <p style={{ color: "#333", margin: "0 0 14px", fontSize: 13, lineHeight: 1.7 }}>
                Is jouw organisatie actief op het gebied van informatiehuishouding en wil je je leeraanbod ook via Leerhuis XL beschikbaar stellen? Neem dan contact met ons op.
              </p>
              <button onClick={() => setActiveTab("contact")} style={{ background: PAARS, color: "white", border: "none", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = PAARS_HOVER}
                onMouseLeave={e => e.currentTarget.style.background = PAARS}
              >
                Neem contact op →
              </button>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ background: "white", border: "1px solid #d4d4d4", padding: "32px 28px" }}>
              <h2 style={{ color: PAARS, marginTop: 0, borderBottom: `3px solid ${PAARS}`, paddingBottom: 10, fontSize: 20 }}>Contact</h2>
              <p style={{ color: "#555", marginBottom: 22, lineHeight: 1.6, fontSize: 14 }}>Heb je een vraag of opmerking? Stuur ons een bericht.</p>
              {formSent ? (
                <div style={{ background: PAARS_LICHT, border: `1px solid ${PAARS}`, padding: 22, textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                  <strong style={{ color: PAARS }}>Bericht verzonden!</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#555" }}>We nemen zo snel mogelijk contact met je op.</p>
                  <button onClick={() => setFormSent(false)} style={{ marginTop: 12, background: PAARS, color: "white", border: "none", padding: "8px 20px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Nieuw bericht</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[{ label: "Naam", key: "name", type: "text", placeholder: "Jouw naam" }, { label: "E-mailadres", key: "email", type: "email", placeholder: "jouw@overheid.nl" }].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#222", marginBottom: 4 }}>{label}</label>
                      <input type={type} placeholder={placeholder} value={contactForm[key]}
                        onChange={e => setContactForm({ ...contactForm, [key]: e.target.value })}
                        style={{ width: "100%", padding: "9px 10px", border: "1px solid #c0c0c0", fontSize: 14, outline: "none", color: "#222" }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#222", marginBottom: 4 }}>Bericht</label>
                    <textarea placeholder="Jouw bericht..." rows={5} value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                      style={{ width: "100%", padding: "9px 10px", border: "1px solid #c0c0c0", fontSize: 14, resize: "vertical", outline: "none", color: "#222", fontFamily: "inherit" }} />
                  </div>
                  <button onClick={handleContactSubmit}
                    style={{ background: PAARS, color: "white", border: "none", padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}
                    onMouseEnter={e => e.currentTarget.style.background = PAARS_HOVER}
                    onMouseLeave={e => e.currentTarget.style.background = PAARS}>
                    Verstuur bericht →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "install" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `5px solid ${PAARS}`, padding: "32px 36px" }}>
              <h2 style={{ color: PAARS, marginTop: 0, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>📲 Installeer de app</h2>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                Voeg Leerhuis XL toe aan je beginscherm en gebruik het als een echte app — zonder app store.
              </p>

              {isInStandaloneMode ? (
                <div style={{ background: "#e5f5e9", border: "1px solid #a5d6a7", padding: "20px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <strong style={{ color: "#275937", fontSize: 15 }}>Je gebruikt Leerhuis XL al als app!</strong>
                </div>

              ) : isAndroid ? (
                <div>
                  <div style={{ background: PAARS_LICHT, border: `1px solid #d4b8e8`, padding: "16px 20px", marginBottom: 20, fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                    <strong>Android</strong> — Klik op de knop hieronder. Chrome vraagt je bevestiging en voegt de app toe aan je beginscherm.
                  </div>
                  {installState === "done" ? (
                    <div style={{ background: "#e5f5e9", border: "1px solid #a5d6a7", padding: "16px 20px", textAlign: "center" }}>
                      <strong style={{ color: "#275937" }}>✅ App geïnstalleerd! Ga naar je beginscherm.</strong>
                    </div>
                  ) : (
                    <button onClick={handleInstallAndroid} disabled={!deferredPrompt}
                      style={{ width: "100%", background: deferredPrompt ? PAARS : "#ccc", color: "white", border: "none", padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: deferredPrompt ? "pointer" : "default" }}>
                      {deferredPrompt ? "📲 Installeer Leerhuis XL" : "App is al geïnstalleerd of niet beschikbaar"}
                    </button>
                  )}
                </div>

              ) : isIOS ? (
                <div>
                  <div style={{ background: PAARS_LICHT, border: `1px solid #d4b8e8`, padding: "16px 20px", marginBottom: 20, fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                    <strong>iPhone / iPad</strong> — Apple staat automatisch installeren niet toe. Volg deze drie stappen:
                  </div>
                  {[
                    { stap: "1", icon: "⬆️", tekst: "Tik op het deel-icoon onderaan Safari (het vierkantje met het pijltje omhoog)" },
                    { stap: "2", icon: "➕", tekst: 'Scroll naar beneden en kies "Zet op beginscherm"' },
                    { stap: "3", icon: "✅", tekst: 'Tik op "Voeg toe" — de app staat nu op je beginscherm' },
                  ].map(({ stap, icon, tekst }) => (
                    <div key={stap} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ background: PAARS, color: "white", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{stap}</div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6, paddingTop: 4 }}>{icon} {tekst}</div>
                    </div>
                  ))}
                </div>

              ) : (
                <div>
                  <div style={{ background: PAARS_LICHT, border: `1px solid #d4b8e8`, padding: "16px 20px", marginBottom: 20, fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                    <strong>Desktop (Chrome / Edge)</strong> — Klik op het installatie-icoon rechts in de adresbalk, of gebruik het menu hieronder.
                  </div>
                  <button onClick={handleInstallAndroid} disabled={!deferredPrompt}
                    style={{ width: "100%", background: deferredPrompt ? PAARS : "#ccc", color: "white", border: "none", padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: deferredPrompt ? "pointer" : "default" }}>
                    {deferredPrompt ? "📲 Installeer Leerhuis XL" : "Gebruik het installatie-icoon in de adresbalk →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={{ background: PAARS, color: "white", padding: "24px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Leerhuis XL</div>
            <div style={{ fontSize: 11, opacity: 0.72 }}>Één overzicht, alle aanbieders</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>© 2026 Leerhuis XL — wordt u aangeboden door het Leerhuis Informatiehuishouding</div>
        </div>
      </footer>

      <LexWidget courses={courses} />
    </div>
  );
}

function TopModule({ courses }) {
  const PAARS = "#42145f";
  const PAARS_LICHT = "#f5eefa";
  const topBekeken = [...courses]
    .filter(c => c.werkvorm !== "Podcast" && (c.click_count || 0) > 0)
    .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
    .slice(0, 5);
  const topBeluisterd = [...courses]
    .filter(c => c.werkvorm === "Podcast" && (c.click_count || 0) > 0)
    .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
    .slice(0, 5);

  if (topBekeken.length === 0 && topBeluisterd.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 2 }}>
        {topBekeken.length > 0 && (
          <div style={{ background: "white", border: "1px solid #d4d4d4", borderTop: `4px solid ${PAARS}` }}>
            <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: PAARS }}>Meest bekeken</span>
            </div>
            <ol style={{ margin: 0, padding: "8px 18px 12px 36px" }}>
              {topBekeken.map((c, i) => (
                <li key={c.id} style={{ padding: "7px 0", borderBottom: i < topBekeken.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                  <a href={c.enroll_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#222", textDecoration: "none", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1 }}>{c.title}</span>
                    <span style={{ fontSize: 11, color: "#888", background: "#f3f3f3", padding: "2px 7px", whiteSpace: "nowrap" }}>{c.click_count}×</span>
                  </a>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{c.vendor}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
        {topBeluisterd.length > 0 && (
          <div style={{ background: "white", border: "1px solid #d4d4d4", borderTop: "4px solid #1DB954" }}>
            <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎧</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1DB954" }}>Meest beluisterd</span>
            </div>
            <ol style={{ margin: 0, padding: "8px 18px 12px 36px" }}>
              {topBeluisterd.map((c, i) => (
                <li key={c.id} style={{ padding: "7px 0", borderBottom: i < topBeluisterd.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                  <a href={c.enroll_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#222", textDecoration: "none", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1 }}>{c.title}</span>
                    <span style={{ fontSize: 11, color: "#888", background: "#f0faf4", padding: "2px 7px", whiteSpace: "nowrap" }}>{c.click_count}×</span>
                  </a>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{c.vendor}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}


function CourseCard({ course, onClickTrack }) {
  const vendorColor = VENDOR_COLORS[course.vendor] || PAARS;
  const [hovered, setHovered] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);

  const bekijkLabel = course.werkvorm ? `Bekijk ${course.werkvorm.toLowerCase()}` : "Bekijk leeractiviteit";

  const isSpotify = course.werkvorm === "Podcast" && course.enroll_url?.includes("spotify.com/episode/");
  const spotifyEpisodeId = isSpotify ? course.enroll_url.split("/episode/")[1]?.split("?")[0] : null;
  const spotifyEmbedUrl = spotifyEpisodeId ? `https://open.spotify.com/embed/episode/${spotifyEpisodeId}?utm_source=generator` : null;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: "white", display: "flex", flexDirection: "column",
        border: "1px solid #d4d4d4", borderLeft: `4px solid ${vendorColor}`,
        outline: hovered ? `2px solid ${vendorColor}` : "2px solid transparent",
        transition: "outline 0.12s",
      }}>
      <div style={{ padding: "16px 16px 13px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: vendorColor }}>{course.vendor}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: course.is_free ? "#275937" : "#6b4300", background: course.is_free ? "#e5f5e9" : "#fff3e0", padding: "2px 7px", borderRadius: 2, flexShrink: 0, marginLeft: 6 }}>
            {course.is_free ? "Gratis" : "Betaald"}
          </span>
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#222", lineHeight: 1.3 }}>{course.title}</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#555", lineHeight: 1.6, flex: 1 }}>
          {course.description ? course.description.slice(0, 145) + (course.description.length > 145 ? "…" : "") : "Geen omschrijving beschikbaar."}
        </p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {course.topic && <span style={{ fontSize: 11, color: PAARS, background: PAARS_LICHT, padding: "2px 8px", border: "1px solid #d4b8e8" }}>{course.topic}</span>}
          {course.werkvorm && <span style={{ fontSize: 11, color: "#444", background: "#f3f3f3", padding: "2px 8px", border: "1px solid #ddd" }}>{course.werkvorm}</span>}
          {course.duration && <span style={{ fontSize: 11, color: "#444", background: "#f3f3f3", padding: "2px 8px", border: "1px solid #ddd" }}>⏱ {course.duration}</span>}
        </div>
        {isSpotify ? (
          <div>
            {playerOpen && (
              <iframe
                src={spotifyEmbedUrl}
                width="100%" height="152" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ display: "block", marginBottom: 6 }}
              />
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setPlayerOpen(p => !p); if (!playerOpen && onClickTrack) onClickTrack(course.id); }}
                style={{ flex: 1, background: vendorColor, color: "white", border: "none", padding: "9px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                {playerOpen ? "⏹ Sluit player" : "▶ Nu luisteren"}
              </button>
              <a href={course.enroll_url} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: "white", color: vendorColor, border: `2px solid ${vendorColor}`, padding: "9px 10px", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                Open in Spotify
              </a>
            </div>
          </div>
        ) : course.enroll_url ? (
          <a href={course.enroll_url} target="_blank" rel="noopener noreferrer"
            onClick={() => onClickTrack && onClickTrack(course.id)}
            style={{ display: "block", textAlign: "center", background: vendorColor, color: "white", padding: "9px 14px", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = vendorColor; e.currentTarget.style.outline = `2px solid ${vendorColor}`; }}
            onMouseLeave={e => { e.currentTarget.style.background = vendorColor; e.currentTarget.style.color = "white"; e.currentTarget.style.outline = "none"; }}>
            {bekijkLabel} →
          </a>
        ) : (
          <span style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>Geen link beschikbaar</span>
        )}
      </div>
    </div>
  );
}
