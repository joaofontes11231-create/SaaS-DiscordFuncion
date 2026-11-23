require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Licenca = require('./models/Licenca');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SENHA_MESTRA = "SB2026#Mestre99";

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Painel conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Painel Master — SaaS Bot Vendas</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .container { max-width: 1100px; width: 100%; margin: auto; background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                h1, h2 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #0f172a; border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; font-size: 13px; }
                th { background-color: #1e293b; color: #38bdf8; }
                .btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; font-size: 12px; margin: 2px; transition: 0.2s; }
                .btn:hover { opacity: 0.85; }
                .btn-green { background-color: #22c55e; color: white; }
                .btn-yellow { background-color: #eab308; color: black; }
                .btn-red { background-color: #ef4444; color: white; }
                .btn-blue { background-color: #3b82f6; color: white; }
                input, select { padding: 10px; margin: 5px 0 15px 0; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; width: 100%; box-sizing: border-box; }
                .card { background: #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
                .login-box { max-width: 400px; margin: auto; background: #1e293b; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #334155; }
                .guild-icon { width: 45px; height: 45px; border-radius: 50%; vertical-align: middle; margin-right: 10px; object-fit: cover; }
            </style>
        </head>
        <body>
            <div id="app" style="width: 100%;">
                <div class="login-box">
                    <h2>👑 Acesso Master Restrito</h2>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Insira a senha mestra para gerenciar os aluguéis e licenças.</p>
                    <button class="btn btn-blue" style="width:100%; padding:14px; font-size: 15px;" onclick="solicitarAcesso()">Entrar no Painel Master</button>
                </div>
            </div>

            <script>
                function solicitarAcesso() {
                    const s = prompt("Digite a Senha Mestra:");
                    if (!s) return;
                    fetch('/api/dados?senha=' + encodeURIComponent(s))
                        .then(res => res.json())
                        .then(data => {
                            if(data.erro) { alert("Senha incorreta!"); }
                            else { localStorage.setItem('senha_master', s); renderizarPainel(s, data.clientes); }
                        })
                        .catch(() => alert("Erro de conexão."));
                }

                function sair() { localStorage.removeItem('senha_master'); location.reload(); }

                function renderizarPainel(senha, clientes) {
                    let html = \`<div class="container">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h1>👑 Painel Master — SaaS Bot Vendas</h1>
                            <button class="btn btn-red" onclick="sair()">Sair</button>
                        </div>

                        <div class="card">
                            <h3>➕ Cadastrar / Liberar Nova Licença de Aluguel</h3>
                            <form action="/api/salvar" method="POST">
                                <input type="hidden" name="senha" value="\${senha}">
                                <div style="display:flex; gap:10px;">
                                    <div style="flex:1;"><label>Guild ID (Servidor):</label><input type="text" name="guildId" required placeholder="Ex: 118563765..."></div>
                                    <div style="flex:1;"><label>ID do Dono (Cliente):</label><input type="text" name="donoId" required placeholder="Ex: 458923749..."></div>
                                </div>
                                <div style="display:flex; gap:10px;">
                                    <div style="flex:1;"><label>Nome da Loja:</label><input type="text" name="nomeCliente" required placeholder="Ex: Loja do Gamer"></div>
                                    <div style="flex:1;"><label>Link da Foto/Ícone:</label><input type="text" name="avatarUrl" placeholder="URL da foto do server"></div>
                                </div>
                                <label>Status de Pagamento:</label>
                                <select name="pago">
                                    <option value="true">🟢 Pago (Liberado)</option>
                                    <option value="false">🔴 Pendente (Bloqueado)</option>
                                </select>
                                <button class="btn btn-green" style="width:100%; padding:12px;">Salvar / Ativar Licença (+30 Dias)</button>
                            </form>
                        </div>

                        <h2>📋 Clientes e Aluguéis Ativos (\${clientes.length})</h2>
                        <table>
                            <tr>
                                <th>Loja / Servidor</th>
                                <th>Dono (ID)</th>
                                <th>Status / Pagamento</th>
                                <th>Dias Restantes</th>
                                <th>Ações Master</th>
                            </tr>\`;

                    if (clientes.length === 0) {
                        html += \`<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Nenhum cliente cadastrado.</td></tr>\`;
                    } else {
                        clientes.forEach(c => {
                            let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                            let statusBadge = c.status === 'ativo' ? '<span style="color:#4ade80;">🟢 Ativo</span>' : '<span style="color:#f87171;">🔴 Bloqueado</span>';
                            let pagoBadge = c.pago ? '💳 Pago' : '⏳ Pendente';
                            let icone = c.avatarUrl ? \`<img src="\${c.avatarUrl}" class="guild-icon">\` : \`<span style="display:inline-block;width:45px;height:45px;background:#334155;border-radius:50%;text-align:center;line-height:12px;margin-right:10px;font-weight:bold;line-height:45px;">🛒</span>\`;

                            html += \`<tr>
                                <td><div style="display:flex; align-items:center;">\${icone}<div><strong>\${c.nomeCliente}</strong><br><small style="color:#94a3b8;">Server ID: \${c.guildId}</small></div></div></td>
                                <td><small>Dono ID:</small><br><strong>\${c.donoId || 'Não definido'}</strong></td>
                                <td>\${statusBadge}<br><small>\${pagoBadge}</small></td>
                                <td><strong>\${diasRestantes > 0 ? diasRestantes + ' dias' : 'Expirado'}</strong></td>
                                <td>
                                    <a href="/api/renovar?id=\${c.guildId}&senha=\${senha}" class="btn btn-blue">+30d</a>
                                    <form action="/api/bloquear" method="POST" style="display:inline-block;">
                                        <input type="hidden" name="senha" value="\${senha}">
                                        <input type="hidden" name="guildId" value="\${c.guildId}">
                                        <button class="btn btn-yellow">\${c.status === 'ativo' ? 'Bloquear' : 'Desbloquear'}</button>
                                    </form>
                                    <form action="/api/remover" method="POST" style="display:inline;" onsubmit="return confirm('Excluir este aluguel?');">
                                        <input type="hidden" name="senha" value="\${senha}">
                                        <input type="hidden" name="guildId" value="\${c.guildId}">
                                        <button class="btn btn-red">Excluir</button>
                                    </form>
                                </td>
                            </tr>\`;
                        });
                    }
                    html += \`</table></div>\`;
                    document.body.innerHTML = html;
                }

                const senhaSalva = localStorage.getItem('senha_master');
                if (senhaSalva === "${SENHA_MESTRA}") {
                    fetch('/api/dados?senha=' + encodeURIComponent(senhaSalva))
                        .then(res => res.json())
                        .then(data => { if (!data.erro) renderizarPainel(senhaSalva, data.clientes); else localStorage.removeItem('senha_master'); });
                }
            </script>
        </body>
        </html>
    `);
});

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

    await Licenca.findOneAndUpdate(
        { guildId },
        { donoId, nomeCliente, avatarUrl: avatarUrl || '', dataVencimento: vencimento, status: 'ativo', pago: pago === 'true', motivoBloqueio: '' },
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
    const lic = await Licenca.findOne({ guildId: req.body.guildId });
    if (lic) {
        lic.status = lic.status === 'ativo' ? 'suspenso' : 'ativo';
        lic.motivoBloqueio = lic.status === 'suspenso' ? 'Bloqueado pelo Administrador Master' : '';
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
    console.log(`🚀 Painel Master rodando em: http://127.0.0.1:${PORT}`);
});
