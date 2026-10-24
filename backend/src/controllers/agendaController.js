const pool = require('../config/database');

// ============================================================
// GET /api/agenda?data=YYYY-MM-DD — agendas ativas do dia
// (reservas, jogos e eventos com status 'agendada')
// ============================================================

const listarAgendaDoDia = async (req, res) => {
  try {
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Informe a data no formato AAAA-MM-DD (ex.: ?data=2025-09-20)'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({
        success: false,
        message: 'Data inválida (formato esperado: AAAA-MM-DD)'
      });
    }

    // Rejeita datas inexistentes (ex.: 2025-02-30)
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);

    if (
      dataObj.getFullYear() !== ano ||
      dataObj.getMonth() !== mes - 1 ||
      dataObj.getDate() !== dia
    ) {
      return res.status(400).json({
        success: false,
        message: 'Data inválida (a data não existe)'
      });
    }

    // Agendas ativas da única quadra na data informada.
    // Retorna apenas horário e tipo — sem dados pessoais.
    const [agendas] = await pool.execute(
      `SELECT id_agenda, hora_inicio, hora_fim, tipo
       FROM agenda_quadra
       WHERE id_quadra = 1
         AND data_utilizacao = ?
         AND status = 'agendada'
       ORDER BY hora_inicio ASC`,
      [data]
    );

    return res.json({
      success: true,
      data,
      agendas
    });

  } catch (error) {
    console.error('Erro ao listar agenda do dia:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarAgendaDoDia
};