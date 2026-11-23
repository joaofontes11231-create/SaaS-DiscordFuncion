require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Licenca = require('./models/Licenca');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SENHA_MESTRA = "SB2026#Mestre99";

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Painel Master conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// Rota Principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Master Control — SaaS Bot</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #090d16; color: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
                
                /* Tela de Login Moderna */
                .login-wrapper { width: 100%; max-width: 420px; background: #111827; padding: 40px 32px; border-radius: 16px; border: 1px solid #1f2937; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; }
                .login-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); }
                .login-wrapper h2 { font-size: 22px; margin-bottom: 8px; color: #fff; }
                .login-wrapper p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
                .input-group { position: relative; margin-bottom: 16px; text-align: left; }
                .input-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .input-group input { width: 100%; padding: 14px 45px 14px 14px; background: #090d16; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 15px; outline: none; transition: 0.2s; }
                .input-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
                .toggle-pass { position: absolute; right: 14px; top: 36px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
                .erro-msg { color: #f87171; font-size: 13px; margin-bottom: 14px; display: none; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3); }

                /* Painel Dashboard */
                .dashboard { width: 100%; max-width: 1250px; margin: auto; align-self: flex-start; }
                .topbar { display: flex; justify-content: space-between; align-items: center; background: #111827; padding: 20px 28px; border-radius: 14px; border: 1px solid #1f2937; margin-bottom: 24px; flex-wrap: wrap; gap: 15px; }
                .topbar h1 { font-size: 20px; color: #fff; display: flex; align-items: center; gap: 10px; }
                
                /* Cards de Estatísticas */
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
                .stat-card { background: #111827; padding: 20px; border-radius: 14px; border: 1px solid #1f2937; }
                .stat-card span { font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
                .stat-card h3 { font-size: 28px; margin-top: 8px; color: #fff; }

                /* Formulário e Tabelas */
                .panel-box { background: #111827; padding: 24px; border-radius: 14px; border: 1px solid #1f2937; margin-bottom: 24px; }
                .panel-box h3 { font-size: 16px; margin-bottom: 16px; color: #38bdf8; }
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
                .form-control { width: 100%; padding: 11px 14px; background: #090d16; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; outline: none; }
                .form-control:focus { border-color: #3b82f6; }

                .btn { padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; transition: 0.2s; }
                .btn:hover { filter: brightness(1.1); }
                .btn-primary { background: #3b82f6; color: white; width: 100%; padding: 14px; font-size: 15px; }
                .btn-green { background: #10b981; color: white; }
                .btn-blue { background: #2563eb; color: white; }
                .btn-yellow { background: #f59e0b; color: #000; }
                .btn-red { background: #ef4444; color: white; }
                .btn-ghost { background: #1f2937; color: #e2e8f0; border: 1px solid #374151; }

                .table-responsive { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { text-align: left; padding: 14px; background: #090d16; color: #94a3b8; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #1f2937; }
                td { padding: 16px 14px; border-bottom: 1px solid #1f2937; font-size: 14px; vertical-align: middle; }
                tr:hover { background: rgba(255,255,255,0.02); }

                .avatar { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; background: #1f2937; }
                .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
                .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
                .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
                .badge-yellow { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
                .copy-btn { background: #1f2937; border: none; color: #94a3b8; padding: 3px 7px; border-radius: 5px; cursor: pointer; font-size: 11px; margin-left: 5px; }
                .copy-btn:hover { color: #fff; background: #374151; }
            </style>
        </head>
        <body>

            <!-- Tela de Login Direta na Página (Sem Popup do Google) -->
            <div class="login-wrapper" id="loginScreen">
                <div class="login-icon">👑</div>
                <h2>Painel Master SaaS</h2>
                <p>Acesso exclusivo ao gerenciamento de lojas, donos e aluguéis.</p>
                
                <div class="erro-msg" id="erroLogin">❌ Senha mestra incorreta. Tente novamente.</div>

                <form onsubmit="fazerLogin(event)">
                    <div class="input-group">
                        <label>Senha Mestra</label>
                        <input type="password" id="senhaInput" placeholder="Digite sua senha de acesso..." required autofocus>
                        <button type="button" class="toggle-pass" onclick="alternarSenha()">👁️</button>
                    </div>
                    <button type="submit" class="btn btn-primary" id="btnEntrar">Acessar Sistema</button>
                </form>
            </div>

            <script>
                function alternarSenha() {
                    const input = document.getElementById('senhaInput');
                    input.type = input.type === 'password' ? 'text' : 'password';
                }

                function copiarTexto(texto) {
                    navigator.clipboard.writeText(texto);
                    alert('Copiado: ' + texto);
                }

                function fazerLogin(e) {
                    e.preventDefault();
                    const s = document.getElementById('senhaInput').value;
                    const btn = document.getElementById('btnEntrar');
                    const erro = document.getElementById('erroLogin');
                    
                    btn.innerText = 'Verificando...';
                    erro.style.display = 'none';

                    fetch('/api/dados?senha=' + encodeURIComponent(s))
                        .then(res => res.json())
                        .then(data => {
                            if (data.erro) {
                                erro.style.display = 'block';
                                btn.innerText = 'Acessar Sistema';
                            } else {
                                localStorage.setItem('senha_master', s);
                                renderizarDashboard(s, data.clientes);
                            }
                        })
                        .catch(() => {
                            erro.innerText = '❌ Erro de conexão com o servidor.';
                            erro.style.display = 'block';
                            btn.innerText = 'Acessar Sistema';
                        });
                }

                function sair() {
                    localStorage.removeItem('senha_master');
                    location.reload();
                }

                function renderizarDashboard(senha, clientes) {
                    const total = clientes.length;
                    const ativos = clientes.filter(c => c.status === 'ativo').length;
                    const bloqueados = clientes.filter(c => c.status !== 'ativo').length;
                    const pagos = clientes.filter(c => c.pago).length;

                    let html = \`
                    <div class="dashboard">
                        <div class="topbar">
                            <h1>👑 Painel Master — Controle Total SaaS</h1>
                            <div style="display:flex; gap:10px;">
                                <button class="btn btn-ghost" onclick="location.reload()">🔄 Atualizar Dados</button>
                                <button class="btn btn-red" onclick="sair()">🚪 Sair</button>
                            </div>
                        </div>

                        <!-- Estatísticas Gerais -->
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span>Total de Clientes / Lojas</span>
                                <h3>\${total}</h3>
                            </div>
                            <div class="stat-card">
                                <span>Lojas Ativas (Rodando)</span>
                                <h3 style="color:#34d399;">\${ativos}</h3>
                            </div>
                            <div class="stat-card">
                                <span>Lojas Bloqueadas / Pendentes</span>
                                <h3 style="color:#f87171;">\${bloqueados}</h3>
                            </div>
                            <div class="stat-card">
                                <span>Aluguéis Pagos</span>
                                <h3 style="color:#38bdf8;">\${pagos}</h3>
                            </div>
                        </div>

                        <!-- Cadastrar / Editar Loja -->
                        <div class="panel-box">
                            <h3>➕ Cadastrar ou Liberar Nova Loja</h3>
                            <form action="/api/salvar" method="POST">
                                <input type="hidden" name="senha" value="\${senha}">
                                <div class="form-grid">
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">ID do Servidor (Guild ID) *</label>
                                        <input type="text" name="guildId" class="form-control" required placeholder="Ex: 1185637652855267348">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">ID da Conta do Dono *</label>
                                        <input type="text" name="donoId" class="form-control" required placeholder="Ex: 458923749123456789">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">Nome da Loja / Robô *</label>
                                        <input type="text" name="nomeCliente" class="form-control" required placeholder="Ex: Império Store">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">Link da Foto / Avatar (Opcional)</label>
                                        <input type="text" name="avatarUrl" class="form-control" placeholder="https://...">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">Status Inicial</label>
                                        <select name="pago" class="form-control">
                                            <option value="true">🟢 Pago & Liberado (+30 Dias)</option>
                                            <option value="false">🔴 Pendente / Bloqueado</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-green" style="margin-top:16px; padding:12px 24px;">💾 Salvar e Ativar Loja</button>
                            </form>
                        </div>

                        <!-- Lista Completa -->
                        <div class="panel-box">
                            <h3>📋 Todas as Lojas e Donos Cadastrados (\${total})</h3>
                            <div class="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Loja / Servidor</th>
                                            <th>Perfil do Dono</th>
                                            <th>Status & Pagamento</th>
                                            <th>Tempo Restante</th>
                                            <th>Ações Master</th>
                                        </tr>
                                    </thead>
                                    <tbody>\`;

                    if (clientes.length === 0) {
                        html += \`<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">Nenhuma loja encontrada no banco de dados.</td></tr>\`;
                    } else {
                        clientes.forEach(c => {
                            let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                            let statusHtml = c.status === 'ativo' 
                                ? '<span class="badge badge-green">🟢 Ativo</span>' 
                                : '<span class="badge badge-red">🔴 Bloqueado</span>';
                            let pagoHtml = c.pago 
                                ? '<span class="badge badge-green">💳 Pago</span>' 
                                : '<span class="badge badge-yellow">⏳ Pendente</span>';
                            
                            let avatar = c.avatarUrl 
                                ? \`<img src="\${c.avatarUrl}" class="avatar">\` 
                                : \`<div class="avatar" style="display:flex; align-items:center; justify-content:center; font-size:20px;">🛒</div>\`;

                            let perfilDonoHtml = c.donoId 
                                ? \`<div>
                                    <strong>ID: \${c.donoId}</strong> <button class="copy-btn" onclick="copiarTexto('\${c.donoId}')">Copiar</button><br>
                                    <a href="https://discord.com/users/\${c.donoId}" target="_blank" style="color:#38bdf8; font-size:12px; text-decoration:none;">🔗 Abrir Perfil Discord ↗</a>
                                   </div>\`
                                : '<span style="color:#64748b;">Não vinculado</span>';

                            html += \`
                                <tr>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:12px;">
                                            \${avatar}
                                            <div>
                                                <strong style="font-size:15px; color:#fff;">\${c.nomeCliente}</strong><br>
                                                <small style="color:#94a3b8;">Server ID: \${c.guildId}</small>
                                                <button class="copy-btn" onclick="copiarTexto('\${c.guildId}')">Copiar</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>\${perfilDonoHtml}</td>
                                    <td>
                                        \${statusHtml} \${pagoHtml}<br>
                                        <small style="color:#94a3b8; display:block; margin-top:4px;">\${c.motivoBloqueio ? 'Motivo: ' + c.motivoBloqueio : 'Tudo funcionando 100%'}</small>
                                    </td>
                                    <td>
                                        <strong style="font-size:16px; color:\${diasRestantes > 5 ? '#34d399' : '#f87171'};">
                                            \${diasRestantes > 0 ? diasRestantes + ' dias' : 'Expirado'}
                                        </strong><br>
                                        <small style="color:#64748b;">Vence: \${new Date(c.dataVencimento).toLocaleDateString('pt-BR')}</small>
                                    </td>
                                    <td>
                                        <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                                            <a href="/api/renovar?id=\${c.guildId}&senha=\${senha}" class="btn btn-blue" title="Adicionar +30 dias">+30d</a>
                                            
                                            <form action="/api/bloquear" method="POST" style="display:inline-flex; gap:4px;">
                                                <input type="hidden" name="senha" value="\${senha}">
                                                <input type="hidden" name="guildId" value="\${c.guildId}">
                                                <input type="text" name="motivo" placeholder="Motivo..." class="form-control" style="width:100px; padding:6px 8px; font-size:12px;">
                                                <button type="submit" class="btn btn-yellow">\${c.status === 'ativo' ? 'Bloquear' : 'Liberar'}</button>
                                            </form>

                                            <form action="/api/remover" method="POST" style="display:inline;" onsubmit="return confirm('Tem certeza que deseja excluir esta loja?');">
                                                <input type="hidden" name="senha" value="\${senha}">
                                                <input type="hidden" name="guildId" value="\${c.guildId}">
                                                <button type="submit" class="btn btn-red">🗑️</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            \`;
                        });
                    }

                    html += \`</tbody></table></div></div></div>\`;
                    document.body.innerHTML = html;
                }

                // Auto-login se já estiver salvo
                const senhaSalva = localStorage.getItem('senha_master');
                if (senhaSalva === "${SENHA_MESTRA}") {
                    fetch('/api/dados?senha=' + encodeURIComponent(senhaSalva))
                        .then(res => res.json())
                        .then(data => {
                            if (!data.erro) renderizarDashboard(senhaSalva, data.clientes);
                            else localStorage.removeItem('senha_master');
                        });
                }
            </script>
        </body>
        </html>
    `);
});

// Rotas da API
app.get('/api/dados', async (req, res) => {
    if (req.query.senha !== SENHA_MESTRA) return res.status(401).json({ erro: "Senha inválida" });
    const clientes = await Licenca.find().sort({ dataVencimento: 1 });
    res.json({ clientes });
});

app.post('/api/salvar', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Acesso negado");
    const { guildId, donoId, nomeCliente, avatarUrl, pago } = req.body;
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);

    const isPago = pago === 'true';

    await Licenca.findOneAndUpdate(
        { guildId },
        { 
            donoId, 
            nomeCliente, 
            avatarUrl: avatarUrl || '', 
            dataVencimento: vencimento, 
            status: isPago ? 'ativo' : 'suspenso', 
            pago: isPago, 
            motivoBloqueio: isPago ? '' : 'Aguardando pagamento' 
        },
        { upsert: true }
    );
    res.redirect('/');
});

app.get('/api/renovar', async (req, res) => {
    if (req.query.senha !== SENHA_MESTRA) return res.status(403).send("Acesso negado");
    const lic = await Licenca.findOne({ guildId: req.query.id });
    if (lic) {
        let novaData = lic.dataVencimento > new Date() ? new Date(lic.dataVencimento) : new Date();
        novaData.setDate(novaData.getDate() + 30);
        lic.dataVencimento = novaData;
        lic.status = 'ativo';
        lic.pago = true;
        lic.motivoBloqueio = '';
        await lic.save();
    }
    res.redirect('/');
});

app.post('/api/bloquear', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Acesso negado");
    const { guildId, motivo } = req.body;
    const lic = await Licenca.findOne({ guildId });
    if (lic) {
        lic.status = lic.status === 'ativo' ? 'suspenso' : 'ativo';
        lic.motivoBloqueio = lic.status === 'suspenso' ? (motivo || 'Bloqueado pelo Master') : '';
        await lic.save();
    }
    res.redirect('/');
});

app.post('/api/remover', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Acesso negado");
    await Licenca.findOneAndDelete({ guildId: req.body.guildId });
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(\`🚀 Painel Master rodando em: http://127.0.0.1:\${PORT}\`);
});
