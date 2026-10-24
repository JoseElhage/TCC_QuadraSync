const express = require('express');

const { listarAgendaDoDia } = require('../controllers/agendaController');
const { autenticarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Consultar horários ocupados de uma data (qualquer perfil autenticado)
router.get('/', autenticarToken, listarAgendaDoDia);

module.exports = router;