// Contrato com a api-notificacoes (serviço hoje sem uso na API; payload fixado para a fase 6).
const http = require('http');

let server;
let recebido;
let status = 201;
let servico;

beforeAll((done) => {
    server = http.createServer((req, res) => {
        let corpo = '';
        req.on('data', (c) => { corpo += c; });
        req.on('end', () => {
            recebido = { method: req.method, url: req.url, corpo: JSON.parse(corpo) };
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end('{"id":1}');
        });
    });
    server.listen(0, () => {
        process.env.API_NOTIFICACOES_URL = 'http://localhost:' + server.address().port;
        servico = require('../../src/services/notificacaoService');
        done();
    });
});

afterAll((done) => { server.closeAllConnections(); server.close(done); });

const entrega = { numero_pedido: 'PED-1', origem_endereco: 'A', destino_endereco: 'B' };

test('POST /api/notificacoes com tipo, destinatario, mensagem e canal', async () => {
    await servico.notificarEntregaCriada(entrega);
    expect(recebido.method).toBe('POST');
    expect(recebido.url).toBe('/api/notificacoes');
    expect(recebido.corpo).toEqual({
        tipo: 'ENTREGA_CRIADA',
        destinatario: 'operacao@rotalog.com',
        mensagem: 'Nova entrega criada: PED-1 - De: A Para: B',
        canal: 'email'
    });
});

test('enviarNotificacao rejeita quando a api responde erro', async () => {
    status = 500;
    await expect(servico.enviarNotificacao('X', 'a@b.c', 'm')).rejects.toThrow('HTTP 500');
});

test('notificarX nunca rejeita, mesmo com falha', async () => {
    status = 500;
    await expect(servico.notificarAtraso(entrega)).resolves.toBeUndefined();
});
