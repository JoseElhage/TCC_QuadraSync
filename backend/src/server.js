const express = require('express');
const cors = require('cors');
require('dotenv').config();

const testRoutes = require('./routes/testRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const adminReservaRoutes = require('./routes/adminReservaRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const adminUsuarioRoutes = require('./routes/adminUsuarioRoutes');
const elRoutes = require('./routes/elRoutes'); // NOVO
const { verificarJogosSemResultado } = require('./controllers/elJogoController'); // NOVO

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/admin/reservas', adminReservaRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/admin/usuarios', adminUsuarioRoutes);
app.use('/api/el', elRoutes); // NOVO

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // NOVO: a cada 60s, notifica organizadores sobre jogos
  // encerrados há mais de 10 minutos sem resultado
  setInterval(verificarJogosSemResultado, 60000);
});