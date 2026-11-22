const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Nota = require('../models/Nota');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('master')
        .setDescription('Abre seu Painel Privado de Controle e Bloco de Notas (Exclusivo Dono)'),

    async execute(interaction) {
        if (interaction.user.id !== process.env.MASTER_ID) {
            return interaction.reply({ content: '❌ Acesso negado.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const notaDoc = await Nota.findOne({ donoId: process.env.MASTER_ID });

        const embed = new EmbedBuilder()
            .setTitle('👑 Painel Executivo — Controle de Aluguéis')
            .setDescription(`**Status do Sistema:** ${global.MODO_MANUTENCAO ? '🚨 BLOQUEADO (MANUTENÇÃO)' : '🟢 ONLINE'}\n\nEscolha uma das opções abaixo para gerenciar seus clientes, ver a lista completa em uma aba exclusiva, editar notas ou controlar o sistema.`)
            .addFields({
                name: '📝 Meu Bloco de Notas Privado',
                value: `\`\`\`${notaDoc ? notaDoc.conteudo : 'Clique em Editar Notas para salvar seus lembretes...'}\`\`\``
            })
            .setColor('#2b2d31');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('master_ver_clientes').setLabel('📋 Ver Todos os Clientes').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('master_add').setLabel('➕ Novo Cliente').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('master_renovar').setLabel('🔄 Renovar (+30d)').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('master_bloquear').setLabel('🔒 Bloquear / Ativar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('master_remover').setLabel('🗑️ Remover Cliente').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('master_notas').setLabel('📝 Editar Notas').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('master_emergencia').setLabel('🚨 Trava Geral').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
    }
};
