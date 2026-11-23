const mongoose = require('mongoose');

const licencaSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    nomeCliente: { type: String, required: true }, // Nome da Loja / Servidor
    donoId: { type: String, default: '' },        // ID do dono que comprou
    avatarUrl: { type: String, default: '' },     // Foto do servidor/bot
    status: { type: String, default: 'suspenso' }, // 'ativo' ou 'suspenso' (Começa bloqueado por padrão!)
    pago: { type: Boolean, default: false },
    dataEntrada: { type: Date, default: Date.now },
    dataVencimento: { type: Date, required: true },
    motivoBloqueio: { type: String, default: 'Aguardando ativação do Administrador' }
});

module.exports = mongoose.model('Licenca', licencaSchema);
