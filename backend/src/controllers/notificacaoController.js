const pool = require('../config/database');

// ============================================================
// GET /api/notificacoes — listar notificações do usuário logado
// ============================================================

const listarNotificacoes = async (req, res) => {
  try {
    const [notificacoes] = await pool.execute(
      `SELECT
        id_notificacao,
        titulo,
        mensagem,
        data_envio,
        visualizada,
        tipo,
        id_reserva
      FROM notificacao
      WHERE id_usuario = ?
      ORDER BY data_envio DESC`,
      [req.usuario.id_usuario]
    );

    // Contagem de não visualizadas (para badge na interface)
    const naoVisualizadas = notificacoes.filter((n) => !n.visualizada).length;

    return res.json({
      success: true,
      naoVisualizadas,
      notificacoes
    });

  } catch (error) {
    console.error('Erro ao listar notificações:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/notificacoes/:id_notificacao/visualizar
// — marcar UMA notificação como visualizada
// ============================================================

const marcarComoVisualizada = async (req, res) => {
  try {
    const { id_notificacao } = req.params;

    const idNotificacao = Number(id_notificacao);

    if (!Number.isInteger(idNotificacao) || idNotificacao <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da notificação inválido'
      });
    }

    // Verifica existência E posse — não revela notificações de outros usuários
    const [notificacoes] = await pool.execute(
      'SELECT id_notificacao FROM notificacao WHERE id_notificacao = ? AND id_usuario = ?',
      [idNotificacao, req.usuario.id_usuario]
    );

    if (notificacoes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    // Idempotente: se já estiver visualizada, o UPDATE não altera nada
    // e a resposta continua sendo de sucesso
    await pool.execute(
      'UPDATE notificacao SET visualizada = true WHERE id_notificacao = ?',
      [idNotificacao]
    );

    return res.json({
      success: true,
      message: 'Notificação marcada como visualizada'
    });

  } catch (error) {
    console.error('Erro ao marcar notificação como visualizada:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/notificacoes/visualizar-todas
// — marcar TODAS as notificações do usuário como visualizadas
// ============================================================

const marcarTodasComoVisualizadas = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notificacao SET visualizada = true WHERE id_usuario = ? AND visualizada = false',
      [req.usuario.id_usuario]
    );

    return res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como visualizadas'
    });

  } catch (error) {
    console.error('Erro ao marcar notificações como visualizadas:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarNotificacoes,
  marcarComoVisualizada,
  marcarTodasComoVisualizadas
};