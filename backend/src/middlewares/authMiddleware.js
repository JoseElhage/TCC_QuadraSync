const jwt = require('jsonwebtoken');

const autenticarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }

    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato do token inválido'
      });
    }

    const token = partes[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = decoded;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

const autorizarPerfis = (...perfis) => {
  return (req, res, next) => {
    if (!req.usuario) {
      console.error('autorizarPerfis usado sem autenticarToken antes');

      return res.status(500).json({
        success: false,
        message: 'Erro de configuração: autenticação não executada antes da autorização'
      });
    }

    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: perfil sem permissão para esta ação'
      });
    }

    next();
  };
};

module.exports = {
  autenticarToken,
  autorizarPerfis
};