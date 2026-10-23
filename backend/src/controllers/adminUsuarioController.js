const pool = require('../config/database');

// ============================================================
// GET /api/admin/usuarios/alunos
// Listar alunos e organizadores ativos (para promover/rebaixar)
// Não lista administradores e nunca retorna senhas
// ============================================================

const listarAlunos = async (req, res) => {
  try {
    const [usuarios] = await pool.execute(
      `SELECT id_usuario, nome, email, perfil, curso, turma
       FROM usuario
       WHERE perfil IN ('aluno', 'organizador') AND ativo = true
       ORDER BY turma ASC, nome ASC`
    );

    return res.json({
      success: true,
      usuarios
    });

  } catch (error) {
    console.error('Erro ao listar alunos:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// ============================================================
// PUT /api/admin/usuarios/:id_usuario/perfil
// Promover aluno -> organizador ou rebaixar organizador -> aluno
// Body: { "perfil": "organizador" } ou { "perfil": "aluno" }
// ============================================================

const alterarPerfil = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { perfil } = req.body;

    const idUsuario = Number(id_usuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário inválido'
      });
    }

    // Por esta rota só é possível definir aluno ou organizador.
    // Ninguém se torna administrador pela API.
    if (perfil !== 'aluno' && perfil !== 'organizador') {
      return res.status(400).json({
        success: false,
        message: 'Perfil inválido (só é possível definir aluno ou organizador)'
      });
    }

    // O administrador não pode alterar o próprio perfil
    if (idUsuario === Number(req.usuario.id_usuario)) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível alterar o próprio perfil'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Bloquear a linha do usuário alvo
      const [usuarios] = await connection.execute(
        'SELECT id_usuario, nome, perfil, ativo FROM usuario WHERE id_usuario = ? FOR UPDATE',
        [idUsuario]
      );

      if (usuarios.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const alvo = usuarios[0];

      if (!alvo.ativo) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: 'Este usuário está inativo'
        });
      }

      if (alvo.perfil === 'administrador') {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: 'Não é possível alterar o perfil de um administrador'
        });
      }

      if (alvo.perfil === perfil) {
        await connection.rollback();

        const rotulo = perfil === 'organizador' ? 'organizador' : 'aluno';

        return res.status(409).json({
          success: false,
          message: `Este usuário já é ${rotulo}`
        });
      }

      // Alterar o perfil
      await connection.execute(
        'UPDATE usuario SET perfil = ? WHERE id_usuario = ?',
        [perfil, idUsuario]
      );

      // Notificar o usuário sobre a mudança
      let titulo;
      let mensagem;
      let tipoNotificacao;

      if (perfil === 'organizador') {
        titulo = 'Você foi promovido a Organizador';
        mensagem = 'Parabéns! Agora você é um organizador do QuadraSync e pode gerenciar o ETEC League.';
        tipoNotificacao = 'promocao_organizador';
      } else {
        titulo = 'Seu perfil foi alterado';
        mensagem = 'Seu acesso de organizador foi removido. Você voltou ao perfil de aluno.';
        tipoNotificacao = 'rebaixamento_aluno';
      }

      await connection.execute(
        `INSERT INTO notificacao
          (id_usuario, titulo, mensagem, tipo)
         VALUES (?, ?, ?, ?)`,
        [idUsuario, titulo, mensagem, tipoNotificacao]
      );

      await connection.commit();

      const acao = perfil === 'organizador' ? 'promovido a organizador' : 'rebaixado a aluno';

      return res.json({
        success: true,
        message: `${alvo.nome} foi ${acao} com sucesso`
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erro ao alterar perfil:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarAlunos,
  alterarPerfil
};