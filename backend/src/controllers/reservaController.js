const pool = require('../config/database');

// ============================================================
// Helpers de validação e formatação
// ============================================================

const MODALIDADES_VALIDAS = ['futsal', 'volei', 'basquete'];

// Valida formato AAAA-MM-DD e se é uma data real (rejeita 2025-02-30)
const validarData = (data) => {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);

  return (
    dataObj.getFullYear() === ano &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getDate() === dia
  );
};

// Aceita HH:MM ou HH:MM:SS
const validarHora = (hora) => {
  if (typeof hora !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora);
};

// Sempre devolve HH:MM:SS (formato armazenado no banco)
const normalizarHora = (hora) => (hora.length === 5 ? `${hora}:00` : hora);

// Data de hoje no servidor (fuso local), formato AAAA-MM-DD
const obterDataHoje = () => {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
};

// AAAA-MM-DD -> DD/MM/AAAA (usado apenas em mensagens de notificação)
const formatarData = (data) => {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

// HH:MM:SS -> HH:MM (usado apenas em mensagens de notificação)
const formatarHora = (hora) => hora.substring(0, 5);

// Busca a única conta de administrador ativa do sistema.
// Sempre roda dentro da transação (usa a mesma connection).
// Retorna null se não existir — tratado como erro de configuração.
const buscarAdministradorAtivo = async (connection) => {
  const [administradores] = await connection.execute(
    `SELECT id_usuario
     FROM usuario
     WHERE perfil = 'administrador' AND ativo = true
     LIMIT 1`
  );

  return administradores.length > 0 ? administradores[0] : null;
};

// ============================================================
// POST /api/reservas — criar solicitação de reserva (aluno)
// ============================================================

const criarReserva = async (req, res) => {
  try {
    const {
      data_utilizacao,
      hora_inicio,
      hora_fim,
      modalidade,
      quantidade_pessoas,
      finalidade,
      observacao
    } = req.body;

    // ---------- Validação dos dados ----------

    if (!data_utilizacao || !hora_inicio || !hora_fim || !modalidade || !quantidade_pessoas || !finalidade) {
      return res.status(400).json({
        success: false,
        message: 'Informe todos os campos obrigatórios: data_utilizacao, hora_inicio, hora_fim, modalidade, quantidade_pessoas e finalidade'
      });
    }

    if (!validarData(data_utilizacao)) {
      return res.status(400).json({
        success: false,
        message: 'Data de utilização inválida (formato esperado: AAAA-MM-DD)'
      });
    }

    if (data_utilizacao < obterDataHoje()) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível criar reserva para datas passadas'
      });
    }

    if (!validarHora(hora_inicio) || !validarHora(hora_fim)) {
      return res.status(400).json({
        success: false,
        message: 'Horário inválido (formato esperado: HH:MM)'
      });
    }

    const horaInicio = normalizarHora(hora_inicio);
    const horaFim = normalizarHora(hora_fim);

    if (horaInicio >= horaFim) {
      return res.status(400).json({
        success: false,
        message: 'A hora de início deve ser anterior à hora de fim'
      });
    }

    if (!MODALIDADES_VALIDAS.includes(modalidade)) {
      return res.status(400).json({
        success: false,
        message: 'Modalidade inválida (opções: futsal, volei ou basquete)'
      });
    }

    const quantidadePessoas = Number(quantidade_pessoas);

    if (!Number.isInteger(quantidadePessoas) || quantidadePessoas <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade de pessoas deve ser um número inteiro maior que zero'
      });
    }

    if (typeof finalidade !== 'string' || finalidade.trim().length === 0 || finalidade.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Finalidade deve ter entre 1 e 100 caracteres'
      });
    }

    if (observacao !== undefined && observacao !== null && typeof observacao !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Observação deve ser um texto'
      });
    }

    const finalidadeLimpa = finalidade.trim();
    const observacaoLimpa = (typeof observacao === 'string' && observacao.trim().length > 0)
      ? observacao.trim()
      : null;

    // ---------- Confirmar que o aluno está ativo ----------

    const [alunos] = await pool.execute(
      'SELECT nome FROM usuario WHERE id_usuario = ? AND ativo = true',
      [req.usuario.id_usuario]
    );

    if (alunos.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }

    const nomeAluno = alunos[0].nome;

    // ---------- Transação ----------

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1) Bloquear a única quadra — serializa criações concorrentes
      const [quadras] = await connection.execute(
        'SELECT id_quadra FROM quadra WHERE id_quadra = 1 FOR UPDATE'
      );

      if (quadras.length === 0) {
        await connection.rollback();

        return res.status(500).json({
          success: false,
          message: 'Quadra padrão não encontrada no sistema'
        });
      }

      // 2) Verificar conflito com agendas ativas (status = 'agendada', qualquer tipo).
      //    FOR UPDATE garante leitura do estado commitado mais recente (não do snapshot).
      const [conflitos] = await connection.execute(
        `SELECT id_agenda
         FROM agenda_quadra
         WHERE id_quadra = 1
           AND data_utilizacao = ?
           AND status = 'agendada'
           AND hora_inicio < ?
           AND hora_fim > ?
         FOR UPDATE`,
        [data_utilizacao, horaFim, horaInicio]
      );

      if (conflitos.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Já existe um agendamento para este horário'
        });
      }

      // 3) Criar nova agenda (sempre uma nova linha — nunca reutiliza canceladas)
      const [agendaResultado] = await connection.execute(
        `INSERT INTO agenda_quadra
          (data_utilizacao, hora_inicio, hora_fim, tipo, status, id_quadra)
         VALUES (?, ?, ?, 'reserva', 'agendada', 1)`,
        [data_utilizacao, horaInicio, horaFim]
      );

      const idAgenda = agendaResultado.insertId;

      // 4) Criar a reserva (status inicial: pendente, preenchido pelo DEFAULT)
      const [reservaResultado] = await connection.execute(
        `INSERT INTO reserva
          (id_agenda, id_usuario, modalidade, quantidade_pessoas, finalidade, observacao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idAgenda, req.usuario.id_usuario, modalidade, quantidadePessoas, finalidadeLimpa, observacaoLimpa]
      );

      const idReserva = reservaResultado.insertId;

      // 5) Notificar a conta de administrador (única no sistema)
      const administrador = await buscarAdministradorAtivo(connection);

      if (!administrador) {
        await connection.rollback();

        console.error('Nenhuma conta de administrador ativa encontrada no sistema');

        return res.status(500).json({
          success: false,
          message: 'Erro de configuração: nenhuma conta de administrador ativa no sistema'
        });
      }

      const tituloNotificacao = 'Nova solicitação de reserva';
      const mensagemNotificacao = `${nomeAluno} solicitou a quadra em ${formatarData(data_utilizacao)} das ${formatarHora(horaInicio)} às ${formatarHora(horaFim)} (${modalidade}).`;

      await connection.execute(
        `INSERT INTO notificacao
          (id_usuario, titulo, mensagem, tipo, id_reserva)
         VALUES (?, ?, ?, 'nova_reserva', ?)`,
        [administrador.id_usuario, tituloNotificacao, mensagemNotificacao, idReserva]
      );

      // 6) Confirmar tudo
      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Solicitação de reserva enviada com sucesso',
        reserva: {
          id_reserva: idReserva,
          id_agenda: idAgenda,
          data_utilizacao,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          modalidade,
          quantidade_pessoas: quantidadePessoas,
          finalidade: finalidadeLimpa,
          observacao: observacaoLimpa,
          status: 'pendente'
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao criar reserva:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// GET /api/reservas/minhas — listar as reservas do aluno
// ============================================================

const listarMinhasReservas = async (req, res) => {
  try {
    const [reservas] = await pool.execute(
      `SELECT
        r.id_reserva,
        a.data_utilizacao,
        a.hora_inicio,
        a.hora_fim,
        r.modalidade,
        r.quantidade_pessoas,
        r.finalidade,
        r.observacao,
        r.status,
        r.motivo_recusa,
        r.data_solicitacao,
        r.data_decisao
      FROM reserva r
      INNER JOIN agenda_quadra a ON r.id_agenda = a.id_agenda
      WHERE r.id_usuario = ?
      ORDER BY a.data_utilizacao DESC, a.hora_inicio DESC`,
      [req.usuario.id_usuario]
    );

    return res.json({
      success: true,
      reservas
    });

  } catch (error) {
    console.error('Erro ao listar reservas:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/reservas/:id_reserva/cancelar — cancelar reserva (aluno)
// ============================================================

const cancelarReserva = async (req, res) => {
  try {
    const { id_reserva } = req.params;

    const idReserva = Number(id_reserva);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da reserva inválido'
      });
    }

    // Confirmar que o aluno está ativo (nome usado na notificação)
    const [alunos] = await pool.execute(
      'SELECT nome FROM usuario WHERE id_usuario = ? AND ativo = true',
      [req.usuario.id_usuario]
    );

    if (alunos.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1) Bloquear a reserva e a agenda associada
      const [reservas] = await connection.execute(
        `SELECT
          r.id_reserva,
          r.id_usuario,
          r.status,
          a.id_agenda,
          a.data_utilizacao,
          a.hora_inicio,
          a.hora_fim
        FROM reserva r
        INNER JOIN agenda_quadra a ON r.id_agenda = a.id_agenda
        WHERE r.id_reserva = ?
        FOR UPDATE`,
        [idReserva]
      );

      // Não revela a existência de reservas de outros alunos
      if (
        reservas.length === 0 ||
        Number(reservas[0].id_usuario) !== Number(req.usuario.id_usuario)
      ) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Reserva não encontrada'
        });
      }

      const reserva = reservas[0];

      // 2) Somente pendentes ou confirmadas podem ser canceladas
      if (reserva.status !== 'pendente' && reserva.status !== 'confirmada') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Esta reserva não pode ser cancelada (status atual: ${reserva.status})`
        });
      }

      // 3) Cancelar a reserva (histórico preservado — nada é apagado)
      await connection.execute(
        'UPDATE reserva SET status = \'cancelada\' WHERE id_reserva = ?',
        [idReserva]
      );

      // 4) Cancelar a agenda associada (libera o horário)
      await connection.execute(
        'UPDATE agenda_quadra SET status = \'cancelada\' WHERE id_agenda = ?',
        [reserva.id_agenda]
      );

      // 5) Notificar a conta de administrador (única no sistema)
      const administrador = await buscarAdministradorAtivo(connection);

      if (!administrador) {
        await connection.rollback();

        console.error('Nenhuma conta de administrador ativa encontrada no sistema');

        return res.status(500).json({
          success: false,
          message: 'Erro de configuração: nenhuma conta de administrador ativa no sistema'
        });
      }

      const tituloNotificacao = 'Reserva cancelada pelo aluno';
      const mensagemNotificacao = `${alunos[0].nome} cancelou a reserva de ${formatarData(reserva.data_utilizacao)} das ${formatarHora(reserva.hora_inicio)} às ${formatarHora(reserva.hora_fim)}.`;

      await connection.execute(
        `INSERT INTO notificacao
          (id_usuario, titulo, mensagem, tipo, id_reserva)
         VALUES (?, ?, ?, 'reserva_cancelada', ?)`,
        [administrador.id_usuario, tituloNotificacao, mensagemNotificacao, idReserva]
      );

      // 6) Confirmar
      await connection.commit();

      return res.json({
        success: true,
        message: 'Reserva cancelada com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  criarReserva,
  listarMinhasReservas,
  cancelarReserva
};