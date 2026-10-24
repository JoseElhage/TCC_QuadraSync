const pool = require('../config/database');

// ============================================================
// Constantes e helpers (ETEC League — campeonatos e equipes)
// ============================================================

const MODALIDADES_VALIDAS = ['futsal', 'volei', 'basquete'];
const CATEGORIAS_VALIDAS = ['feminino', 'masculino', 'misto'];

// Valida formato AAAA-MM-DD e se a data existe de verdade
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

// Escudo: data URI da imagem (PNG/JPG) escolhida pelo organizador
const validarEscudoUrl = (escudo) => {
  if (escudo === undefined || escudo === null || escudo === '') {
    return true;
  }

  if (typeof escudo !== 'string' || escudo.length > 1500000) {
    return false;
  }

  return /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=\s]+$/.test(escudo);
};

// Normaliza escudo: vazio -> NULL (remove o escudo)
const normalizarEscudo = (escudo) => {
  if (typeof escudo !== 'string' || escudo.trim() === '') {
    return null;
  }

  return escudo.trim();
};

// ============================================================
// CAMPEONATOS
//
// O status do campeonato é AUTOMÁTICO:
// - nasce 'planejado' (o POST ignora qualquer status no body)
// - vira 'andamento' quando o 1º jogo começa (gatilhos no elJogoController)
// - vira 'encerrado' quando a final termina (avancarFaseOuCoroarCampeao)
// O PUT não aceita mais status — apenas nome, datas, modalidade e categoria.
// ============================================================

// GET /api/el/campeonatos — listar (qualquer perfil autenticado)
const listarCampeonatos = async (req, res) => {
  try {
    const [campeonatos] = await pool.execute(
      `SELECT
        c.id_campeonato,
        c.nome,
        c.modalidade,
        c.categoria,
        c.data_inicio,
        c.data_fim,
        c.status,
        c.id_campeao,
        camp.nome AS nome_campeao,
        (SELECT COUNT(*) FROM campeonato_equipe ce WHERE ce.id_campeonato = c.id_campeonato) AS total_equipes,
        (SELECT COUNT(*) FROM jogo j WHERE j.id_campeonato = c.id_campeonato AND j.status <> 'cancelado') AS total_jogos
      FROM campeonato c
      LEFT JOIN equipe camp ON c.id_campeao = camp.id_equipe
      ORDER BY c.data_inicio DESC`
    );

    return res.json({
      success: true,
      campeonatos
    });

  } catch (error) {
    console.error('Erro ao listar campeonatos:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// POST /api/el/campeonatos — criar (organizador)
const criarCampeonato = async (req, res) => {
  try {
    // status NÃO vem mais do body: o campeonato sempre nasce 'planejado'
    // e é promovido automaticamente pelo elJogoController
    const { nome, modalidade, categoria, data_inicio, data_fim } = req.body;

    if (!nome || !modalidade || !categoria || !data_inicio) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: nome, modalidade, categoria, data_inicio'
      });
    }

    if (typeof nome !== 'string' || nome.trim().length < 3 || nome.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nome do campeonato deve ter entre 3 e 100 caracteres'
      });
    }

    if (!MODALIDADES_VALIDAS.includes(modalidade)) {
      return res.status(400).json({
        success: false,
        message: 'Modalidade inválida (opções: futsal, volei, basquete)'
      });
    }

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({
        success: false,
        message: 'Categoria inválida (opções: feminino, masculino, misto)'
      });
    }

    if (!validarData(data_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'Data de início inválida (formato: AAAA-MM-DD)'
      });
    }

    let dataFim = null;

    if (data_fim !== undefined && data_fim !== null && data_fim !== '') {
      if (!validarData(data_fim)) {
        return res.status(400).json({
          success: false,
          message: 'Data de fim inválida (formato: AAAA-MM-DD)'
        });
      }

      if (data_fim < data_inicio) {
        return res.status(400).json({
          success: false,
          message: 'A data de fim deve ser igual ou posterior à data de início'
        });
      }

      dataFim = data_fim;
    }

    const [resultado] = await pool.execute(
      `INSERT INTO campeonato (nome, modalidade, categoria, data_inicio, data_fim, status)
       VALUES (?, ?, ?, ?, ?, 'planejado')`,
      [nome.trim(), modalidade, categoria, data_inicio, dataFim]
    );

    return res.status(201).json({
      success: true,
      message: 'Campeonato criado com sucesso',
      campeonato: {
        id_campeonato: resultado.insertId,
        nome: nome.trim(),
        modalidade,
        categoria,
        data_inicio,
        data_fim: dataFim,
        status: 'planejado'
      }
    });

  } catch (error) {
    console.error('Erro ao criar campeonato:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// GET /api/el/campeonatos/:id_campeonato — detalhes (qualquer perfil autenticado)
const obterCampeonato = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const [campeonatos] = await pool.execute(
      `SELECT c.id_campeonato, c.nome, c.modalidade, c.categoria, c.data_inicio, c.data_fim,
              c.status, c.id_campeao, camp.nome AS nome_campeao
       FROM campeonato c
       LEFT JOIN equipe camp ON c.id_campeao = camp.id_equipe
       WHERE c.id_campeonato = ?`,
      [idCampeonato]
    );

    if (campeonatos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campeonato não encontrado'
      });
    }

    return res.json({
      success: true,
      campeonato: campeonatos[0]
    });

  } catch (error) {
    console.error('Erro ao buscar campeonato:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// PUT /api/el/campeonatos/:id_campeonato — editar (organizador)
// Nome e datas sempre; modalidade/categoria só se não houver jogos.
// Status NÃO é editável — é automático (criação = planejado, 1º jogo =
// andamento, campeão = encerrado). Body que enviar status é ignorado.
const atualizarCampeonato = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const { nome, modalidade, categoria, data_inicio, data_fim } = req.body;

    if (
      nome === undefined &&
      modalidade === undefined &&
      categoria === undefined &&
      data_inicio === undefined &&
      data_fim === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Informe ao menos um campo para atualizar'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [campeonatos] = await connection.execute(
        'SELECT id_campeonato, nome, modalidade, categoria, data_inicio, data_fim, status FROM campeonato WHERE id_campeonato = ? FOR UPDATE',
        [idCampeonato]
      );

      if (campeonatos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Campeonato não encontrado'
        });
      }

      const atual = campeonatos[0];

      const [jogos] = await connection.execute(
        'SELECT COUNT(*) AS total FROM jogo WHERE id_campeonato = ?',
        [idCampeonato]
      );

      const temJogos = jogos[0].total > 0;

      // ----- Validações dos campos fornecidos -----

      let novoNome = atual.nome;

      if (nome !== undefined) {
        if (typeof nome !== 'string' || nome.trim().length < 3 || nome.trim().length > 100) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Nome do campeonato deve ter entre 3 e 100 caracteres'
          });
        }

        novoNome = nome.trim();
      }

      let novaModalidade = atual.modalidade;

      if (modalidade !== undefined) {
        if (!MODALIDADES_VALIDAS.includes(modalidade)) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Modalidade inválida (opções: futsal, volei, basquete)'
          });
        }

        if (temJogos && modalidade !== atual.modalidade) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: 'Não é possível alterar a modalidade de um campeonato que já possui jogos'
          });
        }

        novaModalidade = modalidade;
      }

      let novaCategoria = atual.categoria;

      if (categoria !== undefined) {
        if (!CATEGORIAS_VALIDAS.includes(categoria)) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Categoria inválida (opções: feminino, masculino, misto)'
          });
        }

        if (temJogos && categoria !== atual.categoria) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: 'Não é possível alterar a categoria de um campeonato que já possui jogos'
          });
        }

        novaCategoria = categoria;
      }

      let novaDataInicio = atual.data_inicio;

      if (data_inicio !== undefined) {
        if (!validarData(data_inicio)) {
          await connection.rollback();

          return res.status(400).json({
            success: false,
            message: 'Data de início inválida (formato: AAAA-MM-DD)'
          });
        }

        novaDataInicio = data_inicio;
      }

      // data_fim: null explícito limpa o campo
      let novaDataFim = atual.data_fim;

      if (data_fim !== undefined) {
        if (data_fim === null || data_fim === '') {
          novaDataFim = null;
        } else {
          if (!validarData(data_fim)) {
            await connection.rollback();

            return res.status(400).json({
              success: false,
              message: 'Data de fim inválida (formato: AAAA-MM-DD)'
            });
          }

          novaDataFim = data_fim;
        }
      }

      if (novaDataFim !== null && novaDataFim < novaDataInicio) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: 'A data de fim deve ser igual ou posterior à data de início'
        });
      }

      await connection.execute(
        `UPDATE campeonato
         SET nome = ?, modalidade = ?, categoria = ?, data_inicio = ?, data_fim = ?
         WHERE id_campeonato = ?`,
        [novoNome, novaModalidade, novaCategoria, novaDataInicio, novaDataFim, idCampeonato]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Campeonato atualizado com sucesso',
        campeonato: {
          id_campeonato: idCampeonato,
          nome: novoNome,
          modalidade: novaModalidade,
          categoria: novaCategoria,
          data_inicio: novaDataInicio,
          data_fim: novaDataFim,
          status: atual.status // automático — devolve o atual, sem alterar
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao atualizar campeonato:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// DELETE /api/el/campeonatos/:id_campeonato — excluir (organizador)
// Regras: nunca se tem campeão registrado; só quando outro campeonato
// está em andamento; histórico de campeões fica para sempre
const excluirCampeonato = async (req, res) => {
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
        'SELECT id_campeonato, id_campeao FROM campeonato WHERE id_campeonato = ? FOR UPDATE',
        [idCampeonato]
      );

      if (campeonatos.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Campeonato não encontrado'
        });
      }

      // Campeonato com campeão é histórico — fica para sempre
      if (campeonatos[0].id_campeao !== null) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Este campeonato possui um campeão registrado e faz parte do histórico — não pode ser excluído'
        });
      }

      // Só pode excluir quando outro campeonato estiver em andamento
      const [outros] = await connection.execute(
        'SELECT COUNT(*) AS total FROM campeonato WHERE id_campeonato <> ? AND status = \'andamento\'',
        [idCampeonato]
      );

      if (outros[0].total === 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Só é possível excluir um campeonato quando outro estiver em andamento'
        });
      }

      // Coleta as agendas dos jogos antes de removê-los
      const [agendas] = await connection.execute(
        'SELECT id_agenda FROM jogo WHERE id_campeonato = ? AND id_agenda IS NOT NULL',
        [idCampeonato]
      );

      await connection.execute('DELETE FROM jogo WHERE id_campeonato = ?', [idCampeonato]);

      for (const agenda of agendas) {
        await connection.execute('DELETE FROM agenda_quadra WHERE id_agenda = ?', [agenda.id_agenda]);
      }

      await connection.execute('DELETE FROM campeonato_equipe WHERE id_campeonato = ?', [idCampeonato]);
      await connection.execute('DELETE FROM campeonato WHERE id_campeonato = ?', [idCampeonato]);

      await connection.commit();

      return res.json({
        success: true,
        message: 'Campeonato excluído com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao excluir campeonato:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// EQUIPES (inscrições por campeonato)
// ============================================================

// GET /api/el/campeonatos/:id_campeonato/equipes — listar inscritas (qualquer perfil)
const listarEquipesDoCampeonato = async (req, res) => {
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

    const [equipes] = await pool.execute(
      `SELECT e.id_equipe, e.nome, e.escudo_url
       FROM campeonato_equipe ce
       INNER JOIN equipe e ON ce.id_equipe = e.id_equipe
       WHERE ce.id_campeonato = ?
       ORDER BY e.nome ASC`,
      [idCampeonato]
    );

    return res.json({
      success: true,
      equipes
    });

  } catch (error) {
    console.error('Erro ao listar equipes:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// POST /api/el/campeonatos/:id_campeonato/equipes — inscrever (organizador)
// Body: { nome, escudo_url? } — escudo em base64 (PNG/JPG) ou vazio
// Equipe global: se já existir com esse nome, reutiliza (e atualiza o escudo
// se um novo for informado); senão, cria.
const inscreverEquipe = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do campeonato inválido'
      });
    }

    const { nome, escudo_url } = req.body;

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nome da equipe deve ter entre 2 e 100 caracteres'
      });
    }

    if (!validarEscudoUrl(escudo_url)) {
      return res.status(400).json({
        success: false,
        message: 'Escudo inválido (selecione uma imagem PNG ou JPG)'
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
          message: 'Não é possível inscrever equipes em um campeonato encerrado'
        });
      }

      const nomeLimpo = nome.trim();
      const escudoLimpo = normalizarEscudo(escudo_url);

      // Busca equipe global pelo nome exato
      const [equipes] = await connection.execute(
        'SELECT id_equipe FROM equipe WHERE nome = ?',
        [nomeLimpo]
      );

      let idEquipe;

      if (equipes.length > 0) {
        idEquipe = equipes[0].id_equipe;

        // Atualiza o escudo se um novo foi informado
        if (escudoLimpo !== null) {
          await connection.execute(
            'UPDATE equipe SET escudo_url = ? WHERE id_equipe = ?',
            [escudoLimpo, idEquipe]
          );
        }
      } else {
        const [resultado] = await connection.execute(
          'INSERT INTO equipe (nome, escudo_url) VALUES (?, ?)',
          [nomeLimpo, escudoLimpo]
        );

        idEquipe = resultado.insertId;
      }

      // Já está inscrita neste campeonato?
      const [inscricoes] = await connection.execute(
        'SELECT id_equipe FROM campeonato_equipe WHERE id_campeonato = ? AND id_equipe = ?',
        [idCampeonato, idEquipe]
      );

      if (inscricoes.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Esta equipe já está inscrita neste campeonato'
        });
      }

      await connection.execute(
        'INSERT INTO campeonato_equipe (id_campeonato, id_equipe) VALUES (?, ?)',
        [idCampeonato, idEquipe]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Equipe inscrita com sucesso',
        equipe: {
          id_equipe: idEquipe,
          nome: nomeLimpo,
          escudo_url: escudoLimpo
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao inscrever equipe:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// PUT /api/el/equipes/:id_equipe — editar nome/escudo (organizador)
// A equipe é global: a alteração vale para todos os campeonatos dela
const atualizarEquipe = async (req, res) => {
  try {
    const idEquipe = Number(req.params.id_equipe);

    if (!Number.isInteger(idEquipe) || idEquipe <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da equipe inválido'
      });
    }

    const { nome, escudo_url } = req.body;

    if (nome === undefined && escudo_url === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Informe ao menos um campo para atualizar (nome ou escudo_url)'
      });
    }

    if (!validarEscudoUrl(escudo_url)) {
      return res.status(400).json({
        success: false,
        message: 'Escudo inválido (selecione uma imagem PNG ou JPG)'
      });
    }

    const [equipes] = await pool.execute(
      'SELECT id_equipe, nome, escudo_url FROM equipe WHERE id_equipe = ?',
      [idEquipe]
    );

    if (equipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipe não encontrada'
      });
    }

    const atual = equipes[0];

    let novoNome = atual.nome;

    if (nome !== undefined) {
      if (typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Nome da equipe deve ter entre 2 e 100 caracteres'
        });
      }

      novoNome = nome.trim();
    }

    const novoEscudo = escudo_url !== undefined ? normalizarEscudo(escudo_url) : atual.escudo_url;

    await pool.execute(
      'UPDATE equipe SET nome = ?, escudo_url = ? WHERE id_equipe = ?',
      [novoNome, novoEscudo, idEquipe]
    );

    return res.json({
      success: true,
      message: 'Equipe atualizada com sucesso',
      equipe: {
        id_equipe: idEquipe,
        nome: novoNome,
        escudo_url: novoEscudo
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar equipe:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// DELETE /api/el/campeonatos/:id_campeonato/equipes/:id_equipe — remover inscrição (organizador)
// Só se a equipe ainda não tem jogos neste campeonato. A equipe em si
// nunca é apagada (histórico dos campeonatos anteriores permanece).
const removerEquipeDoCampeonato = async (req, res) => {
  try {
    const idCampeonato = Number(req.params.id_campeonato);
    const idEquipe = Number(req.params.id_equipe);

    if (!Number.isInteger(idCampeonato) || idCampeonato <= 0 ||
        !Number.isInteger(idEquipe) || idEquipe <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [inscricoes] = await connection.execute(
        'SELECT id_equipe FROM campeonato_equipe WHERE id_campeonato = ? AND id_equipe = ? FOR UPDATE',
        [idCampeonato, idEquipe]
      );

      if (inscricoes.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Esta equipe não está inscrita neste campeonato'
        });
      }

      const [jogos] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM jogo
         WHERE id_campeonato = ?
           AND (id_equipe1 = ? OR id_equipe2 = ?)`,
        [idCampeonato, idEquipe, idEquipe]
      );

      if (jogos[0].total > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: 'Não é possível remover: esta equipe possui jogos neste campeonato'
        });
      }

      await connection.execute(
        'DELETE FROM campeonato_equipe WHERE id_campeonato = ? AND id_equipe = ?',
        [idCampeonato, idEquipe]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Equipe removida do campeonato com sucesso'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao remover equipe do campeonato:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarCampeonatos,
  criarCampeonato,
  obterCampeonato,
  atualizarCampeonato,
  excluirCampeonato,
  listarEquipesDoCampeonato,
  inscreverEquipe,
  atualizarEquipe,
  removerEquipeDoCampeonato
};