require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Licenca = require('./models/Licenca'); // Usa o mesmo modelo do seu bot

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SENHA_MESTRA = "SB2026#Mestre99";

// Conexão direta com o mesmo MongoDB do seu bot
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Painel conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// Rota Principal (abre direto o painel)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Painel Executivo — SaaS Bot</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
                .container { max-width: 1000px; margin: auto; background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                h1, h2 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #0f172a; border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; font-size: 14px; }
                th { background-color: #1e293b; color: #38bdf8; }
                .btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; font-size: 12px; margin: 2px; transition: 0.2s; }
                .btn:hover { opacity: 0.85; }
                .btn-green { background-color: #22c55e; color: white; }
                .btn-yellow { background-color: #eab308; color: black; }
                .btn-red { background-color: #ef4444; color: white; }
                .btn-blue { background-color: #3b82f6; color: white; }
                input, select { padding: 10px; margin: 5px 0 15px 0; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; width: 100%; box-sizing: border-box; }
                .card { background: #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
                .login-box { max-width: 400px; margin: 100px auto; background: #1e293b; padding: 30px; border-radius: 12px; text-align: center; }
            </style>
        </head>
        <body>
            <div id="app">
                <div class="login-box">
                    <h2>🔒 Acesso Restrito</h2>
                    <input type="password" id="inputSenha" placeholder="Digite a Senha Mestra">
                    <button class="btn btn-blue" style="width:100%; padding:12px;" onclick="entrar()">Entrar no Painel</button>
                </div>
            </div>

            <script>
                function entrar() {
                    const s = document.getElementById('inputSenha').value;
                    if (s === "${SENHA_MESTRA}") {
                        localStorage.setItem('senha_master', s);
                        carregarPainel(s);
                    } else {
                        alert("Senha incorreta!");
                    }
                }

                function sair() {
                    localStorage.removeItem('senha_master');
                    location.reload();
                }

                function carregarPainel(senha) {
                    fetch('/api/dados?senha=' + encodeURIComponent(senha))
                        .then(res => res.json())
                        .then(data => {
                            if(data.erro) { sair(); return; }
                            
                            let html = \`<div class="container">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <h1>👑 Painel Executivo — SaaS Bot</h1>
                                    <button class="btn btn-red" onclick="sair()">Sair</button>
                                </div>

                                <div class="card">
                                    <h3>➕ Cadastrar ou Renovar Cliente</h3>
                                    <form action="/api/salvar" method="POST">
                                        <input type="hidden" name="senha" value="\${senha}">
                                        <label>ID do Servidor Discord:</label>
                                        <input type="text" name="guildId" required placeholder="Ex: 1185637652855267348">
                                        <label>Nome do Cliente:</label>
                                        <input type="text" name="nomeCliente" required placeholder="Ex: Loja do João">
                                        <label>Status de Pagamento:</label>
                                        <select name="pago">
                                            <option value="true">🟢 Pago</option>
                                            <option value="false">🔴 Pendente</option>
                                        </select>
                                        <button class="btn btn-green">Salvar Cliente (+30 Dias)</button>
                                    </form>
                                </div>

                                <h2>📋 Clientes Cadastrados (\${data.clientes.length})</h2>
                                <table>
                                    <tr>
                                        <th>Cliente / ID Servidor</th>
                                        <th>Status</th>
                                        <th>Vencimento</th>
                                        <th>Motivo Bloqueio</th>
                                        <th>Ações</th>
                                    </tr>\`;

                            data.clientes.forEach(c => {
                                let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                                let statusBadge = c.status === 'ativo' ? '<span style="color:#4ade80;">🟢 Ativo</span>' : '<span style="color:#f87171;">🔴 Bloqueado</span>';
                                let pagoBadge = c.pago ? '💳 Pago' : '⏳ Pendente';

                                html += \`<tr>
                                    <td><strong>\${c.nomeCliente}</strong><br><small style="color:#94a3b8;">\${c.guildId}</small></td>
                                    <td>\${statusBadge}<br><small>\${pagoBadge}</small></td>
                                    <td><strong>\${diasRestantes} dias</strong> restantes</td>
                                    <td>\${c.motivoBloqueio || '-'}</td>
                                    <td>
                                        <a href="/api/renovar?id=\${c.guildId}&senha=\${senha}" class="btn btn-blue">+30d</a>
                                        <form action="/api/bloquear" method="POST" style="display:inline-block;">
                                            <input type="hidden" name="senha" value="\${senha}">
                                            <input type="hidden" name="guildId" value="\${c.guildId}">
                                            <input type="text" name="motivo" placeholder="Motivo..." style="width:90px; padding:5px; margin:0;" required>
                                            <button class="btn btn-yellow">\${c.status === 'ativo' ? 'Bloquear' : 'Ativar'}</button>
                                        </form>
                                        <form action="/api/remover" method="POST" style="display:inline;" onsubmit="return confirm('Remover este cliente?');">
                                            <input type="hidden" name="senha" value="\${senha}">
                                            <input type="hidden" name="guildId" value="\${c.guildId}">
                                            <button class="btn btn-red">Excluir</button>
                                        </form>
                                    </td>
                                </tr>\`;
                            });

                            html += \`</table></div>\`;
                            document.getElementById('app').innerHTML = html;
                        });
                }

                // Auto-login se já tiver digitado a senha antes
                const senhaSalva = localStorage.getItem('senha_master');
                if (senhaSalva === "${SENHA_MESTRA}") {
                    carregarPainel(senhaSalva);
                }
            </script>
        </body>
        </html>
    `);
});

// Rotas da API do Painel
app.get('/api/dados', async (req, res) => {
    if (req.query.senha !== SENHA_MESTRA) return res.json({ erro: "Senha inválida" });
    const clientes = await Licenca.find().sort({ dataVencimento: 1 });
    res.json({ clientes });
});

app.post('/api/salvar', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Acesso negado");
    const { guildId, nomeCliente, pago } = req.body;
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);

    await Licenca.findOneAndUpdate(
        { guildId },
        { nomeCliente, dataEntrada: new Date(), dataVencimento: vencimento, status: 'ativo', pago: pago === 'true', motivoBloqueio: '' },
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
        lic.motivoBloqueio = lic.status === 'suspenso' ? motivo : '';
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
app.listen(PORT, () => {
    console.log(`🚀 Painel Web rodando em: http://localhost:${PORT}`);
});
