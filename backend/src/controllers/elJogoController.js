const pool = require('../config/database');

// ============================================================
// Constantes e helpers (ETEC League — jogos, fases, chaveamento)
// ============================================================

const PONTOS_VITORIA = 3;
const PONTOS_EMPATE = 1;
const PONTOS_DERROTA = 0;

const FASES_MATA_MATA = ['quartas', 'semifinal', 'final'];

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

const validarHora = (hora) => {
  if (typeof hora !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora);
};

const normalizarHora = (hora) => (hora.length === 5 ? `${hora}:00` : hora);

const calcularHoraFimPadrao = (horaInicio) => {
  const [hora, minuto, segundo] = horaInicio.split(':').map(Number);

  if (hora + 1 > 23) {
    return null;
  }

  return `${String(hora + 1).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:${String(segundo).padStart(2, '0')}`;
};

const obterDataHoje = () => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Determina o vencedor de uma linha de jogo (placar, pênaltis ou W.O.)
const determinarVencedor = (j) => {
  if (j.id_equipe_wo !== null && j.id_equipe_wo !== undefined) {
    return j.id_equipe_wo === j.id_equipe1 ? j.id_equipe2 : j.id_equipe1;
  }

  if (j.placar_equipe1 > j.placar_equipe2) return j.id_equipe1;
  if (j.placar_equipe2 > j.placar_equipe1) return j.id_equipe2;

  if (j.placar_penaltis_equipe1 !== null && j.placar_penaltis_equipe2 !== null) {
    return j.placar_penaltis_equipe1 > j.placar_penaltis_equipe2 ? j.id_equipe1 : j.id_equipe2;
  }

  return null;
};

// Valida placar por modalidade e fase.
// Retorna { erro } ou { penaltis1, penaltis2 }
const validarPlacar = (modalidade, fase, p1, p2, temPenaltis, pen1, pen2) => {
  const empate = p1 === p2;

  if (temPenaltis && !empate) {
    return { erro: 'Pênaltis só podem ser informadas em caso de empate' };
  }

  if (empate) {
    if (fase === 'grupo') {
      if (temPenaltis) {
        return { erro: 'Pênaltis não existem na fase de grupos — empate vale 1 ponto para cada' };
      }

      return { penaltis1: null, penaltis2: null };
    }

    // Mata-mata: alguém precisa avançar
    if (modalidade === 'volei') {
      return { erro: 'Jogos de vôlei não podem terminar empatados' };
    }

    if (modalidade === 'basquete') {
      return { erro: 'No mata-mata do basquete não há empate — informe o placar final já com a prorrogação' };
    }

    if (modalidade !== 'futsal') {
      return { erro: 'Empate não permitido no mata-mata desta modalidade' };
    }

    if (!temPenaltis) {
      return { erro: 'Empate no mata-mata do futsal: informe a disputa de pênaltis' };
    }

    if (pen1 === pen2) {
      return { erro: 'Os pênaltis devem ter um vencedor (placares diferentes)' };
    }

    return { penaltis1: pen1, penaltis2: pen2 };
  }

  if (temPenaltis) {
    return { erro: 'Pênaltis só podem ser informadas em caso de empate' };
  }

  if (modalidade === 'volei') {
    const vencedor = Math.max(p1, p2);
    const perdedor = Math.min(p1, p2);

    if (vencedor !== 2 || perdedor > 1) {
      return { erro: 'Vôlei é melhor de 3 sets: o placar deve ser 2x0 ou 2x1' };
    }
  }

  return { penaltis1: null, penaltis2: null };
};

// Calcula a tabela da FASE DE GRUPOS (usada pela classificação e pelo chaveamento)
// Aceita pool ou connection (ambos têm .execute)
const calcularTabelaClassificacao = async (db, idCampeonato) => {
  const [equipes] = await db.execute(
    `SELECT e.id_equipe, e.nome, e.escudo_url
     FROM campeonato_equipe ce
     INNER JOIN equipe e ON ce.id_equipe = e.id_equipe
     WHERE ce.id_campeonato = ?
     ORDER BY e.nome ASC`,
    [idCampeonato]
  );

  const [jogos] = await db.execute(
    `SELECT id_equipe1, id_equipe2, placar_equipe1, placar_equipe2, id_equipe_wo
     FROM jogo
     WHERE id_campeonato = ? AND fase = 'grupo' AND status = 'finalizado'`,
    [idCampeonato]
  );

  const tabela = {};

  equipes.forEach((equipe) => {
    tabela[equipe.id_equipe] = {
      id_equipe: equipe.id_equipe,
      nome: equipe.nome,
      escudo_url: equipe.escudo_url,
      pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      gols_pro: 0, gols_sofridos: 0
    };
  });

  jogos.forEach((jogo) => {
    const casa = tabela[jogo.id_equipe1];
    const fora = tabela[jogo.id_equipe2];

    if (!casa || !fora) return;

    casa.jogos += 1;
    fora.jogos += 1;

    // W.O.: 3 pontos para quem compareceu, 0 para quem faltou (sem placar)
    if (jogo.id_equipe_wo !== null && jogo.id_equipe_wo !== undefined) {
      if (jogo.id_equipe_wo === jogo.id_equipe1) {
        fora.pontos += PONTOS_VITORIA; fora.vitorias += 1;
        casa.pontos += PONTOS_DERROTA; casa.derrotas += 1;
      } else {
        casa.pontos += PONTOS_VITORIA; casa.vitorias += 1;
        fora.pontos += PONTOS_DERROTA; fora.derrotas += 1;
      }

      return;
    }

    if (jogo.placar_equipe1 === null || jogo.placar_equipe2 === null) return;

    const gols1 = jogo.placar_equipe1;
    const gols2 = jogo.placar_equipe2;

    casa.gols_pro += gols1; casa.gols_sofridos += gols2;
    fora.gols_pro += gols2; fora.gols_sofridos += gols1;

    if (gols1 > gols2) {
      casa.pontos += PONTOS_VITORIA; casa.vitorias += 1;
      fora.pontos += PONTOS_DERROTA; fora.derrotas += 1;
    } else if (gols2 > gols1) {
      fora.pontos += PONTOS_VITORIA; fora.vitorias += 1;
      casa.pontos += PONTOS_DERROTA; casa.derrotas += 1;
    } else {
      casa.pontos += PONTOS_EMPATE; fora.pontos += PONTOS_EMPATE;
      casa.empates += 1; fora.empates += 1;
    }
  });

  return Object.values(tabela)
    .map((linha) => ({ ...linha, saldo: linha.gols_pro - linha.gols_sofridos }))
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.saldo !== a.saldo) return b.saldo - a.saldo;
      if (b.gols_pro !== a.gols_pro) return b.gols_pro - a.gols_pro;
      return a.nome.localeCompare(b.nome);
    })
    .map((linha, indice) => ({ posicao: indice + 1, ...linha }));
};

// Dentro da transação de resultado/W.O.: gera a próxima fase ou coroa o campeão
const avancarFaseOuCoroarCampeao = async (connection, idCampeonato, fase) => {
  if (!FASES_MATA_MATA.includes(fase)) return;

  const [jogosFase] = await connection.execute(
    `SELECT id_jogo, id_equipe1, id_equipe2, placar_equipe1, placar_equipe2,
            placar_penaltis_equipe1, placar_penaltis_equipe2, id_equipe_wo, status
     FROM jogo
     WHERE id_campeonato = ? AND fase = ?
     ORDER BY id_jogo ASC`,
    [idCampeonato, fase]
  );

  // Fase ainda não está completa
  if (jogosFase.some((j) => j.status !== 'finalizado')) return;

  const vencedores = jogosFase.map(determinarVencedor);

  if (vencedores.some((v) => v === null)) return; // proteção

  if (fase === 'quartas') {
    // Semifinais: vencedor do 1º jogo x vencedor do 4º; 2º x 3º
    const confrontos = [
      [vencedores[0], vencedores[3]],
      [vencedores[1], vencedores[2]]
    ];

    for (const [eq1, eq2] of confrontos) {
      await connection.execute(
        `INSERT INTO jogo (id_agenda, id_campeonato, id_equipe1, id_equipe2, fase, status)
         VALUES (NULL, ?, ?, ?, 'semifinal', 'definido')`,
        [idCampeonato, eq1, eq2]
      );
    }

    return;
  }

  if (fase === 'semifinal') {
    await connection.execute(
      `INSERT INTO jogo (id_agenda, id_campeonato, id_equipe1, id_equipe2, fase, status)
       VALUES (NULL, ?, ?, ?, 'final', 'definido')`,
      [idCampeonato, vencedores[0], vencedores[1]]
    );

    return;
  }

  if (fase === 'final') {
    await connection.execute(
      `UPDATE campeonato SET id_campeao = ?, status = 'encerrado' WHERE id_campeonato = ?`,
      [vencedores[0], idCampeonato]
    );
  }
};

// Encerra a agenda de um jogo cujo horário já passou
const concluirAgendaSePassado = async (connection, idAgenda) => {
  if (idAgenda === null || idAgenda === undefined) return;

  await connection.execute(
    `UPDATE agenda_quadra SET status = 'concluida'
     WHERE id_agenda = ?
       AND CONCAT(data_utilizacao, ' ', hora_fim) <= NOW()`,
    [idAgenda]
  );
};
// Dentro da transação: campeonato 'planejado' vira 'andamento'.
// Idempotente — quem já está 'andamento' ou 'encerrado' não é tocado,
// e o status nunca volta.
const promoverParaAndamento = async (connection, idCampeonato) => {
  await connection.execute(
    `UPDATE campeonato SET status = 'andamento' WHERE id_campeonato = ? AND status = 'planejado'`,
    [idCampeonato]
  );
};

// ============================================================
// GET /api/el/campeonatos/:id_campeonato/jogos
// ============================================================

const listarJogos = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const [jogos] = await pool.execute(
      `SELECT
        j.id_jogo,
        j.fase,
        j.status,
        j.placar_equipe1,
        j.placar_equipe2,
        j.placar_penaltis_equipe1,
        j.placar_penaltis_equipe2,
        j.id_equipe_wo,
        a.id_agenda,
        a.data_utilizacao,
        a.hora_inicio,
        a.hora_fim,
        e1.id_equipe AS id_equipe1,
        e1.nome AS nome_equipe1,
        e1.escudo_url AS escudo_equipe1,
        e2.id_equipe AS id_equipe2,
        e2.nome AS nome_equipe2,
        e2.escudo_url AS escudo_equipe2,
        ewo.nome AS nome_equipe_wo
      FROM jogo j
      LEFT JOIN agenda_quadra a ON j.id_agenda = a.id_agenda
      INNER JOIN equipe e1 ON j.id_equipe1 = e1.id_equipe
      INNER JOIN equipe e2 ON j.id_equipe2 = e2.id_equipe
      LEFT JOIN equipe ewo ON j.id_equipe_wo = ewo.id_equipe
      WHERE j.id_campeonato = ?
        AND j.status <> 'cancelado'
      ORDER BY
        CASE j.fase
          WHEN 'grupo' THEN 0
          WHEN 'quartas' THEN 1
          WHEN 'semifinal' THEN 2
          WHEN 'final' THEN 3
          ELSE 4
        END ASC,
        a.data_utilizacao ASC,
        j.id_jogo ASC`,
      [idCampeonato]
    );

    return res.json({
      success: true,
      jogos
    });

  } catch (error) {
    console.error('Erro ao listar jogos:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// POST /api/el/campeonatos/:id_campeonato/jogos (organizador)
// Cria jogo da FASE DE GRUPOS. Data passada exige resultado
// (normal ou W.O.) na criação — o jogo já nasce finalizado.
// ============================================================

const criarJogo = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const {
      id_equipe1, id_equipe2,
      data_utilizacao, hora_inicio, hora_fim,
      placar_equipe1, placar_equipe2,
      id_equipe_wo
    } = req.body;

    const equipe1 = Number(id_equipe1);
    const equipe2 = Number(id_equipe2);

    if (!Number.isInteger(equipe1) || equipe1 <= 0 ||
        !Number.isInteger(equipe2) || equipe2 <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selecione as duas equipes'
      });
    }

    if (equipe1 === equipe2) {
      return res.status(400).json({
        success: false,
        message: 'As duas equipes devem ser diferentes'
      });
    }

    if (!validarData(data_utilizacao)) {
      return res.status(400).json({
        success: false,
        message: 'Data do jogo inválida (formato: AAAA-MM-DD)'
      });
    }

    if (!validarHora(hora_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'Horário de início inválido (formato: HH:MM)'
      });
    }

    const horaInicio = normalizarHora(hora_inicio);

    let horaFim;

    if (hora_fim !== undefined && hora_fim !== null && hora_fim !== '') {
      if (!validarHora(hora_fim)) {
        return res.status(400).json({
          success: false,
          message: 'Horário de fim inválido (formato: HH:MM)'
        });
      }

      horaFim = normalizarHora(hora_fim);
    } else {
      horaFim = calcularHoraFimPadrao(horaInicio);
    }

    if (horaFim === null || horaFim <= horaInicio) {
      return res.status(400).json({
        success: false,
        message: 'O horário de fim deve ser posterior ao horário de início'
      });
    }

    const retroativo = data_utilizacao < obterDataHoje();

    // ----- Validação do resultado (obrigatório em jogo retroativo) -----

    const informouWO = id_equipe_wo !== undefined && id_equipe_wo !== null;
    const informouPlacar = placar_equipe1 !== undefined && placar_equipe2 !== undefined;

    if (retroativo && !informouWO && !informouPlacar) {
      return res.status(400).json({
        success: false,
        message: 'Jogo em data passada: informe o resultado (placar ou W.O.) na criação'
      });
    }

    if (!retroativo && (informouWO || informouPlacar)) {
      return res.status(400).json({
        success: false,
        message: 'Resultado só pode ser informado na criação de jogos em datas passadas'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [campeonatos] = await connection.execute(
        'SELECT id_campeonato, status, modalidade FROM campeonato WHERE id_campeonato = ? FOR UPDATE',
        [idCampeonato]
      );

      if (campeonatos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Campeonato não encontrado'
        });
      }

      const modalidade = campeonatos[0].modalidade;

      if (campeonatos[0].status === 'encerrado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Não é possível criar jogos em um campeonato encerrado'
        });
      }

      const [inscricoes] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM campeonato_equipe
         WHERE id_campeonato = ? AND id_equipe IN (?, ?)`,
        [idCampeonato, equipe1, equipe2]
      );

      if (inscricoes[0].total < 2) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'As duas equipes precisam estar inscritas neste campeonato'
        });
      }

      let placar1 = null;
      let placar2 = null;
      let equipeWO = null;

      if (informouWO) {
        equipeWO = Number(id_equipe_wo);

        if (equipeWO !== equipe1 && equipeWO !== equipe2) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'A equipe do W.O. deve ser uma das duas do jogo'
          });
        }
      }

      if (informouPlacar) {
        placar1 = Number(placar_equipe1);
        placar2 = Number(placar_equipe2);

        if (!Number.isInteger(placar1) || placar1 < 0 ||
            !Number.isInteger(placar2) || placar2 < 0) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Os placares devem ser inteiros maiores ou iguais a zero'
          });
        }

        const validacao = validarPlacar(modalidade, 'grupo', placar1, placar2, false, null, null);

        if (validacao.erro) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: validacao.erro
          });
        }
      }

      // ----- Agenda -----
      // Jogo futuro: agenda 'agendada' com verificação de conflito (bloqueia a quadra).
      // Jogo retroativo: agenda 'concluida', sem verificação (o passado já aconteceu).

      let idAgenda;

      if (!retroativo) {
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

        const [conflitos] = await connection.execute(
          `SELECT id_agenda FROM agenda_quadra
           WHERE id_quadra = 1 AND data_utilizacao = ? AND status = 'agendada'
             AND hora_inicio < ? AND hora_fim > ?`,
          [data_utilizacao, horaFim, horaInicio]
        );

        if (conflitos.length > 0) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: 'Já existe um agendamento para este horário'
          });
        }

        const [agendaResultado] = await connection.execute(
          `INSERT INTO agenda_quadra (data_utilizacao, hora_inicio, hora_fim, tipo, status, id_quadra)
           VALUES (?, ?, ?, 'jogo', 'agendada', 1)`,
          [data_utilizacao, horaInicio, horaFim]
        );

        idAgenda = agendaResultado.insertId;
      } else {
        const [agendaResultado] = await connection.execute(
          `INSERT INTO agenda_quadra (data_utilizacao, hora_inicio, hora_fim, tipo, status, id_quadra)
           VALUES (?, ?, ?, 'jogo', 'concluida', 1)`,
          [data_utilizacao, horaInicio, horaFim]
        );

        idAgenda = agendaResultado.insertId;
      }

      const statusJogo = retroativo ? 'finalizado' : 'agendado';

      const [jogoResultado] = await connection.execute(
        `INSERT INTO jogo
          (id_agenda, id_campeonato, id_equipe1, id_equipe2, fase, status,
           placar_equipe1, placar_equipe2, id_equipe_wo, resultado_solicitado)
         VALUES (?, ?, ?, ?, 'grupo', ?, ?, ?, ?, ?)`,
        [idAgenda, idCampeonato, equipe1, equipe2, statusJogo, placar1, placar2, equipeWO, retroativo]
      );

      // Jogo retroativo já aconteceu: o campeonato entra em andamento
      if (retroativo) {
        await promoverParaAndamento(connection, idCampeonato);
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: retroativo
          ? 'Jogo retroativo registrado com resultado'
          : 'Jogo criado com sucesso',
        jogo: {
          id_jogo: jogoResultado.insertId,
          id_agenda: idAgenda,
          id_campeonato: idCampeonato,
          fase: 'grupo',
          status: statusJogo
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao criar jogo:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/el/jogos/:id_jogo/agendar (organizador)
// Agenda um jogo do chaveamento ('definido') ou REAGENDA
// ('agendado'/'adiado') — edita a agenda existente (reutiliza)
// ============================================================

const agendarJogo = async (req, res) => {
  try {
    const idJogo = Number(req.params.id_jogo);

    if (!Number.isInteger(idJogo) || idJogo <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do jogo inválido'
      });
    }

    const { data_utilizacao, hora_inicio, hora_fim } = req.body;

    if (!validarData(data_utilizacao)) {
      return res.status(400).json({
        success: false,
        message: 'Data do jogo inválida (formato: AAAA-MM-DD)'
      });
    }

    if (data_utilizacao < obterDataHoje()) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível agendar jogos em datas passadas'
      });
    }

    if (!validarHora(hora_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'Horário de início inválido (formato: HH:MM)'
      });
    }

    const horaInicio = normalizarHora(hora_inicio);

    let horaFim;

    if (hora_fim !== undefined && hora_fim !== null && hora_fim !== '') {
      if (!validarHora(hora_fim)) {
        return res.status(400).json({
          success: false,
          message: 'Horário de fim inválido (formato: HH:MM)'
        });
      }

      horaFim = normalizarHora(hora_fim);
    } else {
      horaFim = calcularHoraFimPadrao(horaInicio);
    }

    if (horaFim === null || horaFim <= horaInicio) {
      return res.status(400).json({
        success: false,
        message: 'O horário de fim deve ser posterior ao horário de início'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [jogos] = await connection.execute(
        `SELECT j.id_jogo, j.status, j.id_agenda
         FROM jogo j
         WHERE j.id_jogo = ?
         FOR UPDATE`,
        [idJogo]
      );

      if (jogos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Jogo não encontrado'
        });
      }

      const jogo = jogos[0];

      if (jogo.status !== 'definido' && jogo.status !== 'agendado' && jogo.status !== 'adiado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Este jogo não pode ser agendado (status atual: ${jogo.status})`
        });
      }

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

      // Conflito: ignora a própria agenda do jogo (reagendamento)
      const [conflitos] = await connection.execute(
        `SELECT id_agenda FROM agenda_quadra
         WHERE id_quadra = 1 AND data_utilizacao = ? AND status = 'agendada'
           AND hora_inicio < ? AND hora_fim > ?
           AND id_agenda <> ?`,
        [data_utilizacao, horaFim, horaInicio, jogo.id_agenda !== null ? jogo.id_agenda : -1]
      );

      if (conflitos.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Já existe um agendamento para este horário'
        });
      }

      if (jogo.id_agenda === null) {
        // Jogo do chaveamento sem agenda: cria
        const [agendaResultado] = await connection.execute(
          `INSERT INTO agenda_quadra (data_utilizacao, hora_inicio, hora_fim, tipo, status, id_quadra)
           VALUES (?, ?, ?, 'jogo', 'agendada', 1)`,
          [data_utilizacao, horaInicio, horaFim]
        );

        await connection.execute(
          'UPDATE jogo SET id_agenda = ?, status = \'agendado\' WHERE id_jogo = ?',
          [agendaResultado.insertId, idJogo]
        );
      } else {
        // Reagendamento: edita a MESMA agenda (reutiliza o registro)
        await connection.execute(
          `UPDATE agenda_quadra
           SET data_utilizacao = ?, hora_inicio = ?, hora_fim = ?, status = 'agendada'
           WHERE id_agenda = ?`,
          [data_utilizacao, horaInicio, horaFim, jogo.id_agenda]
        );

        await connection.execute(
          'UPDATE jogo SET status = \'agendado\' WHERE id_jogo = ?',
          [idJogo]
        );
      }

      await connection.commit();

      return res.json({
        success: true,
        message: 'Jogo agendado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao agendar jogo:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/el/jogos/:id_jogo/resultado (organizador)
// Registra ou CORRIGI o resultado (edita o mesmo jogo).
// ============================================================

const registrarResultado = async (req, res) => {
  try {
    const idJogo = Number(req.params.id_jogo);

    if (!Number.isInteger(idJogo) || idJogo <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do jogo inválido'
      });
    }

    const {
      placar_equipe1, placar_equipe2,
      placar_penaltis_equipe1, placar_penaltis_equipe2
    } = req.body;

    const placar1 = Number(placar_equipe1);
    const placar2 = Number(placar_equipe2);

    if (!Number.isInteger(placar1) || placar1 < 0 ||
        !Number.isInteger(placar2) || placar2 < 0) {
      return res.status(400).json({
        success: false,
        message: 'Os placares devem ser inteiros maiores ou iguais a zero'
      });
    }

    const temPenaltis =
      (placar_penaltis_equipe1 !== undefined && placar_penaltis_equipe1 !== null) ||
      (placar_penaltis_equipe2 !== undefined && placar_penaltis_equipe2 !== null);

    let penaltis1 = null;
    let penaltis2 = null;

    if (temPenaltis) {
      penaltis1 = Number(placar_penaltis_equipe1);
      penaltis2 = Number(placar_penaltis_equipe2);

      if (!Number.isInteger(penaltis1) || penaltis1 < 0 ||
          !Number.isInteger(penaltis2) || penaltis2 < 0) {
        return res.status(400).json({
          success: false,
          message: 'Os placares de pênaltis devem ser inteiros maiores ou iguais a zero'
        });
      }
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [jogos] = await connection.execute(
        `SELECT j.id_jogo, j.fase, j.status, j.id_agenda,
                c.modalidade, c.id_campeonato
         FROM jogo j
         INNER JOIN campeonato c ON j.id_campeonato = c.id_campeonato
         WHERE j.id_jogo = ?
         FOR UPDATE`,
        [idJogo]
      );

      if (jogos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Jogo não encontrado'
        });
      }

      const jogo = jogos[0];

      if (jogo.status === 'cancelado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Não é possível registrar resultado de um jogo cancelado'
        });
      }

      // Correção de resultado já registrado: só se a próxima fase ainda não existe
      if (jogo.status === 'finalizado') {
        const bloqueio = await verificarProximaFaseExiste(connection, jogo.id_campeonato, jogo.fase);

        if (bloqueio) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: 'Não é possível corrigir: a próxima fase do chaveamento já foi gerada com base neste resultado'
          });
        }
      }

      const validacao = validarPlacar(jogo.modalidade, jogo.fase, placar1, placar2, temPenaltis, penaltis1, penaltis2);

      if (validacao.erro) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: validacao.erro
        });
      }

      await connection.execute(
        `UPDATE jogo
         SET placar_equipe1 = ?, placar_equipe2 = ?,
             placar_penaltis_equipe1 = ?, placar_penaltis_equipe2 = ?,
             id_equipe_wo = NULL,
             status = 'finalizado'
         WHERE id_jogo = ?`,
        [placar1, placar2, validacao.penaltis1, validacao.penaltis2, idJogo]
      );

      await promoverParaAndamento(connection, jogo.id_campeonato);
      // Agenda: conclui se o horário já passou (futuro continua bloqueando a quadra)
      await concluirAgendaSePassado(connection, jogo.id_agenda);

      // Avanço automático do chaveamento
      await avancarFaseOuCoroarCampeao(connection, jogo.id_campeonato, jogo.fase);

      await connection.commit();

      return res.json({
        success: true,
        message: 'Resultado registrado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao registrar resultado:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Verifica se a próxima fase do chaveamento já foi gerada (bloqueia correção)
const verificarProximaFaseExiste = async (connection, idCampeonato, fase) => {
  let proxima = null;

  if (fase === 'quartas') proxima = 'semifinal';
  if (fase === 'semifinal') proxima = 'final';

  if (proxima) {
    const [existentes] = await connection.execute(
      'SELECT COUNT(*) AS total FROM jogo WHERE id_campeonato = ? AND fase = ?',
      [idCampeonato, proxima]
    );

    return existesTotal(existentes) > 0;
  }

  if (fase === 'final') {
    const [campeonatos] = await connection.execute(
      'SELECT id_campeao FROM campeonato WHERE id_campeonato = ?',
      [idCampeonato]
    );

    return campeonatos[0].id_campeao !== null;
  }

  return false;
};

const existesTotal = (linhas) => linhas[0].total;

// ============================================================
// PUT /api/el/jogos/:id_jogo/wo (organizador)
// Registra W.O.: equipe ausente não pontua; presente vence
// ============================================================

const registrarWO = async (req, res) => {
  try {
    const idJogo = Number(req.params.id_jogo);

    if (!Number.isInteger(idJogo) || idJogo <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do jogo inválido'
      });
    }

    const { id_equipe_wo } = req.body;

    const equipeWO = Number(id_equipe_wo);

    if (!Number.isInteger(equipeWO) || equipeWO <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe a equipe que não compareceu'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [jogos] = await connection.execute(
        `SELECT j.id_jogo, j.status, j.fase, j.id_agenda, j.id_equipe1, j.id_equipe2, j.id_campeonato
         FROM jogo j
         WHERE j.id_jogo = ?
         FOR UPDATE`,
        [idJogo]
      );

      if (jogos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Jogo não encontrado'
        });
      }

      const jogo = jogos[0];

      if (jogo.status === 'finalizado' || jogo.status === 'cancelado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Não é possível registrar W.O. (status atual: ${jogo.status})`
        });
      }

      if (equipeWO !== jogo.id_equipe1 && equipeWO !== jogo.id_equipe2) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: 'A equipe do W.O. deve ser uma das duas do jogo'
        });
      }

      await connection.execute(
        `UPDATE jogo
         SET id_equipe_wo = ?, placar_equipe1 = NULL, placar_equipe2 = NULL,
             placar_penaltis_equipe1 = NULL, placar_penaltis_equipe2 = NULL,
             status = 'finalizado'
         WHERE id_jogo = ?`,
        [equipeWO, idJogo]
      );

      await promoverParaAndamento(connection, jogo.id_campeonato);
      await concluirAgendaSePassado(connection, jogo.id_agenda);
      await avancarFaseOuCoroarCampeao(connection, jogo.id_campeonato, jogo.fase);

      await connection.commit();

      return res.json({
        success: true,
        message: 'W.O. registrado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao registrar W.O.:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/el/jogos/:id_jogo/cancelar (organizador)
// Só fase de grupos (cancelar mata-mata quebraria o chaveamento)
// ============================================================

const cancelarJogo = async (req, res) => {
  try {
    const idJogo = Number(req.params.id_jogo);

    if (!Number.isInteger(idJogo) || idJogo <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do jogo inválido'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [jogos] = await connection.execute(
        `SELECT j.id_jogo, j.status, j.fase, j.id_agenda
         FROM jogo j
         WHERE j.id_jogo = ?
         FOR UPDATE`,
        [idJogo]
      );

      if (jogos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Jogo não encontrado'
        });
      }

      const jogo = jogos[0];

      if (FASES_MATA_MATA.includes(jogo.fase)) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Jogos do chaveamento não podem ser cancelados — use W.O. se uma equipe faltou'
        });
      }

      if (jogo.status === 'finalizado' || jogo.status === 'cancelado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Este jogo não pode ser cancelado (status atual: ${jogo.status})`
        });
      }

      await connection.execute(
        'UPDATE jogo SET status = \'cancelado\' WHERE id_jogo = ?',
        [idJogo]
      );

      if (jogo.id_agenda !== null) {
        await connection.execute(
          'UPDATE agenda_quadra SET status = \'cancelada\' WHERE id_agenda = ?',
          [jogo.id_agenda]
        );
      }

      await connection.commit();

      return res.json({
        success: true,
        message: 'Jogo cancelado com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao cancelar jogo:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// GET /api/el/campeonatos/:id_campeonato/classificacao
// Tabela da FASE DE GRUPOS (congelada durante o mata-mata)
// ============================================================

const obterClassificacao = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const [campeonatos] = await pool.execute(
      'SELECT id_campeonato FROM campeonato WHERE id_campeonato = ?',
      [idCampeonato]
    );

    if (campeonatos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campeonato não encontrado'
      });
    }

    const classificacao = await calcularTabelaClassificacao(pool, idCampeonato);

    return res.json({
      success: true,
      classificacao
    });

  } catch (error) {
    console.error('Erro ao calcular classificação:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// POST /api/el/campeonatos/:id_campeonato/gerar-mata-mata (organizador)
// Semeia o chaveamento pelos classificados da fase de grupos
// ============================================================

const gerarMataMata = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [campeonatos] = await connection.execute(
        'SELECT id_campeonato, status FROM campeonato WHERE id_campeonato = ? FOR UPDATE',
        [idCampeonato]
      );

      if (campeonatos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Campeonato não encontrado'
        });
      }

      if (campeonatos[0].status === 'encerrado') {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Este campeonato já foi encerrado'
        });
      }

      // Já existe mata-mata?
      const [mataExistente] = await connection.execute(
        `SELECT COUNT(*) AS total FROM jogo
         WHERE id_campeonato = ? AND fase IN ('quartas', 'semifinal', 'final')`,
        [idCampeonato]
      );

      if (mataExistente[0].total > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'O mata-mata deste campeonato já foi gerado'
        });
      }

      // Jogos de grupo pendentes?
      const [pendentes] = await connection.execute(
        `SELECT COUNT(*) AS total FROM jogo
         WHERE id_campeonato = ? AND fase = 'grupo' AND status <> 'finalizado' AND status <> 'cancelado'`,
        [idCampeonato]
      );

      if (pendentes[0].total > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Finalize todos os jogos da fase de grupos antes de gerar o mata-mata'
        });
      }

      const tabela = await calcularTabelaClassificacao(connection, idCampeonato);

      if (tabela.length < 2) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'São necessárias pelo menos 2 equipes inscritas'
        });
      }

      // Número de classificados: 8 (quartas), 4 (semis) ou 2 (final direta)
      let n;

      if (tabela.length >= 8) {
        n = 8;
      } else if (tabela.length >= 4) {
        n = 4;
      } else {
        n = 2;
      }

      const fase = n === 8 ? 'quartas' : (n === 4 ? 'semifinal' : 'final');

      const classificados = tabela.slice(0, n);

      const confrontos = [];

      for (let i = 0; i < n / 2; i++) {
        const seedA = classificados[i];
        const seedB = classificados[n - 1 - i];

        await connection.execute(
          `INSERT INTO jogo (id_agenda, id_campeonato, id_equipe1, id_equipe2, fase, status)
           VALUES (NULL, ?, ?, ?, ?, 'definido')`,
          [idCampeonato, seedA.id_equipe, seedB.id_equipe, fase]
        );

        confrontos.push(`${seedA.nome} x ${seedB.nome}`);
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: `Mata-mata gerado: ${fase}`,
        fase,
        confrontos
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao gerar mata-mata:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// Verificação periódica (setInterval no server.js):
// 1) Campeonato 'planejado' cujo 1º jogo já começou vira 'andamento'
// 2) 10 minutos após o fim de um jogo sem resultado, notifica
//    os organizadores ativos — uma única vez por jogo
// ============================================================

const verificarJogosSemResultado = async () => {
  try {
    // 1) Relógio: 1º jogo do campeonato já começou -> 'andamento'
    await pool.execute(
      `UPDATE campeonato c
       SET c.status = 'andamento'
       WHERE c.status = 'planejado'
         AND EXISTS (
           SELECT 1
           FROM jogo j
           INNER JOIN agenda_quadra a ON j.id_agenda = a.id_agenda
           WHERE j.id_campeonato = c.id_campeonato
             AND j.status <> 'cancelado'
             AND CONCAT(a.data_utilizacao, ' ', a.hora_inicio) <= NOW()
         )`
    );
    const [jogos] = await pool.execute(
      `SELECT j.id_jogo, j.fase, e1.nome AS nome1, e2.nome AS nome2
       FROM jogo j
       INNER JOIN agenda_quadra a ON j.id_agenda = a.id_agenda
       INNER JOIN equipe e1 ON j.id_equipe1 = e1.id_equipe
       INNER JOIN equipe e2 ON j.id_equipe2 = e2.id_equipe
       WHERE j.status = 'agendado'
         AND j.resultado_solicitado = FALSE
         AND CONCAT(a.data_utilizacao, ' ', a.hora_fim) <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
    );

    for (const jogo of jogos) {
      try {
        const [organizadores] = await pool.execute(
          'SELECT id_usuario FROM usuario WHERE perfil = \'organizador\' AND ativo = true'
        );

        for (const organizador of organizadores) {
          await pool.execute(
            `INSERT INTO notificacao (id_usuario, titulo, mensagem, tipo)
             VALUES (?, ?, ?, 'resultado_pendente')`,
            [
              organizador.id_usuario,
              'Resultado pendente',
              `O jogo ${jogo.nome1} x ${jogo.nome2} já terminou. Insira o resultado o quanto antes.`
            ]
          );
        }

        await pool.execute(
          'UPDATE jogo SET resultado_solicitado = TRUE WHERE id_jogo = ?',
          [jogo.id_jogo]
        );
      } catch (erroJogo) {
        console.error(`Erro ao notificar resultado do jogo ${jogo.id_jogo}:`, erroJogo.message);
      }
    }
  } catch (error) {
    console.error('Erro na verificação de jogos sem resultado:', error.message);
  }
};

module.exports = {
  listarJogos,
  criarJogo,
  agendarJogo,
  registrarResultado,
  registrarWO,
  cancelarJogo,
  obterClassificacao,
  gerarMataMata,
  verificarJogosSemResultado
};