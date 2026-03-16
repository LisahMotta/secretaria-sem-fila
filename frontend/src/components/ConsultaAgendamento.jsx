import { useState, useEffect } from "react";
import {
  consultarProtocolo,
  verificarAgendamento,
  buscarInfoCancelamento,
  confirmarCancelamento,
  buscarInfoReagendamento,
  confirmarReagendamento,
  buscarSlotsOcupados,
} from "../api.js";

const C = {
  navy:"#1B3A6B", green:"#2E8B3A", orange:"#E87820",
  white:"#FFFFFF", gray100:"#EEF2F7", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D",
  red:"#DC2626", bg:"#F4F7FB",
};

const STATUS_CONFIG = {
  pendente:   { label:"Pendente",   color:C.orange },
  confirmado: { label:"Confirmado", color:C.green  },
  cancelado:  { label:"Cancelado",  color:C.red    },
  concluido:  { label:"Concluído",  color:C.navy   },
};

const SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","13:00","13:30","14:00","14:30","15:00","15:30"];

const DAYS = (() => {
  const days = [], now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
    if (days.length === 5) break;
  }
  return days;
})();

function fmtDate(d) {
  if (!d) return "—";
  const [y,m,dia] = d.toString().split("T")[0].split("-");
  return `${dia}/${m}/${y}`;
}

function CardInfo({ ag }) {
  const statusCfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.pendente;
  return (
    <div style={{ background:C.white, border:"2px solid " + C.gray200,
      borderRadius:16, padding:20, marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:900, fontSize:15, color:C.navy }}>{ag.serviceLabel}</div>
        <div style={{ color:statusCfg.color, fontWeight:800, fontSize:13 }}>
          ● {statusCfg.label}
        </div>
      </div>
      <div style={{ fontSize:13, color:C.gray600 }}>
        <div>📅 {ag.date ? fmtDate(ag.date) + (ag.slot ? " às " + ag.slot : "") : "Sem data"}</div>
        {ag.responsibleName && <div>👤 {ag.responsibleName}</div>}
        {ag.studentName && <div>🎒 {ag.studentName}</div>}
        <div style={{ marginTop:8, fontSize:11, color:C.gray400 }}>
          Protocolo: <strong style={{ color:C.navy }}>{ag.protocol}</strong>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width:"100%", border:"2px solid " + C.gray200, borderRadius:10,
  padding:"11px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
  color:C.gray800, outline:"none", boxSizing:"border-box",
};

// ── Modo: Consulta por protocolo ─────────────────────────────
function ModoConsulta({ onVoltar, onCancelar, onReagendar }) {
  // etapa 1: buscar pelo protocolo
  const [protocolo, setProtocolo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro]           = useState("");
  const [carregando, setCarregando] = useState(false);

  // etapa 2: verificar telefone para liberar ações
  const [telefone, setTelefone]       = useState("");
  const [verificando, setVerificando] = useState(false);
  const [erroVerif, setErroVerif]     = useState("");
  const [token, setToken]             = useState(null); // cancelToken desbloqueado

  const podeAgir = resultado &&
    resultado.status !== "cancelado" &&
    resultado.status !== "concluido";

  async function buscar(e) {
    e.preventDefault();
    const p = protocolo.trim().toUpperCase();
    if (!p) return;
    setCarregando(true); setErro(""); setResultado(null); setToken(null); setTelefone("");
    try { setResultado(await consultarProtocolo(p)); }
    catch (err) { setErro(err.message); }
    finally { setCarregando(false); }
  }

  async function verificar(e) {
    e.preventDefault();
    if (!telefone.trim()) return;
    setVerificando(true); setErroVerif("");
    try {
      const data = await verificarAgendamento(resultado.protocol, telefone.trim());
      setToken(data.cancelToken);
    } catch (err) { setErroVerif(err.message); }
    finally { setVerificando(false); }
  }

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:6 }}>
        🔍 Consultar agendamento
      </div>
      <div style={{ fontSize:13, color:C.gray600, marginBottom:20 }}>
        Digite o número de protocolo recebido na secretaria ou no WhatsApp.
      </div>

      {/* Etapa 1 — busca */}
      <form onSubmit={buscar} style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={protocolo} onChange={e => setProtocolo(e.target.value.toUpperCase())}
          placeholder="Ex: AG20250316-1234"
          style={{ ...inputStyle, flex:1 }} />
        <button type="submit" disabled={carregando}
          style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
            padding:"11px 20px", fontFamily:"'Nunito',sans-serif", fontSize:14,
            fontWeight:800, cursor:"pointer" }}>
          {carregando ? "..." : "Buscar"}
        </button>
      </form>
      {erro && <div style={{ color:C.red, fontSize:13, marginBottom:12 }}>⚠️ {erro}</div>}

      {resultado && (
        <>
          <CardInfo ag={resultado} />

          {/* Etapa 2 — verificação para liberar ações */}
          {podeAgir && !token && (
            <div style={{ background:"#EBF0F9", border:"2px solid rgba(27,58,107,0.2)",
              borderRadius:14, padding:"16px", marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.navy, marginBottom:8 }}>
                🔒 Para cancelar ou reagendar, confirme seu telefone:
              </div>
              <form onSubmit={verificar} style={{ display:"flex", gap:8 }}>
                <input value={telefone} onChange={e => setTelefone(e.target.value)}
                  placeholder="Telefone cadastrado (ex: 11999998888)"
                  style={{ ...inputStyle, flex:1 }} />
                <button type="submit" disabled={verificando}
                  style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
                    padding:"11px 16px", fontFamily:"'Nunito',sans-serif", fontSize:13,
                    fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {verificando ? "..." : "Confirmar"}
                </button>
              </form>
              {erroVerif && <div style={{ color:C.red, fontSize:12, marginTop:8 }}>⚠️ {erroVerif}</div>}
            </div>
          )}

          {/* Ações liberadas após verificação */}
          {token && (
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={() => onReagendar(token)}
                style={{ flex:1, background:"#EBF0F9", color:C.navy,
                  border:"2px solid rgba(27,58,107,0.3)", borderRadius:10,
                  padding:"11px", fontFamily:"'Nunito',sans-serif", fontSize:14,
                  fontWeight:800, cursor:"pointer" }}>
                📅 Reagendar
              </button>
              <button onClick={() => onCancelar(token)}
                style={{ flex:1, background:"#FEF0EE", color:C.red,
                  border:"2px solid rgba(220,38,38,0.3)", borderRadius:10,
                  padding:"11px", fontFamily:"'Nunito',sans-serif", fontSize:14,
                  fontWeight:800, cursor:"pointer" }}>
                ❌ Cancelar
              </button>
            </div>
          )}

          {/* Status final */}
          {(resultado.status === "cancelado" || resultado.status === "concluido") && (
            <div style={{ fontSize:13, color:C.gray400, textAlign:"center", padding:"8px 0" }}>
              Este agendamento foi {resultado.status === "cancelado" ? "cancelado" : "concluído"} e não pode ser alterado.
            </div>
          )}
        </>
      )}

      <button onClick={onVoltar}
        style={{ background:"transparent", color:C.gray600, border:"none",
          padding:"8px 0", fontFamily:"'Nunito',sans-serif", fontSize:13,
          cursor:"pointer", fontWeight:700 }}>
        ← Voltar
      </button>
    </div>
  );
}

// ── Modo: Cancelar via token ──────────────────────────────────
function ModoCancelar({ token, onVoltar }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelado, setCancelado] = useState(false);

  useEffect(() => {
    buscarInfoCancelamento(token)
      .then(setInfo)
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [token]);

  async function cancelar() {
    setConfirmando(true); setErro("");
    try {
      await confirmarCancelamento(token);
      setCancelado(true);
    } catch (err) { setErro(err.message); }
    finally { setConfirmando(false); }
  }

  if (carregando) return <div style={{ color:C.gray400, textAlign:"center", padding:40 }}>Carregando...</div>;

  if (cancelado) return (
    <div style={{ textAlign:"center", padding:24 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
      <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:8 }}>
        Agendamento cancelado
      </div>
      <div style={{ fontSize:13, color:C.gray600, marginBottom:20 }}>
        Seu agendamento foi cancelado com sucesso.
      </div>
      <button onClick={onVoltar}
        style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
          padding:"11px 24px", fontFamily:"'Nunito',sans-serif", fontSize:14,
          fontWeight:800, cursor:"pointer" }}>
        Ir para o início
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:C.red, marginBottom:6 }}>
        ❌ Cancelar agendamento
      </div>
      {erro && <div style={{ color:C.red, fontSize:13, marginBottom:12 }}>⚠️ {erro}</div>}
      {info && (
        <>
          <CardInfo ag={info} />
          <div style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.3)",
            borderRadius:12, padding:16, marginBottom:16, fontSize:13, color:C.red }}>
            ⚠️ <strong>Tem certeza?</strong> Esta ação não pode ser desfeita.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={cancelar} disabled={confirmando}
              style={{ flex:1, background:C.red, color:"#fff", border:"none",
                borderRadius:10, padding:"12px", fontFamily:"'Nunito',sans-serif",
                fontSize:14, fontWeight:800, cursor:"pointer" }}>
              {confirmando ? "Cancelando..." : "Sim, cancelar agendamento"}
            </button>
            <button onClick={onVoltar}
              style={{ flex:1, background:"transparent", color:C.gray600,
                border:"2px solid " + C.gray200, borderRadius:10, padding:"12px",
                fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              Voltar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Modo: Reagendar via token ─────────────────────────────────
function ModoReagendar({ token, onVoltar }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [dataSel, setDataSel] = useState("");
  const [slotSel, setSlotSel] = useState("");
  const [slotsOcupados, setSlotsOcupados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState(null);

  useEffect(() => {
    buscarInfoReagendamento(token)
      .then(setInfo)
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [token]);

  useEffect(() => {
    if (!dataSel) return;
    buscarSlotsOcupados(dataSel).then(r => setSlotsOcupados(r.ocupados || []));
  }, [dataSel]);

  async function reagendar() {
    if (!dataSel || !slotSel) { setErro("Selecione data e horário."); return; }
    setSalvando(true); setErro("");
    try {
      const result = await confirmarReagendamento(token, dataSel, slotSel);
      setFeito(result);
    } catch (err) { setErro(err.message); }
    finally { setSalvando(false); }
  }

  if (carregando) return <div style={{ color:C.gray400, textAlign:"center", padding:40 }}>Carregando...</div>;

  if (feito) return (
    <div style={{ textAlign:"center", padding:24 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
      <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:8 }}>
        Reagendado com sucesso!
      </div>
      <div style={{ fontSize:13, color:C.gray600, marginBottom:8 }}>
        Novo horário: <strong>{fmtDate(feito.date)} às {feito.slot}</strong>
      </div>
      <div style={{ fontSize:12, color:C.gray400, marginBottom:20 }}>
        Você receberá uma confirmação pelo WhatsApp.
      </div>
      <button onClick={onVoltar}
        style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
          padding:"11px 24px", fontFamily:"'Nunito',sans-serif", fontSize:14,
          fontWeight:800, cursor:"pointer" }}>
        Ir para o início
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:6 }}>
        📅 Reagendar atendimento
      </div>
      {erro && <div style={{ color:C.red, fontSize:13, marginBottom:12 }}>⚠️ {erro}</div>}
      {info && (
        <>
          <CardInfo ag={info} />
          <div style={{ fontWeight:800, fontSize:14, color:C.gray800, marginBottom:10 }}>
            Escolha a nova data:
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {DAYS.map(d => {
              const iso = d.toISOString().split("T")[0];
              const sel = dataSel === iso;
              return (
                <button key={iso} onClick={() => { setDataSel(iso); setSlotSel(""); }}
                  style={{ background: sel ? C.navy : C.white,
                    color: sel ? "#fff" : C.gray800,
                    border:"2px solid " + (sel ? C.navy : C.gray200),
                    borderRadius:10, padding:"8px 14px",
                    fontFamily:"'Nunito',sans-serif", fontSize:13,
                    fontWeight:800, cursor:"pointer" }}>
                  {d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})}
                </button>
              );
            })}
          </div>
          {dataSel && (
            <>
              <div style={{ fontWeight:800, fontSize:14, color:C.gray800, marginBottom:10 }}>
                Escolha o horário:
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
                {SLOTS.map(s => {
                  const ocupado = slotsOcupados.includes(s);
                  const sel = slotSel === s;
                  return (
                    <button key={s} disabled={ocupado} onClick={() => setSlotSel(s)}
                      style={{ background: ocupado ? C.gray100 : sel ? C.green : C.white,
                        color: ocupado ? C.gray400 : sel ? "#fff" : C.gray800,
                        border:"2px solid " + (ocupado ? C.gray200 : sel ? C.green : C.gray200),
                        borderRadius:10, padding:"10px 0",
                        fontFamily:"'Nunito',sans-serif", fontSize:13,
                        fontWeight:800, cursor: ocupado ? "not-allowed" : "pointer" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={reagendar} disabled={salvando || !dataSel || !slotSel}
              style={{ flex:1, background: (!dataSel || !slotSel) ? C.gray200 : C.green,
                color: (!dataSel || !slotSel) ? C.gray400 : "#fff",
                border:"none", borderRadius:10, padding:"12px",
                fontFamily:"'Nunito',sans-serif", fontSize:14,
                fontWeight:800, cursor: (!dataSel || !slotSel) ? "not-allowed" : "pointer" }}>
              {salvando ? "Salvando..." : "Confirmar reagendamento"}
            </button>
            <button onClick={onVoltar}
              style={{ flex:1, background:"transparent", color:C.gray600,
                border:"2px solid " + C.gray200, borderRadius:10, padding:"12px",
                fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              Voltar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function ConsultaAgendamento({ modo: modoInicial, token: tokenInicial, onVoltar }) {
  // Permite navegar de "consulta" para "cancelar"/"reagendar" internamente
  const [modo, setModo]   = useState(modoInicial);
  const [token, setToken] = useState(tokenInicial);

  function irParaCancelar(tk) { setToken(tk); setModo("cancelar"); }
  function irParaReagendar(tk) { setToken(tk); setModo("reagendar"); }
  function voltarParaConsulta() { setModo("consulta"); setToken(null); }

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh",
      background:C.bg, display:"flex", justifyContent:"center", padding:"40px 16px" }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        <div style={{ background:C.white, borderRadius:20, padding:"28px 24px",
          boxShadow:"0 4px 24px rgba(27,58,107,0.10)" }}>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <div style={{ width:36, height:36, background:C.navy, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:18 }}>📋</span>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:15, color:C.navy }}>SECRETARIA</div>
              <div style={{ fontWeight:900, fontSize:12, color:C.green, fontStyle:"italic" }}>— SEM FILA —</div>
            </div>
          </div>

          {modo === "cancelar" && <ModoCancelar token={token} onVoltar={modoInicial === "consulta" ? voltarParaConsulta : onVoltar} />}
          {modo === "reagendar" && <ModoReagendar token={token} onVoltar={modoInicial === "consulta" ? voltarParaConsulta : onVoltar} />}
          {modo === "consulta" && (
            <ModoConsulta
              onVoltar={onVoltar}
              onCancelar={irParaCancelar}
              onReagendar={irParaReagendar}
            />
          )}
        </div>
      </div>
    </div>
  );
}
