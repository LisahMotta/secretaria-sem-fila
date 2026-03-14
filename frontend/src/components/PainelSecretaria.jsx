import { useState, useEffect, useCallback } from "react";
import { listarAgendamentos, atualizarStatus } from "../api.js";
import { registrarPushSecretaria } from "../push.js";
import { removeToken, getNome, trocarSenha } from "../auth.js";

const C = {
  navy:"#1B3A6B", green:"#2E8B3A", orange:"#E87820",
  white:"#FFFFFF", gray100:"#EEF2F7", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D",
  red:"#DC2626", bg:"#F4F7FB",
};

const STATUS_CONFIG = {
  pendente:   { label:"Pendente",   bg:"#FEF3EC", color:C.orange,  border:"rgba(232,120,32,0.4)"  },
  confirmado: { label:"Confirmado", bg:"#EBF5EC", color:C.green,   border:"rgba(46,139,58,0.4)"   },
  cancelado:  { label:"Cancelado",  bg:"#FEF0EE", color:C.red,     border:"rgba(220,38,38,0.3)"   },
  concluido:  { label:"Concluído",  bg:"#EBF0F9", color:C.navy,    border:"rgba(27,58,107,0.3)"   },
};

const SERVICE_LABEL = {
  historico:"Histórico Escolar", declaracao:"Declaração de Matrícula",
  passe:"Passe Escolar", documentos:"Entrega de Documentos", outros:"Outros Atendimentos",
};
const SERVICE_EMOJI = {
  historico:"📄", declaracao:"📋", passe:"🚌", documentos:"📁", outros:"💬",
};

export default function PainelSecretaria({ onVoltar }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtroData, setFiltroData]     = useState(new Date().toISOString().split("T")[0]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando]     = useState(true);
  const [erro, setErro]                 = useState("");
  const [pushAtivo, setPushAtivo]       = useState(false);
  const [atualizando, setAtualizando]   = useState(null);
  const [modalSenha, setModalSenha]     = useState(false);
  const [senhaAtual, setSenhaAtual]     = useState("");
  const [novaSenha, setNovaSenha]       = useState("");
  const [erroSenha, setErroSenha]       = useState("");
  const [okSenha, setOkSenha]           = useState("");
  const nome = getNome();

  function handleLogout() {
    removeToken();
    onVoltar();
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const dados = await listarAgendamentos({ data: filtroData, status: filtroStatus || undefined });
      setAgendamentos(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtroData, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  async function handlePush() {
    const ok = await registrarPushSecretaria();
    setPushAtivo(ok);
  }

  async function handleStatus(id, novoStatus) {
    setAtualizando(id);
    try {
      await atualizarStatus(id, novoStatus);
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: novoStatus } : a)
      );
    } catch (e) {
      alert("Erro ao atualizar: " + e.message);
    } finally {
      setAtualizando(null);
    }
  }

  const contadores = Object.fromEntries(
    ["pendente","confirmado","cancelado","concluido"].map(s => [
      s, agendamentos.filter(a => a.status === s).length
    ])
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:C.bg }}>

      {/* Header */}
      <div style={{ background:C.white, borderBottom:`3px solid ${C.green}`,
        padding:"12px 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <div>
          <div style={{ fontWeight:900, fontSize:17, color:C.navy }}>SECRETARIA</div>
          <div style={{ fontWeight:900, fontSize:13, color:C.green, fontStyle:"italic" }}>— PAINEL —</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handlePush}
            style={{ background: pushAtivo ? "#EBF5EC" : "#FEF3EC",
              color: pushAtivo ? C.green : C.orange,
              border:`2px solid ${pushAtivo ? C.green : C.orange}`,
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:800,
              cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
            {pushAtivo ? "🔔 Push ativo" : "🔕 Ativar push"}
          </button>
          <button onClick={() => setModalSenha(true)}
            style={{ background:"transparent", border:`2px solid ${C.gray200}`,
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700,
              cursor:"pointer", color:C.gray600, fontFamily:"'Nunito',sans-serif" }}>
            🔑 Senha
          </button>
          <button onClick={handleLogout}
            style={{ background:"#FEF0EE", border:`2px solid rgba(220,38,38,0.3)`,
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700,
              cursor:"pointer", color:C.red, fontFamily:"'Nunito',sans-serif" }}>
            Sair
          </button>
        </div>
      </div>

      {/* Modal trocar senha */}
      {modalSenha && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background:C.white, borderRadius:20, padding:"28px 24px",
            width:"100%", maxWidth:380, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:20 }}>
              🔑 Trocar senha
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Senha atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                placeholder="Senha atual"
                style={{ width:"100%", border:`2px solid ${C.gray200}`, borderRadius:10,
                  padding:"11px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
                  color:C.gray800, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Nova senha (mín. 6 caracteres)</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                placeholder="Nova senha"
                style={{ width:"100%", border:`2px solid ${C.gray200}`, borderRadius:10,
                  padding:"11px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
                  color:C.gray800, outline:"none", boxSizing:"border-box" }} />
            </div>
            {erroSenha && <div style={{ color:C.red, fontSize:13, marginBottom:10 }}>⚠️ {erroSenha}</div>}
            {okSenha   && <div style={{ color:C.green, fontSize:13, marginBottom:10 }}>✅ {okSenha}</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={async () => {
                setErroSenha(""); setOkSenha("");
                try {
                  await trocarSenha(senhaAtual, novaSenha);
                  setOkSenha("Senha alterada com sucesso!");
                  setSenhaAtual(""); setNovaSenha("");
                  setTimeout(() => setModalSenha(false), 1500);
                } catch (e) { setErroSenha(e.message); }
              }}
                style={{ flex:1, background:C.navy, color:"#fff", border:"none",
                  borderRadius:10, padding:"11px", fontFamily:"'Nunito',sans-serif",
                  fontSize:14, fontWeight:800, cursor:"pointer" }}>
                Salvar
              </button>
              <button onClick={() => { setModalSenha(false); setErroSenha(""); setOkSenha(""); setSenhaAtual(""); setNovaSenha(""); }}
                style={{ flex:1, background:"transparent", color:C.gray600,
                  border:`2px solid ${C.gray200}`, borderRadius:10, padding:"11px",
                  fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Contadores */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:20 }}>
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <div key={s} style={{ background:cfg.bg, border:`2px solid ${cfg.border}`,
              borderRadius:12, padding:"12px 10px", textAlign:"center", cursor:"pointer",
              outline: filtroStatus === s ? `3px solid ${cfg.color}` : "none" }}
              onClick={() => setFiltroStatus(filtroStatus === s ? "" : s)}>
              <div style={{ fontSize:22, fontWeight:900, color:cfg.color }}>{contadores[s]}</div>
              <div style={{ fontSize:11, fontWeight:800, color:cfg.color }}>{cfg.label}</div>
            </div>
          ))}
        </div>

        {/* Filtro de data */}
        <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
          <label style={{ fontSize:13, fontWeight:700, color:C.gray600 }}>Data:</label>
          <input type="date" value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            style={{ border:`2px solid ${C.gray200}`, borderRadius:10, padding:"8px 12px",
              fontSize:14, fontFamily:"'Nunito',sans-serif", color:C.gray800, outline:"none" }} />
          <button onClick={carregar}
            style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
              padding:"8px 18px", fontSize:13, fontWeight:800, cursor:"pointer",
              fontFamily:"'Nunito',sans-serif" }}>
            Atualizar
          </button>
          <button onClick={() => setFiltroData("")}
            style={{ background:"transparent", color:C.gray600, border:`2px solid ${C.gray200}`,
              borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer",
              fontFamily:"'Nunito',sans-serif" }}>
            Todos
          </button>
        </div>

        {/* Lista */}
        {carregando && (
          <div style={{ textAlign:"center", padding:40, color:C.gray400, fontSize:14 }}>
            Carregando...
          </div>
        )}
        {erro && (
          <div style={{ background:"#FEF0EE", border:`2px solid rgba(220,38,38,0.3)`,
            borderRadius:12, padding:16, color:C.red, fontSize:14, marginBottom:16 }}>
            ⚠️ {erro}
          </div>
        )}
        {!carregando && !erro && agendamentos.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:C.gray400, fontSize:14 }}>
            Nenhum agendamento encontrado.
          </div>
        )}

        {agendamentos.map(a => {
          const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
          const responsavel = typeof a.responsible === "string"
            ? JSON.parse(a.responsible) : a.responsible;
          const aluno = a.student
            ? (typeof a.student === "string" ? JSON.parse(a.student) : a.student)
            : null;
          return (
            <div key={a.id}
              style={{ background:C.white, border:`2px solid ${C.gray200}`,
                borderRadius:16, padding:"16px", marginBottom:12,
                borderLeft:`4px solid ${cfg.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>{SERVICE_EMOJI[a.service] || "📋"}</span>
                  <div>
                    <div style={{ fontWeight:900, fontSize:15, color:C.navy }}>
                      {SERVICE_LABEL[a.service] || a.service}
                    </div>
                    <div style={{ fontSize:12, color:C.gray400 }}>
                      {a.date ? a.date + (a.slot ? " às " + a.slot : "") : "Sem data definida"}
                    </div>
                  </div>
                </div>
                <div style={{ background:cfg.bg, color:cfg.color,
                  border:`2px solid ${cfg.border}`, borderRadius:8,
                  padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                  {cfg.label}
                </div>
              </div>

              <div style={{ fontSize:13, color:C.gray600, marginBottom:8 }}>
                <strong style={{ color:C.gray800 }}>Responsável:</strong> {responsavel?.name} · {responsavel?.phone}
              </div>
              {aluno && (
                <div style={{ fontSize:13, color:C.gray600, marginBottom:8 }}>
                  <strong style={{ color:C.gray800 }}>Aluno:</strong> {aluno.name} · {aluno.grade}
                </div>
              )}
              <div style={{ fontSize:11, color:C.gray400, marginBottom:12 }}>
                Protocolo: <strong style={{ color:C.navy }}>{a.protocol}</strong>
              </div>

              {/* Ações */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {a.status === "pendente" && (
                  <button disabled={atualizando === a.id}
                    onClick={() => handleStatus(a.id, "confirmado")}
                    style={{ background:"#EBF5EC", color:C.green, border:`2px solid ${C.green}`,
                      borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                      cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                    ✓ Confirmar
                  </button>
                )}
                {a.status === "confirmado" && (
                  <button disabled={atualizando === a.id}
                    onClick={() => handleStatus(a.id, "concluido")}
                    style={{ background:"#EBF0F9", color:C.navy, border:`2px solid ${C.navy}`,
                      borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                      cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                    ✅ Concluir
                  </button>
                )}
                {(a.status === "pendente" || a.status === "confirmado") && (
                  <button disabled={atualizando === a.id}
                    onClick={() => handleStatus(a.id, "cancelado")}
                    style={{ background:"#FEF0EE", color:C.red, border:`2px solid ${C.red}`,
                      borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                      cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                    ✕ Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
