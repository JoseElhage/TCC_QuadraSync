import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferior from '../components/MenuInferior';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

// Grade de horários oficiais da quadra (início de cada slot de 1 hora):
// manhã 08:00–12:00 e tarde 13:00–17:00 (sem 12:00–13:00).
const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
];

// Mesmos slots, agrupados para exibição
const GRUPOS_HORARIO = [
  { label: 'Manhã', icone: 'sunny-outline', slots: TIME_SLOTS.slice(0, 4) },
  { label: 'Tarde', icone: 'partly-sunny-outline', slots: TIME_SLOTS.slice(4) },
];

const MODALIDADES = [
  { valor: 'futsal', label: 'Futsal', icone: 'soccer' },
  { valor: 'volei', label: 'Vôlei', icone: 'volleyball' },
  { valor: 'basquete', label: 'Basquete', icone: 'basketball' },
];

// '08:00' -> '09:00' (cada slot vale 1 hora)
const calcularFimSlot = (inicio) => {
  const [hora, minuto] = inicio.split(':').map(Number);
  return `${String(hora + 1).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
};

const statusStyles = {
  disponivel: { cor: '#059669', label: 'Livre' },
  reservado: { cor: '#D97706', label: 'Reservado' },
  bloqueado: { cor: '#DC2626', label: 'Bloqueado' },
};

// ============================================================
// COMPONENTE INTERNO — campo de texto padronizado do app
// (mesmo padrão de Login/Cadastro, com suporte a multiline)
// ============================================================
function CampoTexto({
  label,
  icone,
  placeholder,
  valor,
  aoMudar,
  nomeCampo,
  campoFocado,
  aoFocar,
  aoDesfocar,
  teclado,
  autoCapitalizacao,
  semCorrecao,
  seguro,
  acaoDireita,
  dica,
  maxLength,
  multiline,
}) {
  const ativo = campoFocado === nomeCampo;

  return (
    <View style={styles.campoWrap}>
      <Text style={styles.campoLabel}>{label}</Text>

      <View style={[styles.campoInput, ativo && styles.campoInputAtivo]}>
        <Ionicons
          name={icone}
          size={18}
          color={ativo ? '#1565C0' : '#94A3B8'}
          style={styles.campoIcone}
        />
        <TextInput
          style={[styles.campoTexto, multiline && styles.campoTextoMultilinha]}
          placeholder={placeholder}
          placeholderTextColor="#A8B3C4"
          value={valor}
          onChangeText={aoMudar}
          onFocus={aoFocar}
          onBlur={aoDesfocar}
          keyboardType={teclado}
          autoCapitalize={autoCapitalizacao}
          autoCorrect={semCorrecao ? false : undefined}
          secureTextEntry={seguro}
          maxLength={maxLength}
          multiline={multiline}
        />
        {acaoDireita}
      </View>

      {dica ? <Text style={styles.campoDica}>{dica}</Text> : null}
    </View>
  );
}

export default function TelaCalendario({
  token,
  irParaInicial,
  irParaNotificacoes,
  irParaPerfil,
  irParaEL,
}) {
  const hoje = new Date();
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  // ----- Calendário -----
  const [anoMes, setAnoMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ----- Horários do dia (backend) -----
  const [agendas, setAgendas] = useState([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [erroSlots, setErroSlots] = useState(false);

  // ----- Formulário de solicitação -----
  const [formAberto, setFormAberto] = useState(false);
  const [modalidade, setModalidade] = useState(null);
  const [quantidadePessoas, setQuantidadePessoas] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Qual campo está focado (apenas efeito visual da borda/ícone)
  const [focado, setFocado] = useState(null);

  // ----- Confirmação -----
  const [reservaEnviada, setReservaEnviada] = useState(false);

  // ===== Animações =====
  const entradaCard = useRef(new Animated.Value(0)).current;
  const entradaDia = useRef(new Animated.Value(0)).current;
  const entradaSheet = useRef(new Animated.Value(0)).current;
  const entradaConfirm = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entradaCard, {
      toValue: 1,
      duration: 520,
      delay: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Seção do dia selecionado entra com fade + rise a cada troca de dia
  useEffect(() => {
    if (selectedDay !== null) {
      entradaDia.setValue(0);
      Animated.timing(entradaDia, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDay]);

  // Bottom sheet do formulário
  useEffect(() => {
    if (formAberto) {
      entradaSheet.setValue(0);
      Animated.timing(entradaSheet, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [formAberto]);

  // Modal de confirmação (pop suave)
  useEffect(() => {
    if (reservaEnviada) {
      entradaConfirm.setValue(0);
      Animated.timing(entradaConfirm, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }).start();
    }
  }, [reservaEnviada]);

  const rise = (valor) => ({
    opacity: valor,
    transform: [{ translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  // ------------------------------------------------------------
  // Dados derivados do calendário
  // ------------------------------------------------------------
  const mesEhAtual = anoMes.ano === hoje.getFullYear() && anoMes.mes === hoje.getMonth();

  const daysInMonth = new Date(anoMes.ano, anoMes.mes + 1, 0).getDate();
  const firstDayIndex = new Date(anoMes.ano, anoMes.mes, 1).getDay();

  const dataSelecionadaISO = selectedDay !== null
    ? `${anoMes.ano}-${String(anoMes.mes + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;

  const gerarMatrix = () => {
    const matrix = [];
    let week = [];

    for (let i = 0; i < firstDayIndex; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      matrix.push(week);
    }

    return matrix;
  };

  const calendarMatrix = gerarMatrix();

  const ehHoje = (day) => mesEhAtual && day === hoje.getDate();
  const ehPassado = (day) => new Date(anoMes.ano, anoMes.mes, day) < hojeZero;

  // Descrições do dia selecionado
  const dataSelecionadaObj = selectedDay !== null
    ? new Date(anoMes.ano, anoMes.mes, selectedDay)
    : null;
  const diaSemanaSelecionado = dataSelecionadaObj ? DIAS_SEMANA[dataSelecionadaObj.getDay()] : '';
  const dataExtenso = selectedDay !== null
    ? `${selectedDay} de ${MESES[anoMes.mes]} de ${anoMes.ano}`
    : '';

  const dataFormatadaCurta = selectedDay !== null
    ? `${String(selectedDay).padStart(2, '0')}/${String(anoMes.mes + 1).padStart(2, '0')}/${anoMes.ano}`
    : '';

  // ------------------------------------------------------------
  // Navegação de meses
  // ------------------------------------------------------------
  const mudarMes = (direcao) => {
    let novoAno = anoMes.ano;
    let novoMes = anoMes.mes + direcao;

    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    }

    if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }

    setAnoMes({ ano: novoAno, mes: novoMes });
    setSelectedDay(null);
    setSelectedSlot(null);
    setAgendas([]);
    setErroSlots(false);
  };

  // ------------------------------------------------------------
  // Horários ocupados do dia (GET /api/agenda?data=...)
  // ------------------------------------------------------------
  const carregarAgendaDoDia = async (dataISO) => {
    setCarregandoSlots(true);
    setErroSlots(false);

    try {
      const resposta = await fetch(`${API_URL}/agenda?data=${dataISO}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resposta.status === 401) {
        setErroSlots(true);
        Alert.alert(
          'Sessão expirada',
          'Sua sessão expirou. Saia da conta e faça login novamente.'
        );
        return;
      }

      const dados = await resposta.json();

      if (!resposta.ok || !dados.success) {
        setErroSlots(true);
        return;
      }

      setAgendas(dados.agendas);
    } catch (error) {
      setErroSlots(true);
    } finally {
      setCarregandoSlots(false);
    }
  };

  const aoSelecionarDia = (day) => {
    setSelectedDay(day);
    setSelectedSlot(null);
    carregarAgendaDoDia(
      `${anoMes.ano}-${String(anoMes.mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  };

  // Status de um slot: disponível / reservado (reserva) / bloqueado (jogo ou evento)
  const statusDoSlot = (inicioSlot) => {
    const inicioCompleto = `${inicioSlot}:00`;
    const fimCompleto = `${calcularFimSlot(inicioSlot)}:00`;

    const conflito = agendas.find(
      (agenda) => agenda.hora_inicio < fimCompleto && agenda.hora_fim > inicioCompleto
    );

    if (!conflito) return 'disponivel';
    if (conflito.tipo === 'reserva') return 'reservado';
    return 'bloqueado';
  };

  // Contagem de slots livres do dia (para o pill do cabeçalho)
  const totalSlots = TIME_SLOTS.length;
  const slotsLivres = selectedDay !== null && !carregandoSlots && !erroSlots
    ? TIME_SLOTS.filter((t) => statusDoSlot(t) === 'disponivel').length
    : 0;

  // ------------------------------------------------------------
  // Formulário de solicitação (POST /api/reservas)
  // ------------------------------------------------------------
  const fecharFormulario = () => {
    if (!enviando) setFormAberto(false);
  };

  const abrirFormulario = () => {
    setModalidade(null);
    setQuantidadePessoas('');
    setFinalidade('');
    setObservacao('');
    setFormAberto(true);
  };

  const enviarSolicitacao = async () => {
    if (!modalidade) {
      Alert.alert('Atenção', 'Selecione a modalidade.');
      return;
    }

    const qtd = Number(quantidadePessoas);

    if (!Number.isInteger(qtd) || qtd <= 0) {
      Alert.alert('Atenção', 'Informe a quantidade de pessoas (número inteiro maior que zero).');
      return;
    }

    if (!finalidade.trim()) {
      Alert.alert('Atenção', 'Informe a finalidade da reserva.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data_utilizacao: dataSelecionadaISO,
          hora_inicio: selectedSlot,
          hora_fim: calcularFimSlot(selectedSlot),
          modalidade,
          quantidade_pessoas: qtd,
          finalidade: finalidade.trim(),
          observacao: observacao.trim().length > 0 ? observacao.trim() : null,
        }),
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
        setFormAberto(false);
        setReservaEnviada(true);
        return;
      }

      if (resposta.status === 409) {
        setFormAberto(false);
        setSelectedSlot(null);
        Alert.alert('Horário ocupado', dados.message || 'Este horário acabou de ser ocupado.');
        carregarAgendaDoDia(dataSelecionadaISO);
        return;
      }

      Alert.alert(
        'Não foi possível enviar',
        dados.message || 'Verifique os dados e tente novamente.'
      );
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setEnviando(false);
    }
  };

  const fecharConfirmacao = () => {
    setReservaEnviada(false);
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ==================== HEADER ==================== */}
        <View style={styles.header}>
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerTopo}>
            <View>
              <Text style={styles.headerTitulo}>Calendário</Text>
              <Text style={styles.headerSubtitulo}>Escolha o dia e o horário</Text>
            </View>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7} onPress={irParaNotificacoes}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================== CARD DO CALENDÁRIO ==================== */}
        <Animated.View style={[styles.calendarCard, rise(entradaCard)]}>

          {/* Navegação de Mês */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => mudarMes(-1)}
              disabled={mesEhAtual}
              style={[styles.monthNavButton, mesEhAtual && styles.monthNavButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={17} color="#334155" />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {MESES[anoMes.mes]} {anoMes.ano}
            </Text>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => mudarMes(1)}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-forward" size={17} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Cabeçalho dos Dias da Semana */}
          <View style={styles.weekdays}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <Text key={d} style={styles.weekday}>{d}</Text>
            ))}
          </View>

          {/* Renderização em Linhas */}
          <View style={styles.matrixGrid}>
            {calendarMatrix.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={`empty-${dayIndex}`} style={styles.dayButtonEmpty} />;
                  }

                  const isToday = ehHoje(day);
                  const isSelected = day === selectedDay;
                  const isPast = ehPassado(day);

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      activeOpacity={0.7}
                      disabled={isPast}
                      onPress={() => aoSelecionarDia(day)}
                      style={[
                        styles.dayButton,
                        isToday && styles.dayToday,
                        isSelected && styles.daySelected,
                        isPast && styles.dayPast,
                      ]}
                    >
                      <Text style={[
                        styles.dayNumber,
                        isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                        isPast && styles.dayNumberPast,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ==================== CONTEÚDO DO DIA ==================== */}
        {selectedDay === null ? (
          <View style={styles.vazioCard}>
            <Ionicons name="calendar-outline" size={26} color="#94A3B8" />
            <Text style={styles.vazioTitulo}>Escolha um dia</Text>
            <Text style={styles.vazioTexto}>
              Selecione uma data no calendário para ver os horários disponíveis da quadra.
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.diaSection, rise(entradaDia)]}>

            {/* Cabeçalho do dia */}
            <View style={styles.diaHeader}>
              <View style={styles.diaIcone}>
                <Ionicons name="calendar" size={17} color="#1565C0" />
              </View>
              <View style={styles.diaTextos}>
                <Text style={styles.diaTitulo}>{dataExtenso}</Text>
                <Text style={styles.diaSub}>{diaSemanaSelecionado}</Text>
              </View>
              {!carregandoSlots && !erroSlots && (
                <View style={[styles.diaPill, slotsLivres === 0 ? styles.diaPillEsgotado : styles.diaPillLivre]}>
                  <Text style={[styles.diaPillTexto, slotsLivres === 0 ? styles.diaPillTextoEsgotado : styles.diaPillTextoLivre]}>
                    {slotsLivres === 0 ? 'Esgotado' : `${slotsLivres} de ${totalSlots} livres`}
                  </Text>
                </View>
              )}
            </View>

            {/* Status de carregamento / erro / slots */}
            {carregandoSlots ? (
              <View style={styles.slotsStatusBox}>
                <ActivityIndicator size="small" color="#1565C0" />
                <Text style={styles.slotsStatusTexto}>Carregando horários...</Text>
              </View>
            ) : erroSlots ? (
              <TouchableOpacity
                style={styles.erroCard}
                activeOpacity={0.7}
                onPress={() => carregarAgendaDoDia(dataSelecionadaISO)}
              >
                <Ionicons name="cloud-offline-outline" size={22} color="#DC2626" />
                <Text style={styles.erroTitulo}>Não foi possível carregar os horários</Text>
                <Text style={styles.erroAcao}>Toque para tentar novamente</Text>
              </TouchableOpacity>
            ) : (
              <>
                {GRUPOS_HORARIO.map((grupo) => (
                  <View key={grupo.label}>
                    <View style={styles.grupoLabel}>
                      <Ionicons name={grupo.icone} size={13} color="#94A3B8" />
                      <Text style={styles.grupoLabelTexto}>{grupo.label}</Text>
                    </View>

                    <View style={styles.timeSlotsContainer}>
                      {grupo.slots.map((time) => {
                        const status = statusDoSlot(time);
                        const estilo = statusStyles[status];
                        const selecionado = selectedSlot === time;
                        const clicavel = status === 'disponivel';

                        return (
                          <TouchableOpacity
                            key={time}
                            activeOpacity={0.7}
                            disabled={!clicavel}
                            onPress={() => setSelectedSlot(selecionado ? null : time)}
                            style={[
                              styles.timeSlot,
                              selecionado && styles.timeSlotSelecionado,
                              !clicavel && styles.timeSlotIndisponivel,
                            ]}
                          >
                            <Text style={[
                              styles.timeText,
                              selecionado && styles.timeTextSelecionado,
                              !clicavel && !selecionado && styles.timeTextIndisponivel,
                            ]}>
                              {time}
                            </Text>

                            {selecionado ? (
                              <View style={styles.statusRow}>
                                <Ionicons name="checkmark" size={12} color="#1565C0" />
                                <Text style={[styles.statusLabel, { color: '#1565C0' }]}>Selecionado</Text>
                              </View>
                            ) : (
                              <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: estilo.cor }]} />
                                <Text style={[styles.statusLabel, { color: estilo.cor }]}>
                                  {estilo.label}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}

                {/* Botão Solicitar */}
                {selectedSlot !== null && (
                  <TouchableOpacity activeOpacity={0.85} onPress={abrirFormulario} style={styles.heroButton}>
                    <View style={styles.heroIcone}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroTextos}>
                      <Text style={styles.heroTitulo}>Solicitar reserva</Text>
                      <Text style={styles.heroSubtitulo}>
                        {selectedSlot} às {calcularFimSlot(selectedSlot)}
                      </Text>
                    </View>
                    <View style={styles.heroChevron}>
                      <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* ==================== MENU INFERIOR ==================== */}
      <MenuInferior
        telaAtiva="calendario"
        irParaInicial={irParaInicial}
        irParaEL={irParaEL}
        irParaPerfil={irParaPerfil}
      />

      {/* ==================== BOTTOM SHEET: FORMULÁRIO ==================== */}
      <Modal
        visible={formAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharFormulario}
      >
        {formAberto && (
          <View style={styles.sheetFundo}>
            <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={fecharFormulario} />

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              enabled
            >
              <Animated.View
                style={[
                  styles.sheetPainel,
                  {
                    opacity: entradaSheet,
                    transform: [
                      { translateY: entradaSheet.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                    ],
                  },
                ]}
              >
                <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitulo}>Nova solicitação</Text>
                  <TouchableOpacity style={styles.sheetFechar} activeOpacity={0.7} onPress={fecharFormulario}>
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.sheetConteudo}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Resumo data + horário */}
                  <View style={styles.resumoRow}>
                    <View style={styles.resumoChip}>
                      <Ionicons name="calendar-outline" size={13} color="#1565C0" />
                      <Text style={styles.resumoTexto}>{dataFormatadaCurta}</Text>
                    </View>
                    <View style={styles.resumoChip}>
                      <Ionicons name="time-outline" size={13} color="#1565C0" />
                      <Text style={styles.resumoTexto}>{selectedSlot} – {calcularFimSlot(selectedSlot)}</Text>
                    </View>
                  </View>

                  {/* Modalidade */}
                  <Text style={styles.formLabel}>Modalidade</Text>
                  <View style={styles.modalidadeRow}>
                    {MODALIDADES.map((m) => {
                      const ativo = modalidade === m.valor;

                      return (
                        <TouchableOpacity
                          key={m.valor}
                          activeOpacity={0.7}
                          onPress={() => setModalidade(m.valor)}
                          style={[styles.modalidadeButton, ativo && styles.modalidadeButtonAtivo]}
                        >
                          <MaterialCommunityIcons
                            name={m.icone}
                            size={22}
                            color={ativo ? '#1565C0' : '#64748B'}
                          />
                          <Text style={[styles.modalidadeTexto, ativo && styles.modalidadeTextoAtivo]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <CampoTexto
                    label="Quantidade de pessoas"
                    icone="people-outline"
                    placeholder="Ex.: 10"
                    valor={quantidadePessoas}
                    aoMudar={setQuantidadePessoas}
                    nomeCampo="quantidade"
                    campoFocado={focado}
                    aoFocar={() => setFocado('quantidade')}
                    aoDesfocar={() => setFocado(null)}
                    teclado="number-pad"
                    autoCapitalizacao="none"
                    semCorrecao
                  />

                  <CampoTexto
                    label="Finalidade"
                    icone="flag-outline"
                    placeholder="Ex.: Aula prática de futsal"
                    valor={finalidade}
                    aoMudar={setFinalidade}
                    nomeCampo="finalidade"
                    campoFocado={focado}
                    aoFocar={() => setFocado('finalidade')}
                    aoDesfocar={() => setFocado(null)}
                    autoCapitalizacao="sentences"
                    maxLength={100}
                  />

                  <CampoTexto
                    label="Observação (opcional)"
                    icone="chatbox-outline"
                    placeholder="Alguma informação adicional?"
                    valor={observacao}
                    aoMudar={setObservacao}
                    nomeCampo="observacao"
                    campoFocado={focado}
                    aoFocar={() => setFocado('observacao')}
                    aoDesfocar={() => setFocado(null)}
                    autoCapitalizacao="sentences"
                    multiline
                  />

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={enviarSolicitacao}
                    style={[styles.botaoPrincipal, enviando && styles.botaoCarregando]}
                    disabled={enviando}
                  >
                    {enviando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={styles.botaoIcone} />
                    ) : (
                      <Ionicons name="send-outline" size={17} color="#FFFFFF" style={styles.botaoIcone} />
                    )}
                    <Text style={styles.botaoTexto}>
                      {enviando ? 'Enviando...' : 'Enviar solicitação'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={fecharFormulario}
                    style={styles.botaoCancelar}
                    disabled={enviando}
                  >
                    <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
      </Modal>

      {/* ==================== MODAL DE CONFIRMAÇÃO ==================== */}
      <Modal
        visible={reservaEnviada}
        transparent
        animationType="fade"
        onRequestClose={fecharConfirmacao}
      >
        {reservaEnviada && (
          <View style={styles.confirmFundo}>
            <Animated.View
              style={[
                styles.confirmCard,
                {
                  opacity: entradaConfirm,
                  transform: [
                    { scale: entradaConfirm.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              <View style={styles.confirmIcone}>
                <Ionicons name="checkmark-circle" size={38} color="#059669" />
              </View>

              <Text style={styles.confirmTitulo}>Solicitação enviada!</Text>
              <Text style={styles.confirmTexto}>
                Sua solicitação foi encaminhada e está aguardando a aprovação do administrador.
              </Text>

              <View style={styles.resumoRow}>
                <View style={styles.resumoChip}>
                  <Ionicons name="calendar-outline" size={13} color="#1565C0" />
                  <Text style={styles.resumoTexto}>{dataFormatadaCurta}</Text>
                </View>
                <View style={styles.resumoChip}>
                  <Ionicons name="time-outline" size={13} color="#1565C0" />
                  <Text style={styles.resumoTexto}>{selectedSlot} – {calcularFimSlot(selectedSlot)}</Text>
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.85} onPress={fecharConfirmacao} style={styles.confirmBotao}>
                <Text style={styles.confirmBotaoTexto}>Entendido</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5F9' },
  scrollContent: { paddingBottom: 108 },

  // ==================== HEADER ====================
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 45,
    paddingBottom: 34,
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
  },
  headerTitulo: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitulo: {
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== CARD DO CALENDÁRIO ====================
  calendarCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -18,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavButtonDisabled: { opacity: 0.3 },
  monthTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },

  weekdays: { flexDirection: 'row', marginBottom: 8 },
  weekday: {
    flex: 1,
    fontWeight: '700',
    color: '#94A3B8',
    fontSize: 10.5,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  matrixGrid: { flexDirection: 'column' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },

  dayButton: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonEmpty: { flex: 1, marginHorizontal: 2, aspectRatio: 1 },
  dayToday: { backgroundColor: '#EFF6FF' },
  daySelected: { backgroundColor: '#1565C0', elevation: 3 },
  dayPast: { opacity: 0.22 },
  dayNumber: { fontSize: 14, fontWeight: '600', color: '#334155' },
  dayNumberToday: { color: '#1565C0', fontWeight: '800' },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '800' },
  dayNumberPast: { color: '#94A3B8' },

  // ==================== ESTADO VAZIO ====================
  vazioCard: {
    marginHorizontal: 20,
    marginTop: 24,
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

  // ==================== SEÇÃO DO DIA ====================
  diaSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  diaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  diaIcone: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaTextos: { flex: 1 },
  diaTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  diaSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  diaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  diaPillLivre: { backgroundColor: '#D1FAE5' },
  diaPillEsgotado: { backgroundColor: '#FEE2E2' },
  diaPillTexto: { fontSize: 11, fontWeight: '800' },
  diaPillTextoLivre: { color: '#065F46' },
  diaPillTextoEsgotado: { color: '#991B1B' },

  // ==================== CARREGANDO / ERRO ====================
  slotsStatusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 26,
    alignItems: 'center',
  },
  slotsStatusTexto: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
  },
  erroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 22,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  erroTitulo: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  erroAcao: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1565C0',
    marginTop: 4,
  },

  // ==================== GRUPOS E SLOTS ====================
  grupoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  grupoLabelTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeSlot: {
    width: '48.5%',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
  },
  timeSlotSelecionado: {
    borderColor: '#1565C0',
    backgroundColor: '#EFF6FF',
  },
  timeSlotIndisponivel: { opacity: 0.55 },
  timeText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  timeTextSelecionado: { color: '#1565C0' },
  timeTextIndisponivel: { color: '#64748B' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 999 },
  statusLabel: { fontSize: 10.5, fontWeight: '700' },

  // ==================== BOTÃO HERO ====================
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
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
  heroTextos: { flex: 1 },
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
    fontVariant: ['tabular-nums'],
  },
  heroChevron: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== BOTTOM SHEET ====================
  sheetFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheetOverlay: { flex: 1 },
  sheetPainel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sheetTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sheetFechar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetConteudo: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },

  // Chips de resumo (data / horário)
  resumoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resumoTexto: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1565C0',
    fontVariant: ['tabular-nums'],
  },

  // Modalidades
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  modalidadeRow: { flexDirection: 'row', gap: 8 },
  modalidadeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 5,
  },
  modalidadeButtonAtivo: {
    borderColor: '#1565C0',
    backgroundColor: '#EFF6FF',
  },
  modalidadeTexto: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  modalidadeTextoAtivo: { color: '#1565C0' },

  // Campos (mesmo padrão de Login/Cadastro)
  campoWrap: {},
  campoLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  campoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    paddingRight: 6,
  },
  campoInputAtivo: {
    borderColor: '#1565C0',
    backgroundColor: '#F5F9FF',
  },
  campoIcone: { marginLeft: 14, marginRight: 10 },
  campoTexto: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  campoTextoMultilinha: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  campoAcao: { paddingVertical: 12, paddingLeft: 12, paddingRight: 8 },
  campoDica: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 4,
  },

  // Botões do sheet
  botaoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    paddingVertical: 15,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  botaoCarregando: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  botaoIcone: { marginRight: 8 },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  botaoCancelar: { alignItems: 'center', paddingVertical: 10 },
  botaoCancelarTexto: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  // ==================== MODAL DE CONFIRMAÇÃO ====================
  confirmFundo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 330,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  confirmIcone: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  confirmTexto: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBotao: {
    backgroundColor: '#1565C0',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
    elevation: 4,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  confirmBotaoTexto: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});