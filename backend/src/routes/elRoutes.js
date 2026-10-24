const express = require('express');

const {
  listarCampeonatos,
  criarCampeonato,
  obterCampeonato,
  atualizarCampeonato,
  excluirCampeonato,
  listarEquipesDoCampeonato,
  inscreverEquipe,
  atualizarEquipe,
  removerEquipeDoCampeonato
} = require('../controllers/elController');

const {
  listarJogos,
  criarJogo,
  agendarJogo,
  registrarResultado,
  registrarWO,
  cancelarJogo,
  obterClassificacao,
  gerarMataMata
} = require('../controllers/elJogoController');

const {
  autenticarToken,
  autorizarPerfis
} = require('../middlewares/authMiddleware');

const router = express.Router();

// ---------- Campeonatos ----------
router.get('/campeonatos', autenticarToken, listarCampeonatos);
router.post('/campeonatos', autenticarToken, autorizarPerfis('organizador'), criarCampeonato);
router.get('/campeonatos/:id_campeonato', autenticarToken, obterCampeonato);
router.put('/campeonatos/:id_campeonato', autenticarToken, autorizarPerfis('organizador'), atualizarCampeonato);
router.delete('/campeonatos/:id_campeonato', autenticarToken, autorizarPerfis('organizador'), excluirCampeonato);

// ---------- Equipes ----------
router.get('/campeonatos/:id_campeonato/equipes', autenticarToken, listarEquipesDoCampeonato);
router.post('/campeonatos/:id_campeonato/equipes', autenticarToken, autorizarPerfis('organizador'), inscreverEquipe);
router.put('/equipes/:id_equipe', autenticarToken, autorizarPerfis('organizador'), atualizarEquipe);
router.delete('/campeonatos/:id_campeonato/equipes/:id_equipe', autenticarToken, autorizarPerfis('organizador'), removerEquipeDoCampeonato);

// ---------- Jogos e chaveamento ----------
router.get('/campeonatos/:id_campeonato/jogos', autenticarToken, listarJogos);
router.post('/campeonatos/:id_campeonato/jogos', autenticarToken, autorizarPerfis('organizador'), criarJogo);
router.post('/campeonatos/:id_campeonato/gerar-mata-mata', autenticarToken, autorizarPerfis('organizador'), gerarMataMata);
router.get('/campeonatos/:id_campeonato/classificacao', autenticarToken, obterClassificacao);

router.put('/jogos/:id_jogo/agendar', autenticarToken, autorizarPerfis('organizador'), agendarJogo);
router.put('/jogos/:id_jogo/resultado', autenticarToken, autorizarPerfis('organizador'), registrarResultado);
router.put('/jogos/:id_jogo/wo', autenticarToken, autorizarPerfis('organizador'), registrarWO);
router.put('/jogos/:id_jogo/cancelar', autenticarToken, autorizarPerfis('organizador'), cancelarJogo);

module.exports = router;