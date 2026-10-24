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
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarioJogo from '../components/CalendarioJogo';
import RelogioCircular from '../components/RelogioCircular';
import SeletorConfronto from '../components/SeletorConfronto';

import { API_URL } from '../config/api';

// ============================================================
// Constantes de apoio
// ============================================================

const MODALIDADE_LABEL = { futsal: 'Futsal', volei: 'Vôlei', basquete: 'Basquete' };
const MODALIDADE_ICONE = { futsal: 'soccer', volei: 'volleyball', basquete: 'basketball' };
const CATEGORIA_LABEL = { feminino: 'Feminino', masculino: 'Masculino', misto: 'Misto' };

const FASES_ORDEM = { grupo: 0, quartas: 1, semifinal: 2, final: 3 };

const STATUS_JOGO = {
  definido: { label: 'A definir', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  agendado: { label: 'Agendado', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)' },
  adiado: { label: 'Adiado', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  em_andamento: { label: 'Ao vivo', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  finalizado: { label: 'Finalizado', color: '#CCCCCC', bg: 'rgba(255, 255, 255, 0.08)' },
  cancelado: { label: 'Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const STATUS_CAMP = {
  planejado: { label: 'Planejado', color: '#AAAAAA' },
  andamento: { label: 'Em andamento', color: '#4CAF50' },
  encerrado: { label: 'Encerrado', color: '#F59E0B' },
};

// '2025-09-25' -> '25/09'
const formatarDataCurta = (dataISO) => {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}`;
};

// '14:00:00' -> '14:00'
const formatarHora = (hora) => (hora ? hora.substring(0, 5) : '');

// Iniciais do nome da equipe: "Auto Bots" -> "AB"
const obterIniciaisEquipe = (nome) => {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0] ? partes[0][0] : '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
};

// Escudo (base64) ou badge de iniciais
const Escudo = ({ escudo_url, nome, tamanho = 36 }) => {
  if (escudo_url) {
    return (
      <Image
        source={{ uri: escudo_url }}
        style={{ width: tamanho, height: tamanho, borderRadius: 8 }}
      />
    );
  }

  return (
    <View style={[styles.escudoVazio, { width: tamanho, height: tamanho, borderRadius: 8 }]}>
      <Text style={[styles.escudoVazioTexto, { fontSize: tamanho * 0.34 }]}>{obterIniciaisEquipe(nome)}</Text>
    </View>
  );
};

// Bottom sheet padrão da tela (fechamento só por X/Cancelar, bloqueado durante salvamento)
const Sheet = ({ visivel, titulo, icone, aoFechar, bloqueado, rodape, children }) => {
  const scrollRef = useRef(null);
  const alturaConteudoRef = useRef(0);
  const alturaScrollRef = useRef(0);

  // Conteúdo cresceu (acordeão abrindo) E ultrapassa a área visível
  // → rola até o fim pra revelar o que abriu. A primeira medição
  // (montagem) é ignorada — o sheet nunca "pula" sozinho ao abrir.
  const aoMudarTamanhoConteudo = (_, altura) => {
    const anterior = alturaConteudoRef.current;
    alturaConteudoRef.current = altura;
    if (
      anterior > 0 &&
      altura > anterior &&
      alturaScrollRef.current > 0 &&
      altura > alturaScrollRef.current
    ) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={bloqueado ? () => {} : aoFechar}
    >
      <View style={styles.sheetOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled
          style={styles.sheetKav}
        >
          <View style={styles.sheetPainel}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderIcone}>
                <Ionicons name={icone} size={16} color="#4CAF50" />
              </View>
              <Text style={styles.sheetTitulo} numberOfLines={1}>{titulo}</Text>
              <TouchableOpacity
                style={styles.sheetFechar}
                onPress={aoFechar}
                disabled={bloqueado}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={16} color="#999999" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo rolável — handle e header ficam fixos em cima */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.sheetScrollConteudo}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              onLayout={(e) => {
                alturaScrollRef.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={aoMudarTamanhoConteudo}
            >
              {children}
            </ScrollView>

            {/* Rodapé opcional — botões fixos, sempre alcançáveis */}
            {rodape ? <View style={styles.sheetRodape}>{rodape}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// Empty state tracejado
const Vazio = ({ icone, texto }) => (
  <View style={styles.vazioBox}>
    <View style={styles.vazioIcone}>
      <Ionicons name={icone} size={24} color="#4CAF50" />
    </View>
    <Text style={styles.vazioTexto}>{texto}</Text>
  </View>
);

// Entrada em cascata — mesmo padrão das outras telas
const rise = (valor) => ({
  opacity: valor,
  transform: [
    { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
  ],
});

const Animado = ({ delay = 0, style, children }) => {
  const progresso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progresso, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progresso, delay]);

  return <Animated.View style={[style, rise(progresso)]}>{children}</Animated.View>;
};

// ============================================================
// Tela
// ============================================================

export default function TelaELDetalhes({
  token,
  usuario,
  campeonatoId,
  irParaEL,
}) {
  const ehOrganizador = usuario?.perfil === 'organizador';

  // ----- Dados -----
  const [campeonato, setCampeonato] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [classificacao, setClassificacao] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [aba, setAba] = useState('jogos'); // jogos | classificacao | chaveamento | equipes
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [processando, setProcessando] = useState(false);

  // ----- Modais -----
  const [modalJogoAberto, setModalJogoAberto] = useState(false);
  const [jogoEditando, setJogoEditando] = useState(null); // null = novo jogo de grupo
  const [equipe1, setEquipe1] = useState(null);
  const [equipe2, setEquipe2] = useState(null);
  const [dataJogo, setDataJogo] = useState('');
  const [horaJogo, setHoraJogo] = useState('');
  const [faseTexto, setFaseTexto] = useState('1ª rodada');
  const [placar1, setPlacar1] = useState('');
  const [placar2, setPlacar2] = useState('');
  const [penaltis1, setPenaltis1] = useState('');
  const [penaltis2, setPenaltis2] = useState('');

  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [equipeEditando, setEquipeEditando] = useState(null);
  const [nomeEquipe, setNomeEquipe] = useState('');
  const [escudoEquipe, setEscudoEquipe] = useState(null);

  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [jogoResultado, setJogoResultado] = useState(null);

  const [modalAgendarAberto, setModalAgendarAberto] = useState(false);
  const [jogoAgendar, setJogoAgendar] = useState(null);

  // ------------------------------------------------------------
  // Carregar tudo
  // ------------------------------------------------------------
  const carregarTudo = useCallback(async () => {
    try {
      const [resC, resJ, resCl, resE] = await Promise.all([
        fetch(`${API_URL}/el/campeonatos/${campeonatoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/el/campeonatos/${campeonatoId}/jogos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/el/campeonatos/${campeonatoId}/classificacao`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/el/campeonatos/${campeonatoId}/equipes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resC.status === 401) {
        Alert.alert('Sessão expirada', 'Sua sessão expirou. Saia da conta e faça login novamente.');
        setErroCarregamento(true);
        return;
      }

      const [dadosC, dadosJ, dadosCl, dadosE] = await Promise.all([
        resC.json(),
        resJ.json(),
        resCl.json(),
        resE.json(),
      ]);

      setCampeonato(dadosC.campeonato || null);
      setJogos(dadosJ.jogos || []);
      setClassificacao(dadosCl.classificacao || []);
      setEquipes(dadosE.equipes || []);
      setErroCarregamento(false);
    } catch (error) {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }, [token, campeonatoId]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarTudo();
    setAtualizando(false);
  }, [carregarTudo]);

  const tentarNovamente = () => {
    setCarregando(true);
    carregarTudo();
  };

  // ------------------------------------------------------------
  // Helpers de requisição
  // ------------------------------------------------------------
  const chamarAPI = async (url, metodo, corpo) => {
    const resposta = await fetch(`${API_URL}${url}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });

    const dados = await resposta.json().catch(() => ({}));

    return { ok: resposta.ok, status: resposta.status, dados };
  };

  // ------------------------------------------------------------
  // Aba JOGOS
  // ------------------------------------------------------------

  const abrirNovoJogo = () => {
    setJogoEditando(null);
    setEquipe1(null);
    setEquipe2(null);
    setDataJogo('');
    setHoraJogo('');
    setFaseTexto('1ª rodada');
    setPlacar1('');
    setPlacar2('');
    setPenaltis1('');
    setPenaltis2('');
    setModalJogoAberto(true);
  };

  const salvarJogo = async () => {
    if (!equipe1 || !equipe2) {
      Alert.alert('Atenção', 'Selecione as duas equipes.');
      return;
    }

    if (equipe1 === equipe2) {
      Alert.alert('Atenção', 'As equipes devem ser diferentes.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataJogo)) {
      Alert.alert('Atenção', 'Informe a data no formato AAAA-MM-DD.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(horaJogo)) {
      Alert.alert('Atenção', 'Informe a hora no formato HH:MM.');
      return;
    }

    setProcessando(true);

    try {
      const corpo = {
        id_equipe1: equipe1,
        id_equipe2: equipe2,
        data_utilizacao: dataJogo,
        hora_inicio: horaJogo,
        fase: faseTexto.trim() || '1ª rodada',
      };

      // Data passada exige resultado na criação
      const hoje = new Date();
      const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

      if (dataJogo < hojeISO) {
        if (placar1 === '' || placar2 === '') {
          Alert.alert('Atenção', 'Jogo em data passada: informe o placar (ou use W.O. depois de criar).');
          setProcessando(false);
          return;
        }

        corpo.placar_equipe1 = Number(placar1);
        corpo.placar_equipe2 = Number(placar2);
      }

      const { ok, dados } = await chamarAPI(`/el/campeonatos/${campeonatoId}/jogos`, 'POST', corpo);

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível criar', dados.message || 'Verifique os dados e tente novamente.');
        return;
      }

      setModalJogoAberto(false);
      await carregarTudo();
      Alert.alert('Pronto', dados.message || 'Jogo criado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const abrirAgendar = (jogo) => {
    setJogoAgendar(jogo);
    setDataJogo(jogo.data_utilizacao || '');
    setHoraJogo(jogo.hora_inicio ? jogo.hora_inicio.substring(0, 5) : '');
    setModalAgendarAberto(true);
  };

  const confirmarAgendar = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataJogo)) {
      Alert.alert('Atenção', 'Informe a data no formato AAAA-MM-DD.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(horaJogo)) {
      Alert.alert('Atenção', 'Informe a hora no formato HH:MM.');
      return;
    }

    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(`/el/jogos/${jogoAgendar.id_jogo}/agendar`, 'PUT', {
        data_utilizacao: dataJogo,
        hora_inicio: horaJogo,
      });

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível agendar', dados.message || 'Tente novamente.');
        return;
      }

      setModalAgendarAberto(false);
      await carregarTudo();
      Alert.alert('Pronto', 'Jogo agendado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const abrirResultado = (jogo) => {
    setJogoResultado(jogo);
    setPlacar1(jogo.placar_equipe1 !== null && jogo.placar_equipe1 !== undefined ? String(jogo.placar_equipe1) : '');
    setPlacar2(jogo.placar_equipe2 !== null && jogo.placar_equipe2 !== undefined ? String(jogo.placar_equipe2) : '');
    setPenaltis1(jogo.placar_penaltis_equipe1 !== null && jogo.placar_penaltis_equipe1 !== undefined ? String(jogo.placar_penaltis_equipe1) : '');
    setPenaltis2(jogo.placar_penaltis_equipe2 !== null && jogo.placar_penaltis_equipe2 !== undefined ? String(jogo.placar_penaltis_equipe2) : '');
    setModalResultadoAberto(true);
  };

  const confirmarResultado = async () => {
    if (placar1 === '' || placar2 === '') {
      Alert.alert('Atenção', 'Informe os dois placares.');
      return;
    }

    const p1 = Number(placar1);
    const p2 = Number(placar2);

    if (!Number.isInteger(p1) || p1 < 0 || !Number.isInteger(p2) || p2 < 0) {
      Alert.alert('Atenção', 'Placares devem ser inteiros ≥ 0.');
      return;
    }

    const corpo = {
      placar_equipe1: p1,
      placar_equipe2: p2,
    };

    const temPenaltis = penaltis1 !== '' && penaltis2 !== '';

    if (temPenaltis) {
      corpo.placar_penaltis_equipe1 = Number(penaltis1);
      corpo.placar_penaltis_equipe2 = Number(penaltis2);
    }

    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(`/el/jogos/${jogoResultado.id_jogo}/resultado`, 'PUT', corpo);

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível registrar', dados.message || 'Tente novamente.');
        return;
      }

      setModalResultadoAberto(false);
      await carregarTudo();
      Alert.alert('Pronto', dados.message || 'Resultado registrado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const confirmarWO = (jogo) => {
    Alert.alert(
      'Registrar W.O.',
      'Qual equipe NÃO compareceu?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: jogo.nome_equipe1,
          style: 'destructive',
          onPress: () => registrarWO(jogo, jogo.id_equipe1),
        },
        {
          text: jogo.nome_equipe2,
          style: 'destructive',
          onPress: () => registrarWO(jogo, jogo.id_equipe2),
        },
      ]
    );
  };

  const registrarWO = async (jogo, idEquipeWO) => {
    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(`/el/jogos/${jogo.id_jogo}/wo`, 'PUT', {
        id_equipe_wo: idEquipeWO,
      });

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível registrar', dados.message || 'Tente novamente.');
        return;
      }

      await carregarTudo();
      Alert.alert('Pronto', 'W.O. registrado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const confirmarCancelarJogo = (jogo) => {
    Alert.alert(
      'Cancelar jogo',
      `Cancelar ${jogo.nome_equipe1} x ${jogo.nome_equipe2}?`,
      [
        { text: 'Manter', style: 'cancel' },
        { text: 'Cancelar jogo', style: 'destructive', onPress: () => cancelarJogo(jogo) },
      ]
    );
  };

  const cancelarJogo = async (jogo) => {
    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(`/el/jogos/${jogo.id_jogo}/cancelar`, 'PUT');

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível cancelar', dados.message || 'Tente novamente.');
        return;
      }

      await carregarTudo();
      Alert.alert('Pronto', 'Jogo cancelado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  // ------------------------------------------------------------
  // Mata-mata e equipes
  // ------------------------------------------------------------

  const gerarMataMata = async () => {
    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(`/el/campeonatos/${campeonatoId}/gerar-mata-mata`, 'POST');

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível gerar', dados.message || 'Tente novamente.');
        return;
      }

      await carregarTudo();
      setAba('chaveamento');
      Alert.alert('Pronto', dados.message || 'Mata-mata gerado.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const abrirNovaEquipe = () => {
    setEquipeEditando(null);
    setNomeEquipe('');
    setEscudoEquipe(null);
    setModalEquipeAberto(true);
  };

  const abrirEdicaoEquipe = (equipe) => {
    setEquipeEditando(equipe);
    setNomeEquipe(equipe.nome || '');
    setEscudoEquipe(equipe.escudo_url || null);
    setModalEquipeAberto(true);
  };

  const escolherEscudo = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Atenção', 'É necessário permitir o acesso à galeria para escolher o escudo.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      const mime = asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
      setEscudoEquipe(`data:${mime};base64,${asset.base64}`);
    }
  };

  const salvarEquipe = async () => {
    if (!nomeEquipe.trim()) {
      Alert.alert('Atenção', 'Informe o nome da equipe.');
      return;
    }

    setProcessando(true);

    try {
      const corpo = {
        nome: nomeEquipe.trim(),
        escudo_url: escudoEquipe || null,
      };

      const { ok, dados } = equipeEditando
        ? await chamarAPI(`/el/equipes/${equipeEditando.id_equipe}`, 'PUT', corpo)
        : await chamarAPI(`/el/campeonatos/${campeonatoId}/equipes`, 'POST', corpo);

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível salvar', dados.message || 'Verifique os dados e tente novamente.');
        return;
      }

      setModalEquipeAberto(false);
      await carregarTudo();
      Alert.alert('Pronto', dados.message || (equipeEditando ? 'Equipe atualizada.' : 'Equipe inscrita.'));
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  const confirmarRemoverEquipe = (equipe) => {
    Alert.alert(
      'Remover equipe',
      `Remover "${equipe.nome}" deste campeonato?`,
      [
        { text: 'Manter', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => removerEquipe(equipe) },
      ]
    );
  };

  const removerEquipe = async (equipe) => {
    setProcessando(true);

    try {
      const { ok, dados } = await chamarAPI(
        `/el/campeonatos/${campeonatoId}/equipes/${equipe.id_equipe}`,
        'DELETE'
      );

      if (!ok || !dados.success) {
        Alert.alert('Não foi possível remover', dados.message || 'Tente novamente.');
        return;
      }

      await carregarTudo();
      Alert.alert('Pronto', dados.message || 'Equipe removida.');
    } catch (error) {
      Alert.alert('Erro de conexão', 'Verifique o backend e o Wi-Fi.');
    } finally {
      setProcessando(false);
    }
  };

  // ------------------------------------------------------------
  // Renderização
  // ------------------------------------------------------------

  const jogosAgrupados = {};

  jogos.forEach((jogo) => {
    const fase = jogo.fase;
    if (!jogosAgrupados[fase]) jogosAgrupados[fase] = [];
    jogosAgrupados[fase].push(jogo);
  });

  const temMataMata = jogos.some((j) => j.fase !== 'grupo');

  // Data passada? (controla o que o formulário do novo jogo mostra)
  const agora = new Date();
  const hojeISO = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const dataPassada = /^\d{4}-\d{2}-\d{2}$/.test(dataJogo) && dataJogo < hojeISO;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#000000" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={['#4CAF50']} tintColor="#4CAF50" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={irParaEL} style={styles.headerVoltar}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo} numberOfLines={1}>
            {campeonato ? campeonato.nome : 'Campeonato'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Card de contexto */}
        {campeonato && (
          <Animado style={styles.contextoCard} delay={0}>
            <View style={styles.contextoChips}>
              <View style={styles.chipInfo}>
                <MaterialCommunityIcons name={MODALIDADE_ICONE[campeonato.modalidade]} size={13} color="#4CAF50" />
                <Text style={styles.chipInfoTexto}>{MODALIDADE_LABEL[campeonato.modalidade]}</Text>
              </View>

              <View style={styles.chipInfo}>
                <Ionicons name="people-outline" size={13} color="#4CAF50" />
                <Text style={styles.chipInfoTexto}>{CATEGORIA_LABEL[campeonato.categoria]}</Text>
              </View>

              {STATUS_CAMP[campeonato.status] && (
                <View style={styles.chipStatus}>
                  <View style={[styles.chipDot, { backgroundColor: STATUS_CAMP[campeonato.status].color }]} />
                  <Text style={styles.chipStatusTexto}>{STATUS_CAMP[campeonato.status].label}</Text>
                </View>
              )}
            </View>

            {campeonato.nome_campeao && (
              <View style={styles.campeaoBox}>
                <Ionicons name="trophy" size={15} color="#F59E0B" />
                <Text style={styles.campeaoTexto}>Campeão: {campeonato.nome_campeao}</Text>
              </View>
            )}
          </Animado>
        )}

        {/* Abas */}
        <Animado style={styles.abasRow} delay={60}>
          {[
            { id: 'jogos', label: 'Jogos' },
            { id: 'classificacao', label: 'Classificação' },
            { id: 'chaveamento', label: 'Chaveamento' },
            { id: 'equipes', label: 'Equipes' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => setAba(item.id)}
              style={[styles.abaButton, aba === item.id && styles.abaButtonAtiva]}
            >
              <Text style={[styles.abaTexto, aba === item.id && styles.abaTextoAtiva]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animado>

        {/* Carregando */}
        {carregando && (
          <View style={styles.carregandoBox}>
            <ActivityIndicator color="#4CAF50" size="large" />
            <Text style={styles.carregandoTexto}>Carregando...</Text>
          </View>
        )}

        {/* Erro */}
        {!carregando && erroCarregamento && (
          <TouchableOpacity style={styles.erroBox} onPress={tentarNovamente} activeOpacity={0.7}>
            <View style={styles.erroIcone}>
              <Ionicons name="cloud-offline-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.erroTitulo}>Não foi possível carregar</Text>
            <Text style={styles.erroTexto}>
              Verifique o backend e o Wi-Fi, ou puxe para baixo para atualizar.
            </Text>
            <View style={styles.erroBotao}>
              <Ionicons name="refresh" size={14} color="#4CAF50" />
              <Text style={styles.erroBotaoTexto}>Tentar novamente</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ================== ABA JOGOS ================== */}
        {!carregando && !erroCarregamento && aba === 'jogos' && (
          <View style={styles.abaConteudo}>
            {ehOrganizador && campeonato && campeonato.status !== 'encerrado' && (
              <Animado delay={120}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={abrirNovoJogo}
                  style={[styles.botaoVerde, processando && styles.botaoOff]}
                  disabled={processando}
                >
                  <Ionicons name="add" size={18} color="#000000" />
                  <Text style={styles.botaoVerdeTexto}>Novo jogo · fase de grupos</Text>
                </TouchableOpacity>
              </Animado>
            )}

            {jogos.length === 0 && (
              <Vazio icone="trophy-outline" texto={'Nenhum jogo cadastrado ainda.'} />
            )}

            {Object.keys(jogosAgrupados)
              .sort((a, b) => (FASES_ORDEM[a] ?? 4) - (FASES_ORDEM[b] ?? 4))
              .map((fase) => (
                <View key={fase}>
                  <Text style={[styles.faseTitulo, fase === 'final' && styles.faseTituloFinal]}>
                    {labelFase(fase)}
                  </Text>

                  {jogosAgrupados[fase].map((jogo, indice) => {
                    const status = STATUS_JOGO[jogo.status] || STATUS_JOGO.agendado;
                    const temResultado = jogo.status === 'finalizado';

                    return (
                      <Animado key={jogo.id_jogo} style={styles.jogoCard} delay={180 + 60 * Math.min(indice, 5)}>
                        <View style={styles.jogoTopo}>
                          <Text style={styles.jogoFase}>{faseTextoOuPadrao(jogo)}</Text>

                          <View style={[styles.badge, { backgroundColor: status.bg }]}>
                            <View style={[styles.badgeDot, { backgroundColor: status.color }]} />
                            <Text style={[styles.badgeTexto, { color: status.color }]}>{status.label}</Text>
                          </View>
                        </View>

                        <View style={styles.jogoTimes}>
                          <View style={styles.jogoTime}>
                            <Escudo escudo_url={jogo.escudo_equipe1} nome={jogo.nome_equipe1} tamanho={32} />
                            <Text style={styles.jogoTimeNome} numberOfLines={1}>{jogo.nome_equipe1}</Text>
                          </View>

                          <View style={styles.jogoPlacar}>
                            {temResultado && jogo.placar_equipe1 !== null ? (
                              <>
                                <Text style={styles.jogoPlacarTexto}>{jogo.placar_equipe1} - {jogo.placar_equipe2}</Text>
                                {jogo.placar_penaltis_equipe1 !== null && (
                                  <Text style={styles.jogoPenaltis}>
                                    Pên. {jogo.placar_penaltis_equipe1}x{jogo.placar_penaltis_equipe2}
                                  </Text>
                                )}
                                {jogo.nome_equipe_wo && (
                                  <Text style={styles.jogoWO}>W.O. ({jogo.nome_equipe_wo} faltou)</Text>
                                )}
                              </>
                            ) : (
                              <Text style={styles.jogoPlacarX}>VS</Text>
                            )}
                          </View>

                          <View style={styles.jogoTime}>
                            <Escudo escudo_url={jogo.escudo_equipe2} nome={jogo.nome_equipe2} tamanho={32} />
                            <Text style={styles.jogoTimeNome} numberOfLines={1}>{jogo.nome_equipe2}</Text>
                          </View>
                        </View>

                        <View style={styles.jogoDataRow}>
                          <Ionicons name="calendar-outline" size={12} color="#777777" />
                          <Text style={styles.jogoData}>
                            {jogo.data_utilizacao
                              ? `${formatarDataCurta(jogo.data_utilizacao)} · ${formatarHora(jogo.hora_inicio)}`
                              : 'A agendar'}
                          </Text>
                        </View>

                        {ehOrganizador && (
                          <View style={styles.jogoAcoes}>
                            {(jogo.status === 'definido' || jogo.status === 'agendado' || jogo.status === 'adiado') && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => abrirAgendar(jogo)}
                                style={[styles.acaoMini, styles.acaoMiniAzul]}
                              >
                                <Ionicons name="calendar-outline" size={13} color="#93C5FD" />
                                <Text style={styles.acaoMiniTextoAzul}>
                                  {jogo.status === 'definido' ? 'Agendar' : 'Remarcar'}
                                </Text>
                              </TouchableOpacity>
                            )}

                            {jogo.status !== 'finalizado' && jogo.status !== 'cancelado' && (
                              <>
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => abrirResultado(jogo)}
                                  style={[styles.acaoMini, styles.acaoMiniVerde]}
                                >
                                  <Ionicons name="stats-chart-outline" size={13} color="#66BB6A" />
                                  <Text style={styles.acaoMiniTextoVerde}>Resultado</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => confirmarWO(jogo)}
                                  style={[styles.acaoMini, styles.acaoMiniAmarelo]}
                                >
                                  <Ionicons name="ban-outline" size={13} color="#F59E0B" />
                                  <Text style={styles.acaoMiniTextoAmarelo}>W.O.</Text>
                                </TouchableOpacity>

                                {jogo.fase === 'grupo' && (
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => confirmarCancelarJogo(jogo)}
                                    style={[styles.acaoMini, styles.acaoMiniVermelho]}
                                  >
                                    <Ionicons name="close-outline" size={13} color="#EF4444" />
                                    <Text style={styles.acaoMiniTextoVermelho}>Cancelar</Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            )}

                            {jogo.status === 'finalizado' && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => abrirResultado(jogo)}
                                style={[styles.acaoMini, styles.acaoMiniAmarelo]}
                              >
                                <Ionicons name="create-outline" size={13} color="#F59E0B" />
                                <Text style={styles.acaoMiniTextoAmarelo}>Corrigir</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </Animado>
                    );
                  })}
                </View>
              ))}
          </View>
        )}

        {/* ================== ABA CLASSIFICAÇÃO ================== */}
        {!carregando && !erroCarregamento && aba === 'classificacao' && (
          <View style={styles.abaConteudo}>
            {classificacao.length === 0 ? (
              <Vazio
                icone="list-outline"
                texto={'Nenhuma equipe inscrita ainda.\nA classificação aparece quando houver jogos.'}
              />
            ) : (
              <>
                <Animado style={styles.tabelaBox} delay={180}>
                  <View style={styles.tabelaLinhaCabecalho}>
                    <Text style={styles.tabelaCelulaPos}>#</Text>
                    <Text style={styles.tabelaCelulaEquipe}>Equipe</Text>
                    <Text style={styles.tabelaCelulaNum}>P</Text>
                    <Text style={styles.tabelaCelulaNum}>J</Text>
                    <Text style={styles.tabelaCelulaNum}>V</Text>
                    <Text style={styles.tabelaCelulaNum}>E</Text>
                    <Text style={styles.tabelaCelulaNum}>D</Text>
                    <Text style={styles.tabelaCelulaNum}>SG</Text>
                  </View>

                  {classificacao.map((linha, indice) => (
                    <View
                      key={linha.id_equipe}
                      style={[
                        styles.tabelaLinha,
                        indice < classificacao.length - 1 && styles.tabelaLinhaDivisa,
                        linha.posicao === 1 && styles.tabelaLinhaLider,
                      ]}
                    >
                      <Text style={[styles.tabelaCelulaPos, linha.posicao === 1 && { color: '#4CAF50' }]}>
                        {linha.posicao}
                      </Text>

                      <View style={styles.tabelaCelulaEquipeConteudo}>
                        <Escudo escudo_url={linha.escudo_url} nome={linha.nome} tamanho={24} />
                        <Text style={styles.tabelaEquipeNome} numberOfLines={1}>{linha.nome}</Text>
                      </View>

                      <Text style={[styles.tabelaCelulaNum, styles.tabelaCelulaDestaque]}>{linha.pontos}</Text>
                      <Text style={styles.tabelaCelulaNum}>{linha.jogos}</Text>
                      <Text style={styles.tabelaCelulaNum}>{linha.vitorias}</Text>
                      <Text style={styles.tabelaCelulaNum}>{linha.empates}</Text>
                      <Text style={styles.tabelaCelulaNum}>{linha.derrotas}</Text>
                      <Text style={styles.tabelaCelulaNum}>{linha.saldo}</Text>
                    </View>
                  ))}
                </Animado>

                <Text style={styles.tabelaLegenda}>
                  P pontos · J jogos · V vitórias · E empates · D derrotas · SG saldo
                </Text>
              </>
            )}
          </View>
        )}

        {/* ================== ABA CHAVEAMENTO ================== */}
        {!carregando && !erroCarregamento && aba === 'chaveamento' && (
          <View style={styles.abaConteudo}>
            {ehOrganizador && !temMataMata && campeonato && campeonato.status !== 'encerrado' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={gerarMataMata}
                style={[styles.botaoVerde, processando && styles.botaoOff]}
                disabled={processando}
              >
                {processando ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons name="git-network-outline" size={17} color="#000000" />
                )}
                <Text style={styles.botaoVerdeTexto}>Gerar mata-mata</Text>
              </TouchableOpacity>
            )}

            {!temMataMata && (
              <Vazio
                icone="git-network-outline"
                texto={'O chaveamento é gerado a partir da classificação\nda fase de grupos.'}
              />
            )}

            {Object.keys(jogosAgrupados)
              .filter((f) => f !== 'grupo')
              .sort((a, b) => (FASES_ORDEM[a] ?? 4) - (FASES_ORDEM[b] ?? 4))
              .map((fase) => (
                <View key={fase}>
                  <Text style={[styles.faseTitulo, fase === 'final' && styles.faseTituloFinal]}>
                    {labelFase(fase)}
                  </Text>

                  {jogosAgrupados[fase].map((jogo) => {
                    const status = STATUS_JOGO[jogo.status] || STATUS_JOGO.agendado;

                    return (
                      <View key={jogo.id_jogo} style={styles.jogoCard}>
                        <View style={styles.jogoTopo}>
                          <Text style={styles.jogoFase}>{status.label}</Text>
                        </View>

                        <View style={styles.jogoTimes}>
                          <View style={styles.jogoTime}>
                            <Escudo escudo_url={jogo.escudo_equipe1} nome={jogo.nome_equipe1} tamanho={32} />
                            <Text style={styles.jogoTimeNome} numberOfLines={1}>{jogo.nome_equipe1}</Text>
                          </View>

                          <View style={styles.jogoPlacar}>
                            {jogo.status === 'finalizado' && jogo.placar_equipe1 !== null ? (
                              <>
                                <Text style={styles.jogoPlacarTexto}>{jogo.placar_equipe1} - {jogo.placar_equipe2}</Text>
                                {jogo.placar_penaltis_equipe1 !== null && (
                                  <Text style={styles.jogoPenaltis}>
                                    Pên. {jogo.placar_penaltis_equipe1}x{jogo.placar_penaltis_equipe2}
                                  </Text>
                                )}
                                {jogo.nome_equipe_wo && (
                                  <Text style={styles.jogoWO}>W.O. ({jogo.nome_equipe_wo} faltou)</Text>
                                )}
                              </>
                            ) : (
                              <Text style={styles.jogoPlacarX}>VS</Text>
                            )}
                          </View>

                          <View style={styles.jogoTime}>
                            <Escudo escudo_url={jogo.escudo_equipe2} nome={jogo.nome_equipe2} tamanho={32} />
                            <Text style={styles.jogoTimeNome} numberOfLines={1}>{jogo.nome_equipe2}</Text>
                          </View>
                        </View>

                        <View style={styles.jogoDataRow}>
                          <Ionicons name="calendar-outline" size={12} color="#777777" />
                          <Text style={styles.jogoData}>
                            {jogo.data_utilizacao
                              ? `${formatarDataCurta(jogo.data_utilizacao)} · ${formatarHora(jogo.hora_inicio)}`
                              : 'A agendar'}
                          </Text>
                        </View>

                        {ehOrganizador && jogo.status !== 'finalizado' && jogo.status !== 'cancelado' && (
                          <View style={styles.jogoAcoes}>
                            {(jogo.status === 'definido' || jogo.status === 'agendado' || jogo.status === 'adiado') && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => abrirAgendar(jogo)}
                                style={[styles.acaoMini, styles.acaoMiniAzul]}
                              >
                                <Ionicons name="calendar-outline" size={13} color="#93C5FD" />
                                <Text style={styles.acaoMiniTextoAzul}>
                                  {jogo.status === 'definido' ? 'Agendar' : 'Remarcar'}
                                </Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => abrirResultado(jogo)}
                              style={[styles.acaoMini, styles.acaoMiniVerde]}
                            >
                              <Ionicons name="stats-chart-outline" size={13} color="#66BB6A" />
                              <Text style={styles.acaoMiniTextoVerde}>Resultado</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => confirmarWO(jogo)}
                              style={[styles.acaoMini, styles.acaoMiniAmarelo]}
                            >
                              <Ionicons name="ban-outline" size={13} color="#F59E0B" />
                              <Text style={styles.acaoMiniTextoAmarelo}>W.O.</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
          </View>
        )}

        {/* ================== ABA EQUIPES ================== */}
        {!carregando && !erroCarregamento && aba === 'equipes' && (
          <View style={styles.abaConteudo}>
            {ehOrganizador && campeonato && campeonato.status !== 'encerrado' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={abrirNovaEquipe}
                style={[styles.botaoVerde, processando && styles.botaoOff]}
                disabled={processando}
              >
                <Ionicons name="person-add-outline" size={17} color="#000000" />
                <Text style={styles.botaoVerdeTexto}>Inscrever equipe</Text>
              </TouchableOpacity>
            )}

            {equipes.length === 0 && (
              <Vazio icone="people-outline" texto={'Nenhuma equipe inscrita neste campeonato.'} />
            )}

            {equipes.map((equipe) => (
              <View key={equipe.id_equipe} style={styles.equipeCard}>
                <Escudo escudo_url={equipe.escudo_url} nome={equipe.nome} tamanho={44} />

                <View style={styles.equipeInfo}>
                  <Text style={styles.equipeNome} numberOfLines={1}>{equipe.nome}</Text>
                </View>

                {ehOrganizador && (
                  <View style={styles.equipeAcoes}>
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => abrirEdicaoEquipe(equipe)}
                      style={styles.equipeAcao}
                    >
                      <Ionicons name="create-outline" size={16} color="#CCCCCC" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => confirmarRemoverEquipe(equipe)}
                      style={styles.equipeAcao}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

            {/* ============ SHEET: NOVO JOGO ============ */}
      <Sheet
        visivel={modalJogoAberto}
        titulo="Novo jogo · fase de grupos"
        icone="add-circle-outline"
        aoFechar={() => setModalJogoAberto(false)}
        bloqueado={processando}
        rodape={
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={salvarJogo}
              style={[styles.sheetSalvar, processando && styles.sheetSalvarOff]}
              disabled={processando}
            >
              {processando ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="checkmark" size={17} color="#000000" />
              )}
              <Text style={styles.sheetSalvarTexto}>{processando ? 'Salvando...' : 'Criar jogo'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setModalJogoAberto(false)}
              style={styles.sheetCancelar}
              disabled={processando}
            >
              <Text style={styles.sheetCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        }
      >
        {modalJogoAberto && (
          <>
            {/* Confronto */}
            <SeletorConfronto
              equipes={equipes}
              equipe1={equipe1}
              equipe2={equipe2}
              aoEscolher1={setEquipe1}
              aoEscolher2={setEquipe2}
            />

            {/* Rodada */}
            <Text style={styles.sheetLabel}>Fase / rodada</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Ex.: 1ª rodada"
              placeholderTextColor="#777777"
              value={faseTexto}
              onChangeText={setFaseTexto}
              maxLength={50}
            />

            {/* Data e hora */}
            <CalendarioJogo label="Data" valor={dataJogo} aoSelecionar={setDataJogo} />

            <RelogioCircular label="Hora de início" valor={horaJogo} aoSelecionar={setHoraJogo} />

            {/* Placar — só existe para jogo em data passada */}
            {dataPassada && (
              <>
                <View style={styles.avisoBox}>
                  <Ionicons name="time-outline" size={14} color="#F59E0B" />
                  <Text style={styles.avisoTexto}>
                    A data já passou: informe o placar — o jogo nasce finalizado.
                  </Text>
                </View>

                <View style={styles.placarRow}>
                  <TextInput
                    style={styles.placarInput}
                    placeholder="Placar 1"
                    placeholderTextColor="#777777"
                    value={placar1}
                    onChangeText={setPlacar1}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={styles.placarInput}
                    placeholder="Placar 2"
                    placeholderTextColor="#777777"
                    value={placar2}
                    onChangeText={setPlacar2}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}
          </>
        )}
      </Sheet>

      {/* ============ SHEET: AGENDAR / REMARCAR ============ */}
      <Sheet
        visivel={modalAgendarAberto}
        titulo={jogoAgendar && jogoAgendar.status === 'definido' ? 'Agendar jogo' : 'Remarcar jogo'}
        icone="calendar-outline"
        aoFechar={() => setModalAgendarAberto(false)}
        bloqueado={processando}
        rodape={
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={confirmarAgendar}
              style={[styles.sheetSalvar, processando && styles.sheetSalvarOff]}
              disabled={processando}
            >
              {processando ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="checkmark" size={17} color="#000000" />
              )}
              <Text style={styles.sheetSalvarTexto}>{processando ? 'Salvando...' : 'Confirmar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setModalAgendarAberto(false)}
              style={styles.sheetCancelar}
              disabled={processando}
            >
              <Text style={styles.sheetCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        }
      >
        {jogoAgendar && (
          <>
            <View style={styles.confrontoMini}>
              <Escudo escudo_url={jogoAgendar.escudo_equipe1} nome={jogoAgendar.nome_equipe1} tamanho={30} />
              <Text style={styles.confrontoMiniNome} numberOfLines={1}>
                {jogoAgendar.nome_equipe1}
              </Text>
              <Text style={styles.confrontoMiniX}>x</Text>
              <Text style={styles.confrontoMiniNome} numberOfLines={1}>
                {jogoAgendar.nome_equipe2}
              </Text>
              <Escudo escudo_url={jogoAgendar.escudo_equipe2} nome={jogoAgendar.nome_equipe2} tamanho={30} />
            </View>

            <CalendarioJogo label="Data" valor={dataJogo} aoSelecionar={setDataJogo} />

            <RelogioCircular label="Hora de início" valor={horaJogo} aoSelecionar={setHoraJogo} />
          </>
        )}
      </Sheet>

      {/* ============ SHEET: EQUIPE ============ */}
      <Sheet
        visivel={modalEquipeAberto}
        titulo={equipeEditando ? 'Editar equipe' : 'Inscrever equipe'}
        icone="shield-outline"
        aoFechar={() => setModalEquipeAberto(false)}
        bloqueado={processando}
        rodape={
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={salvarEquipe}
              style={[styles.sheetSalvar, processando && styles.sheetSalvarOff]}
              disabled={processando}
            >
              {processando ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="checkmark" size={17} color="#000000" />
              )}
              <Text style={styles.sheetSalvarTexto}>
                {processando ? 'Salvando...' : equipeEditando ? 'Salvar alterações' : 'Inscrever'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setModalEquipeAberto(false)}
              style={styles.sheetCancelar}
              disabled={processando}
            >
              <Text style={styles.sheetCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        }
      >
        <Text style={styles.sheetLabel}>Nome da equipe</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder="Ex.: Auto Bots"
          placeholderTextColor="#777777"
          value={nomeEquipe}
          onChangeText={setNomeEquipe}
          maxLength={100}
        />

        <Text style={styles.sheetLabel}>Escudo (PNG/JPG)</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={escolherEscudo} style={styles.escudoBotao}>
          {escudoEquipe ? (
            <View style={styles.escudoPreviewRow}>
              <Image source={{ uri: escudoEquipe }} style={styles.escudoPreview} />
              <Text style={styles.escudoBotaoDica}>Toque para trocar a imagem</Text>
            </View>
          ) : (
            <View style={styles.escudoBotaoRow}>
              <Ionicons name="image-outline" size={19} color="#4CAF50" />
              <Text style={styles.escudoBotaoTexto}>Escolher da galeria</Text>
            </View>
          )}
        </TouchableOpacity>

        {escudoEquipe && (
          <TouchableOpacity activeOpacity={0.6} onPress={() => setEscudoEquipe(null)} style={styles.removerEscudo}>
            <Ionicons name="trash-outline" size={13} color="#EF4444" />
            <Text style={styles.removerEscudoTexto}>Remover escudo</Text>
          </TouchableOpacity>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

// ============================================================
// Helpers de rótulo
// ============================================================

function labelFase(fase) {
  if (fase === 'quartas') return 'Quartas de Final';
  if (fase === 'semifinal') return 'Semifinal';
  if (fase === 'final') return 'FINAL';
  if (fase === 'grupo') return 'Fase de Grupos';
  return fase;
}

function faseTextoOuPadrao(jogo) {
  return jogo.fase === 'grupo' ? 'Fase de Grupos' : labelFase(jogo.fase);
}

// ============================================================
// Estilos
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingTop: 45,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerVoltar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // Card de contexto
  contextoCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 14,
  },
  contextoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipInfoTexto: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
  },
  chipStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipStatusTexto: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
  },
  campeaoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  campeaoTexto: {
    color: '#F59E0B',
    fontSize: 12.5,
    fontWeight: '800',
    flexShrink: 1,
  },

  // Abas
  abasRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  abaButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#1A1A1A',
  },
  abaButtonAtiva: {
    borderBottomColor: '#4CAF50',
  },
  abaTexto: {
    color: '#777777',
    fontSize: 12.5,
    fontWeight: '700',
  },
  abaTextoAtiva: {
    color: '#4CAF50',
    fontWeight: '800',
  },

  abaConteudo: {
    padding: 20,
  },

  // Carregando / erro / vazio
  carregandoBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  carregandoTexto: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '600',
    marginTop: 12,
  },

  erroBox: {
    backgroundColor: '#111111',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
  },
  erroIcone: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  erroTitulo: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  erroTexto: {
    color: '#777777',
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  erroBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  erroBotaoTexto: {
    color: '#4CAF50',
    fontSize: 12.5,
    fontWeight: '800',
  },

  vazioBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#0D0D0D',
  },
  vazioIcone: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vazioTexto: {
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Botão verde principal
  botaoVerde: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  botaoVerdeTexto: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  botaoOff: {
    opacity: 0.55,
  },

  faseTitulo: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },
  faseTituloFinal: {
    color: '#F59E0B',
  },

  // Cards de jogo
  jogoCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  jogoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  jogoFase: {
    fontSize: 10.5,
    color: '#777777',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeTexto: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  jogoTimes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jogoTime: {
    flex: 1,
    alignItems: 'center',
  },
  jogoTimeNome: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  jogoPlacar: {
    width: 92,
    alignItems: 'center',
  },
  jogoPlacarTexto: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  jogoPlacarX: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  jogoPenaltis: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  jogoWO: {
    color: '#EF4444',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  jogoDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  jogoData: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },

  jogoAcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  acaoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acaoMiniAzul: {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
  },
  acaoMiniVerde: {
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  acaoMiniAmarelo: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  acaoMiniVermelho: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  acaoMiniTextoAzul: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
  },
  acaoMiniTextoVerde: {
    color: '#66BB6A',
    fontSize: 11,
    fontWeight: '800',
  },
  acaoMiniTextoAmarelo: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  acaoMiniTextoVermelho: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },

  // Escudos
  escudoVazio: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  escudoVazioTexto: {
    color: '#4CAF50',
    fontWeight: '800',
  },

  // Tabela de classificação
  tabelaBox: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
    overflow: 'hidden',
  },
  tabelaLinhaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  tabelaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tabelaLinhaDivisa: {
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
  },
  tabelaLinhaLider: {
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
  },
  tabelaCelulaPos: {
    width: 28,
    color: '#777777',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  tabelaCelulaEquipe: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '700',
  },
  tabelaCelulaEquipeConteudo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabelaEquipeNome: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
  },
  tabelaCelulaNum: {
    width: 32,
    color: '#888888',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  tabelaCelulaDestaque: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabelaLegenda: {
    color: '#666666',
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },

  // Equipes
  equipeCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  equipeNome: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  equipeAcoes: {
    flexDirection: 'row',
    gap: 8,
  },
  equipeAcao: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom sheets
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetKav: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetPainel: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#222222',
    paddingHorizontal: 20,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sheetHeaderIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitulo: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetFechar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingBottom: 8,
  },
  sheetSubtitulo: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 4,
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999999',
    marginTop: 16,
    marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },

  selecionarTimesRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  selecionarTime: {
    alignItems: 'center',
    width: 80,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0A0A0A',
  },
  selecionarTimeAtivo: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  selecionarTimeNome: {
    color: '#888888',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  selecionarTimeNomeAtivo: {
    color: '#4CAF50',
  },

  placarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placarInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 4,
    fontVariant: ['tabular-nums'],
  },

  avisoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  avisoTexto: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16.5,
  },

  escudoBotao: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  escudoBotaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escudoBotaoTexto: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '700',
  },
  escudoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  escudoPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  escudoBotaoDica: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  removerEscudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  removerEscudoTexto: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },

  sheetSalvar: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sheetSalvarOff: {
    opacity: 0.55,
  },
  sheetSalvarTexto: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  sheetCancelar: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetCancelarTexto: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetScrollConteudo: {
    paddingBottom: 12,
  },
  sheetRodape: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  // ==================== CONFRONTO (novo jogo) ====================
  confrontoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confrontoSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    backgroundColor: '#0D0D0D',
  },
  confrontoSlotAtivo: {
    borderColor: 'rgba(76, 175, 80, 0.45)',
    backgroundColor: 'rgba(76, 175, 80, 0.07)',
  },
  confrontoSlotAberto: {
    borderColor: '#4CAF50',
  },
  confrontoSlotVazio: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confrontoSlotNome: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  confrontoSlotDica: {
    color: '#666666',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 8,
  },
  confrontoVS: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ==================== PAINEL DE SELEÇÃO (acordeão) ====================
  slotPainelWrap: {
    overflow: 'hidden',
  },
  slotPainelInner: {
    paddingTop: 8,
  },
  slotPainel: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 8,
  },
  slotLista: {
    maxHeight: 232,
  },
  equipeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  equipeLinhaAtiva: {
    backgroundColor: 'rgba(76, 175, 80, 0.10)',
  },
  equipeLinhaOcupada: {
    opacity: 0.3,
  },
  equipeLinhaNome: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 13.5,
    fontWeight: '700',
  },
  equipeLinhaNomeAtivo: {
    color: '#4CAF50',
  },

  // ==================== SCOREBOARD (resultado) ====================
  placarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 14,
  },
  placarTimeCol: {
    flex: 1,
    alignItems: 'center',
  },
  placarTimeNome: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  placarInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
  },
  placarInputGrande: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  placarInputMedio: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  placarSeparador: {
    color: '#444444',
    fontSize: 22,
    fontWeight: '900',
  },
  penaltisCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.22)',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  penaltisTitulo: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
  },

  // ==================== CONFRONTO MINI (agendar) ====================
  confrontoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  confrontoMiniNome: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  confrontoMiniX: {
    color: '#555555',
    fontSize: 12,
    fontWeight: '800',
  },
});
