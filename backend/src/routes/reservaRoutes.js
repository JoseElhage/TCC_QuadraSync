const express = require('express');

const {
  criarReserva,
  listarMinhasReservas,
  cancelarReserva
} = require('../controllers/reservaController');

const {
  autenticarToken,
  autorizarPerfis
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Criar solicitação de reserva (aluno ou organizador)
router.post('/', autenticarToken, autorizarPerfis('aluno', 'organizador'), criarReserva);

// Listar as próprias reservas (aluno ou organizador)
router.get('/minhas', autenticarToken, autorizarPerfis('aluno', 'organizador'), listarMinhasReservas);

// Cancelar reserva própria (aluno ou organizador)
router.put('/:id_reserva/cancelar', autenticarToken, autorizarPerfis('aluno', 'organizador'), cancelarReserva);

module.exports = router;