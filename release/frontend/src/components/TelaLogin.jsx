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
