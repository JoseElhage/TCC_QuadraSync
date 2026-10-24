const express = require('express');

const {
  listarReservasPendentes,
  aprovarReserva,
  recusarReserva
} = require('../controllers/adminReservaController');

const {
  autenticarToken,
  autorizarPerfis
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Listar reservas pendentes (administrador)
router.get(
  '/pendentes',
  autenticarToken,
  autorizarPerfis('administrador'),
  listarReservasPendentes
);

// Aprovar reserva (administrador)
router.put(
  '/:id_reserva/aprovar',
  autenticarToken,
  autorizarPerfis('administrador'),
  aprovarReserva
);

// Recusar reserva (administrador)
router.put(
  '/:id_reserva/recusar',
  autenticarToken,
  autorizarPerfis('administrador'),
  recusarReserva
);

module.exports = router;