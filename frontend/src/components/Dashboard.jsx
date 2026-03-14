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
