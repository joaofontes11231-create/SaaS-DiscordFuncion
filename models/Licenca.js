const mongoose = require('mongoose');

const licencaSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    nomeCliente: { type: String, required: true },
    dataEntrada: { type: Date, default: Date.now },
    dataVencimento: { type: Date, required: true },
    mpTokenCriptografado: { type: String, default: "" },
    canalLogsId: { type: String, default: "" },
    status: { type: String, enum: ['ativo', 'suspenso'], default: 'ativo' },
    pago: { type: Boolean, default: true },          // 👈 Adicionado para o painel web
    motivoBloqueio: { type: String, default: '' }     // 👈 Adicionado para a barra de motivo
});

module.exports = mongoose.model('Licenca', licencaSchema);
