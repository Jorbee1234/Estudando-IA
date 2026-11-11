// Valida req.params, req.query ou req.body com um schema zod.
// Falha: 400 { error } com a primeira mensagem (e opcoes.extra, se houver).
// Sucesso: body e query são substituídos pelo valor já convertido (campos desconhecidos saem).
function validar(parte, schema, opcoes) {
    return function(req, res, next) {
        const resultado = schema.safeParse(req[parte] === undefined ? {} : req[parte]);
        if (!resultado.success) {
            const corpo = { error: resultado.error.issues[0].message };
            return res.status(400).json(Object.assign(corpo, opcoes && opcoes.extra));
        }
        if (parte !== 'params') {
            req[parte] = resultado.data;
        }
        next();
    };
}

module.exports = validar;
