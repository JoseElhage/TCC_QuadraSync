import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { API_URL } from './config/api';

import TelaSplash from './telas/TelaSplash';
import TelaBoasVindas from './telas/TelaBoasVindas';
import TelaLogin from './telas/TelaLogin';
import TelaCadastro from './telas/TelaCadastro';
import TelaInicial from './telas/TelaInicial';
import TelaCalendario from './telas/TelaCalendario';
import TelaNotificacoes from './telas/TelaNotificacoes';
import TelaPerfil from './telas/TelaPerfil';
import TelaEL from './telas/TelaEL';
import TelaELDetalhes from './telas/TelaELDetalhes';
import TelaAdminReservas from './telas/TelaAdminReservas';
import TelaAdminPromocoes from './telas/TelaAdminPromocoes';
import TelaAdminHorarios from './telas/TelaAdminHorarios';

import AlertaGlobal from './components/AlertaGlobal';

const CHAVE_SESSAO = '@QuadraSync:sessao';

export default function App() {
  const [tela, setTela] = useState('splash');
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);

  // ETEC League: id do campeonato aberto na tela de detalhes
  const [campeonatoDetalhesId, setCampeonatoDetalhesId] = useState(null);

  useEffect(() => {
    const verificarSessao = async () => {
      try {
        const sessaoSalva = await AsyncStorage.getItem(CHAVE_SESSAO);

        if (!sessaoSalva) {
          return;
        }

        const sessao = JSON.parse(sessaoSalva);

        if (!sessao.token) {
          await AsyncStorage.removeItem(CHAVE_SESSAO);
          return;
        }

        const controle = new AbortController();

        const tempoLimite = setTimeout(() => {
          controle.abort();
        }, 3000);

        try {
          const resposta = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${sessao.token}`,
            },
            signal: controle.signal,
          });

          if (resposta.ok) {
            const dados = await resposta.json();

            setToken(sessao.token);
            setUsuario(dados.usuario);

            if (dados.usuario.perfil === 'administrador') {
              setTela('adminReservas');
            } else {
              setTela('inicial');
            }
          } else {
            await AsyncStorage.removeItem(CHAVE_SESSAO);
          }
        } catch (error) {
          console.log('Não foi possível verificar a sessão:', error.message);
        } finally {
          clearTimeout(tempoLimite);
        }
      } catch (error) {
        console.log('Erro ao restaurar sessão:', error);
      }
    };

    verificarSessao();
  }, []);

  const avancarDaSplash = () => {
    setTela((telaAtual) => {
      if (telaAtual === 'splash') {
        return 'boasVindas';
      }

      return telaAtual;
    });
  };

  const salvarSessao = async ({ token: novoToken, usuario: novoUsuario }) => {
    setToken(novoToken);
    setUsuario(novoUsuario);

    try {
      await AsyncStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({
          token: novoToken,
        })
      );
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    }

    if (novoUsuario && novoUsuario.perfil === 'administrador') {
      setTela('adminReservas');
    } else {
      setTela('inicial');
    }
  };

  const deslogar = async () => {
    setToken(null);
    setUsuario(null);

    try {
      await AsyncStorage.removeItem(CHAVE_SESSAO);
    } catch (error) {
      console.error('Erro ao remover sessão:', error);
    }

    setTela('boasVindas');
  };

  const renderizarTela = () => {
    if (tela === 'splash') {
      return <TelaSplash irParaBoasVindas={avancarDaSplash} />;
    }

    if (tela === 'boasVindas') {
      return (
        <TelaBoasVindas
          irParaLogin={() => setTela('login')}
          irParaCadastro={() => setTela('cadastro')}
        />
      );
    }

    if (tela === 'login') {
      return (
        <TelaLogin
          aoLogar={salvarSessao}
          irParaCadastro={() => setTela('cadastro')}
          irParaBoasVindas={() => setTela('boasVindas')}
        />
      );
    }

    if (tela === 'cadastro') {
      return (
        <TelaCadastro
          irParaLogin={() => setTela('login')}
          irParaBoasVindas={() => setTela('boasVindas')}
        />
      );
    }

    // ==========================================================
    // Telas do ALUNO / ORGANIZADOR
    // ==========================================================

    if (tela === 'inicial') {
      return (
        <TelaInicial
          token={token}
          usuario={usuario}
          irParaCalendario={() => setTela('calendario')}
          irParaNotificacoes={() => setTela('notificacoes')}
          irParaPerfil={() => setTela('perfil')}
          irParaEL={() => setTela('el')}
          deslogar={deslogar}
        />
      );
    }

    if (tela === 'calendario') {
      return (
        <TelaCalendario
          token={token}
          usuario={usuario}
          irParaInicial={() => setTela('inicial')}
          irParaNotificacoes={() => setTela('notificacoes')}
          irParaPerfil={() => setTela('perfil')}
          irParaEL={() => setTela('el')}
        />
      );
    }

    if (tela === 'notificacoes') {
      return (
        <TelaNotificacoes
          token={token}
          usuario={usuario}
          irParaInicial={() => setTela('inicial')}
          irParaCalendario={() => setTela('calendario')}
          irParaPerfil={() => setTela('perfil')}
          irParaEL={() => setTela('el')}
        />
      );
    }

    if (tela === 'perfil') {
      return (
        <TelaPerfil
          token={token}
          usuario={usuario}
          irParaInicial={() => setTela('inicial')}
          irParaCalendario={() => setTela('calendario')}
          irParaNotificacoes={() => setTela('notificacoes')}
          irParaEL={() => setTela('el')}
          deslogar={deslogar}
        />
      );
    }

    if (tela === 'el') {
      return (
        <TelaEL
          token={token}
          usuario={usuario}
          irParaELDetalhes={(id) => {
            setCampeonatoDetalhesId(id);
            setTela('elDetalhes');
          }}
          irParaInicial={() => setTela('inicial')}
          irParaCalendario={() => setTela('calendario')}
          irParaNotificacoes={() => setTela('notificacoes')}
          irParaPerfil={() => setTela('perfil')}
        />
      );
    }

    if (tela === 'elDetalhes') {
      return (
        <TelaELDetalhes
          token={token}
          usuario={usuario}
          campeonatoId={campeonatoDetalhesId}
          irParaEL={() => setTela('el')}
        />
      );
    }

    // ==========================================================
    // Telas do ADMINISTRADOR
    // ==========================================================

    if (tela === 'adminReservas') {
      return (
        <TelaAdminReservas
          token={token}
          usuario={usuario}
          deslogar={deslogar}
          irParaAdminPromocoes={() => setTela('adminPromocoes')}
          irParaAdminHorarios={() => setTela('adminHorarios')}
          irParaAdminNotificacoes={() => setTela('adminNotificacoes')}
        />
      );
    }

    if (tela === 'adminPromocoes') {
      return (
        <TelaAdminPromocoes
          token={token}
          usuario={usuario}
          irParaAdminReservas={() => setTela('adminReservas')}
          irParaAdminHorarios={() => setTela('adminHorarios')}
          irParaAdminNotificacoes={() => setTela('adminNotificacoes')}
        />
      );
    }

    if (tela === 'adminHorarios') {
      return (
        <TelaAdminHorarios
          irParaAdminReservas={() => setTela('adminReservas')}
          irParaAdminPromocoes={() => setTela('adminPromocoes')}
          irParaAdminNotificacoes={() => setTela('adminNotificacoes')}
        />
      );
    }

    if (tela === 'adminNotificacoes') {
      return (
        <TelaNotificacoes
          token={token}
          usuario={usuario}
          modo="admin"
          irParaAdminReservas={() => setTela('adminReservas')}
          irParaAdminPromocoes={() => setTela('adminPromocoes')}
          irParaAdminHorarios={() => setTela('adminHorarios')}
        />
      );
    }

    return <TelaSplash irParaBoasVindas={avancarDaSplash} />;
  };

  // O AlertaGlobal fica montado por cima de qualquer tela —
  // é ele quem desenha os popups personalizados do app.
  //
  // O SafeAreaProvider precisa envolver tudo: é dependência
  // do PainelInferior.js (relógio, calendário e seletor de
  // confronto usam useSafeAreaInsets para não colar handle/
  // rodapé em cima do notch/status bar/barra de gestos).
  return (
    <SafeAreaProvider>
      {renderizarTela()}
      <AlertaGlobal />
    </SafeAreaProvider>
  );
}