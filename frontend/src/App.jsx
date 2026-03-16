import { useState, useEffect } from "react";
import PainelSecretaria from "./components/PainelSecretaria.jsx";
import TelaLogin from "./components/TelaLogin.jsx";
import ConsultaAgendamento from "./components/ConsultaAgendamento.jsx";
import { criarAgendamento, buscarSlotsOcupados } from "./api.js";
import { estaLogado } from "./auth.js";

const C = {
  navy:"#1B3A6B", navyDk:"#122850", green:"#2E8B3A", greenLt:"#3aaa48",
  orange:"#E87820", bg:"#F4F7FB", white:"#FFFFFF",
  gray50:"#F8FAFC", gray100:"#EEF2F7", gray200:"#D8E2EE",
  gray400:"#8EA5C0", gray600:"#4A6080", gray800:"#1E2D3D", red:"#DC2626",
};

const SERVICES = [
  { id:"historico",  emoji:"📄", title:"Histórico Escolar",       desc:"Solicitação de histórico escolar",               time:null,     docs:[] },
  { id:"declaracao", emoji:"📋", title:"Declaração de Matrícula", desc:"Comprovação de vínculo do aluno",                time:"10 min", docs:["RG do responsável"] },
  { id:"passe",      emoji:"🚌", title:"Passe Escolar",           desc:"Informe à secretaria que já fez o cadastro no Consórcio 123 e aguarda aprovação", time:null, docs:[] },
  { id:"boletim",    emoji:"📊", title:"Boletim Escolar",         desc:"Acesse online pela Sala do Futuro",              time:null,     docs:[], external:true, externalUrl:"https://saladofuturo.educacao.sp.gov.br/escolha-de-perfil" },
  { id:"documentos", emoji:"📁", title:"Entrega de Documentos",   desc:"Protocolo de documentos para a secretaria",     time:"15 min", docs:["Documentos a entregar"] },
  { id:"outros",     emoji:"💬", title:"Outros Atendimentos",     desc:"Reunião com direção, coordenação e outros",      time:null,     docs:[] },
];

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

const fmtDay  = d => d.toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short" });
const fmtFull = d => d.toLocaleDateString("pt-BR", { weekday:"long",  day:"2-digit", month:"long", year:"numeric" });
const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length:20 }, (_, i) => String(CUR_YEAR - i));

const DOC_TYPES = [
  { id:"atestado_medico",     emoji:"🏥", label:"Atestado Médico",         desc:"Justificativa de falta por motivo de saúde" },
  { id:"comprovante_end",     emoji:"🏠", label:"Comprovante de Endereço",  desc:"Atualização cadastral do aluno" },
  { id:"certidao_nascimento", emoji:"📜", label:"Certidão de Nascimento",   desc:"Atualização de documentação pessoal" },
  { id:"laudo_medico",        emoji:"🩺", label:"Laudo / Relatório Médico", desc:"Necessidades especiais ou adaptações" },
  { id:"doc_identidade",      emoji:"🪪", label:"Documento de Identidade",  desc:"RG/CPF — Atualização cadastral" },
  { id:"outros_docs",         emoji:"📎", label:"Outros Documentos",        desc:"Documentos não listados acima" },
];
const DOC_LABEL = Object.fromEntries(DOC_TYPES.map(d => [d.id, d.label]));

const ASSUNTOS = [
  { id:"direcao",      label:"Reunião com a Direção",     emoji:"🏫" },
  { id:"coordenacao",  label:"Reunião com a Coordenação", emoji:"📐" },
  { id:"professor",    label:"Reunião com Professor",     emoji:"👩‍🏫" },
  { id:"orientacao",   label:"Orientação Educacional",    emoji:"🧭" },
  { id:"outro_assunto",label:"Outro assunto",             emoji:"💬" },
];
const ASSUNTO_LABEL = Object.fromEntries(ASSUNTOS.map(a => [a.id, a.label]));

const PERIODOS = [
  { id:"manha", label:"Manhã", emoji:"🌅", hora:"07h – 12h" },
  { id:"tarde", label:"Tarde", emoji:"🌤", hora:"13h – 18h" },
  { id:"noite", label:"Noite", emoji:"🌙", hora:"19h – 22h" },
];
const PERIODO_LABEL = { manha:"Manhã (07h–12h)", tarde:"Tarde (13h–18h)", noite:"Noite (19h–22h)" };

// ── Sub-componentes ───────────────────────────────────────────

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:38, height:38, background:C.navy, borderRadius:10,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 3px 10px rgba(27,58,107,0.3)" }}>
        <span style={{ fontSize:20 }}>📋</span>
      </div>
      <div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:17, color:C.navy, lineHeight:1.1 }}>SECRETARIA</div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:14, color:C.green, lineHeight:1, fontStyle:"italic", letterSpacing:"1px" }}>— SEM FILA —</div>
      </div>
    </div>
  );
}

function StepHeader({ step, steps, onBack }) {
  return (
    <div style={{ marginBottom:24 }}>
      <button className="btn-ghost" onClick={onBack}
        style={{ padding:"8px 16px", fontSize:13, marginBottom:18, display:"flex", alignItems:"center", gap:6 }}>
        ← Voltar
      </button>
      <div style={{ display:"flex", gap:5, marginBottom:8 }}>
        {steps.map((_, i) => (
          <div key={i} className="step-bar">
            <div className="step-bar-fill" style={{ width: i < step ? "100%" : "0%" }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:"#8EA5C0", fontWeight:600 }}>
        Passo {step} de {steps.length} — <span style={{ color:C.navy, fontWeight:800 }}>{steps[step - 1]}</span>
      </div>
    </div>
  );
}

function BlocoAluno({ studentInfo, setStudentInfo, studentLgpdOk, setStudentLgpdOk }) {
  return (
    <div style={{ background:"#EBF0F9", border:`2px solid ${C.navy}`, borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.navy }}>
        🎒 Dados do Aluno
      </div>
      <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"10px 12px", marginBottom:14, borderLeft:`4px solid ${C.navy}` }}>
        <p style={{ fontSize:12, color:C.gray600, lineHeight:1.65 }}>
          <strong style={{ color:C.navy }}>Base legal (LGPD, Art. 7º I e Art. 14):</strong> nome e série são usados para agilizar o atendimento e excluídos após a conclusão do serviço.
        </p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Nome completo do aluno *</label>
          <input className="input-field" placeholder="Nome completo do aluno"
            value={studentInfo.studentName}
            onChange={e => setStudentInfo(s => ({ ...s, studentName: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Série / Ano *</label>
          <select className="input-field" value={studentInfo.grade}
            onChange={e => setStudentInfo(s => ({ ...s, grade: e.target.value }))}
            style={{ appearance:"none", cursor:"pointer" }}>
            <option value="">Selecione a série</option>
            <optgroup label="Ensino Fundamental I">
              {["1º ano EF","2º ano EF","3º ano EF","4º ano EF","5º ano EF"].map(g => <option key={g}>{g}</option>)}
            </optgroup>
            <optgroup label="Ensino Fundamental II">
              {["6º ano EF","7º ano EF","8º ano EF","9º ano EF"].map(g => <option key={g}>{g}</option>)}
            </optgroup>
            <optgroup label="Ensino Médio">
              {["1ª série EM","2ª série EM","3ª série EM"].map(g => <option key={g}>{g}</option>)}
            </optgroup>
          </select>
        </div>
      </div>
      <div style={{ background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.25)", borderRadius:12, padding:"14px" }}>
        <div style={{ fontSize:11, fontWeight:800, color:C.red, letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>
          🔒 Termo de Consentimento — Dados do Menor (LGPD Art. 14)
        </div>
        <p style={{ fontSize:12, color:C.gray600, lineHeight:1.7, marginBottom:14 }}>
          Declaro ser <strong style={{ color:C.gray800 }}>responsável legal</strong> pelo aluno e <strong style={{ color:C.gray800 }}>autorizo expressamente</strong> o tratamento do nome e série pela SEDUC-SP, <strong style={{ color:C.gray800 }}>exclusivamente</strong> para o atendimento solicitado. Dados excluídos após a conclusão do serviço.
        </p>
        <label style={{ display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer" }}
          onClick={() => setStudentLgpdOk(v => !v)}>
          <div className={`cb ${studentLgpdOk ? "red" : ""}`}>
            {studentLgpdOk && <span style={{ color:"#fff", fontSize:13, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:12, color:C.gray600, lineHeight:1.5 }}>
            Li e <strong style={{ color:C.red }}>concordo</strong>. Confirmo ser responsável legal pelo aluno.
          </span>
        </label>
      </div>
    </div>
  );
}

function BlocoHistorico({ historicoInfo, setHistoricoInfo }) {
  return (
    <div style={{ background:"#F0F4FF", border:`2px solid ${C.navy}`, borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.navy }}>
        📄 Detalhes do Histórico
      </div>
      <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"10px 12px", marginBottom:16, borderLeft:`4px solid ${C.navy}` }}>
        <p style={{ fontSize:12, color:C.gray600, lineHeight:1.65 }}>
          📞 A secretaria entrará em contato pelo seu telefone para informar se o histórico está pronto ou se há algum documento pendente.
        </p>
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>Tipo de histórico *</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { id:"conclusao",    emoji:"🎓", label:"Conclusão",    desc:"Aluno concluiu o curso" },
            { id:"transferencia",emoji:"🚚", label:"Transferência",desc:"Aluno saiu por transferência" },
          ].map(t => {
            const sel = historicoInfo.tipo === t.id;
            return (
              <div key={t.id}
                onClick={() => setHistoricoInfo(p => ({ ...p, tipo:t.id, anoConclusao:"", anoSaida:"", serieTransferencia:"" }))}
                style={{ textAlign:"center", padding:"14px 10px", cursor:"pointer", transition:"all 0.15s", borderRadius:12,
                  background: sel ? "#DDE6FF" : C.white, border:`2px solid ${sel ? C.navy : C.gray200}` }}>
                <div style={{ fontSize:26, marginBottom:6 }}>{t.emoji}</div>
                <div style={{ fontSize:14, fontWeight:800, color: sel ? C.navy : C.gray800 }}>{t.label}</div>
                <div style={{ fontSize:11, color:C.gray400, marginTop:3 }}>{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {historicoInfo.tipo === "conclusao" && (
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"14px" }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>
            🎓 Ano em que concluiu *
          </label>
          <select className="input-field" value={historicoInfo.anoConclusao}
            onChange={e => setHistoricoInfo(p => ({ ...p, anoConclusao: e.target.value }))}
            style={{ appearance:"none", cursor:"pointer" }}>
            <option value="">Selecione o ano</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {historicoInfo.tipo === "transferencia" && (
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>
              🚚 Ano em que saiu da escola *
            </label>
            <select className="input-field" value={historicoInfo.anoSaida}
              onChange={e => setHistoricoInfo(p => ({ ...p, anoSaida: e.target.value }))}
              style={{ appearance:"none", cursor:"pointer" }}>
              <option value="">Selecione o ano</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>
              📚 Série em que pediu a transferência *
            </label>
            <select className="input-field" value={historicoInfo.serieTransferencia}
              onChange={e => setHistoricoInfo(p => ({ ...p, serieTransferencia: e.target.value }))}
              style={{ appearance:"none", cursor:"pointer" }}>
              <option value="">Selecione a série</option>
              <optgroup label="Ensino Fundamental I">
                {["1º ano EF","2º ano EF","3º ano EF","4º ano EF","5º ano EF"].map(g => <option key={g}>{g}</option>)}
              </optgroup>
              <optgroup label="Ensino Fundamental II">
                {["6º ano EF","7º ano EF","8º ano EF","9º ano EF"].map(g => <option key={g}>{g}</option>)}
              </optgroup>
              <optgroup label="Ensino Médio">
                {["1ª série EM","2ª série EM","3ª série EM"].map(g => <option key={g}>{g}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function BlocoDocumentos({ docType, setDocType }) {
  const toggle = id => setDocType(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  return (
    <div style={{ background:"#FEF3EC", border:"2px solid rgba(232,120,32,0.35)", borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.orange }}>
        📁 Tipo de Documento a Entregar
      </div>
      <p style={{ fontSize:12, color:C.gray600, lineHeight:1.6, marginBottom:14 }}>
        Selecione um ou mais documentos que irá entregar para a secretaria se preparar antecipadamente.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {DOC_TYPES.map(dt => {
          const sel = docType.includes(dt.id);
          return (
            <div key={dt.id} onClick={() => toggle(dt.id)}
              style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"all 0.15s",
                background: sel ? "#FEF3EC" : C.white, borderRadius:12, padding:"11px 14px",
                border:`2px solid ${sel ? C.orange : C.gray200}` }}>
              <span style={{ fontSize:20, minWidth:26, textAlign:"center" }}>{dt.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color: sel ? C.orange : C.gray800 }}>{dt.label}</div>
                <div style={{ fontSize:12, color:C.gray400 }}>{dt.desc}</div>
              </div>
              <div style={{ width:20, height:20, borderRadius:5, minWidth:20, transition:"all 0.15s",
                border:`2px solid ${sel ? C.orange : C.gray200}`,
                background: sel ? C.orange : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {sel && <span style={{ color:"#fff", fontSize:12, fontWeight:900 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      {docType.length > 0 && (
        <div style={{ marginTop:12, padding:"8px 12px", background:C.white, borderRadius:8, fontSize:12, color:C.gray600 }}>
          ✅ <strong style={{ color:C.orange }}>{docType.length} documento{docType.length > 1 ? "s" : ""} selecionado{docType.length > 1 ? "s" : ""}</strong>
        </div>
      )}
    </div>
  );
}

function BlocoOutros({ outrosInfo, setOutrosInfo }) {
  return (
    <div style={{ background:"#F0F4FF", border:`2px solid ${C.navy}`, borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.navy }}>
        💬 Detalhes do Atendimento
      </div>
      <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"10px 12px", marginBottom:16, borderLeft:`4px solid ${C.navy}` }}>
        <p style={{ fontSize:12, color:C.gray600, lineHeight:1.65 }}>
          📌 Você passará pela secretaria para <strong style={{ color:C.navy }}>solicitar o agendamento</strong>. A secretaria entrará em contato pelo seu telefone para confirmar data e horário.
        </p>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>Com quem deseja falar? *</label>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {ASSUNTOS.map(a => {
            const sel = outrosInfo.assunto === a.id;
            return (
              <div key={a.id} onClick={() => setOutrosInfo(p => ({ ...p, assunto: a.id }))}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", transition:"all 0.15s", borderRadius:10,
                  background: sel ? "#DDE6FF" : C.white, border:`2px solid ${sel ? C.navy : C.gray200}` }}>
                <span style={{ fontSize:18 }}>{a.emoji}</span>
                <span style={{ fontSize:14, fontWeight: sel ? 800 : 600, color: sel ? C.navy : C.gray800 }}>{a.label}</span>
                <div style={{ marginLeft:"auto", width:18, height:18, borderRadius:"50%",
                  border:`2px solid ${sel ? C.navy : C.gray200}`,
                  background: sel ? C.navy : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {sel && <span style={{ color:"#fff", fontSize:10, fontWeight:900 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>
          Descreva o assunto que deseja tratar *
        </label>
        <textarea className="input-field" rows={3}
          placeholder="Ex: Quero conversar sobre o desempenho do aluno em Matemática..."
          value={outrosInfo.descricao || ""}
          onChange={e => setOutrosInfo(p => ({ ...p, descricao: e.target.value }))}
          style={{ resize:"none" }} />
      </div>

      <div>
        <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:8 }}>
          Período em que o aluno estuda *
        </label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {PERIODOS.map(p => {
            const sel = outrosInfo.periodo === p.id;
            return (
              <div key={p.id} onClick={() => setOutrosInfo(prev => ({ ...prev, periodo: p.id }))}
                style={{ textAlign:"center", padding:"12px 8px", cursor:"pointer", transition:"all 0.15s", borderRadius:12,
                  background: sel ? "#DDE6FF" : C.white, border:`2px solid ${sel ? C.navy : C.gray200}` }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{p.emoji}</div>
                <div style={{ fontSize:13, fontWeight:800, color: sel ? C.navy : C.gray800 }}>{p.label}</div>
                <div style={{ fontSize:10, color:C.gray400, marginTop:2 }}>{p.hora}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlocoPasse() {
  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
  const horaAgora = new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  return (
    <div style={{ background:"#EFF6FF", border:"2px solid #3B82F6", borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:"#1D4ED8" }}>
        🚌 Passe Escolar — Aprovação de Cadastro
      </div>

      {/* Passo 1 — Cadastro no Consórcio */}
      <div style={{ background:C.white, border:"2px solid #BFDBFE", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
        <div style={{ fontSize:12, fontWeight:800, color:"#1D4ED8", marginBottom:6 }}>
          Passo 1 — Faça o cadastro no site do Consórcio 123
        </div>
        <p style={{ fontSize:12, color:C.gray600, lineHeight:1.65, marginBottom:12 }}>
          O responsável deve primeiro acessar o site do Consórcio 123 e realizar o cadastro do aluno. Após o cadastro, volte aqui para avisar a secretaria.
        </p>
        <a
          href="https://consorcio123sjc.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:8,
            background:"#1D4ED8", color:"#fff", textDecoration:"none",
            borderRadius:10, padding:"10px 18px",
            fontSize:13, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>
          🌐 Acessar site do Consórcio 123
        </a>
      </div>

      {/* Passo 2 — Avisar a secretaria */}
      <div style={{ background:"#DBEAFE", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
        <div style={{ fontSize:12, fontWeight:800, color:"#1D4ED8", marginBottom:8 }}>
          Passo 2 — Avise a secretaria que já fez o cadastro
        </div>
        <p style={{ fontSize:12, color:"#1E2D3D", lineHeight:1.65 }}>
          Ao confirmar este agendamento, a secretaria receberá sua notificação com <strong style={{ color:"#1D4ED8" }}>data e hora registradas</strong> e irá aprovar seu cadastro no sistema do Consórcio 123.
        </p>
      </div>

      {/* Data/hora do registro */}
      <div style={{ background:C.white, border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>🗓️</div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>
            Data do aviso à secretaria
          </div>
          <div style={{ fontSize:15, fontWeight:900, color:"#1E2D3D" }}>{dataHoje}</div>
          <div style={{ fontSize:12, color:C.gray400, marginTop:2 }}>às {horaAgora} — registrado automaticamente</div>
        </div>
      </div>

      <div style={{ marginTop:10, padding:"10px 12px", background:C.white, border:"1px solid #BFDBFE", borderRadius:10, fontSize:12, color:C.gray600, lineHeight:1.6 }}>
        📞 Após o aviso, a secretaria aprovará o cadastro e <strong style={{ color:"#1D4ED8" }}>entrará em contato pelo telefone informado</strong> para confirmar a aprovação.
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────
export default function App() {
  const [step, setStep]                   = useState(0);
  const [service, setService]             = useState(null);
  const [day, setDay]                     = useState(null);
  const [slot, setSlot]                   = useState(null);
  const [form, setForm]                   = useState({ name:"", phone:"", obs:"" });
  const [studentInfo, setStudentInfo]     = useState({ studentName:"", grade:"" });
  const [docType, setDocType]             = useState([]);
  const [outrosInfo, setOutrosInfo]       = useState({ assunto:"", descricao:"", periodo:"" });
  const [historicoInfo, setHistoricoInfo] = useState({ tipo:"", anoConclusao:"", anoSaida:"", serieTransferencia:"" });
  const [lgpdOk, setLgpdOk]               = useState(false);
  const [studentLgpdOk, setStudentLgpdOk] = useState(false);
  const [protocol, setProtocol]           = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState("");
  const [slotsOcupados, setSlotsOcupados] = useState([]);
  const [diaBloqueado, setDiaBloqueado]   = useState(false);
  const [loadingSlots, setLoadingSlots]   = useState(false);

  // Detecta URL /painel ao carregar — abre login automaticamente
  const rotaInicial = window.location.pathname === "/painel";
  const [painelAberto, setPainelAberto]   = useState(rotaInicial && estaLogado());
  const [loginAberto, setLoginAberto]     = useState(rotaInicial && !estaLogado());

  // Detecta parâmetros de URL para ações públicas
  const urlParams = new URLSearchParams(window.location.search);
  const urlCancelar   = urlParams.get("cancelar");
  const urlReagendar  = urlParams.get("reagendar");
  const urlProtocolo  = urlParams.get("protocolo");
  const modoPublico = urlCancelar ? "cancelar"
    : urlReagendar ? "reagendar"
    : urlProtocolo ? "consulta"
    : null;
  const tokenPublico = urlCancelar || urlReagendar || urlProtocolo || null;
  const [consultaAberta, setConsultaAberta] = useState(!!modoPublico);
  const [modoConsulta, setModoConsulta]     = useState(modoPublico);
  const [tokenConsulta, setTokenConsulta]   = useState(tokenPublico);

  function abrirConsulta(modo, token) {
    setModoConsulta(modo); setTokenConsulta(token); setConsultaAberta(true);
  }
  function fecharConsulta() {
    setConsultaAberta(false); setModoConsulta(null); setTokenConsulta(null);
    window.history.replaceState(null, "", "/");
  }

  // Mantém a URL /painel enquanto o painel estiver aberto
  useEffect(() => {
    if (painelAberto || loginAberto) {
      window.history.replaceState(null, "", "/painel");
    } else if (!consultaAberta) {
      window.history.replaceState(null, "", "/");
    }
  }, [painelAberto, loginAberto, consultaAberta]);

  const needsStudent   = !!(service && !service.external);
  const needsDocs      = service?.id === "documentos";
  const needsOthers    = service?.id === "outros";
  const needsHistorico = service?.id === "historico";
  const needsPasse     = service?.id === "passe";
  const skipDateTime   = needsOthers || needsHistorico || needsPasse;
  const steps = skipDateTime
    ? ["Serviço", "Dados", "Confirmação"]
    : ["Serviço", "Data", "Horário", "Dados", "Confirmação"];

  const purposeMap = {
    historico:"solicitacao_historico_escolar", declaracao:"emissao_declaracao_matricula",
    documentos:"entrega_documentos", outros:"atendimento_geral",
    passe:"solicitacao_passe_escolar",
  };

  const genProto = () => "SSF-" + Math.random().toString(36).slice(2,6).toUpperCase() + "-" + Date.now().toString().slice(-4);

  const saveToDatabase = async () => {
    setSaving(true);
    setSaveError("");
    const proto = genProto();
    const payload = {
      protocol: proto,
      service: service.id,
      date: day ? day.toISOString().split("T")[0] : null,
      slot: slot || null,
      responsible: { name:form.name, phone:form.phone, obs:form.obs||null, lgpd_consent:true, lgpd_consent_at:new Date().toISOString() },
      ...(needsDocs      ? { doc_types: docType }      : {}),
      ...(needsOthers    ? { outros: outrosInfo }       : {}),
      ...(needsHistorico ? { historico: historicoInfo } : {}),
      ...(needsPasse     ? { passe: { avisadoEm: new Date().toISOString(), sistema:"consorcio123" } } : {}),
      ...(needsStudent   ? { student: { name:studentInfo.studentName, grade:studentInfo.grade,
          lgpd_guardian_consent:true, lgpd_consent_at:new Date().toISOString(),
          data_purpose: purposeMap[service.id] || "atendimento_geral",
          retention_policy:"delete_after_attendance" } } : {}),
    };
    try {
      await criarAgendamento(payload);
      setSaving(false);
      return proto;
    } catch (err) {
      setSaveError(err.message || "Erro ao salvar. Verifique sua conexão.");
      setSaving(false);
      throw err;
    }
  };

  const reset = () => {
    setStep(0); setService(null); setDay(null); setSlot(null);
    setForm({ name:"", phone:"", obs:"" }); setStudentInfo({ studentName:"", grade:"" });
    setDocType([]); setOutrosInfo({ assunto:"", descricao:"", periodo:"" });
    setHistoricoInfo({ tipo:"", anoConclusao:"", anoSaida:"", serieTransferencia:"" });
    setLgpdOk(false); setStudentLgpdOk(false); setProtocol("");
  };

  const formOk =
    form.name && form.phone && lgpdOk &&
    !(needsStudent   && (!studentInfo.studentName || !studentInfo.grade || !studentLgpdOk)) &&
    !(needsDocs      && docType.length === 0) &&
    !(needsOthers    && (!outrosInfo.assunto || !(outrosInfo.descricao||"").trim() || !outrosInfo.periodo)) &&
    !(needsHistorico && (
      !historicoInfo.tipo ||
      (historicoInfo.tipo === "conclusao"     && !historicoInfo.anoConclusao) ||
      (historicoInfo.tipo === "transferencia" && (!historicoInfo.anoSaida || !historicoInfo.serieTransferencia))
    ));

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    .ssf-card{background:${C.white};border:2px solid ${C.gray200};border-radius:16px;transition:all 0.18s ease;cursor:pointer;}
    .ssf-card:hover{border-color:${C.navy};box-shadow:0 6px 24px rgba(27,58,107,0.12);transform:translateY(-2px);}
    .ssf-card.sel-navy{border-color:${C.navy};background:#EBF0F9;box-shadow:0 0 0 3px rgba(27,58,107,0.12);}
    .ssf-card.sel-green{border-color:${C.green};background:#EBF5EC;box-shadow:0 0 0 3px rgba(46,139,58,0.12);}
    .btn-primary{background:linear-gradient(135deg,${C.green},${C.greenLt});color:#fff;border:none;border-radius:14px;padding:15px 32px;font-family:'Nunito',sans-serif;font-size:16px;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(46,139,58,0.3);}
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(46,139,58,0.4);}
    .btn-primary:disabled{background:#CBD5E1;color:#94A3B8;cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-navy{background:linear-gradient(135deg,${C.navy},${C.navyDk});color:#fff;border:none;border-radius:14px;padding:15px 32px;font-family:'Nunito',sans-serif;font-size:16px;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(27,58,107,0.25);}
    .btn-navy:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(27,58,107,0.35);}
    .btn-navy:disabled{background:#CBD5E1;color:#94A3B8;cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-ghost{background:transparent;color:${C.gray600};border:2px solid ${C.gray200};border-radius:14px;padding:12px 22px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;}
    .btn-ghost:hover{border-color:${C.navy};color:${C.navy};background:${C.gray50};}
    .input-field{width:100%;background:${C.white};border:2px solid ${C.gray200};border-radius:12px;padding:13px 16px;font-family:'Nunito',sans-serif;font-size:15px;color:${C.gray800};outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
    .input-field:focus{border-color:${C.navy};box-shadow:0 0 0 3px rgba(27,58,107,0.1);}
    .input-field::placeholder{color:${C.gray400};}
    .slot-btn{background:${C.white};border:2px solid ${C.gray200};border-radius:10px;padding:11px 6px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;color:${C.gray800};cursor:pointer;transition:all 0.15s;text-align:center;}
    .slot-btn:hover:not(.blocked){border-color:${C.green};color:${C.green};background:#F0FAF0;}
    .slot-btn.slot-sel{border-color:${C.green};background:#EBF5EC;color:${C.green};}
    .slot-btn.blocked{background:${C.gray50};border-color:${C.gray100};color:${C.gray400};cursor:not-allowed;text-decoration:line-through;}
    .step-bar{height:5px;border-radius:3px;background:${C.gray200};overflow:hidden;flex:1;}
    .step-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,${C.navy},${C.green});transition:width 0.4s ease;}
    .section-block{background:${C.white};border:2px solid ${C.gray200};border-radius:16px;padding:18px 16px;margin-bottom:14px;}
    .badge-blue{background:#EBF0F9;color:${C.navy};border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800;}
    .badge-green{background:#EBF5EC;color:${C.green};border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800;}
    .badge-orange{background:#FEF3EC;color:${C.orange};border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800;}
    .cb{width:22px;height:22px;min-width:22px;border-radius:7px;border:2px solid ${C.gray200};background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;}
    .cb.blue{border-color:${C.navy};background:${C.navy};}
    .cb.red{border-color:${C.red};background:${C.red};}
    .fade-in{animation:fadeUp 0.28s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .success-ring{width:86px;height:86px;border-radius:50%;background:linear-gradient(135deg,${C.green},${C.greenLt});display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto;box-shadow:0 8px 32px rgba(46,139,58,0.35);animation:pop 0.45s cubic-bezier(0.175,0.885,0.32,1.275);}
    @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${C.gray100};}
    .row:last-child{border-bottom:none;}
  `;

  // Linhas da tela de confirmação — filtradas dinamicamente
  const confirmRows = [
    !skipDateTime ? { label:"Data",    value: day  ? fmtFull(day) : "—", icon:"📅" } : null,
    !skipDateTime ? { label:"Horário", value: slot || "—",                icon:"🕐" } : null,
    { label:"Responsável", value: form.name,  icon:"👤" },
    { label:"Telefone",    value: form.phone, icon:"📱" },
    needsStudent && studentInfo.studentName ? { label:"Aluno", value:studentInfo.studentName, icon:"🎒", lgpd:true } : null,
    needsStudent && studentInfo.grade       ? { label:"Série", value:studentInfo.grade,        icon:"📚", lgpd:true } : null,
    needsDocs && docType.length > 0 ? { label:"Documentos", icon:"📁",
      value: docType.length === 1 ? (DOC_LABEL[docType[0]] || docType[0]) : `${docType.length} documentos` } : null,
    needsHistorico && historicoInfo.tipo ? { label:"Tipo", icon:"📄",
      value: historicoInfo.tipo === "conclusao" ? "🎓 Conclusão" : "🚚 Transferência" } : null,
    needsHistorico && historicoInfo.anoConclusao      ? { label:"Ano conclusão",       value:historicoInfo.anoConclusao,       icon:"📅" } : null,
    needsHistorico && historicoInfo.anoSaida          ? { label:"Ano de saída",        value:historicoInfo.anoSaida,           icon:"📅" } : null,
    needsHistorico && historicoInfo.serieTransferencia? { label:"Série transferência", value:historicoInfo.serieTransferencia, icon:"📚" } : null,
    needsPasse ? { label:"Aviso de cadastro", icon:"🚌",
      value: new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }) + " às " + new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) } : null,
    needsOthers && outrosInfo.assunto   ? { label:"Com quem", value: ASSUNTO_LABEL[outrosInfo.assunto] || "—", icon:"💬" } : null,
    needsOthers && outrosInfo.periodo   ? { label:"Período",  value: PERIODO_LABEL[outrosInfo.periodo]  || "—", icon:"🕐" } : null,
    needsOthers && outrosInfo.descricao ? { label:"Assunto",  value: outrosInfo.descricao,                      icon:"📝" } : null,
    form.obs ? { label:"Obs", value:form.obs, icon:"💬" } : null,
  ].filter(Boolean);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito','Segoe UI',sans-serif", color:C.gray800 }}>
      <style>{CSS}</style>

      {/* TELA DE LOGIN */}
      {loginAberto && !estaLogado() && (
        <TelaLogin onLogin={() => { setPainelAberto(true); setLoginAberto(false); }} />
      )}

      {/* PAINEL DA SECRETARIA */}
      {painelAberto && estaLogado() && (
        <PainelSecretaria onVoltar={() => setPainelAberto(false)} />
      )}

      {/* CONSULTA / CANCELAMENTO / REAGENDAMENTO PÚBLICO */}
      {consultaAberta && !painelAberto && !loginAberto && (
        <ConsultaAgendamento
          modo={modoConsulta}
          token={tokenConsulta}
          onVoltar={fecharConsulta}
        />
      )}

      {!painelAberto && !loginAberto && !consultaAberta && (
      <>

      {/* HEADER */}
      <div style={{ background:C.white, borderBottom:`3px solid ${C.green}`,
        padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:20, boxShadow:"0 2px 12px rgba(27,58,107,0.08)" }}>
        <Logo />
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span className="badge-blue">🔒 LGPD</span>
          <span className="badge-orange">⚠️ Sem transferências</span>
        </div>
      </div>

      <div style={{ maxWidth:580, margin:"0 auto", padding:"20px 16px 80px" }}>

        {/* STEP 0 — HOME */}
        {step === 0 && (
          <div className="fade-in">
            <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyDk})`,
              borderRadius:20, padding:"30px 24px 26px", marginBottom:18, color:"white", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", right:-30, top:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
              <div style={{ position:"absolute", right:10, bottom:-60, width:200, height:200, borderRadius:"50%", background:"rgba(46,139,58,0.12)" }} />
              <div style={{ marginBottom:18 }}>
                <img src="/mnt/user-data/uploads/ChatGPT_Image_11_de_mar__de_2026__21_45_09.png"
                  alt="Secretaria Sem Fila"
                  style={{ height:54, objectFit:"contain", filter:"brightness(0) invert(1)" }}
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
              <h1 style={{ fontSize:26, fontWeight:900, lineHeight:1.2, marginBottom:10 }}>
                Agende seu atendimento<br />
                <span style={{ color:C.orange }}>sem sair de casa</span>
              </h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.6, marginBottom:24, maxWidth:340 }}>
                Escolha o serviço e a secretaria já prepara tudo antes da sua chegada.
              </p>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <button className="btn-primary" onClick={() => setStep(1)} style={{ fontSize:16, padding:"14px 36px" }}>
                  Agendar agora →
                </button>
                <button onClick={() => abrirConsulta("consulta", null)}
                  style={{ background:"rgba(255,255,255,0.12)", color:"white",
                    border:"2px solid rgba(255,255,255,0.3)", borderRadius:12,
                    padding:"13px 20px", fontFamily:"'Nunito',sans-serif",
                    fontSize:14, fontWeight:800, cursor:"pointer" }}>
                  🔍 Consultar protocolo
                </button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
              {[
                { icon:"⚡", label:"Rápido",  desc:"Agendamento em 2 min",  color:C.orange },
                { icon:"🔒", label:"Seguro",  desc:"Dados protegidos LGPD", color:C.navy   },
                { icon:"📄", label:"Preparo", desc:"Doc pronto na chegada", color:C.green  },
              ].map(p => (
                <div key={p.label} style={{ background:C.white, border:`2px solid ${C.gray200}`, borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{p.icon}</div>
                  <div style={{ fontWeight:800, fontSize:13, color:p.color, marginBottom:3 }}>{p.label}</div>
                  <div style={{ fontSize:11, color:C.gray400, lineHeight:1.4 }}>{p.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"#EBF0F9", border:"2px solid rgba(27,58,107,0.2)", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.navy, marginBottom:6 }}>🔒 Proteção de dados (LGPD)</div>
              <p style={{ fontSize:13, color:C.gray600, lineHeight:1.6 }}>
                Dados de alunos são coletados <strong>apenas com consentimento explícito do responsável legal</strong>, exclusivamente para preparação do documento solicitado.
              </p>
            </div>
            <div style={{ background:"#FEF3EC", border:"2px solid rgba(232,120,32,0.3)", borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.orange, marginBottom:6 }}>⚠️ Transferências não são online</div>
              <p style={{ fontSize:13, color:C.gray600, lineHeight:1.6 }}>
                Por determinação legal, a <strong>transferência de alunos exige presença obrigatória</strong> na secretaria com documentação completa.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1 — SERVIÇO */}
        {step === 1 && (
          <div className="fade-in">
            <StepHeader step={1} steps={steps} onBack={() => setStep(0)} />
            <h2 style={{ fontSize:22, fontWeight:900, color:C.navy, marginBottom:4 }}>Qual serviço você precisa?</h2>
            <p style={{ fontSize:14, color:C.gray400, marginBottom:20 }}>Selecione o tipo de atendimento.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
              {SERVICES.map(s => s.external ? (
                <div key={s.id} style={{ background:"linear-gradient(135deg,#EBF5EC,#d4edda)",
                  border:`2px solid ${C.green}`, borderRadius:16, padding:"14px 16px",
                  display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:26, minWidth:34, textAlign:"center" }}>{s.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.green, marginBottom:2 }}>{s.title}</div>
                    <div style={{ fontSize:13, color:C.gray600, marginBottom:10 }}>O boletim está disponível online — sem precisar vir à secretaria!</div>
                    <a href={s.externalUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:8,
                        background:`linear-gradient(135deg,${C.green},${C.greenLt})`,
                        color:"white", textDecoration:"none", padding:"9px 18px",
                        borderRadius:10, fontSize:13, fontWeight:800,
                        boxShadow:"0 3px 10px rgba(46,139,58,0.3)" }}>
                      🌐 Acessar Sala do Futuro
                    </a>
                  </div>
                  <span className="badge-green" style={{ whiteSpace:"nowrap", alignSelf:"flex-start" }}>Online</span>
                </div>
              ) : (
                <div key={s.id} className={`ssf-card ${service?.id === s.id ? "sel-navy" : ""}`}
                  onClick={() => setService(s)}
                  style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:26, minWidth:34, textAlign:"center" }}>{s.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.navy, marginBottom:2 }}>{s.title}</div>
                    <div style={{ fontSize:13, color:C.gray400 }}>{s.desc}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    {s.time && <span style={{ fontSize:11, color:C.gray400 }}>⏱ {s.time}</span>}
                    {service?.id === s.id && <span className="badge-green">✓ selecionado</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-navy" disabled={!service} onClick={() => setStep(skipDateTime ? 4 : 2)} style={{ width:"100%" }}>
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 2 — DATA */}
        {step === 2 && (
          <div className="fade-in">
            <StepHeader step={2} steps={steps} onBack={() => setStep(1)} />
            <h2 style={{ fontSize:22, fontWeight:900, color:C.navy, marginBottom:4 }}>Escolha a data</h2>
            <p style={{ fontSize:14, color:C.gray400, marginBottom:20 }}>Dias úteis disponíveis.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {DAYS.map((d, i) => (
                <div key={i} className={`ssf-card ${day?.toDateString() === d.toDateString() ? "sel-green" : ""}`}
                  onClick={() => setDay(d)} style={{ padding:"16px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:C.gray400, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                    {d.toLocaleDateString("pt-BR", { weekday:"long" })}
                  </div>
                  <div style={{ fontSize:30, fontWeight:900, color: day?.toDateString() === d.toDateString() ? C.green : C.navy, lineHeight:1 }}>
                    {d.toLocaleDateString("pt-BR", { day:"2-digit" })}
                  </div>
                  <div style={{ fontSize:13, color:C.gray400, marginTop:4 }}>
                    {d.toLocaleDateString("pt-BR", { month:"long" })}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-navy" disabled={!day || loadingSlots}
              onClick={async () => {
                setLoadingSlots(true);
                setSlotsOcupados([]);
                setDiaBloqueado(false);
                setSlot(null);
                try {
                  const dataStr = day.toISOString().split("T")[0];
                  const result = await buscarSlotsOcupados(dataStr);
                  setSlotsOcupados(result.ocupados || []);
                  setDiaBloqueado(result.diaBloqueado || false);
                } catch (_) {
                  setSlotsOcupados([]);
                } finally {
                  setLoadingSlots(false);
                  setStep(3);
                }
              }}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {loadingSlots ? (
                <>
                  <span style={{ width:16, height:16, border:"2.5px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  Verificando horários...
                </>
              ) : "Continuar →"}
            </button>
          </div>
        )}

        {/* STEP 3 — HORÁRIO */}
        {step === 3 && (
          <div className="fade-in">
            <StepHeader step={3} steps={steps} onBack={() => setStep(2)} />
            <h2 style={{ fontSize:22, fontWeight:900, color:C.navy, marginBottom:4 }}>Escolha o horário</h2>
            <p style={{ fontSize:14, color:C.gray400, marginBottom:8 }}>{day && fmtDay(day)}</p>

            <div style={{ display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ width:12, height:12, borderRadius:3, background:C.green }} />
                <span style={{ fontSize:12, color:C.gray600 }}>disponível</span>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ width:12, height:12, borderRadius:3, background:C.gray200 }} />
                <span style={{ fontSize:12, color:C.gray600 }}>ocupado</span>
              </div>
              <span style={{ fontSize:12, color:C.gray400 }}>
                {slotsOcupados.length > 0
                  ? `${slotsOcupados.length} horário${slotsOcupados.length > 1 ? "s" : ""} já agendado${slotsOcupados.length > 1 ? "s" : ""}`
                  : "Todos os horários disponíveis"}
              </span>
            </div>

            {[["Manhã", SLOTS.filter(s => parseInt(s) < 12)], ["Tarde", SLOTS.filter(s => parseInt(s) >= 12)]].map(([period, slots]) => (
              <div key={period} style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:800, color:C.gray400, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:10 }}>{period}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {slots.map(s => {
                    const bloqueado = diaBloqueado || slotsOcupados.includes(s);
                    const selecionado = slot === s;
                    return (
                      <button key={s}
                        className={`slot-btn ${bloqueado ? "blocked" : ""} ${selecionado ? "slot-sel" : ""}`}
                        onClick={() => !bloqueado && setSlot(s)}
                        title={diaBloqueado ? "Dia bloqueado pela secretaria" : bloqueado ? "Horário já agendado" : "Clique para selecionar"}>
                        {s}
                        {bloqueado && (
                          <div style={{ fontSize:9, color:C.gray400, marginTop:2 }}>{diaBloqueado ? "bloqueado" : "ocupado"}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {diaBloqueado && (
              <div style={{ background:"#FEF0EE", border:`2px solid rgba(220,38,38,0.3)`,
                borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.red, fontWeight:700 }}>
                🚫 Este dia está bloqueado pela secretaria. Volte e escolha outra data.
              </div>
            )}
            {!diaBloqueado && SLOTS.every(s => slotsOcupados.includes(s)) && (
              <div style={{ background:"#FEF3EC", border:`2px solid rgba(232,120,32,0.3)`,
                borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.orange, fontWeight:700 }}>
                ⚠️ Todos os horários deste dia estão ocupados. Volte e escolha outra data.
              </div>
            )}

            <button className="btn-navy" disabled={!slot || diaBloqueado} onClick={() => setStep(4)} style={{ width:"100%" }}>
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 4 — DADOS */}
        {step === 4 && (
          <div className="fade-in">
            <StepHeader step={skipDateTime ? 2 : 4} steps={steps} onBack={() => setStep(skipDateTime ? 1 : 3)} />
            <h2 style={{ fontSize:22, fontWeight:900, color:C.navy, marginBottom:4 }}>Seus dados</h2>
            <p style={{ fontSize:14, color:C.gray400, marginBottom:20 }}>Dados do responsável e do aluno.</p>

            <div className="section-block">
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.navy }}>👤 Responsável</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Nome completo *</label>
                  <input className="input-field" placeholder="Seu nome completo"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Telefone *</label>
                  <input className="input-field" placeholder="(11) 99999-9999"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:6 }}>Observações (opcional)</label>
                  <textarea className="input-field" placeholder="Informação adicional..." rows={2}
                    value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} style={{ resize:"none" }} />
                </div>
              </div>
            </div>

            {needsStudent && (
              <BlocoAluno studentInfo={studentInfo} setStudentInfo={setStudentInfo}
                studentLgpdOk={studentLgpdOk} setStudentLgpdOk={setStudentLgpdOk} />
            )}
            {needsHistorico && (
              <BlocoHistorico historicoInfo={historicoInfo} setHistoricoInfo={setHistoricoInfo} />
            )}
            {needsPasse && (
              <BlocoPasse />
            )}
            {needsDocs && (
              <BlocoDocumentos docType={docType} setDocType={setDocType} />
            )}
            {needsOthers && (
              <BlocoOutros outrosInfo={outrosInfo} setOutrosInfo={setOutrosInfo} />
            )}

            {service && service.docs && service.docs.length > 0 && (
              <div className="section-block">
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, color:C.gray600 }}>📎 Documentos necessários no dia</div>
                {service.docs.map(d => (
                  <div key={d} style={{ display:"flex", gap:8, fontSize:14, color:C.gray600, marginBottom:8, alignItems:"center" }}>
                    <span style={{ color:C.green, fontWeight:900 }}>✓</span> {d}
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:"#EBF0F9", border:"2px solid rgba(27,58,107,0.2)", borderRadius:14, padding:"14px 16px", marginBottom:20 }}>
              <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}
                onClick={() => setLgpdOk(v => !v)}>
                <div className={`cb ${lgpdOk ? "blue" : ""}`}>
                  {lgpdOk && <span style={{ color:"#fff", fontSize:13, fontWeight:900 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:C.gray600, lineHeight:1.6 }}>
                  Concordo com o uso dos <strong style={{ color:C.navy }}>meus dados pessoais</strong> para fins de agendamento escolar, conforme a <strong style={{ color:C.navy }}>LGPD</strong>. Dados excluídos após o atendimento.
                </span>
              </label>
            </div>

            <button className="btn-navy" disabled={!formOk} onClick={() => setStep(5)} style={{ width:"100%" }}>
              Revisar Agendamento →
            </button>
          </div>
        )}

        {/* STEP 5 — CONFIRMAÇÃO */}
        {step === 5 && (
          <div className="fade-in">
            <StepHeader step={skipDateTime ? 3 : 5} steps={steps} onBack={() => setStep(4)} />
            <h2 style={{ fontSize:22, fontWeight:900, color:C.navy, marginBottom:4 }}>Confirme o agendamento</h2>
            <p style={{ fontSize:14, color:C.gray400, marginBottom:20 }}>Verifique antes de finalizar.</p>

            <div style={{ background:C.white, border:`2px solid ${C.gray200}`, borderRadius:16, padding:20, marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:14, borderBottom:`2px solid ${C.gray100}`, marginBottom:14 }}>
                <span style={{ fontSize:32 }}>{service?.emoji}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:17, color:C.navy }}>{service?.title}</div>
                  <div style={{ fontSize:13, color:C.gray400 }}>{service?.desc}</div>
                </div>
              </div>
              {confirmRows.map(r => (
                <div key={r.label} className="row">
                  <span style={{ fontSize:13, color:C.gray400, display:"flex", gap:6, alignItems:"center" }}>
                    <span>{r.icon}</span>{r.label}
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {r.lgpd && <span className="badge-blue">🔒 consentido</span>}
                    <span style={{ fontSize:14, fontWeight:700, color:C.gray800, textAlign:"right", maxWidth:200 }}>{r.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary"
              style={{ width:"100%", fontSize:16, padding:16, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}
              disabled={saving}
              onClick={async () => {
                try {
                  const p = await saveToDatabase();
                  setProtocol(p);
                  setStep(6);
                } catch (_) {}
              }}>
              {saving ? (
                <>
                  <span style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  Salvando com segurança...
                </>
              ) : "✅ Confirmar Agendamento"}
            </button>
            {saveError && (
              <div style={{ marginTop:12, background:"#FEF0EE", border:"2px solid rgba(220,38,38,0.3)",
                borderRadius:12, padding:"12px 16px", fontSize:13, color:"#DC2626" }}>
                ⚠️ {saveError}
              </div>
            )}
          </div>
        )}

        {/* STEP 6 — CONCLUÍDO */}
        {step === 6 && (
          <div className="fade-in" style={{ textAlign:"center", padding:"36px 0" }}>
            <div className="success-ring" style={{ marginBottom:20 }}>✓</div>
            <h2 style={{ fontSize:26, fontWeight:900, color:C.navy, marginBottom:8 }}>Agendamento Confirmado!</h2>
            <p style={{ fontSize:15, color:C.gray400, marginBottom:28 }}>Guarde o protocolo para o dia do atendimento.</p>

            <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyDk})`,
              borderRadius:18, padding:"22px 28px", marginBottom:20, display:"inline-block",
              minWidth:280, color:"white", boxShadow:"0 8px 32px rgba(27,58,107,0.3)" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:8 }}>Protocolo</div>
              <div style={{ fontSize:30, fontWeight:900, letterSpacing:"3px", color:C.orange }}>{protocol}</div>
            </div>

            <div style={{ background:C.white, border:`2px solid ${C.gray200}`, borderRadius:14, padding:16, marginBottom:16, textAlign:"left" }}>
              {[
                !skipDateTime ? { icon:"📅", text: day && slot ? fmtFull(day) + " às " + slot : "" } : null,
                { icon:"📌", text: service?.title },
                !skipDateTime ? { icon:"📎", text:"Lembre-se dos documentos necessários" }      : null,
                !skipDateTime ? { icon:"⏰", text:"Chegue com 5 minutos de antecedência" }       : null,
                skipDateTime  ? { icon:"📞", text:"A secretaria entrará em contato pelo seu telefone" } : null,
              ].filter(Boolean).map(i => (
                <div key={i.icon} style={{ display:"flex", gap:10, marginBottom:10, fontSize:14, color:C.gray600 }}>
                  <span>{i.icon}</span><span>{i.text}</span>
                </div>
              ))}
            </div>

            {needsStudent && (
              <div style={{ background:"#EBF5EC", border:"2px solid rgba(46,139,58,0.3)", borderRadius:14, padding:"14px 16px", marginBottom:24, textAlign:"left" }}>
                <div style={{ fontWeight:800, color:C.green, fontSize:14, marginBottom:6 }}>
                  {needsHistorico ? "📞 A secretaria entrará em contato" : needsPasse ? "🚌 Aviso enviado para a secretaria" : "⚡ Atendimento pré-preparado"}
                </div>
                <p style={{ fontSize:13, color:C.gray600, lineHeight:1.6 }}>
                  {needsHistorico
                    ? "A secretaria verificará o histórico e ligará para informar se está pronto ou se há algum documento pendente."
                    : needsPasse
                    ? "A secretaria recebeu seu aviso e irá aprovar seu cadastro no sistema do Consórcio 123. Ela entrará em contato pelo telefone informado para confirmar a aprovação."
                    : "A secretaria já recebeu os dados do aluno e pode preparar o atendimento antes da sua chegada."}
                </p>
                <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(46,139,58,0.15)", fontSize:11, color:C.gray400, display:"flex", gap:6 }}>
                  🔒 <span>Dados protegidos por consentimento LGPD · Excluídos após o atendimento</span>
                </div>
              </div>
            )}

            <button className="btn-ghost" onClick={reset} style={{ width:"100%" }}>
              Fazer outro agendamento
            </button>
          </div>
        )}

      </div>
      </> 
      )}
    </div>
  );
}
