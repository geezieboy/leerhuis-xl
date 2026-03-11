import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

const CORRECT_PASSWORD = "Leerhuis2026*NA";
const PAARS = "#42145f";
const PAARS_LICHT = "#f5eefa";

const ALL_WERKVORMEN = ["E-learning", "Training", "Webinar", "Workshop", "Podcast", "Netwerkborrel", "Bijeenkomst", "Congres", "Spreekuur", "Leerkring"];
const ALL_THEMAS = [
  "Archiveren en beheren", "Meten en verbeteren", "Openbaar maken",
  "Organisatiecultuur en gedragsverandering", "Professionele vaardigheden",
];
const ALL_DOELGROEPEN = ["Informatieprofessional", "Leidinggevende", "Rijksmedewerker"];

const THEMA_MAPPING = {
  "Systemen en data": "Archiveren en beheren",
  "Waardering en selectie": "Archiveren en beheren",
};
const VALID_THEMAS = [
  "Archiveren en beheren", "Meten en verbeteren", "Openbaar maken",
  "Organisatiecultuur en gedragsverandering", "Professionele vaardigheden",
];

function normaliseerThema(thema) {
  if (THEMA_MAPPING[thema]) return THEMA_MAPPING[thema];
  if (VALID_THEMAS.includes(thema)) return thema;
  return null;
}

function mapLeerhuisIH(row) {
  const themas = (row["Thema's"] || "").split(",").map((t) => t.trim()).filter((t) => t && t !== "Alle thema's");
  const geldigeThemas = themas.map(normaliseerThema).filter(Boolean);
  const topic = geldigeThemas[0] || "Professionele vaardigheden";
  const duur = row["Doorlooptijd (informatietekst)"] || row["Lesduur (uren)"] || "";
  const kosten = parseFloat(row["Totale kosten per inschrijving"] || 0);
  const guid = row["Guid"] || "";
  const code = row["Leeractiviteit code"] || "";
  const url = row["URL"] || (guid && guid !== "0" ? `https://mijn.leerhuisinformatiehuishouding.nl/nl/ui#/catalog/course/${guid}` : "");
  const omschrijving = (row["Introductie (informatietekst)"] || row["Doel (informatietekst)"] || "").replace(/\s+/g, " ").trim().slice(0, 500);
  return {
    title: row["Naam"] || row["Volledige naam"] || "",
    description: omschrijving, vendor: "Leerhuis Informatiehuishouding", topic,
    duration: String(duur).trim(), language: "NL", is_free: kosten === 0,
    enroll_url: url, werkvorm: row["Werkvorm"] || "",
    doelgroep: row["Doelgroepen"] || "", extern_id: guid || String(code),
  };
}

const PLATFORM_MAPPERS = { "Leerhuis Informatiehuishouding": mapLeerhuisIH };

function detectPlatform(headers, vendorName) {
  if (vendorName && PLATFORM_MAPPERS[vendorName]) return vendorName;
  if (headers.includes("Leeractiviteit code") && headers.includes("Leverancier")) return "Leerhuis Informatiehuishouding";
  return null;
}

const INITIAL_VENDORS = [
  {
    id: "lih", name: "Leerhuis Informatiehuishouding", status: "actief", color: "#42145f", mapper: "Leerhuis Informatiehuishouding",
    contact: { naam: "Leerhuis Informatiehuishouding", website: "https://www.leerhuisinformatiehuishouding.nl", email: "leerhuis@informatiehuishouding.nl", exportInstructie: "Exporteer via: Beheer → Leeractiviteiten → Exporteren", notities: "CSV bevat kolommen: Naam, Guid, Leeractiviteit code, Werkvorm, Thema's, etc." },
  },
  { id: "kia", name: "KIA", status: "handmatig", color: "#007bc7", mapper: null, contact: { naam: "KIA", website: "", email: "", exportInstructie: "", notities: "" } },
  { id: "radio", name: "RADIO", status: "handmatig", color: "#d52b1e", mapper: null, contact: { naam: "RADIO", website: "", email: "", exportInstructie: "", notities: "" } },
  { id: "ia", name: "Informatie Academie", status: "handmatig", color: "#e17000", mapper: null, contact: { naam: "Informatie Academie", website: "", email: "", exportInstructie: "", notities: "" } },
];

const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #b4b4b4", fontSize: 14, boxSizing: "border-box", outline: "none", color: "#222", fontFamily: "inherit" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 4 };
const btnPrimary = (extra) => ({ background: PAARS, color: "white", border: "none", padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", ...extra });
const btnOutline = (extra) => ({ background: "white", color: PAARS, border: `1px solid ${PAARS}`, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", ...extra });
const btnGray = (extra) => ({ background: "white", color: "#555", border: "1px solid #ccc", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", ...extra });

export default function AdminUpload() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorView, setVendorView] = useState(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [contactEdit, setContactEdit] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [platform, setPlatform] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileRef = useRef();
  const [courses, setCourses] = useState([]);
  const [editSearch, setEditSearch] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [courseCount, setCourseCount] = useState({});
  const [topModuleEnabled, setTopModuleEnabled] = useState(false);
  const [topModulePosition, setTopModulePosition] = useState("boven");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  function handleLogin() {
    if (password === CORRECT_PASSWORD) { setLoggedIn(true); loadAllCounts(); loadTopModuleSettings(); }
    else { setWrongPassword(true); setTimeout(() => setWrongPassword(false), 2000); }
  }

  async function loadAllCounts() {
    const { data } = await supabase.from("courses").select("vendor");
    if (!data) return;
    const counts = {};
    data.forEach(r => { counts[r.vendor] = (counts[r.vendor] || 0) + 1; });
    setCourseCount(counts);
  }

  async function loadTopModuleSettings() {
    const { data } = await supabase.from("site_settings").select("*").in("key", ["top_module_enabled", "top_module_position"]);
    if (data) {
      const enabled = data.find(d => d.key === "top_module_enabled");
      const position = data.find(d => d.key === "top_module_position");
      if (enabled) setTopModuleEnabled(enabled.value === "true");
      if (position) setTopModulePosition(position.value);
    }
  }

  async function saveTopModuleSettings() {
    await supabase.from("site_settings").upsert([
      { key: "top_module_enabled", value: String(topModuleEnabled) },
      { key: "top_module_position", value: topModulePosition },
    ]);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function loadCoursesForVendor(vendorName) {
    setLoadingCourses(true); setEditSearch("");
    const { data } = await supabase.from("courses").select("*").eq("vendor", vendorName).order("title");
    setCourses(data || []); setLoadingCourses(false);
  }

  function openVendor(vendor, view) {
    setSelectedVendor(vendor); setVendorView(view);
    setResult(null); setErrors([]); setFile(null); setPreview([]); setPlatform(null);
    setEditingCourse(null); setSaveMsg("");
    if (view === "edit") loadCoursesForVendor(vendor.name);
    if (view === "add") setAddForm({ vendor: vendor.name, title: "", description: "", topic: "", werkvorm: "", doelgroep: "", duration: "", is_free: true, price: null, enroll_url: "", language: "NL" });
  }

  function processFile(f, vendorName) {
    setFile(f); setResult(null); setErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const detected = detectPlatform(headers, vendorName);
      setPlatform(detected);
      if (detected && PLATFORM_MAPPERS[detected]) {
        setPreview(rows.map(PLATFORM_MAPPERS[detected]).filter((r) => r.title));
      } else {
        setPreview(rows.slice(0, 5));
      }
    };
    reader.readAsArrayBuffer(f);
  }

  async function handleUpload() {
    if (!preview.length || !platform) return;
    setUploading(true); setErrors([]);
    let inserted = 0; let errs = [];
    try {
      const { error: deleteError } = await supabase.from("courses").delete().eq("vendor", platform);
      if (deleteError) { setErrors([`Verwijderen mislukt: ${deleteError.message}`]); setUploading(false); return; }
      const batchSize = 20;
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        const { error } = await supabase.from("courses").insert(batch);
        if (error) errs.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        else inserted += batch.length;
      }
      setResult({ inserted, total: preview.length });
      setErrors(errs);
      loadAllCounts();
    } catch (e) { setErrors([e.message]); }
    setUploading(false);
  }

  function startEdit(course) { setEditingCourse(course.id); setEditForm({ ...course }); setSaveMsg(""); }

  async function saveCourse() {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("courses").update(editForm).eq("id", editForm.id);
    setSaving(false);
    if (error) { setSaveMsg("❌ " + error.message); }
    else {
      setSaveMsg("✅ Opgeslagen!");
      setCourses(cs => cs.map(c => c.id === editForm.id ? { ...editForm } : c));
      setTimeout(() => { setEditingCourse(null); setSaveMsg(""); }, 1200);
    }
  }

  async function saveNewCourse() {
    if (!addForm.title?.trim()) { setAddMsg("❌ Titel is verplicht"); return; }
    if (!addForm.topic) { setAddMsg("❌ Thema is verplicht"); return; }
    if (!addForm.werkvorm) { setAddMsg("❌ Leervorm is verplicht"); return; }
    if (!addForm.doelgroep) { setAddMsg("❌ Doelgroep is verplicht"); return; }
    setAdding(true); setAddMsg("");
    const { data, error } = await supabase.from("courses").insert([addForm]).select();
    setAdding(false);
    if (error) { setAddMsg("❌ " + error.message); }
    else {
      setAddMsg("✅ Activiteit toegevoegd!");
      loadAllCounts();
      setTimeout(() => { setSelectedVendor(null); setVendorView(null); setAddMsg(""); }, 1500);
    }
  }

  async function deleteCourse(id) {
    if (!window.confirm("Weet je zeker dat je deze leeractiviteit wilt verwijderen?")) return;
    await supabase.from("courses").delete().eq("id", id);
    setCourses(cs => cs.filter(c => c.id !== id));
    loadAllCounts();
  }

  function addVendor() {
    if (!newVendorName.trim()) return;
    const id = newVendorName.trim().toLowerCase().replace(/\s+/g, "-");
    setVendors(vs => [...vs, { id, name: newVendorName.trim(), status: "handmatig", color: "#888", mapper: null, contact: { naam: newVendorName.trim(), website: "", email: "", exportInstructie: "", notities: "" } }]);
    setNewVendorName(""); setShowAddVendor(false);
  }

  function saveContactInfo() {
    setVendors(vs => vs.map(v => v.id === contactEdit.id ? { ...v, contact: contactEdit.contact } : v));
    setContactEdit(null);
  }

  const filteredCourses = courses.filter(c => !editSearch || c.title?.toLowerCase().includes(editSearch.toLowerCase()));

  const statusBadge = (status) => {
    if (status === "actief") return { label: "✅ Actief", bg: "#e6f4ea", color: "#275937", border: "#a8d5b0" };
    if (status === "handmatig") return { label: "✏️ Handmatig", bg: "#fff8e1", color: "#7a5500", border: "#ffe082" };
    return { label: "🔜 Binnenkort", bg: "#f0f0f0", color: "#666", border: "#ccc" };
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ background: "white", padding: 40, width: 340, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ background: PAARS, color: "white", fontWeight: 900, fontSize: 18, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>XL</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: PAARS }}>Leerhuis XL — Beheer</div>
          </div>
          <label style={labelStyle}>Wachtwoord</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ ...inputStyle, marginBottom: 16 }} placeholder="Voer wachtwoord in" autoFocus />
          {wrongPassword && <div style={{ color: "#d52b1e", fontSize: 13, marginBottom: 12 }}>❌ Onjuist wachtwoord</div>}
          <button onClick={handleLogin} style={{ ...btnPrimary({ width: "100%", padding: "11px", fontSize: 15 }) }}>Inloggen</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f3f3", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: PAARS, color: "white", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.2)", fontWeight: 900, fontSize: 16, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>XL</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Leerhuis XL — Beheerportaal</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedVendor && (
            <button onClick={() => { setSelectedVendor(null); setVendorView(null); }}
              style={btnGray({ color: "white", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", fontSize: 13 })}>
              ← Terug naar overzicht
            </button>
          )}
          <button onClick={() => { setLoggedIn(false); setSelectedVendor(null); }} style={btnGray({ fontSize: 13 })}>Uitloggen</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* OVERZICHT */}
        {!selectedVendor && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: PAARS, fontSize: 22 }}>Aanbieders</h2>
              <span style={{ fontSize: 14, color: "#666" }}>{Object.values(courseCount).reduce((a, b) => a + b, 0)} activiteiten totaal</span>
            </div>

            {/* Top module instellingen */}
            <div style={{ background: "white", border: "1px solid #d4d4d4", borderTop: `4px solid ${PAARS}`, padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: PAARS, marginBottom: 14 }}>🏆 Meest bekeken / Meest beluisterd module</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Module tonen:</span>
                  <button onClick={() => setTopModuleEnabled(true)}
                    style={{ ...btnPrimary(), background: topModuleEnabled ? PAARS : "white", color: topModuleEnabled ? "white" : PAARS, border: `1px solid ${PAARS}`, padding: "6px 16px" }}>
                    Aan
                  </button>
                  <button onClick={() => setTopModuleEnabled(false)}
                    style={{ ...btnGray(), background: !topModuleEnabled ? "#e0e0e0" : "white", fontWeight: !topModuleEnabled ? 700 : 400, padding: "6px 16px" }}>
                    Uit
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Positie:</span>
                  <button onClick={() => setTopModulePosition("boven")}
                    style={{ ...btnOutline(), background: topModulePosition === "boven" ? PAARS : "white", color: topModulePosition === "boven" ? "white" : PAARS, padding: "6px 16px" }}>
                    ↑ Boven activiteiten
                  </button>
                  <button onClick={() => setTopModulePosition("onder")}
                    style={{ ...btnOutline(), background: topModulePosition === "onder" ? PAARS : "white", color: topModulePosition === "onder" ? "white" : PAARS, padding: "6px 16px" }}>
                    ↓ Onder activiteiten
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={saveTopModuleSettings} style={btnPrimary({ padding: "7px 20px" })}>
                    {settingsSaved ? "✅ Opgeslagen!" : "Opslaan"}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {vendors.map(vendor => {
                const badge = statusBadge(vendor.status);
                const count = courseCount[vendor.name] || 0;
                return (
                  <div key={vendor.id} style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `5px solid ${vendor.color}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button onClick={() => openVendor(vendor, "contact")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 16, color: PAARS, textDecoration: "underline", fontFamily: "inherit" }}>
                        {vendor.name}
                      </button>
                      <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, padding: "2px 8px", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                        <span style={{ fontSize: 12, color: "#888" }}>{count} activiteiten</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openVendor(vendor, "import")} style={btnPrimary()}>⬆ Importeren</button>
                      <button onClick={() => openVendor(vendor, "add")} style={btnOutline()}>+ Handmatig</button>
                      <button onClick={() => openVendor(vendor, "edit")} style={btnOutline()}>✏️ Bewerken</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16 }}>
              {!showAddVendor ? (
                <button onClick={() => setShowAddVendor(true)} style={{ ...btnOutline(), width: "100%", padding: "12px", fontSize: 14, borderStyle: "dashed" }}>
                  + Vendor toevoegen
                </button>
              ) : (
                <div style={{ background: "white", border: "1px dashed #b4b4b4", padding: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addVendor()}
                    placeholder="Naam van nieuwe aanbieder..." style={{ ...inputStyle, flex: 1, minWidth: 200 }} autoFocus />
                  <button onClick={addVendor} style={btnPrimary()}>Toevoegen</button>
                  <button onClick={() => { setShowAddVendor(false); setNewVendorName(""); }} style={btnGray()}>Annuleren</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* CONTACT */}
        {selectedVendor && vendorView === "contact" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 8, height: 32, background: selectedVendor.color }} />
              <h2 style={{ margin: 0, color: PAARS, fontSize: 20 }}>{selectedVendor.name} — Contactinformatie</h2>
            </div>
            {contactEdit?.id === selectedVendor.id ? (
              <div style={{ background: "white", border: `2px solid ${PAARS}`, padding: 28 }}>
                <h3 style={{ margin: "0 0 20px", color: PAARS, fontSize: 15 }}>✏️ Contactinfo bewerken</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[{ label: "Contactnaam / organisatie", key: "naam" }, { label: "Website", key: "website" }, { label: "E-mailadres", key: "email" }, { label: "Export instructie", key: "exportInstructie" }].map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <input value={contactEdit.contact[f.key] || ""} onChange={e => setContactEdit({ ...contactEdit, contact: { ...contactEdit.contact, [f.key]: e.target.value } })} style={inputStyle} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Notities / CSV-mapping info</label>
                    <textarea value={contactEdit.contact.notities || ""} rows={3} onChange={e => setContactEdit({ ...contactEdit, contact: { ...contactEdit.contact, notities: e.target.value } })} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={saveContactInfo} style={btnPrimary()}>✅ Opslaan</button>
                  <button onClick={() => setContactEdit(null)} style={btnGray()}>Annuleren</button>
                </div>
              </div>
            ) : (
              <div style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `5px solid ${selectedVendor.color}`, padding: 28 }}>
                {[{ label: "Organisatie", key: "naam" }, { label: "Website", key: "website", isLink: true }, { label: "E-mail", key: "email", isEmail: true }, { label: "Export instructie", key: "exportInstructie" }, { label: "Notities", key: "notities" }].map(f => (
                  <div key={f.label} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ width: 160, fontSize: 13, fontWeight: 700, color: "#555", flexShrink: 0 }}>{f.label}</div>
                    <div style={{ fontSize: 14, color: "#222", flex: 1 }}>
                      {f.isLink && selectedVendor.contact[f.key] ? <a href={selectedVendor.contact[f.key]} target="_blank" rel="noopener noreferrer" style={{ color: PAARS }}>{selectedVendor.contact[f.key]}</a>
                        : f.isEmail && selectedVendor.contact[f.key] ? <a href={`mailto:${selectedVendor.contact[f.key]}`} style={{ color: PAARS }}>{selectedVendor.contact[f.key]}</a>
                        : selectedVendor.contact[f.key] || <span style={{ color: "#aaa" }}>— niet ingevuld —</span>}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                  <button onClick={() => setContactEdit({ id: selectedVendor.id, contact: { ...selectedVendor.contact } })} style={btnOutline()}>✏️ Bewerk contactinfo</button>
                  <button onClick={() => openVendor(selectedVendor, "import")} style={btnPrimary()}>⬆ Importeren</button>
                  <button onClick={() => openVendor(selectedVendor, "edit")} style={btnOutline()}>✏️ Bewerken</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* IMPORT */}
        {selectedVendor && vendorView === "import" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 8, height: 32, background: selectedVendor.color }} />
              <h2 style={{ margin: 0, color: PAARS, fontSize: 20 }}>{selectedVendor.name} — Importeren</h2>
            </div>
            {!selectedVendor.mapper && (
              <div style={{ background: "#fff8e1", border: "1px solid #ffe082", padding: "14px 18px", marginBottom: 20, fontSize: 14, color: "#7a5500" }}>
                ⚠️ Voor <strong>{selectedVendor.name}</strong> is nog geen automatische CSV-mapping geconfigureerd.
              </div>
            )}
            <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f, selectedVendor.mapper); }}
              onClick={() => fileRef.current.click()}
              style={{ border: `2px dashed ${dragging ? PAARS : "#b4b4b4"}`, background: dragging ? PAARS_LICHT : "white", padding: 48, textAlign: "center", cursor: "pointer", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 4 }}>{file ? file.name : "Sleep hier je bestand naartoe"}</div>
              <div style={{ fontSize: 13, color: "#888" }}>Ondersteund: .xlsx, .xls, .csv</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => { const f = e.target.files[0]; if (f) processFile(f, selectedVendor.mapper); }} />
            </div>
            {file && platform && (
              <div style={{ background: "white", border: "1px solid #d4d4d4", padding: 20, marginBottom: 20 }}>
                <div style={{ marginBottom: 12, color: "#275937", fontWeight: 600, fontSize: 14 }}>✅ Herkend als: <strong>{platform}</strong> — {preview.length} rijen</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: PAARS_LICHT }}>
                        {["Titel", "Thema", "Leervorm", "Doelgroep", "Gratis"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: PAARS, borderBottom: "2px solid #d4b8e8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 8).map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "6px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</td>
                          <td style={{ padding: "6px 10px" }}>{r.topic}</td>
                          <td style={{ padding: "6px 10px" }}>{r.werkvorm}</td>
                          <td style={{ padding: "6px 10px" }}>{r.doelgroep}</td>
                          <td style={{ padding: "6px 10px" }}>{r.is_free ? "✅" : "💰"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 8 && <div style={{ fontSize: 13, color: "#888", padding: "8px 10px" }}>... en {preview.length - 8} meer</div>}
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={handleUpload} disabled={uploading} style={btnPrimary({ padding: "11px 28px", fontSize: 14, opacity: uploading ? 0.6 : 1 })}>
                    {uploading ? "⏳ Bezig..." : `⬆ Importeer ${preview.length} activiteiten`}
                  </button>
                  <button onClick={() => { setFile(null); setPreview([]); setPlatform(null); setResult(null); }} style={btnGray()}>Annuleren</button>
                </div>
              </div>
            )}
            {result && <div style={{ background: "#e6f4ea", border: "1px solid #a8d5b0", padding: "14px 18px", fontSize: 14, color: "#275937" }}>✅ Import geslaagd! <strong>{result.inserted}</strong> van <strong>{result.total}</strong> activiteiten geïmporteerd.</div>}
            {errors.length > 0 && <div style={{ background: "#fff5f5", border: "1px solid #f5c6cb", padding: "14px 18px", fontSize: 14, color: "#d52b1e" }}>{errors.map((e, i) => <div key={i}>❌ {e}</div>)}</div>}
          </>
        )}

        {/* EDIT */}
        {selectedVendor && vendorView === "edit" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 32, background: selectedVendor.color }} />
                <h2 style={{ margin: 0, color: PAARS, fontSize: 20 }}>{selectedVendor.name} — Bewerken</h2>
              </div>
              <button onClick={() => loadCoursesForVendor(selectedVendor.name)} style={btnGray()}>🔄 Vernieuwen</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={editSearch} onChange={e => setEditSearch(e.target.value)} placeholder="Zoek op titel..." style={{ ...inputStyle, flex: 1 }} />
              <span style={{ padding: "8px 0", fontSize: 14, color: "#666", whiteSpace: "nowrap" }}>{filteredCourses.length} activiteiten</span>
            </div>
            {loadingCourses ? (
              <div style={{ padding: 40, textAlign: "center", color: "#666" }}>⏳ Laden...</div>
            ) : filteredCourses.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #d4d4d4", padding: 40, textAlign: "center", color: "#888" }}>
                Geen activiteiten gevonden.
                <div style={{ marginTop: 12 }}><button onClick={() => openVendor(selectedVendor, "import")} style={btnPrimary()}>⬆ Importeer activiteiten</button></div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filteredCourses.map(course => (
                  <div key={course.id}>
                    {editingCourse !== course.id ? (
                      <div style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `4px solid ${selectedVendor.color}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{course.title}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: PAARS, background: PAARS_LICHT, padding: "2px 7px", border: "1px solid #d4b8e8" }}>{course.topic || "—"}</span>
                            <span style={{ fontSize: 11, color: "#555", background: "#f3f3f3", padding: "2px 7px", border: "1px solid #ddd" }}>{course.werkvorm || "—"}</span>
                            {!course.doelgroep && <span style={{ fontSize: 11, color: "#d52b1e", background: "#fff5f5", padding: "2px 7px" }}>⚠️ geen doelgroep</span>}
                            {!course.enroll_url && <span style={{ fontSize: 11, color: "#d52b1e", background: "#fff5f5", padding: "2px 7px" }}>⚠️ geen link</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEdit(course)} style={btnPrimary()}>✏️ Bewerk</button>
                          <button onClick={() => deleteCourse(course.id)} style={btnGray({ color: "#d52b1e", border: "1px solid #d52b1e" })}>🗑</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "white", border: `2px solid ${PAARS}`, padding: 24, marginBottom: 2 }}>
                        <h3 style={{ margin: "0 0 20px", color: PAARS, fontSize: 15 }}>✏️ {course.title}</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Titel<Tooltip text={FIELD_TIPS.titel} /></label>
                            <input value={editForm.title || ""} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={inputStyle} />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Omschrijving<Tooltip text={FIELD_TIPS.omschrijving} /></label>
                            <textarea value={editForm.description || ""} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          </div>
                          <div>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Thema<Tooltip text={FIELD_TIPS.thema} /></label>
                            <select value={editForm.topic || ""} onChange={e => setEditForm({ ...editForm, topic: e.target.value })} style={inputStyle}>
                              <option value="">— Kies thema —</option>
                              {ALL_THEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Leervorm<Tooltip text={FIELD_TIPS.leervorm} /></label>
                            <select value={editForm.werkvorm || ""} onChange={e => setEditForm({ ...editForm, werkvorm: e.target.value })} style={inputStyle}>
                              <option value="">— Kies leervorm —</option>
                              {ALL_WERKVORMEN.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Doelgroep<Tooltip text={FIELD_TIPS.doelgroep} /></label>
                            <select value={editForm.doelgroep || ""} onChange={e => setEditForm({ ...editForm, doelgroep: e.target.value })} style={inputStyle}>
                              <option value="">— Kies doelgroep —</option>
                              {ALL_DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Duur<Tooltip text={FIELD_TIPS.duur} /></label>
                            <input value={editForm.duration || ""} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} style={inputStyle} placeholder="bijv. 2 uur" />
                          </div>
                          <div>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Kosten<Tooltip text={FIELD_TIPS.kosten} /></label>
                            <select value={String(editForm.is_free)} onChange={e => setEditForm({ ...editForm, is_free: e.target.value === "true", price: e.target.value === "true" ? null : (editForm.price || "") })} style={inputStyle}>
                              <option value="true">Gratis</option>
                              <option value="false">Betaald</option>
                            </select>
                          </div>
                          <div style={{ opacity: editForm.is_free ? 0.4 : 1, transition: "opacity 0.2s" }}>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Bedrag (€)<Tooltip text={FIELD_TIPS.bedrag} /></label>
                            <input
                              type="number" min="0" step="0.01"
                              value={editForm.price || ""}
                              onChange={e => setEditForm({ ...editForm, price: e.target.value ? parseFloat(e.target.value) : null })}
                              disabled={editForm.is_free}
                              placeholder="bijv. 125.00"
                              style={{ ...inputStyle, background: editForm.is_free ? "#f5f5f5" : "white", cursor: editForm.is_free ? "not-allowed" : "text" }}
                            />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Inschrijflink (URL)<Tooltip text={FIELD_TIPS.inschrijflink} /></label>
                            <input value={editForm.enroll_url || ""} onChange={e => setEditForm({ ...editForm, enroll_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Vervaldatum (optioneel)<Tooltip text={FIELD_TIPS.vervaldatum} /></label>
                            <input type="date" value={editForm.expiry_date || ""} onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value || null })} style={inputStyle} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
                          <button onClick={saveCourse} disabled={saving} style={btnPrimary({ padding: "11px 28px", fontSize: 14, opacity: saving ? 0.6 : 1 })}>
                            {saving ? "Opslaan..." : "✅ Opslaan"}
                          </button>
                          <button onClick={() => { setEditingCourse(null); setSaveMsg(""); }} style={btnGray()}>Annuleren</button>
                          {saveMsg && <span style={{ fontSize: 14, color: saveMsg.includes("❌") ? "#d52b1e" : "#275937" }}>{saveMsg}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* HANDMATIG TOEVOEGEN */}
        {selectedVendor && vendorView === "add" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 8, height: 32, background: selectedVendor.color }} />
              <h2 style={{ margin: 0, color: PAARS, fontSize: 20 }}>{selectedVendor.name} — Handmatig toevoegen</h2>
            </div>
            <div style={{ background: "white", border: `2px solid ${PAARS}`, padding: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Titel <span style={{ color: "#d52b1e", marginLeft: 2 }}>*</span><Tooltip text={FIELD_TIPS.titel} /></label>
                  <input value={addForm.title || ""} onChange={e => setAddForm({ ...addForm, title: e.target.value })} style={inputStyle} placeholder="Naam van de leeractiviteit" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Omschrijving<Tooltip text={FIELD_TIPS.omschrijving} /></label>
                  <textarea value={addForm.description || ""} onChange={e => setAddForm({ ...addForm, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Korte omschrijving..." />
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Thema <span style={{ color: "#d52b1e", marginLeft: 2 }}>*</span><Tooltip text={FIELD_TIPS.thema} /></label>
                  <select value={addForm.topic || ""} onChange={e => setAddForm({ ...addForm, topic: e.target.value })} style={inputStyle}>
                    <option value="">— Kies thema —</option>
                    {ALL_THEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Leervorm <span style={{ color: "#d52b1e", marginLeft: 2 }}>*</span><Tooltip text={FIELD_TIPS.leervorm} /></label>
                  <select value={addForm.werkvorm || ""} onChange={e => setAddForm({ ...addForm, werkvorm: e.target.value })} style={inputStyle}>
                    <option value="">— Kies leervorm —</option>
                    {ALL_WERKVORMEN.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Doelgroep <span style={{ color: "#d52b1e", marginLeft: 2 }}>*</span><Tooltip text={FIELD_TIPS.doelgroep} /></label>
                  <select value={addForm.doelgroep || ""} onChange={e => setAddForm({ ...addForm, doelgroep: e.target.value })} style={inputStyle}>
                    <option value="">— Kies doelgroep —</option>
                    {ALL_DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Duur<Tooltip text={FIELD_TIPS.duur} /></label>
                  <input value={addForm.duration || ""} onChange={e => setAddForm({ ...addForm, duration: e.target.value })} style={inputStyle} placeholder="bijv. 2 uur" />
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Kosten<Tooltip text={FIELD_TIPS.kosten} /></label>
                  <select value={String(addForm.is_free)} onChange={e => setAddForm({ ...addForm, is_free: e.target.value === "true", price: e.target.value === "true" ? null : (addForm.price || "") })} style={inputStyle}>
                    <option value="true">Gratis</option>
                    <option value="false">Betaald</option>
                  </select>
                </div>
                <div style={{ opacity: addForm.is_free ? 0.4 : 1, transition: "opacity 0.2s" }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Bedrag (€)<Tooltip text={FIELD_TIPS.bedrag} /></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={addForm.price || ""}
                    onChange={e => setAddForm({ ...addForm, price: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={addForm.is_free}
                    placeholder="bijv. 125.00"
                    style={{ ...inputStyle, background: addForm.is_free ? "#f5f5f5" : "white", cursor: addForm.is_free ? "not-allowed" : "text" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Inschrijflink (URL)<Tooltip text={FIELD_TIPS.inschrijflink} /></label>
                  <input value={addForm.enroll_url || ""} onChange={e => setAddForm({ ...addForm, enroll_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{...labelStyle, display: "flex", alignItems: "center"}}>Vervaldatum (optioneel)<Tooltip text={FIELD_TIPS.vervaldatum} /></label>
                  <input type="date" value={addForm.expiry_date || ""} onChange={e => setAddForm({ ...addForm, expiry_date: e.target.value || null })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
                <button onClick={saveNewCourse} disabled={adding} style={{ ...btnPrimary(), padding: "11px 28px", fontSize: 14, opacity: adding ? 0.6 : 1 }}>
                  {adding ? "Opslaan..." : "✅ Toevoegen aan database"}
                </button>
                <button onClick={() => { setSelectedVendor(null); setVendorView(null); }} style={btnGray()}>Annuleren</button>
                {addMsg && <span style={{ fontSize: 14, color: addMsg.includes("❌") ? "#d52b1e" : "#275937" }}>{addMsg}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
