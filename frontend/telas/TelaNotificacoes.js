import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferior from '../components/MenuInferior';
import MenuInferiorAdmin from '../components/MenuInferiorAdmin';

// ============================================================
// Aparência de cada tipo de notificação
// ============================================================

const TIPOS_NOTIFICACAO = {
  nova_reserva: { icone: 'inbox', fundo: '#DBEAFE', cor: '#1565C0' },
  reserva_confirmada: { icone: 'checkmark-circle', fundo: '#D1FAE5', cor: '#059669' },
  reserva_recusada: { icone: 'close-circle', fundo: '#FEE2E2', cor: '#DC2626' },
  reserva_cancelada: { icone: 'ban', fundo: '#FEF3C7', cor: '#D97706' },
  reserva_cancelada_admin: { icone: 'alert-circle', fundo: '#FEE2E2', cor: '#DC2626' },
  promocao_organizador: { icone: 'ribbon', fundo: '#FEF3C7', cor: '#D97706' },
  rebaixamento_aluno: { icone: 'trending-down', fundo: '#F1F5F9', cor: '#64748B' },
  resultado_pendente: { icone: 'timer', fundo: '#FEF3C7', cor: '#D97706' },
};

const TIPO_PADRAO = { icone: 'notifications', fundo: '#EFF6FF', cor: '#1565C0' };

const obterIcone = (tipo) => TIPOS_NOTIFICACAO[tipo] || TIPO_PADRAO;

// "2025-09-25 14:32:10" -> "14:32" (hoje) | "Ontem" | "25/09/2025"
const formatarTempo = (dataEnvio) => {
  const [dataParte, horaParte] = dataEnvio.split(' ');

  if (!dataParte || !horaParte) return '';

  const [ano, mes, dia] = dataParte.split('-').map(Number);
  const hora = horaParte.substring(0, 5);

  const envio = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const ontemZero = new Date(hojeZero);
  ontemZero.setDate(ontemZero.getDate() - 1);

  if (envio.getTime() === hojeZero.getTime()) return hora;
  if (envio.getTime() === ontemZero.getTime()) return 'Ontem';
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
};

// ============================================================
// Animação de entrada (fade + rise) e componentes de apoio
// ============================================================

const rise = (valor) => ({
  opacity: valor,
  transform: [
    { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
  ],
});

function Animado({ delay = 0, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return <Animated.View style={rise(anim)}>{children}</Animated.View>;
}

function CartaoNotificacao({ notificacao, indice, aoMarcar }) {
  const config = obterIcone(notificacao.tipo);
  const lida = notificacao.visualizada;

  return (
    <Animado delay={Math.min(indice, 8) * 60}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => aoMarcar(notificacao)}
        style={[styles.card, lida ? styles.cardLida : styles.cardNova]}
      >
        <View style={[styles.iconeTipo, { backgroundColor: config.fundo }]}>
          <Ionicons name={config.icone} size={22} color={config.cor} />
        </View>

        <View style={styles.cardTextos}>
          <View style={styles.cardTituloLinha}>
            {!lida && <View style={styles.pontoNaoLida} />}
            <Text
              style={[styles.cardTitulo, lida && styles.cardTituloLida]}
              numberOfLines={1}
            >
              {notificacao.titulo}
            </Text>
          </View>
          <Text style={styles.cardMensagem}>{notificacao.mensagem}</Text>
        </View>

        <Text style={styles.cardTempo}>{formatarTempo(notificacao.data_envio)}</Text>
      </TouchableOpacity>
    </Animado>
  );
}

// ============================================================
// Tela
// ============================================================

export default function TelaNotificacoes({
  token,
  modo = 'aluno',
  irParaInicial,
  irParaCalendario,
  irParaPerfil,
  irParaEL,
  irParaAdminReservas,
  irParaAdminPromocoes,
  irParaAdminHorarios,
}) {
  const ehAdmin = modo === 'admin';

  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const naoVisualizadas = notificacoes.filter((n) => !n.visualizada).length;

  // ------------------------------------------------------------
  // Carregar notificações (GET /api/notificacoes)
  // ------------------------------------------------------------
  const carregarNotificacoes = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/notificacoes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resposta.status === 401) {
        setErroCarregamento(true);
        Alert.alert(
          'Sessão expirada',
          'Sua sessão expirou. Saia da conta e faça login novamente.'
        );
        return;
      }

      const dados = await resposta.json();

      if (!resposta.ok || !dados.success) {
        setErroCarregamento(true);
        return;
      }

      setNotificacoes(dados.notificacoes);
      setErroCarregamento(false);
    } catch (error) {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  // ------------------------------------------------------------
  // Pull-to-refresh
  // ------------------------------------------------------------
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarNotificacoes();
    setAtualizando(false);
  }, [carregarNotificacoes]);

  // Retry pelo card de erro (mesma requisição, com feedback de loading)
  const tentarNovamente = useCallback(() => {
    setCarregando(true);
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  // ------------------------------------------------------------
  // Marcar UMA como visualizada
  // ------------------------------------------------------------
  const marcarVisualizada = async (notificacao) => {
    if (notificacao.visualizada) return;

    try {
      const resposta = await fetch(
        `${API_URL}/notificacoes/${notificacao.id_notificacao}/visualizar`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!resposta.ok) {
        return;
      }

      setNotificacoes((atuais) =>
        atuais.map((n) =>
          n.id_notificacao === notificacao.id_notificacao
            ? { ...n, visualizada: true }
            : n
        )
      );
    } catch (error) {
      // Silencioso de propósito
    }
  };

  // ------------------------------------------------------------
  // Marcar TODAS como visualizadas
  // ------------------------------------------------------------
  const marcarTodas = async () => {
    setMarcandoTodas(true);

    try {
      const resposta = await fetch(`${API_URL}/notificacoes/visualizar-todas`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resposta.status === 401) {
        Alert.alert(
          'Sessão expirada',
          'Sua sessão expirou. Saia da conta e faça login novamente.'
        );
        return;
      }

      if (!resposta.ok) {
        Alert.alert('Atenção', 'Não foi possível marcar as notificações. Tente novamente.');
        return;
      }

      setNotificacoes((atuais) => atuais.map((n) => ({ ...n, visualizada: true })));
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setMarcandoTodas(false);
    }
  };

  // Botão voltar: admin volta para Reservas, aluno volta para Início
  const voltar = ehAdmin ? irParaAdminReservas : irParaInicial;

  const subtitulo = ehAdmin
    ? 'Avisos e atualizações do sistema'
    : 'Fique por dentro das novidades';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />

        <View style={styles.headerLinha}>
          <TouchableOpacity activeOpacity={0.7} onPress={voltar} style={styles.botaoVoltar}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>Notificações</Text>
            <Text style={styles.headerSubtitulo}>{subtitulo}</Text>
          </View>
        </View>
      </View>

      {/*
        Resumo (não lidas + marcar todas).
        IMPORTANTE: fica FORA do ScrollView, como irmão dele.
        O ScrollView recorta tudo que fica acima do próprio topo —
        se este card estivesse dentro dele, o marginTop negativo
        (que cria a sobreposição sobre o header azul) seria cortado.
      */}
      {!carregando && !erroCarregamento && notificacoes.length > 0 && (
        <Animado>
          <View style={styles.resumo}>
            {naoVisualizadas > 0 ? (
              <>
                <View style={styles.resumoEsquerda}>
                  <View style={styles.pontoResumo} />
                  <Text style={styles.resumoContagem}>
                    {naoVisualizadas} não lida{naoVisualizadas > 1 ? 's' : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={marcarTodas}
                  disabled={marcandoTodas}
                  style={styles.botaoMarcar}
                >
                  {marcandoTodas ? (
                    <ActivityIndicator size="small" color="#1565C0" />
                  ) : (
                    <Ionicons name="checkmark-done-outline" size={16} color="#1565C0" />
                  )}
                  <Text
                    style={[
                      styles.botaoMarcarTexto,
                      marcandoTodas && styles.botaoMarcarTextoDesabilitado,
                    ]}
                  >
                    {marcandoTodas ? 'Marcando...' : 'Marcar todas como lidas'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.resumoEsquerda}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.resumoTudoLido}>Tudo lido</Text>
              </View>
            )}
          </View>
        </Animado>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={['#1565C0']}
          />
        }
      >
        {/* Carregando */}
        {carregando && (
          <View style={styles.areaStatus}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.textoStatus}>Carregando notificações...</Text>
          </View>
        )}

        {/* Erro */}
        {!carregando && erroCarregamento && (
          <Animado>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={tentarNovamente}
              style={styles.cardErro}
            >
              <View style={styles.erroIcone}>
                <Ionicons name="cloud-offline-outline" size={26} color="#DC2626" />
              </View>
              <View style={styles.erroTextos}>
                <Text style={styles.erroTitulo}>Não foi possível carregar</Text>
                <Text style={styles.erroTexto}>
                  Verifique a conexão com o servidor e toque para tentar novamente.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </Animado>
        )}

        {/* Vazio */}
        {!carregando && !erroCarregamento && notificacoes.length === 0 && (
          <Animado>
            <View style={styles.vazio}>
              <View style={styles.vazioIcone}>
                <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhuma notificação</Text>
              <Text style={styles.vazioTexto}>
                {ehAdmin
                  ? 'Avisos sobre novas solicitações de reserva aparecem aqui.'
                  : 'Quando algo acontecer com suas reservas ou no ETEC League, o aviso aparece aqui.'}
              </Text>
            </View>
          </Animado>
        )}

        {/* Lista */}
        {!carregando &&
          !erroCarregamento &&
          notificacoes.map((n, indice) => (
            <CartaoNotificacao
              key={n.id_notificacao}
              notificacao={n}
              indice={indice}
              aoMarcar={marcarVisualizada}
            />
          ))}
      </ScrollView>

      {/* Menu Inferior — modo ADMIN */}
      {ehAdmin && (
        <MenuInferiorAdmin
          telaAtiva="notificacoes"
          irParaAdminReservas={irParaAdminReservas}
          irParaAdminPromocoes={irParaAdminPromocoes}
          irParaAdminHorarios={irParaAdminHorarios}
        />
      )}

      {/* Menu Inferior — modo ALUNO (nenhuma aba ativa: notificações não é aba) */}
      {!ehAdmin && (
        <MenuInferior
          telaAtiva="notificacoes"
          irParaInicial={irParaInicial}
          irParaCalendario={irParaCalendario}
          irParaEL={irParaEL}
          irParaPerfil={irParaPerfil}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },

  // ---------- Header ----------
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 45,
    paddingBottom: 48,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  circuloGrande: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    right: -45,
    top: -60,
  },
  circuloPequeno: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    left: -30,
    bottom: -35,
  },
  headerLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextos: {
    flexShrink: 1,
  },
  headerTitulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitulo: {
    color: '#BFDBFE',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },

  // ---------- Conteúdo ----------
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 8,
  },

  // Card resumo (não lidas + marcar todas) — irmão do ScrollView,
  // sobrepõe o header com marginTop negativo
  resumo: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 20,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  resumoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pontoResumo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1565C0',
    marginRight: 8,
  },
  resumoContagem: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  resumoTudoLido: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8,
  },
  botaoMarcar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 10,
  },
  botaoMarcarTexto: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1565C0',
    marginLeft: 5,
  },
  botaoMarcarTextoDesabilitado: {
    color: '#94A3B8',
  },

  // Card de notificação
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardNova: {
    backgroundColor: '#EFF6FF',
    borderColor: '#C7DDF7',
  },
  cardLida: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EDF5',
  },
  iconeTipo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTextos: {
    flex: 1,
    flexShrink: 1,
  },
  cardTituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pontoNaoLida: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1565C0',
    marginRight: 7,
  },
  cardTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  cardTituloLida: {
    fontWeight: '700',
    color: '#475569',
  },
  cardMensagem: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardTempo: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  // Carregando
  areaStatus: {
    alignItems: 'center',
    marginTop: 56,
  },
  textoStatus: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 14,
  },

  // Erro
  cardErro: {
    backgroundColor: '#FFFFFF',
    marginTop: 24,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  erroIcone: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  erroTextos: {
    flex: 1,
    flexShrink: 1,
  },
  erroTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  erroTexto: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Vazio
  vazio: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D8DFEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  vazioIcone: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  vazioTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  vazioTexto: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
  },
});