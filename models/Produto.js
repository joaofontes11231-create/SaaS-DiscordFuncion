const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    preco: { type: Number, required: true },
    estoque: { type: [String], default: [] }
});

module.exports = mongoose.model('Produto', produtoSchema);
