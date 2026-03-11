import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

const CORRECT_PASSWORD = "Leerhuis2026*NA";
const PAARS = "#42145f";
const PAARS_LICHT = "#f5eefa";

const ALL_WERKVORMEN = ["E-learning", "Training", "Webinar", "Workshop", "Podcast", "Netwerkborrel"];
const ALL_THEMAS = [
  "Archiveren en beheren", "Meten en verbeteren", "Openbaar maken",
  "Organisatiecultuur en gedragsverandering", "Professionele vaardigheden",
];
const ALL_DOELGROEPEN = ["Informatieprofessional", "Leidinggevende", "Rijksmedewerker"];
const ALL_VENDORS = ["Leerhuis Informatiehuishouding", "KIA", "RAFEB", "RADIO", "Informatie Academie"];

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

function detectPlatform(headers) {
  if (headers.includes("Leeractiviteit code") && headers.includes("Leverancier")) return "Leerhuis Informatiehuishouding";
  return null;
}

const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #b4b4b4", fontSize: 14, boxSizing: "border-box", outline: "none", color: "#222" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 4 };

export default function AdminUpload() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [activeSection, setActiveSection] = useState("import");

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
  const [editVendor, setEditVendor] = useState("Alle aanbieders");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  function handleLogin() {
    if (password === CORRECT_PASSWORD) { setLoggedIn(true); }
    else { setWrongPassword(true); setTimeout(() => setWrongPassword(false), 2000); }
  }

  async function loadCourses() {
    setLoadingCourses(true);
    const { data } = await supabase.from("courses").select("*").order("title");
    setCourses(data || []);
    setLoadingCourses(false);
  }

  useEffect(() => { if (loggedIn && activeSection === "edit") loadCourses(); }, [loggedIn, activeSection]);

  function processFile(f) {
    setFile(f); setResult(null); setErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const detected = detectPlatform(headers);
      setPlatform(detected);
      if (detected && PLATFORM_MAPPERS[detected]) {
        setPreview(rows.map(PLATFORM_MAPPERS[detected]).filter((r) => r.title));
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
    } catch (err) { setErrors([err.message]); }
    setUploading(false);
  }

  function startEdit(course) {
    setEditingCourse(course.id);
    setEditForm({
      title: course.title || "", description: course.description || "",
      vendor: course.vendor || "", topic: course.topic || "",
      werkvorm: course.werkvorm || "", doelgroep: course.doelgroep || "",
      duration: course.duration || "", enroll_url: course.enroll_url || "",
      is_free: course.is_free, language: course.language || "NL",
    });
  }

  async function saveCourse() {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("courses").update(editForm).eq("id", editingCourse);
    if (error) { setSaveMsg("❌ Fout: " + error.message); }
    else {
      setSaveMsg("✅ Opgeslagen!");
      setCourses(courses.map(c => c.id === editingCourse ? { ...c, ...editForm } : c));
      setTimeout(() => { setEditingCourse(null); setSaveMsg(""); }, 1200);
    }
    setSaving(false);
  }

  async function deleteCourse(id) {
    if (!window.confirm("Weet je zeker dat je deze leeractiviteit wilt verwijderen?")) return;
    await supabase.from("courses").delete().eq("id", id);
    setCourses(courses.filter(c => c.id !== id));
  }

  const filteredCourses = courses.filter(c => {
    const matchSearch = editSearch === "" || c.title?.toLowerCase().includes(editSearch.toLowerCase());
    const matchVendor = editVendor === "Alle aanbieders" || c.vendor === editVendor;
    return matchSearch && matchVendor;
  });

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: PAARS, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "white", padding: "48px 40px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, background: PAARS, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 22 }}>XL</div>
          <h2 style={{ margin: "0 0 6px", color: PAARS }}>Leerhuis XL</h2>
          <p style={{ margin: "0 0 28px", color: "#888", fontSize: 13 }}>Beheerportaal — alleen voor beheerders</p>
          <input type="password" placeholder="Wachtwoord" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "12px 16px", fontSize: 15, border: wrongPassword ? "2px solid #d52b1e" : "2px solid #d4d4d4", outline: "none", boxSizing: "border-box", background: wrongPassword ? "#fff5f5" : "white", color: "#222" }} />
          {wrongPassword && <p style={{ color: "#d52b1e", fontSize: 13, margin: "8px 0 0" }}>Onjuist wachtwoord</p>}
          <button onClick={handleLogin} style={{ marginTop: 16, width: "100%", padding: "13px", background: PAARS, color: "white", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Inloggen →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f3f3", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: PAARS, height: 8 }} />
      <div style={{ background: "white", borderBottom: "1px solid #d4d4d4" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: PAARS, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 18 }}>XL</div>
            <span style={{ fontWeight: 700, color: PAARS, fontSize: 17 }}>Leerhuis XL — Beheerportaal</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[{ key: "import", label: "📥 Importeren" }, { key: "edit", label: "✏️ Bewerken" }].map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                background: activeSection === s.key ? PAARS : "transparent",
                color: activeSection === s.key ? "white" : PAARS,
                border: `1px solid ${PAARS}`, padding: "7px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600,
              }}>{s.label}</button>
            ))}
            <button onClick={() => setLoggedIn(false)} style={{ background: "none", border: "1px solid #ccc", color: "#666", padding: "7px 14px", cursor: "pointer", fontSize: 13, marginLeft: 8 }}>Uitloggen</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {activeSection === "import" && (
          <>
            <h2 style={{ color: PAARS, marginTop: 0 }}>Cursussen importeren</h2>
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
              onClick={() => fileRef.current.click()}
              style={{ border: `2px dashed ${dragging ? PAARS : "#b4b4b4"}`, padding: "48px 32px", textAlign: "center", background: dragging ? PAARS_LICHT : "white", cursor: "pointer", marginBottom: 24 }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: PAARS, marginBottom: 6 }}>{file ? file.name : "Sleep hier je bestand naartoe"}</div>
              <div style={{ fontSize: 13, color: "#888" }}>Ondersteund: .xlsx, .xls, .csv</div>
            </div>

            {platform && (
              <div style={{ background: "#eafaf1", border: "1px solid #a9dfbf", padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span>✅</span>
                <div><strong style={{ color: "#1e8449" }}>Platform herkend: {platform}</strong>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{preview.length} leeractiviteiten klaar</div>
                </div>
              </div>
            )}

            {preview.length > 0 && platform && (
              <div style={{ background: "white", border: "1px solid #d4d4d4", padding: 24, marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 16px", color: PAARS, fontSize: 16 }}>Voorbeeld — eerste {Math.min(5, preview.length)} van {preview.length}</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "#f3f3f3" }}>
                      {["Titel", "Thema", "Werkvorm", "Gratis?", "Duur"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "8px 12px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</td>
                          <td style={{ padding: "8px 12px" }}>{row.topic}</td>
                          <td style={{ padding: "8px 12px" }}>{row.werkvorm}</td>
                          <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", background: row.is_free ? "#e5f5e9" : "#fff3e0", color: row.is_free ? "#275937" : "#6b4300" }}>{row.is_free ? "Gratis" : "Betaald"}</span></td>
                          <td style={{ padding: "8px 12px" }}>{row.duration || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleUpload} disabled={uploading} style={{ marginTop: 20, padding: "13px 32px", background: uploading ? "#aaa" : PAARS, color: "white", border: "none", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", width: "100%" }}>
                  {uploading ? "⏳ Bezig..." : `🚀 Importeer ${preview.length} leeractiviteiten`}
                </button>
              </div>
            )}

            {result && (
              <div style={{ background: "#eafaf1", border: "1px solid #a9dfbf", padding: 24, textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <h3 style={{ margin: "0 0 8px", color: "#1e8449" }}>Import geslaagd!</h3>
                <p style={{ margin: 0, color: "#555" }}><strong>{result.total}</strong> leeractiviteiten van <strong>{platform}</strong> staan nu live.</p>
                <button onClick={() => { setFile(null); setPreview([]); setPlatform(null); setResult(null); }} style={{ marginTop: 16, background: PAARS, color: "white", border: "none", padding: "10px 24px", cursor: "pointer", fontWeight: 600 }}>Nieuw bestand</button>
              </div>
            )}
            {errors.length > 0 && (
              <div style={{ background: "#fff5f5", border: "1px solid #f5c6cb", padding: 16, marginTop: 8 }}>
                <strong style={{ color: "#d52b1e" }}>Foutmeldingen:</strong>
                {errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{e}</div>)}
              </div>
            )}

            <div style={{ background: "white", border: "1px solid #d4d4d4", padding: 28, marginTop: 28 }}>
              <h3 style={{ margin: "0 0 16px", color: PAARS, fontSize: 16 }}>📋 Ondersteunde platformen</h3>
              {[
                { name: "Leerhuis Informatiehuishouding", status: "✅ Actief", hint: "Exporteer via: Beheer → Leeractiviteiten → Exporteren" },
                { name: "RAFEB", status: "🔜 Binnenkort" }, { name: "RADIO", status: "🔜 Binnenkort" },
                { name: "KIA", status: "🔜 Binnenkort" }, { name: "Informatie Academie", status: "🔜 Binnenkort" },
              ].map((p) => (
                <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    {p.hint && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{p.hint}</div>}
                  </div>
                  <span style={{ fontSize: 13 }}>{p.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeSection === "edit" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ color: PAARS, margin: 0 }}>Leeractiviteiten bewerken</h2>
              <button onClick={loadCourses} style={{ background: "none", border: `1px solid ${PAARS}`, color: PAARS, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🔄 Vernieuwen</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={editSearch} onChange={e => setEditSearch(e.target.value)} placeholder="Zoek op titel..."
                style={{ flex: 1, minWidth: 200, padding: "9px 12px", border: "1px solid #b4b4b4", fontSize: 14, outline: "none", color: "#222" }} />
              <select value={editVendor} onChange={e => setEditVendor(e.target.value)}
                style={{ padding: "9px 14px", border: "1px solid #b4b4b4", fontSize: 14, cursor: "pointer", background: "white", color: "#222", outline: "none" }}>
                {["Alle aanbieders", ...ALL_VENDORS].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <span style={{ padding: "9px 0", fontSize: 14, color: "#666" }}>{filteredCourses.length} resultaten</span>
            </div>

            {loadingCourses ? <div style={{ padding: 40, textAlign: "center", color: "#666" }}>⏳ Laden...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filteredCourses.map(course => (
                  <div key={course.id}>
                    {editingCourse !== course.id && (
                      <div style={{ background: "white", border: "1px solid #d4d4d4", borderLeft: `4px solid ${PAARS}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#222", marginBottom: 4 }}>{course.title}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#42145f", background: "#f5eefa", padding: "2px 8px", border: "1px solid #d4b8e8" }}>{course.topic || "—"}</span>
                            <span style={{ fontSize: 12, color: "#555", background: "#f3f3f3", padding: "2px 8px", border: "1px solid #ddd" }}>{course.werkvorm || "—"}</span>
                            <span style={{ fontSize: 12, color: "#555", background: "#f3f3f3", padding: "2px 8px", border: "1px solid #ddd" }}>{course.vendor}</span>
                            {!course.doelgroep && <span style={{ fontSize: 12, color: "#d52b1e", background: "#fff5f5", padding: "2px 8px", border: "1px solid #f5c6cb" }}>⚠️ geen doelgroep</span>}
                            {!course.enroll_url && <span style={{ fontSize: 12, color: "#d52b1e", background: "#fff5f5", padding: "2px 8px", border: "1px solid #f5c6cb" }}>⚠️ geen link</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => startEdit(course)} style={{ background: PAARS, color: "white", border: "none", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✏️ Bewerk</button>
                          <button onClick={() => deleteCourse(course.id)} style={{ background: "none", color: "#d52b1e", border: "1px solid #d52b1e", padding: "7px 12px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                        </div>
                      </div>
                    )}
                    {editingCourse === course.id && (
                      <div style={{ background: "white", border: `2px solid ${PAARS}`, padding: 24 }}>
                        <h3 style={{ margin: "0 0 20px", color: PAARS, fontSize: 16 }}>✏️ Bewerk: {course.title}</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Titel</label>
                            <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={inputStyle} />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Omschrijving</label>
                            <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                              style={{ ...inputStyle, resize: "vertical" }} />
                          </div>
                          <div>
                            <label style={labelStyle}>Aanbieder</label>
                            <select value={editForm.vendor} onChange={e => setEditForm({ ...editForm, vendor: e.target.value })} style={{ ...inputStyle }}>
                              {ALL_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Thema</label>
                            <select value={editForm.topic} onChange={e => setEditForm({ ...editForm, topic: e.target.value })} style={{ ...inputStyle }}>
                              <option value="">— Kies thema —</option>
                              {ALL_THEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Leervorm</label>
                            <select value={editForm.werkvorm} onChange={e => setEditForm({ ...editForm, werkvorm: e.target.value })} style={{ ...inputStyle }}>
                              <option value="">— Kies leervorm —</option>
                              {ALL_WERKVORMEN.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Doelgroep</label>
                            <select value={editForm.doelgroep} onChange={e => setEditForm({ ...editForm, doelgroep: e.target.value })} style={{ ...inputStyle }}>
                              <option value="">— Kies doelgroep —</option>
                              {ALL_DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Duur</label>
                            <input value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} style={inputStyle} placeholder="bijv. 2 uur" />
                          </div>
                          <div>
                            <label style={labelStyle}>Kosten</label>
                            <select value={editForm.is_free} onChange={e => setEditForm({ ...editForm, is_free: e.target.value === "true" })} style={{ ...inputStyle }}>
                              <option value="true">Gratis</option>
                              <option value="false">Betaald</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Inschrijflink (URL)</label>
                            <input value={editForm.enroll_url} onChange={e => setEditForm({ ...editForm, enroll_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
                          <button onClick={saveCourse} disabled={saving} style={{ background: PAARS, color: "white", border: "none", padding: "11px 28px", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700 }}>
                            {saving ? "Opslaan..." : "✅ Opslaan"}
                          </button>
                          <button onClick={() => { setEditingCourse(null); setSaveMsg(""); }} style={{ background: "none", border: "1px solid #ccc", color: "#666", padding: "11px 20px", cursor: "pointer", fontSize: 14 }}>Annuleren</button>
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
      </div>
    </div>
  );
}
