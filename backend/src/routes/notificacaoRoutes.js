const express = require('express');

const {
  listarNotificacoes,
  marcarComoVisualizada,
  marcarTodasComoVisualizadas
} = require('../controllers/notificacaoController');

const { autenticarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Listar notificações do usuário logado (qualquer perfil)
router.get('/', autenticarToken, listarNotificacoes);

// Marcar todas como visualizadas (qualquer perfil)
router.put('/visualizar-todas', autenticarToken, marcarTodasComoVisualizadas);

// Marcar uma notificação específica como visualizada (qualquer perfil)
router.put('/:id_notificacao/visualizar', autenticarToken, marcarComoVisualizada);

module.exports = router;