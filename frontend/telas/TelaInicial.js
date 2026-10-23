import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ============================================================
// DADOS MOCKADOS — conectar na API na etapa F5
// ============================================================

// TODO F5: alimentar com GET /agenda?data=hoje (contar slots livres)
const NEWS = [
  {
    id: 1,
    tag: 'ETEC LEAGUE',
    tagColor: '#D97706',
    tagBg: '#FEF3C7',
    title: 'Fase de grupos começa semana que vem',
    sub: '8 equipes confirmadas · 24 atletas inscritos',
    icon: 'trophy',
    accent: '#D97706',
  },
  {
    id: 2,
    tag: 'AVISO',
    tagColor: '#DC2626',
    tagBg: '#FEE2E2',
    title: 'Quadra fechada na sexta à tarde',
    sub: 'Manutenção programada · 13h às 17h',
    icon: 'warning',
    accent: '#DC2626',
  },
  {
    id: 3,
    tag: 'NOVIDADE',
    tagColor: '#059669',
    tagBg: '#D1FAE5',
    title: 'Horário das 7h30 liberado',
    sub: 'Disponível para reservas a partir de hoje',
    icon: 'sunny-outline',
    accent: '#059669',
  },
];

// TODO F5: buscar reservas futuras (confirmada/pendente) e pegar a primeira
const PROXIMA_RESERVA = {
  esporte: 'Futsal',
  iconeEsporte: 'soccer', // MaterialCommunityIcons
  diaSemana: 'QUI',
  dia: '12',
  mes: 'MAR',
  horario: '14:30 – 15:30',
  status: 'confirmada', // confirmada | pendente
};

const CORES_STATUS = {
  confirmada: { bg: '#D1FAE5', texto: '#065F46', label: 'Confirmada' },
  pendente: { bg: '#FEF3C7', texto: '#92400E', label: 'Pendente' },
};

// TODO F5: contar reservas, equipes inscritas e jogos do usuário
const STATS = [
  { icon: 'calendar-clear-outline', valor: 3, label: 'Reservas' },
  { icon: 'people-outline', valor: 1, label: 'Equipes' },
  { icon: 'basketball-outline', valor: 5, label: 'Jogos' },
];

// TODO F5: alimentar com jogo do ETEC League em andamento hoje
const JOGO_AO_VIVO = {
  titulo: 'Futsal · 404 vs AutoBots',
  local: 'Quadra Principal · 2º tempo',
  placar: '2 – 1',
  minuto: "12'",
};

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES_ANO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default function TelaInicial({
  usuario,
  irParaCalendario,
  irParaNotificacoes,
  irParaPerfil,
  irParaEL,
}) {
  // ===== Animações (Animated do core — nada instalado) =====
  const entradaStats = useRef(new Animated.Value(0)).current;
  const entradaReserva = useRef(new Animated.Value(0)).current;
  const entradaAcoes = useRef(new Animated.Value(0)).current;
  const entradaLive = useRef(new Animated.Value(0)).current;
  const entradaNews = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const newsAnim = useRef(new Animated.Value(0)).current;

  const [newsIndex, setNewsIndex] = useState(0);

  // ===== Informações contextuais reais =====
  const agora = new Date();
  const saudacao = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const dataExtenso = `${DIAS_SEMANA[agora.getDay()]}, ${agora.getDate()} de ${MESES_ANO[agora.getMonth()]}`;

  const nomeCompleto = (usuario?.nome || 'Aluno').trim() || 'Aluno';
  const primeiroNome = nomeCompleto.split(/\s+/)[0];
  const iniciais = nomeCompleto
    .split(/\s+/)
    .map((parte) => parte.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ===== Atalhos e menu (dependem das props de navegação) =====
  const ATALHOS = [
    { icon: 'trophy', label: 'ETEC League', sub: 'Jogos da liga', tint: '#FDF3E1', color: '#D97706', action: irParaEL },
    { icon: 'time-outline', label: 'Minhas reservas', sub: 'Histórico', tint: '#F1ECFE', color: '#7C3AED', action: irParaPerfil },
    { icon: 'calendar-outline', label: 'Disponibilidade', sub: 'Grade de horários', tint: '#E2F3F8', color: '#0891B2', action: irParaCalendario },
  ];

  const MENU = [
    { icon: 'home', iconOutline: 'home-outline', label: 'Início', action: null },
    { icon: 'calendar', iconOutline: 'calendar-outline', label: 'Calendário', action: irParaCalendario },
    { icon: 'trophy', iconOutline: 'trophy-outline', label: 'ETEC League', action: irParaEL },
    { icon: 'person', iconOutline: 'person-outline', label: 'Perfil', action: irParaPerfil },
  ];

  // ===== Rotação automática das notícias =====
  useEffect(() => {
    const interval = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % NEWS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ===== Entrada escalonada dos blocos =====
  useEffect(() => {
    const blocos = [entradaStats, entradaReserva, entradaAcoes, entradaLive, entradaNews];
    blocos.forEach((valor, i) => {
      Animated.timing(valor, {
        toValue: 1,
        duration: 520,
        delay: 70 + i * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // ===== Pulso do dot "AO VIVO" =====
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // ===== Fade na troca de notícia =====
  useEffect(() => {
    newsAnim.setValue(0);
    Animated.timing(newsAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [newsIndex]);

  const rise = (valor) => ({
    opacity: valor,
    transform: [{ translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  const currentNews = NEWS[newsIndex];
  const statusReserva = PROXIMA_RESERVA ? CORES_STATUS[PROXIMA_RESERVA.status] : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ==================== HEADER ==================== */}
        <View style={styles.header}>
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerTopo}>
            <Text style={styles.headerData}>{dataExtenso}</Text>
            <View style={styles.headerAcoes}>
              <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={irParaNotificacoes}>
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerAvatar} activeOpacity={0.8} onPress={irParaPerfil}>
                <Text style={styles.headerAvatarTexto}>{iniciais}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.saudacao}>{saudacao},</Text>
          <Text style={styles.nomeUsuario}>{primeiroNome}</Text>

          <View style={styles.disponibilidadePill}>
            <View style={styles.disponibilidadeDot} />
            <Text style={styles.disponibilidadeTexto}>6 horários livres hoje</Text>
          </View>
        </View>

        {/* ==================== ESTATÍSTICAS ==================== */}
        <Animated.View style={[styles.statsContainer, rise(entradaStats)]}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={styles.statChip}>
                <Ionicons name={stat.icon} size={15} color="#1565C0" />
              </View>
              <Text style={styles.statNumero}>{stat.valor}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ==================== PRÓXIMA RESERVA ==================== */}
        <Animated.View style={[styles.secao, rise(entradaReserva)]}>
          <View style={styles.secaoHeader}>
            <Text style={styles.secaoTitulo}>Sua próxima reserva</Text>
            <TouchableOpacity style={styles.linkTodas} activeOpacity={0.7} onPress={irParaPerfil}>
              <Text style={styles.linkTodasTexto}>Ver todas</Text>
              <Ionicons name="chevron-forward" size={13} color="#1565C0" />
            </TouchableOpacity>
          </View>

          {PROXIMA_RESERVA ? (
            <TouchableOpacity style={styles.reservaCard} activeOpacity={0.8} onPress={irParaPerfil}>
              <View style={styles.reservaData}>
                <Text style={styles.reservaDiaSemana}>{PROXIMA_RESERVA.diaSemana}</Text>
                <Text style={styles.reservaDia}>{PROXIMA_RESERVA.dia}</Text>
                <Text style={styles.reservaMes}>{PROXIMA_RESERVA.mes}</Text>
              </View>

              <View style={styles.reservaDivisor} />

              <View style={styles.reservaInfo}>
                <View style={styles.reservaEsporte}>
                  <MaterialCommunityIcons name={PROXIMA_RESERVA.iconeEsporte} size={16} color="#475569" />
                  <Text style={styles.reservaEsporteTexto}>{PROXIMA_RESERVA.esporte}</Text>
                </View>
                <Text style={styles.reservaHorario}>{PROXIMA_RESERVA.horario}</Text>
                <View style={[styles.reservaStatus, { backgroundColor: statusReserva.bg }]}>
                  <Text style={[styles.reservaStatusTexto, { color: statusReserva.texto }]}>
                    {statusReserva.label}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={styles.reservaChevron} />
            </TouchableOpacity>
          ) : (
            <View style={styles.vazioCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={24} color="#94A3B8" />
              <Text style={styles.vazioTitulo}>Nenhuma reserva por aqui</Text>
              <Text style={styles.vazioTexto}>
                Use o botão azul abaixo e garanta seu horário na quadra.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ==================== AÇÕES RÁPIDAS ==================== */}
        <Animated.View style={[styles.secao, rise(entradaAcoes)]}>
          <Text style={styles.secaoTitulo}>Ações rápidas</Text>

          <TouchableOpacity style={styles.heroButton} activeOpacity={0.85} onPress={irParaCalendario}>
            <View style={styles.heroIcone}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextos}>
              <Text style={styles.heroTitulo}>Reservar a quadra</Text>
              <Text style={styles.heroSubtitulo}>Escolha o dia e o horário</Text>
            </View>
            <View style={styles.heroChevron}>
              <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.atalhosRow}>
            {ATALHOS.map((atalho) => (
              <TouchableOpacity key={atalho.label} style={styles.atalhoCard} activeOpacity={0.7} onPress={atalho.action}>
                <View style={[styles.atalhoIcone, { backgroundColor: atalho.tint }]}>
                  <Ionicons name={atalho.icon} size={17} color={atalho.color} />
                </View>
                <Text style={styles.atalhoLabel}>{atalho.label}</Text>
                <Text style={styles.atalhoSub}>{atalho.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ==================== AO VIVO ==================== */}
        <Animated.View style={[styles.liveWrap, rise(entradaLive)]}>
          <View style={styles.liveBanner}>
            <View style={styles.liveDecor} />

            <View style={styles.liveLinha1}>
              <View style={styles.liveTag}>
                <Animated.View
                  style={[
                    styles.liveDot,
                    {
                      transform: [
                        { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                      ],
                    },
                  ]}
                />
                <Text style={styles.liveTagTexto}>AO VIVO</Text>
              </View>
              <View style={styles.livePlacarArea}>
                <Text style={styles.livePlacar}>{JOGO_AO_VIVO.placar}</Text>
                <Text style={styles.liveMinuto}>{JOGO_AO_VIVO.minuto}</Text>
              </View>
            </View>

            <Text style={styles.liveTitulo}>{JOGO_AO_VIVO.titulo}</Text>

            <View style={styles.liveLocal}>
              <Ionicons name="location-outline" size={12} color="#93C5FD" />
              <Text style={styles.liveLocalTexto}>{JOGO_AO_VIVO.local}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ==================== NOTÍCIAS ==================== */}
        <Animated.View style={[styles.secao, rise(entradaNews)]}>
          <Text style={styles.secaoTitulo}>Notícias</Text>

          <Animated.View
            style={[
              styles.newsCard,
              {
                opacity: newsAnim,
                transform: [
                  { translateY: newsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.newsHeader}>
              <View style={[styles.newsTag, { backgroundColor: currentNews.tagBg }]}>
                <Text style={[styles.newsTagTexto, { color: currentNews.tagColor }]}>{currentNews.tag}</Text>
              </View>
              <View
                style={[
                  styles.newsIcone,
                  { backgroundColor: `${currentNews.accent}14`, borderColor: `${currentNews.accent}30` },
                ]}
              >
                <Ionicons name={currentNews.icon} size={19} color={currentNews.accent} />
              </View>
            </View>

            <Text style={styles.newsTitulo}>{currentNews.title}</Text>
            <Text style={styles.newsSubtitulo}>{currentNews.sub}</Text>
          </Animated.View>

          <View style={styles.newsDots}>
            {NEWS.map((_, i) => (
              <TouchableOpacity key={i} style={styles.newsDotArea} activeOpacity={0.7} onPress={() => setNewsIndex(i)}>
                <View style={[styles.newsDot, i === newsIndex && styles.newsDotAtivo]} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Text style={styles.rodape}>QuadraSync · ETEC Profª Ilza Nascimento Pintus</Text>
      </ScrollView>

      {/* ==================== MENU INFERIOR ==================== */}
      <View style={styles.menuContainer}>
        {MENU.map((item, i) => {
          const ativo = i === 0;
          const conteudo = (
            <>
              <Ionicons
                name={ativo ? item.icon : item.iconOutline}
                size={21}
                color={ativo ? '#1565C0' : '#94A3B8'}
              />
              <Text style={[styles.menuLabel, ativo && styles.menuLabelAtivo]}>{item.label}</Text>
            </>
          );

          return ativo ? (
            <View key={item.label} style={styles.menuItem}>
              {conteudo}
            </View>
          ) : (
            <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.6} onPress={item.action}>
              {conteudo}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },
  scrollContent: {
    paddingBottom: 108, // espaço para o menu flutuante
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 30,
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
    right: 60,
    bottom: -55,
  },
  headerTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerData: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  saudacao: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '600',
  },
  nomeUsuario: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 31,
    marginBottom: 12,
  },
  disponibilidadePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disponibilidadeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#4ADE80',
  },
  disponibilidadeTexto: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '600',
  },

  // ==================== ESTATÍSTICAS ====================
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -18, // efeito sobreposto ao header
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
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
    backgroundColor: '#EFF6FF',
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
  secaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  linkTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkTodasTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565C0',
    marginRight: 2,
  },

  // ==================== PRÓXIMA RESERVA ====================
  reservaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  reservaData: {
    width: 64,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  reservaDiaSemana: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 1.5,
  },
  reservaDia: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1565C0',
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  reservaMes: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 1.5,
  },
  reservaDivisor: {
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D3DCE8',
    marginVertical: 12,
  },
  reservaInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    gap: 3,
  },
  reservaEsporte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reservaEsporteTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  reservaHorario: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  reservaStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 2,
  },
  reservaStatusTexto: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reservaChevron: {
    alignSelf: 'center',
    paddingRight: 12,
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
    marginTop: 6,
  },
  vazioTexto: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 3,
  },

  // ==================== AÇÕES RÁPIDAS ====================
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 18,
    padding: 14,
    elevation: 5,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroTextos: {
    flex: 1,
  },
  heroTitulo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroSubtitulo: {
    color: '#BFDBFE',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  heroChevron: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  atalhosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  atalhoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  atalhoIcone: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  atalhoLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  atalhoSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
    textAlign: 'center',
  },

  // ==================== AO VIVO ====================
  liveWrap: {
    marginHorizontal: 20,
    marginTop: 26,
  },
  liveBanner: {
    backgroundColor: '#0D47A1',
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  liveDecor: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    right: -40,
    top: -55,
  },
  liveLinha1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#4ADE80',
  },
  liveTagTexto: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  livePlacarArea: {
    alignItems: 'flex-end',
  },
  livePlacar: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  liveMinuto: {
    color: '#93C5FD',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  liveTitulo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  liveLocal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveLocalTexto: {
    color: '#BFDBFE',
    fontSize: 11.5,
    fontWeight: '500',
  },

  // ==================== NOTÍCIAS ====================
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newsTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  newsTagTexto: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newsIcone: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  newsSubtitulo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 17,
  },
  newsDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  newsDotArea: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  newsDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  newsDotAtivo: {
    width: 18,
    backgroundColor: '#1565C0',
  },

  // ==================== RODAPÉ ====================
  rodape: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
    marginTop: 28,
    marginBottom: 4,
  },

  // ==================== MENU INFERIOR ====================
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  menuLabelAtivo: {
    fontWeight: '800',
    color: '#1565C0',
  },
});