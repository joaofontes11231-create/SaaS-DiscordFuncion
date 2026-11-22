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

// --- CONFIGURAÇÃO DO EXPRESS (PAINEL WEB) ---
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SENHA_MESTRA = "SB2026#Mestre99";

// Rota raiz simples para indicar que o webserver está online
app.get('/', (req, res) => {
    res.send('Bot online');
});

// Rota de Login / Painel Web Completo
app.get('/master', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Painel Executivo — SaaS Bot</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
                .container { max-width: 1000px; margin: auto; background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                h1, h2 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #0f172a; border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; font-size: 14px; }
                th { background-color: #1e293b; color: #38bdf8; }
                .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; font-size: 12px; margin: 2px; }
                .btn-green { background-color: #22c55e; color: white; }
                .btn-yellow { background-color: #eab308; color: black; }
                .btn-red { background-color: #ef4444; color: white; }
                .btn-blue { background-color: #3b82f6; color: white; }
                input, select { padding: 8px; margin: 5px 0; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 4px; width: 100%; box-sizing: border-box; }
                .card { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
            </style>
        </head>
        <body>
            <div id="app">Carregando painel...</div>
            <script>
                let senha = localStorage.getItem('senha_master');
                if (!senha || senha !== "${SENHA_MESTRA}") {
                    senha = prompt("Digite a senha do painel:");
                    if (senha === "${SENHA_MESTRA}") {
                        localStorage.setItem('senha_master', senha);
                        location.reload();
                    } else {
                        alert("Senha incorreta!");
                        document.body.innerHTML = "<h2 style='text-align:center;margin-top:100px;color:red;'>Acesso Negado</h2>";
                    }
                } else {
                    fetch('/api/dados?senha=' + encodeURIComponent(senha))
                        .then(res => res.json())
                        .then(data => {
                            if(data.erro) { alert(data.erro); localStorage.removeItem('senha_master'); location.reload(); return; }
                            
                            let html = \`<div class="container">
                                <h1>👑 Painel Executivo — SaaS Bot</h1>
                                <p>Status do Sistema: <span style="color: \${data.manutencao ? 'orange' : 'lightgreen'}">\${data.manutencao ? '🛠️ MANUTENÇÃO ATIVA' : '🟢 ONLINE'}</span></p>
                                
                                <div class="card">
                                    <h3>Ações Rápidas</h3>
                                    <form action="/api/manutencao" method="POST" style="display:inline;">
                                        <input type="hidden" name="senha" value="\${senha}">
                                        <button class="btn \${data.manutencao ? 'btn-green' : 'btn-yellow'}">\${data.manutencao ? 'Desativar Manutenção' : 'Ativar Manutenção'}</button>
                                    </form>
                                </div>

                                <div class="card">
                                    <h3>Cadastrar / Renovar Cliente</h3>
                                    <form action="/api/salvar" method="POST">
                                        <input type="hidden" name="senha" value="\${senha}">
                                        <label>ID do Servidor Discord:</label>
                                        <input type="text" name="guildId" required placeholder="Ex: 1185637652855267348">
                                        <label>Nome do Cliente:</label>
                                        <input type="text" name="nomeCliente" required placeholder="Ex: Nome ou @">
                                        <label>Status de Pagamento:</label>
                                        <select name="pago">
                                            <option value="true">🟢 Pago</option>
                                            <option value="false">🔴 Pendente</option>
                                        </select>
                                        <button class="btn btn-green" style="margin-top:10px;">Salvar / Adicionar</button>
                                    </form>
                                </div>

                                <h2>📋 Clientes Cadastrados</h2>
                                <table>
                                    <tr>
                                        <th>Cliente / Servidor</th>
                                        <th>Status / Pagamento</th>
                                        <th>Dias (Total / Restantes)</th>
                                        <th>Motivo Bloqueio</th>
                                        <th>Ações</th>
                                    </tr>\`;

                            data.clientes.forEach(c => {
                                let totalDias = Math.ceil((new Date(c.dataVencimento) - new Date(c.dataEntrada)) / (1000 * 60 * 60 * 24));
                                let diasRestantes = Math.ceil((new Date(c.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
                                let statusCor = c.status === 'ativo' ? '🟢 Ativo' : '🔴 Bloqueado';
                                let pagoStr = c.pago ? '💳 Pago' : '⏳ Pendente';

                                html += \`<tr>
                                    <td><strong>\${c.nomeCliente}</strong><br><small>\${c.guildId}</small></td>
                                    <td>\${statusCor}<br><small>\${pagoStr}</small></td>
                                    <td>Total: \${totalDias > 0 ? totalDias : 30}d<br>Restam: <strong>\${diasRestantes}d</strong></td>
                                    <td>\${c.motivoBloqueio || 'Nenhum'}</td>
                                    <td>
                                        <a href="/api/renovar?id=\${c.guildId}&senha=\${senha}" class="btn btn-blue">+30 Dias</a>
                                        <form action="/api/bloquear" method="POST" style="display:inline-block;">
                                            <input type="hidden" name="senha" value="\${senha}">
                                            <input type="hidden" name="guildId" value="\${c.guildId}">
                                            <input type="text" name="motivo" placeholder="Motivo..." style="width:100px; font-size:11px; padding:4px;" required>
                                            <button class="btn btn-yellow">\${c.status === 'ativo' ? 'Bloq' : 'Ativ'}</button>
                                        </form>
                                        <form action="/api/remover" method="POST" style="display:inline;" onsubmit="return confirm('Excluir?');">
                                            <input type="hidden" name="senha" value="\${senha}">
                                            <input type="hidden" name="guildId" value="\${c.guildId}">
                                            <button class="btn btn-red">X</button>
                                        </form>
                                    </td>
                                </tr>\`;
                            });

                            html += \`</table></div>\`;
                            document.getElementById('app').innerHTML = html;
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
    const { guildId, nomeCliente, pago } = req.body;
    const agora = new Date();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);

    await Licenca.findOneAndUpdate(
        { guildId },
        { nomeCliente, dataEntrada: agora, dataVencimento: vencimento, status: 'ativo', pago: pago === 'true', motivoBloqueio: '' },
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
        await lic.save();
    }
    res.redirect('/master');
});

app.post('/api/bloquear', async (req, res) => {
    if (req.body.senha !== SENHA_MESTRA) return res.status(403).send("Senha incorreta");
    const { guildId, motivo } = req.body;
    const lic = await Licenca.findOne({ guildId });
    if (lic) {
        if (lic.status === 'ativo') {
            lic.status = 'suspenso';
            lic.motivoBloqueio = motivo;
        } else {
            lic.status = 'ativo';
            lic.motivoBloqueio = '';
        }
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

// Banco de Dados e Servidor HTTP juntos
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro no MongoDB:', err));

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🌐 Painel Web rodando na porta ${PORT}`);
});
