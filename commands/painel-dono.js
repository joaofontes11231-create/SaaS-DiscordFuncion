// Exemplo de verificação no evento interactionCreate do seu bot:
if (interaction.commandName === 'minhaloja') {
    const licenca = await Licenca.findOne({ guildId: interaction.guild.id });

    // Verifica se o servidor está cadastrado e ativo, e se quem usou é o dono cadastrado
    if (!licenca || licenca.status !== 'ativo') {
        return interaction.reply({ 
            content: '🔴 **Sistema Bloqueado!**\nPara ativar sua loja, acesse: https://discord.gg/ZQzv7U3Vnw', 
            ephemeral: true 
        });
    }

    if (licenca.donoId && interaction.user.id !== licenca.donoId) {
        return interaction.reply({ 
            content: '❌ Apenas o **Dono da Loja** registrado pode acessar este painel.', 
            ephemeral: true 
        });
    }

    const diasRestantes = Math.ceil((new Date(licenca.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));

    return interaction.reply({
        content: `🏪 **Painel da Loja: ${licenca.nomeCliente}**\n` +
                 `• **Status:** 🟢 Ativo\n` +
                 `• **Tempo Restante:** ${diasRestantes > 0 ? diasRestantes + ' dias' : 'Expirado'}\n` +
                 `• **Vencimento:** ${new Date(licenca.dataVencimento).toLocaleDateString('pt-BR')}\n\n` +
                 `💡 *Para alterar o nome secundário (apelido) do robô no seu servidor, use \`/apelido-bot\`. O nome oficial permanece protegido.*`,
        ephemeral: true
    });
}

// Comando para o Dono mudar o Nome Secundário (Apelido no Servidor) do Bot
if (interaction.commandName === 'apelido-bot') {
    const licenca = await Licenca.findOne({ guildId: interaction.guild.id });
    if (!licenca || licenca.status !== 'ativo' || interaction.user.id !== licenca.donoId) {
        return interaction.reply({ content: '❌ Você não tem permissão ou sua licença está bloqueada.', ephemeral: true });
    }

    const novoNome = interaction.options.getString('nome');
    await interaction.guild.members.me.setNickname(novoNome);
    
    // Atualiza o nome da loja no seu Painel Master também!
    licenca.nomeCliente = novoNome;
    await licenca.save();

    return interaction.reply({ content: `✅ Apelido (nome secundário) do bot atualizado para **${novoNome}** e sincronizado com o sistema!`, ephemeral: true });
}
