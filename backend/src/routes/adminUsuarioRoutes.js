const express = require('express');

const {
  listarAlunos,
  alterarPerfil
} = require('../controllers/adminUsuarioController');

const {
  autenticarToken,
  autorizarPerfis
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Listar alunos e organizadores (administrador)
router.get(
  '/alunos',
  autenticarToken,
  autorizarPerfis('administrador'),
  listarAlunos
);

// Promover / rebaixar (administrador)
router.put(
  '/:id_usuario/perfil',
  autenticarToken,
  autorizarPerfis('administrador'),
  alterarPerfil
);

module.exports = router;