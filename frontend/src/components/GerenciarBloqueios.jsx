import { useState, useEffect } from "react";
import { listarBloqueios, criarBloqueio, excluirBloqueio } from "../api.js";

const C = {
  navy:"#1B3A6B", green:"#2E8B3A", orange:"#E87820", white:"#FFFFFF",
  gray100:"#EEF2F7", gray200:"#D8E2EE", gray400:"#8EA5C0",
  gray600:"#4A6080", gray800:"#1E2D3D", red:"#DC2626",
};

const SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","13:00","13:30","14:00","14:30","15:00","15:30"];

const inputStyle = {
  width:"100%", border:"2px solid " + C.gray200, borderRadius:10,
  padding:"10px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
  color:C.gray800, outline:"none", boxSizing:"border-box",
};

function fmtDate(d) {
  if (!d) return "—";
  const [y,m,dia] = d.toString().split("T")[0].split("-");
  return `${dia}/${m}/${y}`;
}

export default function GerenciarBloqueios() {
  const [bloqueios, setBloqueios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ date:"", slot:"", motivo:"" });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  async function carregar() {
    setCarregando(true); setErro("");
    try { setBloqueios(await listarBloqueios()); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function handleCriar(e) {
    e.preventDefault();
    if (!form.date || !form.motivo) { setErroForm("Data e motivo são obrigatórios."); return; }
    setSalvando(true); setErroForm("");
    try {
      await criarBloqueio({ date: form.date, slot: form.slot || null, motivo: form.motivo });
      setForm({ date:"", slot:"", motivo:"" });
      await carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  }

  async function handleExcluir(id) {
    try { await excluirBloqueio(id); await carregar(); }
    catch (e) { alert(e.message); }
  }

  const hoje = new Date().toISOString().split("T")[0];
  const futuros = bloqueios.filter(b => b.date >= hoje);
  const passados = bloqueios.filter(b => b.date < hoje);

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:17, color:C.navy, marginBottom:20 }}>🚫 Bloqueio de Datas e Horários</div>

      {/* Formulário de novo bloqueio */}
      <div style={{ background:C.white, border:"2px solid " + C.gray200, borderRadius:16, padding:20, marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:14, color:C.navy, marginBottom:14 }}>➕ Novo bloqueio</div>
        <div style={{ fontSize:12, color:C.gray600, marginBottom:14, lineHeight:1.5 }}>
          Deixe o horário em branco para bloquear o <strong>dia inteiro</strong> (feriado, recesso, etc.).
        </div>
        <form onSubmit={handleCriar}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Data *</label>
              <input type="date" style={inputStyle} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Horário (opcional)</label>
              <select style={{ ...inputStyle, cursor:"pointer", appearance:"none" }} value={form.slot}
                onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}>
                <option value="">Dia inteiro</option>
                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Motivo *</label>
            <input style={inputStyle} placeholder="Ex: Feriado municipal, Reunião pedagógica..." value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
          </div>
          {erroForm && <div style={{ color:C.red, fontSize:13, marginBottom:10 }}>⚠️ {erroForm}</div>}
          <button type="submit" disabled={salvando}
            style={{ background:C.orange, color:"#fff", border:"none", borderRadius:10,
              padding:"10px 24px", fontFamily:"'Nunito',sans-serif", fontSize:14,
              fontWeight:800, cursor:"pointer" }}>
            {salvando ? "Bloqueando..." : "🚫 Criar bloqueio"}
          </button>
        </form>
      </div>

      {erro && <div style={{ color:C.red, fontSize:13, marginBottom:12 }}>⚠️ {erro}</div>}

      {/* Bloqueios futuros/ativos */}
      {carregando ? (
        <div style={{ color:C.gray400, textAlign:"center", padding:24 }}>Carregando...</div>
      ) : (
        <>
          {futuros.length === 0 && (
            <div style={{ color:C.gray400, textAlign:"center", padding:24, fontSize:14 }}>
              Nenhum bloqueio ativo.
            </div>
          )}
          {futuros.map(b => (
            <div key={b.id} style={{ background:C.white, border:"2px solid rgba(232,120,32,0.4)",
              borderLeft:"4px solid " + C.orange, borderRadius:14, padding:"14px 16px", marginBottom:8,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:C.gray800 }}>
                  📅 {fmtDate(b.date)}
                  {b.slot
                    ? <span style={{ marginLeft:8, color:C.orange }}>às {b.slot}</span>
                    : <span style={{ marginLeft:8, background:"#FEF3EC", color:C.orange,
                        border:"1.5px solid rgba(232,120,32,0.3)", borderRadius:6,
                        padding:"1px 8px", fontSize:11, fontWeight:800 }}>Dia inteiro</span>
                  }
                </div>
                <div style={{ fontSize:13, color:C.gray600, marginTop:2 }}>🚫 {b.motivo}</div>
                <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>Por: {b.criado_por}</div>
              </div>
              <button onClick={() => handleExcluir(b.id)}
                style={{ background:"#FEF0EE", color:C.red, border:"2px solid rgba(220,38,38,0.3)",
                  borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                Remover
              </button>
            </div>
          ))}

          {passados.length > 0 && (
            <details style={{ marginTop:16 }}>
              <summary style={{ fontSize:13, color:C.gray400, cursor:"pointer", fontWeight:700 }}>
                Ver {passados.length} bloqueio{passados.length > 1?"s":""} passado{passados.length > 1?"s":""}
              </summary>
              <div style={{ marginTop:8 }}>
                {passados.map(b => (
                  <div key={b.id} style={{ background:C.gray100, borderRadius:10, padding:"10px 14px",
                    marginBottom:6, fontSize:13, color:C.gray600,
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>📅 {fmtDate(b.date)}{b.slot ? " às " + b.slot : " (dia inteiro)"} — {b.motivo}</span>
                    <button onClick={() => handleExcluir(b.id)}
                      style={{ background:"none", border:"none", color:C.gray400, cursor:"pointer", fontSize:16 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
