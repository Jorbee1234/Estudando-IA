// Proxy para a api-frotas, usado pelos frontends.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/frotasController');

router.get('/veiculos/disponiveis', controller.veiculosDisponiveis);
router.get('/veiculos/:placa', controller.veiculoPorPlaca);
router.get('/veiculos/:placa/disponibilidade', controller.disponibilidade);
router.get('/motoristas/:id', controller.motoristaPorId);

module.exports = router;
