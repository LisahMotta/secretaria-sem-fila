import { useState, useEffect } from "react";
import { buscarEstatisticas } from "../api.js";

const C = {
  navy:"#1B3A6B", navyDk:"#122850", green:"#2E8B3A", greenLt:"#3aaa48",
  orange:"#E87820", white:"#FFFFFF", gray100:"#EEF2F7", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D",
  red:"#DC2626", bg:"#F4F7FB",
};

const SERVICE_EMOJI = {
  historico:"📄", declaracao:"📋", passe:"🚌", documentos:"📁", outros:"💬",
};

function Card({ label, value, sub, color = C.navy, bg = "#EBF0F9" }) {
  return (
    <div style={{ background:bg, borderRadius:14, padding:"16px 14px", textAlign:"center" }}>
      <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:800, color, marginTop:4, letterSpacing:"0.5px" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.gray400, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxVal, color = C.navy, height = 80 }) {
  if (!data || data.length === 0) return (
    <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:C.gray400 }}>
      Sem dados ainda
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height, padding:"0 4px" }}>
      {data.map((item, i) => {
        const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
        const barH = Math.max(4, (pct / 100) * height);
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}
            title={`${item.label || item.dia || item.slot}: ${item.total}`}>
            <div style={{ fontSize:10, color:C.gray400, fontWeight:700 }}>{item.total}</div>
            <div style={{ width:"100%", height:barH, background:color, borderRadius:"4px 4px 0 0",
              opacity: 0.7 + (pct/100)*0.3, transition:"height 0.4s ease" }} />
            <div style={{ fontSize:9, color:C.gray400, textAlign:"center",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              maxWidth:"100%", fontWeight:600 }}>
              {(item.label || item.dia || item.slot || "").split(" ")[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, height = 100 }) {
  if (!data || data.length < 2) return (
    <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:C.gray400 }}>
      Dados insuficientes (mínimo 2 dias)
    </div>
  );
  const vals = data.map(d => parseInt(d.total));
  const maxV = Math.max(...vals, 1);
  const w = 100 / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * w,
    y: height - 12 - ((parseInt(d.total) / maxV) * (height - 24)),
    label: d.dia,
    val: d.total,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length-1].x} ${height} L 0 ${height} Z`;

  return (
    <div style={{ position:"relative" }}>
      <svg width="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
        style={{ overflow:"visible" }}>
        <path d={areaD} fill={C.navy} fillOpacity="0.08" stroke="none" />
        <path d={pathD} fill="none" stroke={C.navy} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={C.navy} />
        ))}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {data.length <= 10
          ? data.map((d, i) => (
            <span key={i} style={{ fontSize:9, color:C.gray400, flex:1, textAlign:"center" }}>{d.dia}</span>
          ))
          : [data[0], data[Math.floor(data.length/2)], data[data.length-1]].map((d, i) => (
            <span key={i} style={{ fontSize:9, color:C.gray400 }}>{d.dia}</span>
          ))
        }
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState("");
  const [periodo, setPeriodo]   = useState(30);

  useEffect(() => {
    setLoading(true);
    buscarEstatisticas()
      .then(data => { setStats(data); setLoading(false); })
      .catch(e => { setErro(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:C.gray400, fontSize:14 }}>
      Carregando estatísticas...
    </div>
  );

  if (erro) return (
    <div style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.3)",
      borderRadius:12, padding:16, color:C.red, fontSize:13 }}>
      ⚠️ {erro}
    </div>
  );

  if (!stats) return null;

  const { totais, porDia, porServico, porHorario, taxa, semanas } = stats;
  const total = parseInt(totais.total) || 0;
  const concluidos = parseInt(totais.concluidos) || 0;
  const cancelados = parseInt(totais.cancelados) || 0;
  const pendentes = parseInt(totais.pendentes) || 0;
  const confirmados = parseInt(totais.confirmados) || 0;
  const finalizados = parseInt(taxa.finalizados) || 0;
  const taxaConclusao = finalizados > 0 ? Math.round((parseInt(taxa.concluidos) / finalizados) * 100) : 0;
  const semAtual = parseInt(semanas.semana_atual) || 0;
  const semAnterior = parseInt(semanas.semana_anterior) || 0;
  const variacaoSem = semAnterior > 0 ? Math.round(((semAtual - semAnterior) / semAnterior) * 100) : null;
  const maxServico = Math.max(...porServico.map(s => s.total), 1);
  const maxHorario = Math.max(...porHorario.map(h => parseInt(h.total)), 1);
  const diasFiltrados = porDia.slice(-(periodo));
  const maxDia = Math.max(...diasFiltrados.map(d => parseInt(d.total)), 1);

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>

      {/* Título */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:C.navy }}>Dashboard</div>
          <div style={{ fontSize:13, color:C.gray400 }}>Visão geral de todos os agendamentos</div>
        </div>
        <div style={{ background:"#EBF0F9", borderRadius:10, padding:"4px",
          display:"flex", gap:4 }}>
          {[7, 15, 30].map(d => (
            <button key={d} onClick={() => setPeriodo(d)}
              style={{ background: periodo===d ? C.navy : "transparent",
                color: periodo===d ? "#fff" : C.gray600,
                border:"none", borderRadius:8, padding:"5px 12px",
                fontSize:12, fontWeight:800, cursor:"pointer",
                fontFamily:"'Nunito',sans-serif", transition:"all 0.15s" }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Cards de métricas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:20 }}>
        <Card label="Total de agendamentos" value={total} bg="#EBF0F9" color={C.navy}
          sub={variacaoSem !== null ? `${variacaoSem >= 0 ? "+" : ""}${variacaoSem}% vs semana ant.` : ""}/>
        <Card label="Pendentes hoje" value={pendentes} bg="#FEF3EC" color={C.orange}
          sub={confirmados > 0 ? `${confirmados} confirmado${confirmados>1?"s":""}` : "Nenhum confirmado"} />
        <Card label="Concluídos" value={concluidos} bg="#EBF5EC" color={C.green}
          sub={`Taxa: ${taxaConclusao}%`} />
        <Card label="Cancelados" value={cancelados} bg="#FEF0EE" color={C.red}
          sub={total > 0 ? `${Math.round((cancelados/total)*100)}% do total` : ""} />
      </div>

      {/* Gráfico de linha — agendamentos por dia */}
      <div style={{ background:C.white, border:`2px solid ${C.gray200}`,
        borderRadius:16, padding:"16px", marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:800, color:C.navy, letterSpacing:"1px",
          textTransform:"uppercase", marginBottom:14 }}>
          Agendamentos nos últimos {periodo} dias
        </div>
        {diasFiltrados.length > 0 ? (
          <>
            <LineChart data={diasFiltrados} height={90} />
            <div style={{ display:"flex", justifyContent:"space-between",
              marginTop:12, paddingTop:10, borderTop:`1px solid ${C.gray100}` }}>
              <div style={{ fontSize:12, color:C.gray600 }}>
                Esta semana: <strong style={{ color:C.navy }}>{semAtual}</strong>
              </div>
              <div style={{ fontSize:12, color:C.gray600 }}>
                Semana anterior: <strong style={{ color:C.gray600 }}>{semAnterior}</strong>
              </div>
              {variacaoSem !== null && (
                <div style={{ fontSize:12, fontWeight:800,
                  color: variacaoSem >= 0 ? C.green : C.red }}>
                  {variacaoSem >= 0 ? "▲" : "▼"} {Math.abs(variacaoSem)}%
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:C.gray400 }}>
            Sem dados no período selecionado
          </div>
        )}
      </div>

      {/* Por serviço */}
      <div style={{ background:C.white, border:`2px solid ${C.gray200}`,
        borderRadius:16, padding:"16px", marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:800, color:C.navy, letterSpacing:"1px",
          textTransform:"uppercase", marginBottom:14 }}>
          Por serviço
        </div>
        {porServico.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {porServico.map((s, i) => {
              const pct = Math.round((s.total / total) * 100) || 0;
              return (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:4, alignItems:"center" }}>
                    <span style={{ fontSize:13, color:C.gray800, display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ fontSize:16 }}>{SERVICE_EMOJI[s.service] || "📋"}</span>
                      {s.label}
                    </span>
                    <span style={{ fontSize:13, fontWeight:800, color:C.navy }}>
                      {s.total} <span style={{ fontSize:11, color:C.gray400, fontWeight:600 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height:8, background:C.gray100, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, borderRadius:4,
                      background:`linear-gradient(90deg,${C.navy},${C.green})`,
                      transition:"width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"16px 0", fontSize:13, color:C.gray400 }}>
            Sem dados ainda
          </div>
        )}
      </div>

      {/* Horários mais procurados */}
      {porHorario.length > 0 && (
        <div style={{ background:C.white, border:`2px solid ${C.gray200}`,
          borderRadius:16, padding:"16px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.navy, letterSpacing:"1px",
            textTransform:"uppercase", marginBottom:14 }}>
            Horários mais procurados
          </div>
          <BarChart
            data={porHorario.map(h => ({ ...h, total: parseInt(h.total), label: h.slot }))}
            maxVal={maxHorario}
            color={C.orange}
            height={80}
          />
        </div>
      )}

      {/* Taxa de conclusão */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyDk})`,
        borderRadius:16, padding:"18px 16px", color:"#fff" }}>
        <div style={{ fontSize:12, fontWeight:800, letterSpacing:"1px",
          textTransform:"uppercase", marginBottom:12, color:"rgba(255,255,255,0.6)" }}>
          Taxa de conclusão
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:40, fontWeight:900, color:C.green === "#2E8B3A" ? "#3aaa48" : C.green }}>
            {taxaConclusao}%
          </div>
          <div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", marginBottom:4 }}>
              {parseInt(taxa.concluidos)} de {finalizados} atendimentos finalizados foram concluídos
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,0.15)", borderRadius:4, overflow:"hidden", width:200 }}>
              <div style={{ height:"100%", width:`${taxaConclusao}%`, borderRadius:4,
                background:"#3aaa48", transition:"width 0.6s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { listarAgendamentos, atualizarStatus } from "../api.js";
import { registrarPushSecretaria } from "../push.js";
import { removeToken, getNome, trocarSenha } from "../auth.js";
import Dashboard from "./Dashboard.jsx";

const C = {
  navy:"#1B3A6B", green:"#2E8B3A", orange:"#E87820",
  white:"#FFFFFF", gray100:"#EEF2F7", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D",
  red:"#DC2626", bg:"#F4F7FB",
};

const STATUS_CONFIG = {
  pendente:   { label:"Pendente",   bg:"#FEF3EC", color:C.orange, border:"rgba(232,120,32,0.4)"  },
  confirmado: { label:"Confirmado", bg:"#EBF5EC", color:C.green,  border:"rgba(46,139,58,0.4)"   },
  cancelado:  { label:"Cancelado",  bg:"#FEF0EE", color:C.red,    border:"rgba(220,38,38,0.3)"   },
  concluido:  { label:"Concluido",  bg:"#EBF0F9", color:C.navy,   border:"rgba(27,58,107,0.3)"   },
};

const SERVICE_LABEL = {
  historico:"Historico Escolar", declaracao:"Declaracao de Matricula",
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
  const [aba, setAba]                   = useState("agendamentos");
  const [modalSenha, setModalSenha]     = useState(false);
  const [senhaAtual, setSenhaAtual]     = useState("");
  const [novaSenha, setNovaSenha]       = useState("");
  const [erroSenha, setErroSenha]       = useState("");
  const [okSenha, setOkSenha]           = useState("");
  const [busca, setBusca]               = useState("");
  const nome = getNome();

  function handleLogout() { removeToken(); onVoltar(); }

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    try {
      const dados = await listarAgendamentos({ data: filtroData, status: filtroStatus || undefined });
      setAgendamentos(dados);
    } catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }, [filtroData, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  async function handlePush() { setPushAtivo(await registrarPushSecretaria()); }

  async function handleStatus(id, novoStatus) {
    setAtualizando(id);
    try {
      await atualizarStatus(id, novoStatus);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a));
    } catch (e) { alert("Erro ao atualizar: " + e.message); }
    finally { setAtualizando(null); }
  }

  const contadores = Object.fromEntries(
    ["pendente","confirmado","cancelado","concluido"].map(s => [
      s, agendamentos.filter(a => a.status === s).length
    ])
  );

  const termoBusca = busca.trim().toLowerCase();
  const agendamentosFiltrados = termoBusca
    ? agendamentos.filter(a => {
        const r = typeof a.responsible === "string" ? JSON.parse(a.responsible) : a.responsible;
        const al = a.student ? (typeof a.student === "string" ? JSON.parse(a.student) : a.student) : null;
        return (
          a.protocol?.toLowerCase().includes(termoBusca) ||
          r?.name?.toLowerCase().includes(termoBusca) ||
          r?.phone?.replace(/\D/g,"").includes(termoBusca.replace(/\D/g,"")) ||
          al?.name?.toLowerCase().includes(termoBusca)
        );
      })
    : agendamentos;

  function destacar(texto) {
    if (!termoBusca || !texto) return texto;
    const idx = texto.toLowerCase().indexOf(termoBusca);
    if (idx === -1) return texto;
    return (
      <span>
        {texto.slice(0, idx)}
        <mark style={{ background:"#FEF08A", borderRadius:3, padding:"0 2px" }}>
          {texto.slice(idx, idx + termoBusca.length)}
        </mark>
        {texto.slice(idx + termoBusca.length)}
      </span>
    );
  }

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:C.bg }}>

      <div style={{ background:C.white, borderBottom:"3px solid " + C.green,
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
              border:"2px solid " + (pushAtivo ? C.green : C.orange),
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:800,
              cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
            {pushAtivo ? "🔔 Push ativo" : "🔕 Ativar push"}
          </button>
          <button onClick={() => setModalSenha(true)}
            style={{ background:"transparent", border:"2px solid " + C.gray200,
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700,
              cursor:"pointer", color:C.gray600, fontFamily:"'Nunito',sans-serif" }}>
            🔑 Senha
          </button>
          <button onClick={handleLogout}
            style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.3)",
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700,
              cursor:"pointer", color:C.red, fontFamily:"'Nunito',sans-serif" }}>
            Sair
          </button>
        </div>
      </div>

      {modalSenha && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background:C.white, borderRadius:20, padding:"28px 24px",
            width:"100%", maxWidth:380, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight:900, fontSize:18, color:C.navy, marginBottom:20 }}>🔑 Trocar senha</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Senha atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                placeholder="Senha atual"
                style={{ width:"100%", border:"2px solid " + C.gray200, borderRadius:10,
                  padding:"11px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
                  color:C.gray800, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Nova senha (min. 6 caracteres)</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                placeholder="Nova senha"
                style={{ width:"100%", border:"2px solid " + C.gray200, borderRadius:10,
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
                  border:"2px solid " + C.gray200, borderRadius:10, padding:"11px",
                  fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 16px 60px" }}>

        <div style={{ display:"flex", gap:4, marginBottom:20,
          background:"#EBF0F9", borderRadius:12, padding:4 }}>
          {[
            { id:"agendamentos", label:"📋 Agendamentos" },
            { id:"dashboard",   label:"📊 Dashboard" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setAba(tab.id)}
              style={{ flex:1, background: aba===tab.id ? C.navy : "transparent",
                color: aba===tab.id ? "#fff" : C.gray600,
                border:"none", borderRadius:9, padding:"9px 12px",
                fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:800,
                cursor:"pointer", transition:"all 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {aba === "dashboard" && <Dashboard />}

        {aba === "agendamentos" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:20 }}>
              {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                <div key={s} style={{ background:cfg.bg, border:"2px solid " + cfg.border,
                  borderRadius:12, padding:"12px 10px", textAlign:"center", cursor:"pointer",
                  outline: filtroStatus === s ? "3px solid " + cfg.color : "none" }}
                  onClick={() => setFiltroStatus(filtroStatus === s ? "" : s)}>
                  <div style={{ fontSize:22, fontWeight:900, color:cfg.color }}>{contadores[s]}</div>
                  <div style={{ fontSize:11, fontWeight:800, color:cfg.color }}>{cfg.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ fontSize:13, fontWeight:700, color:C.gray600 }}>Data:</label>
              <input type="date" value={filtroData}
                onChange={e => setFiltroData(e.target.value)}
                style={{ border:"2px solid " + C.gray200, borderRadius:10, padding:"8px 12px",
                  fontSize:14, fontFamily:"'Nunito',sans-serif", color:C.gray800, outline:"none" }} />
              <button onClick={carregar}
                style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
                  padding:"8px 18px", fontSize:13, fontWeight:800, cursor:"pointer",
                  fontFamily:"'Nunito',sans-serif" }}>
                Atualizar
              </button>
              <button onClick={() => setFiltroData("")}
                style={{ background:"transparent", color:C.gray600, border:"2px solid " + C.gray200,
                  borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer",
                  fontFamily:"'Nunito',sans-serif" }}>
                Todos
              </button>
            </div>

            <div style={{ position:"relative", marginBottom:20 }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                fontSize:16, pointerEvents:"none" }}>🔍</span>
              <input type="text"
                placeholder="Buscar por protocolo, nome, aluno ou telefone..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{ width:"100%", border:"2px solid " + (busca ? C.navy : C.gray200),
                  borderRadius:12, padding:"11px 40px",
                  fontFamily:"'Nunito',sans-serif", fontSize:14, color:C.gray800,
                  outline:"none", boxSizing:"border-box",
                  background: busca ? "#F0F4FF" : C.white }} />
              {busca && (
                <button onClick={() => setBusca("")}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16,
                    color:C.gray400, padding:0 }}>
                  ✕
                </button>
              )}
            </div>

            {busca && (
              <div style={{ fontSize:13, color:C.gray600, marginBottom:12, fontWeight:700 }}>
                {agendamentosFiltrados.length === 0
                  ? "Nenhum resultado encontrado"
                  : agendamentosFiltrados.length + " resultado" + (agendamentosFiltrados.length > 1 ? "s" : "") + " para \"" + busca + "\""}
              </div>
            )}

            {carregando && (
              <div style={{ textAlign:"center", padding:40, color:C.gray400, fontSize:14 }}>
                Carregando...
              </div>
            )}
            {erro && (
              <div style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.3)",
                borderRadius:12, padding:16, color:C.red, fontSize:14, marginBottom:16 }}>
                ⚠️ {erro}
              </div>
            )}
            {!carregando && !erro && agendamentosFiltrados.length === 0 && (
              <div style={{ textAlign:"center", padding:40, color:C.gray400, fontSize:14 }}>
                {busca ? "Nenhum resultado para \"" + busca + "\"" : "Nenhum agendamento encontrado."}
              </div>
            )}

            {agendamentosFiltrados.map(a => {
              const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
              const responsavel = typeof a.responsible === "string" ? JSON.parse(a.responsible) : a.responsible;
              const aluno = a.student ? (typeof a.student === "string" ? JSON.parse(a.student) : a.student) : null;
              return (
                <div key={a.id}
                  style={{ background:C.white, border:"2px solid " + C.gray200,
                    borderRadius:16, padding:"16px", marginBottom:12,
                    borderLeft:"4px solid " + cfg.color }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ fontSize:22 }}>{SERVICE_EMOJI[a.service] || "📋"}</span>
                      <div>
                        <div style={{ fontWeight:900, fontSize:15, color:C.navy }}>
                          {SERVICE_LABEL[a.service] || a.service}
                        </div>
                        <div style={{ fontSize:12, color:C.gray400 }}>
                          {a.date ? a.date + (a.slot ? " as " + a.slot : "") : "Sem data definida"}
                        </div>
                      </div>
                    </div>
                    <div style={{ background:cfg.bg, color:cfg.color,
                      border:"2px solid " + cfg.border, borderRadius:8,
                      padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                      {cfg.label}
                    </div>
                  </div>

                  <div style={{ fontSize:13, color:C.gray600, marginBottom:8 }}>
                    <strong style={{ color:C.gray800 }}>Responsavel:</strong> {destacar(responsavel?.name)} · {responsavel?.phone}
                  </div>
                  {aluno && (
                    <div style={{ fontSize:13, color:C.gray600, marginBottom:8 }}>
                      <strong style={{ color:C.gray800 }}>Aluno:</strong> {destacar(aluno.name)} · {aluno.grade}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:C.gray400, marginBottom:12 }}>
                    Protocolo: <strong style={{ color:C.navy }}>{destacar(a.protocol)}</strong>
                  </div>

                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {a.status === "pendente" && (
                      <button disabled={atualizando === a.id}
                        onClick={() => handleStatus(a.id, "confirmado")}
                        style={{ background:"#EBF5EC", color:C.green, border:"2px solid " + C.green,
                          borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                          cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                        Confirmar
                      </button>
                    )}
                    {a.status === "confirmado" && (
                      <button disabled={atualizando === a.id}
                        onClick={() => handleStatus(a.id, "concluido")}
                        style={{ background:"#EBF0F9", color:C.navy, border:"2px solid " + C.navy,
                          borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                          cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                        Concluir
                      </button>
                    )}
                    {(a.status === "pendente" || a.status === "confirmado") && (
                      <button disabled={atualizando === a.id}
                        onClick={() => handleStatus(a.id, "cancelado")}
                        style={{ background:"#FEF0EE", color:C.red, border:"2px solid " + C.red,
                          borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                          cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
import { useState } from "react";
import { login } from "../auth.js";

const C = {
  navy:"#1B3A6B", navyDk:"#122850", green:"#2E8B3A", greenLt:"#3aaa48",
  orange:"#E87820", white:"#FFFFFF", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D",
  red:"#DC2626", bg:"#F4F7FB",
};

export default function TelaLogin({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!usuario.trim() || !senha) {
      setErro("Preencha usuário e senha.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      const data = await login(usuario.trim(), senha);
      onLogin(data.nome);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:C.white, borderBottom:`3px solid ${C.green}`,
        padding:"12px 20px", display:"flex", alignItems:"center",
        boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <div>
          <div style={{ fontWeight:900, fontSize:17, color:C.navy }}>SECRETARIA</div>
          <div style={{ fontWeight:900, fontSize:13, color:C.green, fontStyle:"italic" }}>— SEM FILA —</div>
        </div>
      </div>

      {/* Card de login */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {/* Ícone */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ width:72, height:72, background:C.navy, borderRadius:20,
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 8px 24px rgba(27,58,107,0.25)`, marginBottom:16 }}>
              <span style={{ fontSize:34 }}>🔒</span>
            </div>
            <div style={{ fontWeight:900, fontSize:22, color:C.navy, marginBottom:4 }}>
              Painel da Secretaria
            </div>
            <div style={{ fontSize:14, color:C.gray400 }}>
              Acesso restrito — apenas funcionários autorizados
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit}
            style={{ background:C.white, border:`2px solid ${C.gray200}`,
              borderRadius:20, padding:"28px 24px",
              boxShadow:"0 4px 20px rgba(27,58,107,0.08)" }}>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600,
                display:"block", marginBottom:6 }}>
                Usuário
              </label>
              <input
                type="text"
                placeholder="Ex: secretaria"
                value={usuario}
                autoComplete="username"
                autoFocus
                onChange={e => setUsuario(e.target.value)}
                style={{ width:"100%", background:C.white, border:`2px solid ${C.gray200}`,
                  borderRadius:12, padding:"13px 16px",
                  fontFamily:"'Nunito',sans-serif", fontSize:15, color:C.gray800,
                  outline:"none", boxSizing:"border-box",
                  transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = C.navy}
                onBlur={e => e.target.style.borderColor = C.gray200}
              />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600,
                display:"block", marginBottom:6 }}>
                Senha
              </label>
              <div style={{ position:"relative" }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Sua senha"
                  value={senha}
                  autoComplete="current-password"
                  onChange={e => setSenha(e.target.value)}
                  style={{ width:"100%", background:C.white, border:`2px solid ${C.gray200}`,
                    borderRadius:12, padding:"13px 48px 13px 16px",
                    fontFamily:"'Nunito',sans-serif", fontSize:15, color:C.gray800,
                    outline:"none", boxSizing:"border-box",
                    transition:"border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = C.gray200}
                />
                <button type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:18,
                    color:C.gray400, padding:0 }}>
                  {mostrarSenha ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.25)",
                borderRadius:10, padding:"10px 14px", marginBottom:16,
                fontSize:13, color:C.red, fontWeight:700 }}>
                ⚠️ {erro}
              </div>
            )}

            {/* Botão */}
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:`linear-gradient(135deg,${C.navy},${C.navyDk})`,
                color:"#fff", border:"none", borderRadius:14, padding:"15px",
                fontFamily:"'Nunito',sans-serif", fontSize:16, fontWeight:800,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"all 0.2s",
                boxShadow:"0 4px 14px rgba(27,58,107,0.3)" }}>
              {loading ? (
                <>
                  <span style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.4)",
                    borderTopColor:"#fff", borderRadius:"50%", display:"inline-block",
                    animation:"spin 0.7s linear infinite" }} />
                  Entrando...
                </>
              ) : "🔑 Entrar no painel"}
            </button>
          </form>

          {/* Dica */}
          <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:C.gray400 }}>
            Primeiro acesso? Usuário: <strong style={{ color:C.navy }}>secretaria</strong>
            {" "}· Senha definida pelo administrador
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
