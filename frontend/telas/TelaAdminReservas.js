import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferiorAdmin from '../components/MenuInferiorAdmin';

// ============================================================
// Constantes de apoio
// ============================================================

const MODALIDADES = {
  futsal: { icone: 'soccer', fundo: '#D1FAE5', cor: '#059669' },
  volei: { icone: 'volleyball', fundo: '#E2F3F8', cor: '#0891B2' },
  basquete: { icone: 'basketball', fundo: '#FEF3C7', cor: '#D97706' },
};

const MODALIDADE_PADRAO = { icone: 'help-circle-outline', fundo: '#F1F5F9', cor: '#64748B' };

const obterModalidade = (modalidade) => MODALIDADES[modalidade] || MODALIDADE_PADRAO;

// '2025-09-25' -> '25/09/2025'
const formatarData = (dataISO) => {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

// '14:00:00' -> '14:00'
const formatarHora = (hora) => hora.substring(0, 5);

// '2025-09-25 14:32:10' -> '25/09 às 14:32'
const formatarSolicitacao = (dataHora) => {
  if (!dataHora) return '';

  const [dataParte, horaParte] = dataHora.split(' ');
  const [ano, mes, dia] = dataParte.split('-');

  return `${dia}/${mes} às ${horaParte.substring(0, 5)}`;
};

// ============================================================
// Animação de entrada (fade + rise)
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

// ============================================================
// Card de solicitação pendente
// ============================================================

function CartaoSolicitacao({
  reserva,
  indice,
  aoAprovar,
  aoRecusar,
  aprovandoId,
  processando,
}) {
  const mod = obterModalidade(reserva.modalidade);
  const nomeModalidade =
    reserva.modalidade.charAt(0).toUpperCase() + reserva.modalidade.slice(1);

  return (
    <Animado delay={Math.min(indice, 8) * 60}>
      <View style={styles.card}>
        <View style={styles.cardBarra} />

        <View style={styles.cardConteudo}>
          {/* Aluno */}
          <View style={styles.alunoLinha}>
            <Text style={styles.alunoNome} numberOfLines={1}>
              {reserva.nome}
            </Text>
            <View style={styles.badgePendente}>
              <View style={styles.badgePonto} />
              <Text style={styles.badgeTexto}>Pendente</Text>
            </View>
          </View>

          <Text style={styles.alunoInfo}>
            {reserva.turma} • {reserva.curso}
          </Text>

          <View style={styles.alunoEmailLinha}>
            <Ionicons name="mail-outline" size={12} color="#94A3B8" />
            <Text style={styles.alunoEmail}>{reserva.email}</Text>
          </View>

          <View style={styles.divisor} />

          {/* Reserva */}
          <View style={styles.chipModalidade} backgroundColor={mod.fundo}>
            <MaterialCommunityIcons name={mod.icone} size={14} color={mod.cor} />
            <Text style={[styles.chipTexto, { color: mod.cor }]}>{nomeModalidade}</Text>
          </View>

          <View style={styles.metaLinha}>
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text style={styles.metaTexto}>
              {formatarData(reserva.data_utilizacao)} das{' '}
              {formatarHora(reserva.hora_inicio)} às {formatarHora(reserva.hora_fim)}
            </Text>
          </View>

          <View style={styles.metaLinha}>
            <Ionicons name="people-outline" size={14} color="#94A3B8" />
            <Text style={styles.metaTexto}>
              {reserva.quantidade_pessoas}{' '}
              {reserva.quantidade_pessoas > 1 ? 'pessoas' : 'pessoa'}
            </Text>
          </View>

          <View style={styles.metaLinha}>
            <Ionicons name="flag-outline" size={14} color="#94A3B8" />
            <Text style={styles.metaTexto}>{reserva.finalidade}</Text>
          </View>

          {reserva.observacao ? (
            <View style={styles.metaLinha}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#94A3B8" />
              <Text style={styles.metaTexto}>{reserva.observacao}</Text>
            </View>
          ) : null}

          <View style={styles.solicitadaLinha}>
            <Ionicons name="time-outline" size={12} color="#CBD5E1" />
            <Text style={styles.solicitadaTexto}>
              Solicitada em {formatarSolicitacao(reserva.data_solicitacao)}
            </Text>
          </View>

          {/* Ações */}
          <View style={styles.acoesLinha}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => aoAprovar(reserva)}
              disabled={processando}
              style={[styles.botaoAprovar, processando && styles.botaoDesabilitado]}
            >
              {aprovandoId === reserva.id_reserva ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
              )}
              <Text style={styles.botaoAprovarTexto}>
                {aprovandoId === reserva.id_reserva ? 'Aprovando...' : 'Aprovar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => aoRecusar(reserva)}
              disabled={processando}
              style={[styles.botaoRecusar, processando && styles.botaoDesabilitado]}
            >
              <Ionicons name="close-circle-outline" size={17} color="#DC2626" />
              <Text style={styles.botaoRecusarTexto}>Recusar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animado>
  );
}

// ============================================================
// Tela
// ============================================================

export default function TelaAdminReservas({
  token,
  usuario,
  deslogar,
  irParaAdminPromocoes,
  irParaAdminHorarios,
  irParaAdminNotificacoes,
}) {
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  // Processamento de aprovação/recusa
  const [aprovandoId, setAprovandoId] = useState(null);
  const [recusandoId, setRecusandoId] = useState(null);

  // Modal de recusa
  const [recusaAberta, setRecusaAberta] = useState(false);
  const [reservaRecusa, setReservaRecusa] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [motivoFocado, setMotivoFocado] = useState(false);
  const [enviandoRecusa, setEnviandoRecusa] = useState(false);

  const pendentes = reservas.length;

  // ------------------------------------------------------------
  // Carregar pendentes (GET /api/admin/reservas/pendentes)
  // ------------------------------------------------------------
  const carregarReservas = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/admin/reservas/pendentes`, {
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

      setReservas(dados.reservas);
      setErroCarregamento(false);
    } catch (error) {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarReservas();
  }, [carregarReservas]);

  // ------------------------------------------------------------
  // Pull-to-refresh + retry pelo card de erro
  // ------------------------------------------------------------
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarReservas();
    setAtualizando(false);
  }, [carregarReservas]);

  const tentarNovamente = useCallback(() => {
    setCarregando(true);
    carregarReservas();
  }, [carregarReservas]);

  // ------------------------------------------------------------
  // Aprovar (PUT /api/admin/reservas/:id/aprovar)
  // ------------------------------------------------------------
  const aprovarReserva = (reserva) => {
    Alert.alert(
      'Aprovar reserva',
      `Aprovar a reserva de ${reserva.nome} para ${formatarData(reserva.data_utilizacao)} das ${formatarHora(reserva.hora_inicio)} às ${formatarHora(reserva.hora_fim)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: () => confirmarAprovacao(reserva),
        },
      ]
    );
  };

  const confirmarAprovacao = async (reserva) => {
    setAprovandoId(reserva.id_reserva);

    try {
      const resposta = await fetch(
        `${API_URL}/admin/reservas/${reserva.id_reserva}/aprovar`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (resposta.status === 401) {
        Alert.alert(
          'Sessão expirada',
          'Sua sessão expirou. Saia da conta e faça login novamente.'
        );
        return;
      }

      const dados = await resposta.json();

      if (resposta.ok && dados.success) {
        await carregarReservas();
        Alert.alert('Pronto', 'Reserva aprovada. O aluno foi notificado.');
        return;
      }

      // 404 / 409: a reserva mudou de estado — recarrega e mostra o motivo
      if (resposta.status === 404 || resposta.status === 409) {
        await carregarReservas();
        Alert.alert('Não foi possível aprovar', dados.message || 'A reserva não pode ser aprovada.');
        return;
      }

      Alert.alert('Não foi possível aprovar', dados.message || 'Tente novamente em instantes.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setAprovandoId(null);
    }
  };

  // ------------------------------------------------------------
  // Recusar (PUT /api/admin/reservas/:id/recusar) — motivo obrigatório
  // ------------------------------------------------------------
  const abrirRecusa = (reserva) => {
    setReservaRecusa(reserva);
    setMotivo('');
    setRecusaAberta(true);
  };

  const fecharRecusa = () => {
    if (enviandoRecusa) return;
    setRecusaAberta(false);
  };

  const enviarRecusa = async () => {
    if (!motivo.trim()) {
      Alert.alert('Atenção', 'Informe o motivo da recusa.');
      return;
    }

    setEnviandoRecusa(true);

    try {
      const resposta = await fetch(
        `${API_URL}/admin/reservas/${reservaRecusa.id_reserva}/recusar`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            motivo_recusa: motivo.trim(),
          }),
        }
      );

      if (resposta.status === 401) {
        Alert.alert(
          'Sessão expirada',
          'Sua sessão expirou. Saia da conta e faça login novamente.'
        );
        return;
      }

      const dados = await resposta.json();

      if (resposta.ok && dados.success) {
        setRecusaAberta(false);
        await carregarReservas();
        Alert.alert('Pronto', 'Reserva recusada. O aluno foi notificado com o motivo.');
        return;
      }

      if (resposta.status === 404 || resposta.status === 409) {
        setRecusaAberta(false);
        await carregarReservas();
        Alert.alert('Não foi possível recusar', dados.message || 'A reserva não pode ser recusada.');
        return;
      }

      Alert.alert('Não foi possível recusar', dados.message || 'Tente novamente em instantes.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setEnviandoRecusa(false);
    }
  };

  // ------------------------------------------------------------
  // Sair da conta
  // ------------------------------------------------------------
  const confirmarSaida = () => {
    Alert.alert(
      'Sair da conta',
      'Deseja sair da conta de administrador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: deslogar },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />

        <View style={styles.headerLinha}>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>Reservas</Text>
            <Text style={styles.headerSubtitulo}>Solicitações de uso da quadra</Text>
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={confirmarSaida} style={styles.botaoSair}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/*
        Card de pendências: IRMÃO do ScrollView (regra do design system —
        o ScrollView recorta conteúdo com marginTop negativo).
      */}
      {!carregando && !erroCarregamento && pendentes > 0 && (
        <Animado>
          <View style={styles.resumo}>
            <View style={styles.resumoIcone}>
              <Ionicons name="hourglass-outline" size={22} color="#D97706" />
            </View>
            <View style={styles.resumoTextos}>
              <Text style={styles.resumoTitulo}>
                {pendentes}{' '}
                {pendentes > 1 ? 'solicitações' : 'solicitação'} pendente
                {pendentes > 1 ? 's' : ''}
              </Text>
              <Text style={styles.resumoSubtitulo}>Aguardando sua análise</Text>
            </View>
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
            <Text style={styles.textoStatus}>Carregando solicitações...</Text>
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
        {!carregando && !erroCarregamento && reservas.length === 0 && (
          <Animado>
            <View style={styles.vazio}>
              <View style={styles.vazioIcone}>
                <Ionicons name="checkmark-circle" size={32} color="#059669" />
              </View>
              <Text style={styles.vazioTitulo}>Tudo em ordem</Text>
              <Text style={styles.vazioTexto}>
                Nenhuma solicitação pendente no momento.
              </Text>
            </View>
          </Animado>
        )}

        {/* Lista de pendências */}
        {!carregando &&
          !erroCarregamento &&
          reservas.map((reserva, indice) => (
            <CartaoSolicitacao
              key={reserva.id_reserva}
              reserva={reserva}
              indice={indice}
              aoAprovar={aprovarReserva}
              aoRecusar={abrirRecusa}
              aprovandoId={aprovandoId}
              processando={aprovandoId !== null || recusandoId !== null}
            />
          ))}
      </ScrollView>

      {/*
        Bottom sheet de recusa.
        Toque fora NÃO fecha de propósito (motivo digitado à mão).
        Fecha pelo X, "Cancelar" ou botão voltar do Android.
      */}
      <Modal
        visible={recusaAberta}
        transparent
        animationType="fade"
        onRequestClose={fecharRecusa}
      >
        <KeyboardAvoidingView
          style={styles.recusaOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {recusaAberta && reservaRecusa && (
            <View style={styles.recusaPainel}>
              <View style={styles.recusaHandle} />

              <View style={styles.recusaCabecalho}>
                <View style={styles.recusaCabecalhoIcone}>
                  <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                </View>
                <Text style={styles.recusaTitulo}>Recusar reserva</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={fecharRecusa}
                  disabled={enviandoRecusa}
                  style={styles.recusaFechar}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.recusaSubtitulo}>
                {reservaRecusa.nome} · {formatarData(reservaRecusa.data_utilizacao)} das{' '}
                {formatarHora(reservaRecusa.hora_inicio)} às{' '}
                {formatarHora(reservaRecusa.hora_fim)}
              </Text>

              <Text style={styles.recusaLabel}>Motivo da recusa</Text>
              <Text style={styles.recusaDica}>Obrigatório — o aluno receberá esta mensagem</Text>

              <TextInput
                style={[styles.recusaInput, motivoFocado && styles.recusaInputFocado]}
                placeholder="Ex.: Horário conflitante com aula de ed. física"
                placeholderTextColor="#94A3B8"
                value={motivo}
                onChangeText={setMotivo}
                onFocus={() => setMotivoFocado(true)}
                onBlur={() => setMotivoFocado(false)}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={enviarRecusa}
                style={[styles.recusaBotaoEnviar, enviandoRecusa && styles.botaoDesabilitado]}
                disabled={enviandoRecusa}
              >
                {enviandoRecusa ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send-outline" size={17} color="#FFFFFF" />
                )}
                <Text style={styles.recusaBotaoEnviarTexto}>
                  {enviandoRecusa ? 'Enviando...' : 'Enviar recusa'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={fecharRecusa}
                style={styles.recusaBotaoCancelar}
                disabled={enviandoRecusa}
              >
                <Text style={styles.recusaBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu Inferior Admin */}
      <MenuInferiorAdmin
        telaAtiva="reservas"
        irParaAdminPromocoes={irParaAdminPromocoes}
        irParaAdminHorarios={irParaAdminHorarios}
        irParaAdminNotificacoes={irParaAdminNotificacoes}
      />
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
  headerTextos: {
    flex: 1,
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
  botaoSair: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },

  // ---------- Conteúdo ----------
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 8,
  },

  // Card resumo de pendências (irmão do ScrollView)
  resumo: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  resumoIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resumoTextos: {
    flex: 1,
  },
  resumoTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  resumoSubtitulo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  // ---------- Card de solicitação ----------
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardBarra: {
    width: 5,
    backgroundColor: '#D97706',
  },
  cardConteudo: {
    flex: 1,
    padding: 16,
  },

  alunoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
    marginRight: 8,
  },
  badgePendente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgePonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  badgeTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  alunoInfo: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  alunoEmailLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  alunoEmail: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginLeft: 5,
  },

  divisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  chipModalidade: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  chipTexto: {
    fontSize: 11.5,
    fontWeight: '800',
    marginLeft: 5,
  },

  metaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  metaTexto: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  solicitadaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  solicitadaTexto: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 5,
    fontVariant: ['tabular-nums'],
  },

  acoesLinha: {
    flexDirection: 'row',
    marginTop: 14,
  },
  botaoAprovar: {
    flex: 1,
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 8,
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  botaoAprovarTexto: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    marginLeft: 7,
  },
  botaoRecusar: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  botaoRecusarTexto: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '800',
    marginLeft: 7,
  },
  botaoDesabilitado: {
    opacity: 0.55,
  },

  // ---------- Carregando ----------
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

  // ---------- Erro ----------
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

  // ---------- Vazio ----------
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
    backgroundColor: '#D1FAE5',
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

  // ---------- Bottom sheet de recusa ----------
  recusaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  recusaPainel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
  },
  recusaHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  recusaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recusaCabecalhoIcone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recusaTitulo: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  recusaFechar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recusaSubtitulo: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  recusaLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    marginTop: 18,
  },
  recusaDica: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 8,
  },
  recusaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  recusaInputFocado: {
    borderColor: '#1565C0',
    backgroundColor: '#FFFFFF',
  },
  recusaBotaoEnviar: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 18,
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  recusaBotaoEnviarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  recusaBotaoCancelar: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  recusaBotaoCancelarTexto: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});