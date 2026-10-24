const pool = require('../config/database');

// ============================================================
// GET /api/admin/reservas/pendentes — listar reservas pendentes
// ============================================================

const listarReservasPendentes = async (req, res) => {
  try {
    const [reservas] = await pool.execute(
      `SELECT
        r.id_reserva,
        u.nome,
        u.email,
        u.curso,
        u.turma,
        a.data_utilizacao,
        a.hora_inicio,
        a.hora_fim,
        r.modalidade,
        r.quantidade_pessoas,
        r.finalidade,
        r.observacao,
        r.status,
        r.data_solicitacao
      FROM reserva r
      INNER JOIN agenda_quadra a ON r.id_agenda = a.id_agenda
      INNER JOIN usuario u ON r.id_usuario = u.id_usuario
      WHERE r.status = 'pendente'
      ORDER BY r.data_solicitacao ASC`
    );

    return res.json({
      success: true,
      reservas
    });

  } catch (error) {
    console.error('Erro ao listar reservas pendentes:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/admin/reservas/:id_reserva/aprovar — aprovar reserva
// ============================================================

const aprovarReserva = async (req, res) => {
  try {
    const { id_reserva } = req.params;
    const idReserva = Number(id_reserva);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da reserva inválido'
      });
    }

    const idAprovador = req.usuario.id_usuario;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1) Bloquear a reserva e a agenda associada
      const [reservas] = await connection.execute(
        `SELECT
          r.id_reserva,
          r.id_agenda,
          r.status,
          r.id_usuario,
          a.id_quadra,
          a.data_utilizacao,
          a.hora_inicio,
          a.hora_fim
        FROM reserva r
        INNER JOIN agenda_quadra a ON r.id_agenda = a.id_agenda
        WHERE r.id_reserva = ?
        FOR UPDATE`,
        [idReserva]
      );

      if (reservas.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Reserva não encontrada'
        });
      }

      const reserva = reservas[0];

      if (reserva.status !== 'pendente') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Esta reserva não pode ser aprovada (status atual: ${reserva.status})`
        });
      }

      // 2) Verificar novamente conflito de horário com outras agendas ativas
      //    (exclui a própria agenda da reserva em análise)
      const [conflitos] = await connection.execute(
        `SELECT id_agenda
         FROM agenda_quadra
         WHERE id_quadra = ?
           AND id_agenda != ?
           AND status = 'agendada'
           AND data_utilizacao = ?
           AND hora_inicio < ?
           AND hora_fim > ?`,
        [reserva.id_quadra, reserva.id_agenda, reserva.data_utilizacao, reserva.hora_fim, reserva.hora_inicio]
      );

      if (conflitos.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Já existe um agendamento conflitante para este horário'
        });
      }

      // 3) Aprovar reserva
      await connection.execute(
        `UPDATE reserva
         SET status = 'confirmada', id_aprovador = ?, data_decisao = NOW()
         WHERE id_reserva = ?`,
        [idAprovador, idReserva]
      );

      // 4) Notificar o aluno
      const mensagemConfirmacao = `Sua reserva de ${reserva.data_utilizacao} das ${reserva.hora_inicio.substring(0, 5)} às ${reserva.hora_fim.substring(0, 5)} foi confirmada.`;

      await connection.execute(
        `INSERT INTO notificacao
          (id_usuario, titulo, mensagem, tipo, id_reserva)
         VALUES (?, ?, ?, 'reserva_confirmada', ?)`,
        [reserva.id_usuario, 'Reserva confirmada', mensagemConfirmacao, idReserva]
      );

      // 5) Confirmar transação
      await connection.commit();

      return res.json({
        success: true,
        message: 'Reserva aprovada com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao aprovar reserva:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/admin/reservas/:id_reserva/recusar — recusar reserva
// ============================================================

const recusarReserva = async (req, res) => {
  try {
    const { id_reserva } = req.params;
    const { motivo_recusa } = req.body;

    const idReserva = Number(id_reserva);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da reserva inválido'
      });
    }

    if (typeof motivo_recusa !== 'string' || motivo_recusa.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'O motivo da recusa é obrigatório'
      });
    }

    const idAprovador = req.usuario.id_usuario;
    const motivoLimpo = motivo_recusa.trim();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1) Bloquear a reserva e a agenda associada
      const [reservas] = await connection.execute(
        `SELECT
          r.id_reserva,
          r.id_agenda,
          r.status,
          r.id_usuario,
          a.id_quadra,
          a.data_utilizacao,
          a.hora_inicio,
          a.hora_fim
        FROM reserva r
        INNER JOIN agenda_quadra a ON r.id_agenda = a.id_agenda
        WHERE r.id_reserva = ?
        FOR UPDATE`,
        [idReserva]
      );

      if (reservas.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Reserva não encontrada'
        });
      }

      const reserva = reservas[0];

      if (reserva.status !== 'pendente') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Esta reserva não pode ser recusada (status atual: ${reserva.status})`
        });
      }

      // 2) Atualizar reserva como recusada
      await connection.execute(
        `UPDATE reserva
         SET status = 'recusada', motivo_recusa = ?, id_aprovador = ?, data_decisao = NOW()
         WHERE id_reserva = ?`,
        [motivoLimpo, idAprovador, idReserva]
      );

      // 3) Cancelar a agenda associada (libera o horário)
      await connection.execute(
        'UPDATE agenda_quadra SET status = \'cancelada\' WHERE id_agenda = ?',
        [reserva.id_agenda]
      );

      // 4) Notificar o aluno com o motivo da recusa
      const mensagemRecusa = `Sua reserva de ${reserva.data_utilizacao} das ${reserva.hora_inicio.substring(0, 5)} às ${reserva.hora_fim.substring(0, 5)} foi recusada. Motivo: ${motivoLimpo}`;

      await connection.execute(
        `INSERT INTO notificacao
          (id_usuario, titulo, mensagem, tipo, id_reserva)
         VALUES (?, ?, ?, 'reserva_recusada', ?)`,
        [reserva.id_usuario, 'Reserva recusada', mensagemRecusa, idReserva]
      );

      // 5) Confirmar transação
      await connection.commit();

      return res.json({
        success: true,
        message: 'Reserva recusada com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao recusar reserva:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarReservasPendentes,
  aprovarReserva,
  recusarReserva
};