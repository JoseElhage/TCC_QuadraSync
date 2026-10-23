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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferior from '../components/MenuInferior';

// ============================================================
// Constantes de apoio
// ============================================================

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const MODALIDADES_INFO = {
  futsal: { label: 'Futsal', icone: 'soccer' },
  volei: { label: 'Vôlei', icone: 'volleyball' },
  basquete: { label: 'Basquete', icone: 'basketball' },
};

const STATUS_RESERVA = {
  pendente: { label: 'Pendente', cor: '#D97706', bg: '#FEF3C7' },
  confirmada: { label: 'Confirmada', cor: '#059669', bg: '#D1FAE5' },
  recusada: { label: 'Recusada', cor: '#DC2626', bg: '#FEE2E2' },
  cancelada: { label: 'Cancelada', cor: '#64748B', bg: '#F1F5F9' },
  concluida: { label: 'Concluída', cor: '#1565C0', bg: '#DBEAFE' },
};

// Iniciais do nome: "Gabriel Henrique da Silva" -> "GS"
const obterIniciais = (nome) => {
  if (!nome) return '?';

  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0] ? partes[0][0] : '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

  return (primeira + ultima).toUpperCase();
};

// '2025-09-25' -> '25 set 2025'
const formatarData = (dataISO) => {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
};

// ============================================================
// Tela
// ============================================================

export default function TelaPerfil({
  token,
  usuario,
  irParaInicial,
  irParaCalendario,
  irParaEL,
  irParaNotificacoes,
  deslogar,
}) {
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  // F3: id da reserva que está sendo cancelada agora
  // (null = nenhum cancelamento em andamento)
  const [cancelandoId, setCancelandoId] = useState(null);

  // ===== Animações de entrada =====
  const entradaHeader = useRef(new Animated.Value(0)).current;
  const entradaStats = useRef(new Animated.Value(0)).current;
  const entradaReservas = useRef(new Animated.Value(0)).current;
  const entradaInfo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entradaHeader, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.timing(entradaStats, {
      toValue: 1,
      duration: 520,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(entradaReservas, {
      toValue: 1,
      duration: 520,
      delay: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(entradaInfo, {
      toValue: 1,
      duration: 520,
      delay: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const rise = (valor) => ({
    opacity: valor,
    transform: [{ translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  // ------------------------------------------------------------
  // Carregar reservas do aluno (GET /api/reservas/minhas)
  // ------------------------------------------------------------
  const carregarReservas = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/reservas/minhas`, {
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
  // Pull-to-refresh
  // ------------------------------------------------------------
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarReservas();
    setAtualizando(false);
  }, [carregarReservas]);

  // ------------------------------------------------------------
  // F3: Cancelar reserva (PUT /api/reservas/:id/cancelar)
  // ------------------------------------------------------------
  const cancelarReserva = (idReserva) => {
    Alert.alert(
      'Cancelar reserva',
      'Tem certeza que deseja cancelar esta reserva?',
      [
        { text: 'Manter reserva', style: 'cancel' },
        {
          text: 'Cancelar reserva',
          style: 'destructive',
          onPress: () => confirmarCancelamento(idReserva),
        },
      ]
    );
  };

  const confirmarCancelamento = async (idReserva) => {
    setCancelandoId(idReserva);

    try {
      const resposta = await fetch(`${API_URL}/reservas/${idReserva}/cancelar`, {
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

      const dados = await resposta.json();

      if (resposta.ok && dados.success) {
        await carregarReservas();
        Alert.alert('Pronto', 'Reserva cancelada com sucesso.');
        return;
      }

      // 404 (não encontrada) ou 409 (status mudou — ex.: admin acabou de recusar):
      // recarrega a lista para mostrar o estado real e informa o aluno
      if (resposta.status === 404 || resposta.status === 409) {
        await carregarReservas();
        Alert.alert('Não foi possível cancelar', dados.message || 'A reserva não pode ser cancelada.');
        return;
      }

      Alert.alert('Não foi possível cancelar', dados.message || 'Tente novamente em instantes.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setCancelandoId(null);
    }
  };

  // ------------------------------------------------------------
  // Estatísticas reais (derivadas das reservas carregadas)
  // ------------------------------------------------------------
  const totalReservas = reservas.length;
  const confirmadas = reservas.filter((r) => r.status === 'confirmada').length;
  const pendentes = reservas.filter((r) => r.status === 'pendente').length;
  const recusadas = reservas.filter((r) => r.status === 'recusada').length;

  const STATS = [
    { icone: 'calendar-clear-outline', cor: '#1565C0', tint: '#EFF6FF', valor: totalReservas, label: 'Reservas' },
    { icone: 'checkmark-circle-outline', cor: '#059669', tint: '#D1FAE5', valor: confirmadas, label: 'Confirmadas' },
    { icone: 'time-outline', cor: '#D97706', tint: '#FEF3C7', valor: pendentes, label: 'Pendentes' },
    { icone: 'close-circle-outline', cor: '#DC2626', tint: '#FEE2E2', valor: recusadas, label: 'Recusadas' },
  ];

  const SUBTITULO = [usuario?.turma, usuario?.curso].filter(Boolean).join(' · ');

  const INFO_CONTA = [
    { icone: 'person-outline', label: 'Nome completo', valor: usuario?.nome },
    { icone: 'mail-outline', label: 'E-mail', valor: usuario?.email },
    { icone: 'school-outline', label: 'Curso', valor: usuario?.curso },
    { icone: 'people-outline', label: 'Turma', valor: usuario?.turma },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={['#1565C0']}
            tintColor="#1565C0"
          />
        }
      >

        {/* ==================== HEADER (cartão de identidade) ==================== */}
        <Animated.View style={[styles.header, { opacity: entradaHeader }]}>
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerTopo}>
            <Text style={styles.headerLabel}>Perfil</Text>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={irParaNotificacoes}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.perfilArea}>
            <View style={styles.avatarCirculo}>
              <Text style={styles.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
            </View>
            <Text style={styles.perfilNome}>{usuario?.nome || 'Aluno'}</Text>
            {SUBTITULO ? <Text style={styles.perfilSubtitulo}>{SUBTITULO}</Text> : null}
          </View>
        </Animated.View>

        {/* ==================== ESTATÍSTICAS ==================== */}
        <Animated.View style={[styles.statsGrid, rise(entradaStats)]}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statChip, { backgroundColor: stat.tint }]}>
                <Ionicons name={stat.icone} size={15} color={stat.cor} />
              </View>
              <Text style={styles.statNumero}>{stat.valor}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ==================== MINHAS RESERVAS ==================== */}
        <Animated.View style={[styles.secao, rise(entradaReservas)]}>
          <Text style={styles.secaoTitulo}>Minhas reservas</Text>

          {carregando && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#1565C0" />
              <Text style={styles.statusTexto}>Carregando reservas...</Text>
            </View>
          )}

          {!carregando && erroCarregamento && (
            <TouchableOpacity
              style={styles.statusBox}
              activeOpacity={0.7}
              onPress={carregarReservas}
            >
              <Ionicons name="cloud-offline-outline" size={22} color="#DC2626" />
              <Text style={styles.statusTexto}>
                Não foi possível carregar suas reservas.{'\n'}Toque para tentar novamente.
              </Text>
            </TouchableOpacity>
          )}

          {!carregando && !erroCarregamento && reservas.length === 0 && (
            <View style={styles.vazioCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={26} color="#94A3B8" />
              <Text style={styles.vazioTitulo}>Nenhuma reserva ainda</Text>
              <Text style={styles.vazioTexto}>
                Que tal garantir um horário na quadra? Use o calendário para fazer sua primeira reserva.
              </Text>
            </View>
          )}

          {!carregando && !erroCarregamento && reservas.length > 0 && reservas.map((reserva) => {
            const status = STATUS_RESERVA[reserva.status] || STATUS_RESERVA.pendente;
            const info = MODALIDADES_INFO[reserva.modalidade] || { label: reserva.modalidade, icone: 'help-circle-outline' };
            const podeCancelar = reserva.status === 'pendente' || reserva.status === 'confirmada';
            const cancelandoEsta = cancelandoId === reserva.id_reserva;

            return (
              <View key={reserva.id_reserva} style={styles.reservaCard}>
                <View style={[styles.reservaBarra, { backgroundColor: status.cor }]} />

                <View style={styles.reservaCorpo}>
                  {/* Linha 1: modalidade + status */}
                  <View style={styles.reservaTopo}>
                    <View style={styles.reservaEsporteRow}>
                      <View style={styles.reservaIconeChip}>
                        <MaterialCommunityIcons name={info.icone} size={18} color="#475569" />
                      </View>
                      <Text style={styles.reservaEsporte}>{info.label}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <View style={[styles.statusBadgeDot, { backgroundColor: status.cor }]} />
                      <Text style={[styles.statusBadgeTexto, { color: status.cor }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Linha 2: data e horário */}
                  <View style={styles.reservaMeta}>
                    <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                    <Text style={styles.reservaMetaTexto}>
                      {formatarData(reserva.data_utilizacao)} ·{' '}
                      {reserva.hora_inicio.substring(0, 5)} às {reserva.hora_fim.substring(0, 5)}
                    </Text>
                  </View>

                  {/* Linha 3: pessoas e finalidade */}
                  <View style={styles.reservaMeta}>
                    <Ionicons name="people-outline" size={13} color="#94A3B8" />
                    <Text style={styles.reservaMetaTexto}>
                      {reserva.quantidade_pessoas}{' '}
                      {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'} · {reserva.finalidade}
                    </Text>
                  </View>

                  {/* Motivo da recusa (quando houver) */}
                  {reserva.status === 'recusada' && reserva.motivo_recusa && (
                    <View style={styles.motivoRecusa}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.motivoRecusaTexto}>
                        Motivo da recusa: {reserva.motivo_recusa}
                      </Text>
                    </View>
                  )}

                  {/* Cancelar */}
                  {podeCancelar && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => cancelarReserva(reserva.id_reserva)}
                      disabled={cancelandoId !== null}
                      style={[
                        styles.cancelarButton,
                        cancelandoEsta && styles.cancelarButtonAtivo,
                      ]}
                    >
                      {cancelandoEsta ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                      )}
                      <Text style={styles.cancelarButtonText}>
                        {cancelandoEsta ? 'Cancelando...' : 'Cancelar reserva'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* ==================== INFORMAÇÕES DA CONTA ==================== */}
        <Animated.View style={[styles.secao, rise(entradaInfo)]}>
          <Text style={styles.secaoTitulo}>Informações da conta</Text>

          <View style={styles.infoCard}>
            {INFO_CONTA.map((item, index) => (
              <View key={item.label}>
                {index > 0 ? <View style={styles.infoDivisor} /> : null}
                <View style={styles.infoRow}>
                  <View style={styles.infoChip}>
                    <Ionicons name={item.icone} size={15} color="#1565C0" />
                  </View>
                  <View style={styles.infoTextos}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValor} numberOfLines={1} ellipsizeMode="tail">
                      {item.valor || '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ==================== SAIR ==================== */}
        <TouchableOpacity activeOpacity={0.7} onPress={deslogar} style={styles.sairButton}>
          <Ionicons name="log-out-outline" size={17} color="#DC2626" />
          <Text style={styles.sairButtonText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ==================== MENU INFERIOR ==================== */}
      <MenuInferior
        telaAtiva="perfil"
        irParaInicial={irParaInicial}
        irParaCalendario={irParaCalendario}
        irParaEL={irParaEL}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },
  scrollContent: {
    paddingBottom: 108,
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 18,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -45,
    top: -60,
  },
  headerDecor2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    left: 55,
    bottom: -55,
  },
  headerTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLabel: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilArea: {
    alignItems: 'center',
  },
  avatarCirculo: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarTexto: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  perfilNome: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  perfilSubtitulo: {
    color: '#BFDBFE',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 3,
  },

  // ==================== ESTATÍSTICAS ====================
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -18, // sobrepõe o header
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumero: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // ==================== SEÇÕES ====================
  secao: {
    marginTop: 26,
    marginHorizontal: 20,
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // ==================== STATUS (carregando / erro / vazio) ====================
  statusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
  },
  statusTexto: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  vazioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D8DFEA',
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  vazioTitulo: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  vazioTexto: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 3,
  },

  // ==================== CARD DE RESERVA ====================
  reservaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  reservaBarra: {
    width: 5,
  },
  reservaCorpo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  reservaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reservaEsporteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  reservaIconeChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reservaEsporte: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusBadgeTexto: {
    fontSize: 10,
    fontWeight: '800',
  },
  reservaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reservaMetaTexto: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    flexShrink: 1,
  },
  motivoRecusa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  motivoRecusaTexto: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
    flexShrink: 1,
    lineHeight: 15,
  },

  // Botão Cancelar (outline vermelho suave)
  cancelarButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 8,
  },
  cancelarButtonAtivo: {
    opacity: 0.55,
  },
  cancelarButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },

  // ==================== INFORMAÇÕES DA CONTA ====================
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextos: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  infoValor: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  infoDivisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 60, // alinha depois do chip
  },

  // ==================== SAIR ====================
  sairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  sairButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});