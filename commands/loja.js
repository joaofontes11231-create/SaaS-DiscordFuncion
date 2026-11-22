const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Licenca = require('../models/Licenca');
const Produto = require('../models/Produto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel_loja')
        .setDescription('Abre o painel visual completo para gerenciar sua loja')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const licenca = await Licenca.findOne({ guildId: interaction.guild.id });
        if (!licenca || licenca.status !== 'ativo' || licenca.dataVencimento < new Date()) {
            return interaction.reply({ content: '⚠️ **Assinatura inativa ou vencida!** Contate o dono do bot para liberar seu acesso.', ephemeral: true });
        }

        const produtos = await Produto.find({ guildId: interaction.guild.id });
        const mpStatus = licenca.mpTokenCriptografado ? '🟢 Configurado' : '🔴 Pendente';
        const logsStatus = licenca.canalLogsId ? `<#${licenca.canalLogsId}>` : '🔴 Não definido';
        const venceTs = Math.floor(licenca.dataVencimento.getTime() / 1000);

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ Gerenciador da Loja — ${interaction.guild.name}`)
            .setDescription(`Configure sua loja inteira pelos botões abaixo:\n\n**Mercado Pago:** ${mpStatus}\n**Canal de Logs:** ${logsStatus}\n**Produtos Criados:** ${produtos.length}\n**Vencimento do Aluguel:** <t:${venceTs}:D> (<t:${venceTs}:R>)`)
            .setColor('#5865F2');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('loja_config_mp').setLabel('🔑 Token Mercado Pago').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('loja_criar_prod').setLabel('📦 Criar Produto').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('loja_add_estoque').setLabel('📥 Add Estoque').setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('loja_definir_logs').setLabel('📜 Definir Logs Aqui').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('loja_postar_painel').setLabel('🛒 Postar Loja Neste Canal').setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }
};