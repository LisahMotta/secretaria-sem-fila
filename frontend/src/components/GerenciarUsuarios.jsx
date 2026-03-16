import { useState, useEffect } from "react";
import { listarUsuarios, criarUsuario, excluirUsuario, redefinirSenhaUsuario } from "../api.js";
import { getNome } from "../auth.js";

const C = {
  navy:"#1B3A6B", green:"#2E8B3A", white:"#FFFFFF",
  gray100:"#EEF2F7", gray200:"#D8E2EE", gray400:"#8EA5C0",
  gray600:"#4A6080", gray800:"#1E2D3D", red:"#DC2626", bg:"#F4F7FB",
};

const inputStyle = {
  width:"100%", border:"2px solid " + C.gray200, borderRadius:10,
  padding:"10px 14px", fontFamily:"'Nunito',sans-serif", fontSize:14,
  color:C.gray800, outline:"none", boxSizing:"border-box",
};

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ usuario:"", nome:"", senha:"", perfil:"funcionario" });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [redefinindo, setRedefinindo] = useState(null); // id do usuário
  const [novaSenha, setNovaSenha] = useState("");
  const meNome = getNome();

  async function carregar() {
    setCarregando(true); setErro("");
    try { setUsuarios(await listarUsuarios()); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function handleCriar(e) {
    e.preventDefault();
    if (!form.usuario || !form.nome || !form.senha) { setErroForm("Preencha todos os campos."); return; }
    setSalvando(true); setErroForm("");
    try {
      await criarUsuario(form);
      setForm({ usuario:"", nome:"", senha:"", perfil:"funcionario" });
      await carregar();
    } catch (e) { setErroForm(e.message); }
    finally { setSalvando(false); }
  }

  async function handleExcluir(id, nome) {
    if (!confirm(`Excluir o usuário "${nome}"?`)) return;
    try { await excluirUsuario(id); await carregar(); }
    catch (e) { alert(e.message); }
  }

  async function handleRedefinir(id) {
    if (!novaSenha || novaSenha.length < 6) { alert("Senha deve ter ao menos 6 caracteres."); return; }
    try {
      await redefinirSenhaUsuario(id, novaSenha);
      setRedefinindo(null); setNovaSenha("");
      alert("Senha redefinida com sucesso.");
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:17, color:C.navy, marginBottom:20 }}>👥 Usuários da Secretaria</div>

      {/* Criar novo usuário */}
      <div style={{ background:C.white, border:"2px solid " + C.gray200, borderRadius:16, padding:20, marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:14, color:C.navy, marginBottom:14 }}>➕ Novo usuário</div>
        <form onSubmit={handleCriar}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Usuário (login)</label>
              <input style={inputStyle} placeholder="ex: maria.silva" value={form.usuario}
                onChange={e => setForm(f => ({ ...f, usuario: e.target.value.toLowerCase().replace(/\s/g,"") }))} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Nome completo</label>
              <input style={inputStyle} placeholder="ex: Maria Silva" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Senha inicial</label>
              <input style={inputStyle} type="password" placeholder="Mín. 6 caracteres" value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:5 }}>Perfil</label>
              <select style={{ ...inputStyle, cursor:"pointer", appearance:"none" }} value={form.perfil}
                onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          {erroForm && <div style={{ color:C.red, fontSize:13, marginBottom:10 }}>⚠️ {erroForm}</div>}
          <button type="submit" disabled={salvando}
            style={{ background:C.navy, color:"#fff", border:"none", borderRadius:10,
              padding:"10px 24px", fontFamily:"'Nunito',sans-serif", fontSize:14,
              fontWeight:800, cursor:"pointer" }}>
            {salvando ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      </div>

      {/* Lista de usuários */}
      {erro && <div style={{ color:C.red, fontSize:13, marginBottom:12 }}>⚠️ {erro}</div>}
      {carregando ? (
        <div style={{ color:C.gray400, textAlign:"center", padding:24 }}>Carregando...</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {usuarios.map(u => (
            <div key={u.id} style={{ background:C.white, border:"2px solid " + C.gray200,
              borderRadius:14, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:C.navy }}>{u.nome}</div>
                  <div style={{ fontSize:13, color:C.gray600 }}>
                    @{u.usuario}
                    <span style={{ marginLeft:8, background: u.perfil === "admin" ? "#EBF0F9" : C.gray100,
                      color: u.perfil === "admin" ? C.navy : C.gray600,
                      border:"1.5px solid " + (u.perfil === "admin" ? "rgba(27,58,107,0.3)" : C.gray200),
                      borderRadius:6, padding:"1px 8px", fontSize:11, fontWeight:800 }}>
                      {u.perfil === "admin" ? "Admin" : "Funcionário"}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:C.gray400, marginTop:2 }}>
                    Criado em {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { setRedefinindo(u.id); setNovaSenha(""); }}
                    style={{ background:"#EBF0F9", color:C.navy, border:"2px solid rgba(27,58,107,0.2)",
                      borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700,
                      cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                    🔑 Senha
                  </button>
                  {u.nome !== meNome && (
                    <button onClick={() => handleExcluir(u.id, u.nome)}
                      style={{ background:"#FEF0EE", color:C.red, border:"2px solid rgba(220,38,38,0.3)",
                        borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700,
                        cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {redefinindo === u.id && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid " + C.gray200,
                  display:"flex", gap:8, alignItems:"center" }}>
                  <input type="password" placeholder="Nova senha (mín. 6)" value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    style={{ ...inputStyle, flex:1 }} />
                  <button onClick={() => handleRedefinir(u.id)}
                    style={{ background:C.green, color:"#fff", border:"none", borderRadius:8,
                      padding:"10px 16px", fontFamily:"'Nunito',sans-serif", fontSize:13,
                      fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Salvar
                  </button>
                  <button onClick={() => setRedefinindo(null)}
                    style={{ background:"transparent", color:C.gray600, border:"2px solid " + C.gray200,
                      borderRadius:8, padding:"10px 14px", fontFamily:"'Nunito',sans-serif",
                      fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
