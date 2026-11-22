const axios = require('axios');

async function criarPagamentoPix(tokenMp, titulo, valor, externalReference) {
    try {
        const response = await axios.post('https://api.mercadopago.com/v1/payments', {
            transaction_amount: Number(valor),
            description: titulo,
            payment_method_id: 'pix',
            payer: { email: 'cliente@gmail.com' },
            external_reference: externalReference
        }, {
            headers: {
                'Authorization': `Bearer ${tokenMp}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            id: response.data.id,
            qrCode: response.data.point_of_interaction.transaction_data.qr_code,
            qrCodeBase64: response.data.point_of_interaction.transaction_data.qr_code_base64
        };
    } catch (error) {
        console.error("Erro ao gerar Pix no MP:", error.response?.data || error.message);
        return null;
    }
}

async function verificarPagamento(tokenMp, paymentId) {
    try {
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${tokenMp}`
            }
        });
        return response.data.status;
    } catch (error) {
        return null;
    }
}

module.exports = { criarPagamentoPix, verificarPagamento };