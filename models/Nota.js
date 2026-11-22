const mongoose = require('mongoose');

const notaSchema = new mongoose.Schema({
    donoId: { type: String, required: true, unique: true },
    conteudo: { type: String, default: "Nenhuma anotação salva ainda." },
    atualizadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Nota', notaSchema);
