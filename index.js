require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const {
    Client, GatewayIntentBits, Collection, REST, Routes,
    EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');

const Licenca = require('./models/Licenca');
const Produto = require('./models/Produto');
const Nota = require('./models/Nota');
const { criptografar, descriptografar } = require('./utils/seguranca');
const { criarPagamentoPix, verificarPagamento } = require('./utils/mercadopago');

// --- CONFIGURAÇÃO DO EXPRESS (PAINEL WEB MASTER) ---
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SENHA_MESTRA = "SB2026#Mestre99";

// Redireciona a raiz direto para o painel Master
app.get('/', (req, res) => {
    res.redirect('/master');
});

// Painel Master com Visual Clean (Preto, Branco e Azul)
app.get('/master', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Master Control — SaaS Bot Vendas</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
                .login-card { width: 100%; max-width: 420px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 40px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7); text-align: center; }
                .login-card h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                .login-card p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
                .login-input { width: 100%; padding: 14px 16px; background: #0b0f19; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 15px; outline: none; margin-bottom: 16px; transition: 0.2s; }
                .login-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
                .login-btn { width: 100%; padding: 14px; background: #3b82f6; border: none; border-radius: 10px; color: #ffffff; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
                .login-btn:hover { background: #2563eb; }
                .erro-box { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
                
                .dashboard { width: 100%; max-width: 1250px; margin: auto; align-self: flex-start; }
                .topbar { display: flex; justify-content: space-between; align-items: center; background: #111827; padding: 20px 28px; border-radius: 14px; border: 1px solid #1f2937; margin-bottom: 24px; flex-wrap: wrap; gap: 15px; }
                .topbar h2 { font-size: 20px; color: #fff; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
                .stat-card { background: #111827; padding: 20px; border-radius: 14px; border: 1px solid #1f2937; }
                .stat-card span { font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
                .stat-card h3 { font-size: 28px; margin-top: 8px; color: #fff; }
                .panel-box { background: #111827; padding: 24px; border-radius: 14px; border: 1px solid #1f2937; margin-bottom: 24px; }
                .panel-box h3 { font-size: 16px; margin-bottom: 16px; color: #38bdf8; }
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
                .form-control { width: 100%; padding: 11px 14px; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; outline: none; }
                .form-control:focus { border-color: #3b82f6; }
                .btn { padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; transition: 0.2s; }
                .btn-blue { background: #3b82f6; color: white; }
                .btn-green { background: #10b981; color: white; }
                .btn-yellow { background: #f59e0b; color: #000; }
                .btn-red { background: #ef4444; color: white; }
                .btn-ghost { background: #1f2937; color: #e2e8f0; border: 1px solid #374151; }
                .table-responsive { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { text-align: left; padding: 14px; background: #0b0f19; color: #94a3b8; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #1f2937; }
                td { padding: 16px 14px; border-bottom: 1px solid #1f2937; font-size: 14px; vertical-align: middle; }
                .avatar { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; background: #1f2937; }
                .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
                .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
                .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
                .badge-yellow { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
                .copy-btn { background: #1f2937; border: none; color: #94a3b8; padding: 3px 7px; border-radius: 5px; cursor: pointer; font-size: 11px; margin-left: 5px; }
            </style>
        </head>
        <body>
            <div class="login-card" id="loginCard">
                <h1>Acesso Master</h1>
                <p>Painel Administrativo do SaaS Bot</p>
                <div class="erro-box" id="erroBox">Senha incorreta. Tente novamente.</div>
                <form onsubmit="entrarPainel(event)">
                    <input type="password" id="senhaInput" class="login-input" placeholder="Senha do proprietário" required autofocus>
                    <button type="submit" class="login-btn" id="btnEntrar">Entrar no Painel</button>
                </form>
            </div>

            <script>
                function copiarTexto(texto) {
                    navigator.clipboard.writeText(texto);
                    alert('Copiado: ' + texto);
                }

                function entrarPainel(e) {
                    e.preventDefault();
                    const s = document.getElementById('senhaInput').value;
                    const btn = document.getElementById('btnEntrar');
                    const erro = document.getElementById('erroBox');
                    
                    btn.innerText = 'Entrando...';
                    erro.style.display = 'none';

                    fetch('/api/dados?senha=' + encodeURIComponent(s))
                        .then(res => res.json())
                        .then(data => {
                            if (data.erro) {
                                erro.style.display = 'block';
                                btn.innerText = 'Entrar no Painel';
                            } else {
                                localStorage.setItem('senha_master', s);
                                renderizarDashboard(s, data.clientes, data.manutencao);
                            }
                        })
                        .catch(() => {
                            erro.innerText = 'Erro ao conectar com o servidor.';
                            erro.style.display = 'block';
                            btn.innerText = 'Entrar no Painel';
                        });
                }

                function sair() {
                    localStorage.removeItem('senha_master');
                    location.reload();
                }

                function renderizarDashboard(senha, clientes, manutencao) {
                    const total = clientes.length;
                    const ativos = clientes.filter(c => c.status === 'ativo').length;
                    const bloqueados = clientes.filter(c => c.status !== 'ativo').length;
                    const pagos = clientes.filter(c => c.pago).length;

                    let html = \`
                    <div class="dashboard">
                        <div class="topbar">
                            <h2>👑 Painel Master — SaaS Bot</h2>
                            <div style="display:flex; gap:10px;">
                                <form action="/api/manutencao" method="POST" style="display:inline;">
                                    <input type="hidden" name="senha" value="\${senha}">
                                    <button class="btn \${manutencao ? 'btn-green' : 'btn-yellow'}">\${manutencao ? '🟢 Desativar Manutenção' : '🛠️ Ativar Manutenção'}</button>
                                </form>
                                <button class="btn btn-ghost" onclick="location.reload()">🔄 Atualizar</button>
                                <button class="btn btn-red" onclick="sair()">Sair</button>
                            </div>
                        </div>

                        <div class="stats-grid">
                            <div class="stat-card"><span>Total de Lojas</span><h3>\${total}</h3></div>
                            <div class="stat-card"><span>Lojas Ativas</span><h3 style="color:#34d399;">\${ativos}</h3></div>
                            <div class="stat-card"><span>Bloqueadas / Pendentes</span><h3 style="color:#f87171;">\${bloqueados}</h3></div>
                            <div class="stat-card"><span>Aluguéis Pagos</span><h3 style="color:#38bdf8;">\${pagos}</h3></div>
                        </div>

                        <div class="panel-box">
                            <h3>➕ Cadastrar ou Liberar Nova Loja (Aluguel)</h3>
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
                                        <label style="font-size:12px; color:#94a3b8;">Nome da Loja / Servidor *</label>
                                        <input type="text" name="nomeCliente" class="form-control" required placeholder="Ex: Império Store">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">Link da Foto / Avatar (Opcional)</label>
                                        <input type="text" name="avatarUrl" class="form-control" placeholder="https://...">
                                    </div>
                                    <div>
                                        <label style="font-size:12px; color:#94a3b8;">Status de Pagamento</label>
                                        <select name="pago" class="form-control">
                                            <option value="true">🟢 Pago & Liberado (+30 Dias)</option>
                                            <option value="false">🔴 Pendente / Bloqueado</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-green" style="margin-top:16px; padding:12px 24px;">Salvar e Ativar Licença</button>
                            </form>
                        </div>

                        <div class="panel-box">
                            <h3>📋 Lojas e Aluguéis Ativos (\${total})</h3>
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
                        html += \`<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">Nenhuma loja cadastrada.</td></tr>\`;
                    } else {
                        clientes.forEach(c => {
                            let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                            let statusHtml = c.status === 'ativo' ? '<span class="badge badge-green">🟢 Ativo</span>' : '<span class="badge badge-red">🔴 Bloqueado</span>';
                            let pagoHtml = c.pago ? '<span class="badge badge-green">💳 Pago</span>' : '<span class="badge badge-yellow">⏳ Pendente</span>';
                            let avatar = c.avatarUrl ? \`<img src="\${c.avatarUrl}" class="avatar">\` : \`<div class="avatar" style="display:flex; align-items:center; justify-content:center; font-size:20px;">🛒</div>\`;

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
                                        <small style="color:#94a3b8; display:block; margin-top:4px;">\${c.motivoBloqueio ? 'Motivo: ' + c.motivoBloqueio : 'Sistema Operando'}</small>
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
                                            <form action="/api/remover" method="POST" style="display:inline;" onsubmit="return confirm('Excluir esta loja?');">
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

                const senhaSalva = localStorage.getItem('senha_master');
                if (senhaSalva === "${SENHA_MESTRA}") {
                    fetch('/api/dados?senha=' + encodeURIComponent(senhaSalva))
                        .then(res => res.json())
                        .then(data => {
                            if (!data.erro) renderizarDashboard(senhaSalva, data.clientes, data.manutencao);
                            else localStorage.removeItem('senha_master');
                        });
                }
            </script>
        </body>
        </html>
    `);
});

// Rotas de API do Painel Web
app.get('/api/dados', async (req, res) => {
    if (req.query.senha !== SENHA_MESTRA) return res.json({ erro: "Senha inválida" });
    const clientes = await Licenca.find().sort({ dataVencimento: 1 });
    res.json({ clientes, manutencao: global.MODO_MANUTENCAO || false });
});

app.post('/api/manutencao', (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
    global.MODO_MANUTENCAO = !global.MODO_MANUTENCAO;
    res.redirect('/master');
});

app.post('/api/salvar', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
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
    res.redirect('/master');
});

app.get('/api/renovar', async (req, res) => {
    if (req.query.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
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
    res.redirect('/master');
});

app.post('/api/bloquear', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
    const { guildId, motivo } = req.body;
    const lic = await Licenca.findOne({ guildId });
    if (lic) {
        lic.status = lic.status === 'ativo' ? 'suspenso' : 'ativo';
        lic.motivoBloqueio = lic.status === 'suspenso' ? (motivo || 'Bloqueado pelo Master') : '';
        await lic.save();
    }
    res.redirect('/master');
});

app.post('/api/remover', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
    await Licenca.findOneAndDelete({ guildId: req.body.guildId });
    res.redirect('/master');
});


// --- CONFIGURAÇÃO DO BOT DO DISCORD ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

client.commands = new Collection();
const commandsJSON = [];

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsJSON.push(command.data.toJSON());
        }
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log('✅ Comandos slash registrados globalmente!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

// EVENTO GUILD CREATE (Disparado quando o bot entra em qualquer servidor)
client.on('guildCreate', async (guild) => {
    try {
        let licenca = await Licenca.findOne({ guildId: guild.id });

        if (!licenca) {
            let vencimentoPadrao = new Date();
            vencimentoPadrao.setDate(vencimentoPadrao.getDate() + 1);

            licenca = await Licenca.create({
                guildId: guild.id,
                nomeCliente: guild.name,
                avatarUrl: guild.iconURL() || '',
                status: 'suspenso',
                pago: false,
                dataVencimento: vencimentoPadrao,
                motivoBloqueio: 'Aguardando liberação e ativação pelo Master.'
            });
        }

        const canalChat = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));
        
        if (canalChat) {
            canalChat.send(`🤖 **Robô de vendas automáticas adicionado no servidor.**
- **Estado do Robô:** 🔴 Desligado.
*Para ativar o sistema do robô de vendas automáticas acesse:* https://discord.gg/ZQzv7U3Vnw *e entre em contato para ativar.*`);
        }
    } catch (error) {
        console.error("Erro no guildCreate:", error);
    }
});

client.on('interactionCreate', async interaction => {
    if (global.MODO_MANUTENCAO && interaction.user.id !== process.env.MASTER_ID) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: '🛠️ **Sistema em manutenção temporária.**', flags: MessageFlags.Ephemeral });
        }
        return;
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Erro interno.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    // Botões do Painel Master no Discord
    if (interaction.isButton() && interaction.customId.startsWith('master_')) {
        if (interaction.user.id !== process.env.MASTER_ID) return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });

        if (interaction.customId === 'master_ver_clientes') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const clientes = await Licenca.find().sort({ dataVencimento: 1 });
            if (!clientes.length) return interaction.editReply({ content: '📋 Nenhum cliente cadastrado.' });

            const embed = new EmbedBuilder()
                .setTitle('📋 Todos os Clientes & Status de Pagamento')
                .setColor('#3498db');

            clientes.forEach((c, index) => {
                let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                embed.addFields({
                    name: `${index + 1}. ${c.status === 'ativo' ? '🟢' : '🔴'} ${c.nomeCliente} (${c.pago ? 'Pago' : 'Pendente'})`,
                    value: `🆔 \`${c.guildId}\`\n⏳ Restam: **${diasRestantes} dias**\n🔒 Motivo: \`${c.motivoBloqueio || 'Nenhum'}\``
                });
            });
            return interaction.editReply({ embeds: [embed] });
        }

        if (interaction.customId === 'master_emergencia') {
            global.MODO_MANUTENCAO = !global.MODO_MANUTENCAO;
            return interaction.reply({ content: global.MODO_MANUTENCAO ? '🚨 **TRAVA GERAL ATIVADA!**' : '✅ **SISTEMA LIBERADO!**', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'master_notas') {
            const notaAtual = await Nota.findOne({ donoId: process.env.MASTER_ID });
            const modal = new ModalBuilder().setCustomId('modal_master_notas').setTitle('Bloco de Notas');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('texto_nota').setLabel('Notas').setStyle(TextInputStyle.Paragraph).setValue(notaAtual ? notaAtual.conteudo : '').setRequired(true)));
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'master_add') {
            const modal = new ModalBuilder().setCustomId('modal_master_add').setTitle('Cadastrar Cliente');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('guild_id').setLabel('ID do Servidor').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome_cliente').setLabel('Nome do Cliente').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'master_bloquear') {
            const modal = new ModalBuilder().setCustomId('modal_master_bloquear').setTitle('Bloquear/Desbloquear com Motivo');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('guild_id').setLabel('ID do Servidor').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo do Bloqueio').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_master_bloquear') {
        if (interaction.user.id !== process.env.MASTER_ID) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const guildId = interaction.fields.getTextInputValue('guild_id').trim();
        const motivo = interaction.fields.getTextInputValue('motivo').trim();
        const lic = await Licenca.findOne({ guildId });
        if (!lic) return interaction.editReply('❌ Servidor não encontrado.');
        
        if (lic.status === 'ativo') {
            lic.status = 'suspenso';
            lic.motivoBloqueio = motivo;
        } else {
            lic.status = 'ativo';
            lic.motivoBloqueio = '';
        }
        await lic.save();
        return interaction.editReply(`🔒 Status alterado para **${lic.status}**. Motivo: ${motivo}`);
    }
});

// --- INICIALIZAÇÃO DO BANCO DE DADOS E SERVIDOR WEB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB com segurança!'))
    .catch(err => console.error('❌ Erro no MongoDB:', err));

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Painel Master e Servidor rodando em: http://127.0.0.1:${PORT}`);
});
