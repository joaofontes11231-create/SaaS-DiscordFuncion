require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
const commandsJSON = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
    commandsJSON.push(command.data.toJSON());
}

client.once('clientReady', async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log('✅ Painéis registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }

    setInterval(async () => {
        await Licenca.updateMany(
            { status: 'ativo', dataVencimento: { $lt: new Date() } },
            { $set: { status: 'suspenso' } }
        );
    }, 3600000);
});

client.on('interactionCreate', async interaction => {
    if (global.MODO_MANUTENCAO && interaction.user.id !== process.env.MASTER_ID) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: '🛠️ **Sistema em manutenção temporária.** Tente novamente em instantes.', flags: MessageFlags.Ephemeral });
        }
        return;
    }

    // 1. Comandos Slash
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

    // 2. Botões do Painel Master
    if (interaction.isButton() && interaction.customId.startsWith('master_')) {
        if (interaction.user.id !== process.env.MASTER_ID) return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });

        if (interaction.customId === 'master_ver_clientes') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const clientes = await Licenca.find().sort({ dataVencimento: 1 });

            if (!clientes.length) {
                return interaction.editReply({ content: '📋 Nenhum cliente cadastrado no sistema no momento.' });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Aba Exclusiva: Todos os Clientes')
                .setColor('#3498db')
                .setDescription('Abaixo estão todos os clientes cadastrados, com suas datas e IDs de servidores:');

            clientes.forEach((c, index) => {
                const statusIcone = c.status === 'ativo' ? '🟢' : '🔴';
                const dataEntradaReal = c.dataEntrada ? new Date(c.dataEntrada) : new Date();
                const tsEntrada = Math.floor(dataEntradaReal.getTime() / 1000);
                
                const dataVencimentoReal = c.dataVencimento ? new Date(c.dataVencimento) : new Date();
                const tsVence = Math.floor(dataVencimentoReal.getTime() / 1000);

                embed.addFields({
                    name: `${index + 1}. ${statusIcone} ${c.nomeCliente}`,
                    value: `🆔 **ID do Servidor:** \`${c.guildId}\`\n📥 **Entrada:** <t:${tsEntrada}:d>\n⏳ **Vencimento:** <t:${tsVence}:d> (<t:${tsVence}:R>)`
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (interaction.customId === 'master_emergencia') {
            global.MODO_MANUTENCAO = !global.MODO_MANUTENCAO;
            return interaction.reply({
                content: global.MODO_MANUTENCAO ? '🚨 **TRAVA GERAL ATIVADA!** Todas as lojas foram pausadas.' : '✅ **SISTEMA LIBERADO!**',
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.customId === 'master_notas') {
            const notaAtual = await Nota.findOne({ donoId: process.env.MASTER_ID });
            const modal = new ModalBuilder().setCustomId('modal_master_notas').setTitle('Meu Bloco de Notas Privado');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('texto_nota')
                        .setLabel('Suas anotações (salva automático)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(notaAtual ? notaAtual.conteudo : '')
                        .setRequired(true)
                )
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'master_add') {
            const modal = new ModalBuilder().setCustomId('modal_master_add').setTitle('Cadastrar Novo Cliente');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('guild_id').setLabel('ID do Servidor do Cliente').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome_cliente').setLabel('Nome ou @ do Cliente').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'master_renovar' || interaction.customId === 'master_bloquear' || interaction.customId === 'master_remover') {
            const titulos = {
                master_renovar: 'Renovar Licença (+30 dias)',
                master_bloquear: 'Bloquear / Desbloquear Servidor',
                master_remover: 'Remover Cliente da Lista'
            };
            const modal = new ModalBuilder().setCustomId(`modal_${interaction.customId}`).setTitle(titulos[interaction.customId]);
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('guild_id').setLabel('ID do Servidor').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }
    }

    // 3. Respostas dos Formulários Master
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_master_')) {
        if (interaction.user.id !== process.env.MASTER_ID) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (interaction.customId === 'modal_master_notas') {
            const texto = interaction.fields.getTextInputValue('texto_nota');
            await Nota.findOneAndUpdate(
                { donoId: process.env.MASTER_ID },
                { conteudo: texto, atualizadoEm: new Date() },
                { upsert: true }
            );
            return interaction.editReply('📝 **Bloco de notas salvo com sucesso!**');
        }

        const guildId = interaction.fields.getTextInputValue('guild_id').trim();

        if (interaction.customId === 'modal_master_add') {
            const nomeCliente = interaction.fields.getTextInputValue('nome_cliente').trim();
            const agora = new Date();
            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + 30);

            await Licenca.findOneAndUpdate(
                { guildId },
                { nomeCliente, dataEntrada: agora, dataVencimento: vencimento, status: 'ativo' },
                { upsert: true }
            );
            return interaction.editReply(`✅ **${nomeCliente}** (\`${guildId}\`) adicionado por 30 dias!`);
        }

        if (interaction.customId === 'modal_master_renovar') {
            const lic = await Licenca.findOne({ guildId });
            if (!lic) return interaction.editReply('❌ Servidor não encontrado.');
            const novaData = lic.dataVencimento > new Date() ? new Date(lic.dataVencimento) : new Date();
            novaData.setDate(novaData.getDate() + 30);
            lic.dataVencimento = novaData;
            lic.status = 'ativo';
            await lic.save();
            return interaction.editReply(`🔄 **${lic.nomeCliente}** renovado por +30 dias!`);
        }

        if (interaction.customId === 'modal_master_bloquear') {
            const lic = await Licenca.findOne({ guildId });
            if (!lic) return interaction.editReply('❌ Servidor não encontrado.');
            lic.status = lic.status === 'ativo' ? 'suspenso' : 'ativo';
            await lic.save();
            return interaction.editReply(`${lic.status === 'ativo' ? '🟢 Desbloqueado' : '🔒 Bloqueado'}: **${lic.nomeCliente}** (\`${guildId}\`).`);
        }

        if (interaction.customId === 'modal_master_remover') {
            const lic = await Licenca.findOneAndDelete({ guildId });
            if (!lic) return interaction.editReply('❌ Servidor não encontrado.');
            return interaction.editReply(`🗑️ **${lic.nomeCliente}** (\`${guildId}\`) removido da lista.`);
        }
    }

    // 4. Botões do Painel da Loja do Cliente
    if (interaction.isButton() && interaction.customId.startsWith('loja_')) {
        const licenca = await Licenca.findOne({ guildId: interaction.guild.id });
        if (!licenca || licenca.status !== 'ativo' || licenca.dataVencimento < new Date()) {
            return interaction.reply({ content: '⚠️ Assinatura inativa ou vencida.', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'loja_definir_logs') {
            licenca.canalLogsId = interaction.channel.id;
            await licenca.save();
            return interaction.reply({ content: `📜 Canal <#${interaction.channel.id}> definido para receber os logs de vendas!`, flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'loja_config_mp') {
            const modal = new ModalBuilder().setCustomId('modal_loja_mp').setTitle('Configurar Mercado Pago');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('token_mp').setLabel('Access Token de Produção').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'loja_criar_prod') {
            const modal = new ModalBuilder().setCustomId('modal_loja_prod').setTitle('Criar Novo Produto');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome do Produto').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('preco').setLabel('Preço em R$ (ex: 10.50)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descricao').setLabel('Descrição do Produto').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'loja_add_estoque') {
            const modal = new ModalBuilder().setCustomId('modal_loja_estoque').setTitle('Abastecer Estoque');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome Exato do Produto').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('itens').setLabel('Cole os itens (1 por linha)').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'loja_postar_painel') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const produtos = await Produto.find({ guildId: interaction.guild.id });
            if (!produtos.length) return interaction.editReply('❌ Crie pelo menos 1 produto antes de postar a loja.');

            const embed = new EmbedBuilder()
                .setTitle(`🛒 Loja Oficial — ${interaction.guild.name}`)
                .setDescription('Escolha o produto desejado no menu abaixo para gerar o Pix automático:')
                .setColor('#00b0f4');

            const opcoes = produtos.map(p => ({
                label: `${p.nome} — R$ ${p.preco.toFixed(2)}`,
                description: `Estoque: ${p.estoque.length} un. | ${p.descricao.slice(0, 50)}`,
                value: p._id.toString()
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('selecionar_produto').setPlaceholder('Selecione um produto...').addOptions(opcoes)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply('✅ Painel de vendas postado neste canal!');
        }
    }

    // 5. Respostas dos Formulários da Loja do Cliente
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_loja_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const licenca = await Licenca.findOne({ guildId: interaction.guild.id });
        if (!licenca || licenca.status !== 'ativo') return interaction.editReply('⚠️ Assinatura inativa.');

        if (interaction.customId === 'modal_loja_mp') {
            const token = interaction.fields.getTextInputValue('token_mp').trim();
            licenca.mpTokenCriptografado = criptografar(token);
            await licenca.save();
            return interaction.editReply('🔐 Token do Mercado Pago criptografado e salvo com sucesso!');
        }

        if (interaction.customId === 'modal_loja_prod') {
            const nome = interaction.fields.getTextInputValue('nome').trim();
            const preco = parseFloat(interaction.fields.getTextInputValue('preco').replace(',', '.'));
            const descricao = interaction.fields.getTextInputValue('descricao').trim();

            if (isNaN(preco) || preco <= 0) return interaction.editReply('❌ Preço inválido.');

            await Produto.create({ guildId: interaction.guild.id, nome, preco, descricao });
            return interaction.editReply(`✅ Produto **${nome}** (R$ ${preco.toFixed(2)}) criado!`);
        }

        if (interaction.customId === 'modal_loja_estoque') {
            const nome = interaction.fields.getTextInputValue('nome').trim();
            const itensRaw = interaction.fields.getTextInputValue('itens');
            const lista = itensRaw.split('\n').map(i => i.trim()).filter(i => i.length > 0);

            const produto = await Produto.findOne({ guildId: interaction.guild.id, nome });
            if (!produto) return interaction.editReply('❌ Produto não encontrado.');

            produto.estoque.push(...lista);
            await produto.save();
            return interaction.editReply(`📦 **+${lista.length}** itens adicionados em **${nome}** (Total: ${produto.estoque.length}).`);
        }
    }

    // 6. Compra pelo Menu Público da Loja
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_produto') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const licenca = await Licenca.findOne({ guildId: interaction.guild.id });
        if (!licenca || licenca.status !== 'ativo' || licenca.dataVencimento < new Date()) {
            return interaction.editReply('⚠️ Esta loja está temporariamente suspensa.');
        }

        if (!licenca.mpTokenCriptografado) return interaction.editReply('❌ O dono desta loja ainda não configurou o Mercado Pago.');

        const produtoId = interaction.values[0];
        const produto = await Produto.findOne({ _id: produtoId, guildId: interaction.guild.id });
        if (!produto || produto.estoque.length === 0) return interaction.editReply('❌ Produto esgotado!');

        const tokenMp = descriptografar(licenca.mpTokenCriptografado);
        const pix = await criarPagamentoPix(tokenMp, produto.nome, produto.preco, `${interaction.guild.id}_${interaction.user.id}`);
        if (!pix) return interaction.editReply('❌ Erro ao gerar Pix. Verifique o Token do Mercado Pago.');

        const embedPix = new EmbedBuilder()
            .setTitle(`💠 Pagamento Pix — ${produto.nome}`)
            .setDescription(`**Valor:** R$ ${produto.preco.toFixed(2)}\n\nCopie o código **Pix Copia e Cola** abaixo e pague no banco. A entrega é automática:\n\`\`\`${pix.qrCode}\`\`\``)
            .setColor('#00ff88');

        await interaction.editReply({ embeds: [embedPix] });

        let tentativas = 0;
        const intervalo = setInterval(async () => {
            tentativas++;
            if (tentativas > 120) return clearInterval(intervalo);

            const status = await verificarPagamento(tokenMp, pix.id);
            if (status === 'approved') {
                clearInterval(intervalo);

                const produtoAtualizado = await Produto.findOneAndUpdate(
                    { _id: produtoId, 'estoque.0': { $exists: true } },
                    { $pop: { estoque: -1 } },
                    { new: false }
                );

                if (!produtoAtualizado || produtoAtualizado.estoque.length === 0) {
                    return interaction.user.send(`⚠️ Pagamento aprovado, mas o estoque acabou segundos antes. ID: \`${pix.id}\``).catch(() => {});
                }

                const itemEntregue = produtoAtualizado.estoque[0];

                const embedEntrega = new EmbedBuilder()
                    .setTitle('🎉 Compra Aprovada!')
                    .setDescription(`Obrigado por comprar na **${interaction.guild.name}**!\n\n**Produto:** ${produto.nome}\n**Produto / Key:**\n\`\`\`${itemEntregue}\`\`\``)
                    .setColor('#00ff88');

                await interaction.user.send({ embeds: [embedEntrega] }).catch(() => {
                    interaction.followUp({ content: `✅ Pagamento aprovado! Sua DM estava fechada, aqui está:\n\`\`\`${itemEntregue}\`\`\``, flags: MessageFlags.Ephemeral });
                });

                if (licenca.canalLogsId) {
                    const canalLogs = await client.channels.fetch(licenca.canalLogsId).catch(() => null);
                    if (canalLogs) {
                        const embedLog = new EmbedBuilder()
                            .setTitle('💰 Nova Venda Realizada!')
                            .addFields(
                                { name: 'Comprador', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
                                { name: 'Produto', value: produto.nome, inline: true },
                                { name: 'Valor', value: `R$ ${produto.preco.toFixed(2)}`, inline: true },
                                { name: 'ID Mercado Pago', value: `\`${pix.id}\``, inline: false }
                            )
                            .setColor('#00ff88')
                            .setTimestamp();
                        canalLogs.send({ embeds: [embedLog] }).catch(() => {});
                    }
                }
            }
        }, 5000);
    }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Conectado ao MongoDB com segurança!');
        client.login(process.env.DISCORD_TOKEN);
    })
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));
    const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Vendas Pro Online!');
}).listen(process.env.PORT || 3000);