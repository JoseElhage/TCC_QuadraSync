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
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferiorLeague from '../components/MenuInferiorLeague';

// ============================================================
// Constantes de apoio
// ============================================================

const MODALIDADES = [
  { valor: 'futsal', label: 'Futsal', icone: 'soccer' },
  { valor: 'volei', label: 'Vôlei', icone: 'volleyball' },
  { valor: 'basquete', label: 'Basquete', icone: 'basketball' },
];

const CATEGORIAS = [
  { valor: 'feminino', label: 'Feminino' },
  { valor: 'masculino', label: 'Masculino' },
  { valor: 'misto', label: 'Misto' },
];

const ABREVIACAO_CATEGORIA = { feminino: 'FEM', masculino: 'MASC', misto: 'MISTO' };

const MODALIDADE_LABEL = { futsal: 'Futsal', volei: 'Vôlei', basquete: 'Basquete' };
const CATEGORIA_LABEL = { feminino: 'Feminino', masculino: 'Masculino', misto: 'Misto' };

const STATUS_TEXTO = { planejado: 'Planejado', andamento: 'Em andamento', encerrado: 'Encerrado' };

const STATUS_ESTILO = {
  planejado: { bg: '#2A2A2A', texto: '#AAAAAA', ponto: '#AAAAAA' },
  andamento: { bg: '#4CAF50', texto: '#000000', ponto: '#000000' },
  encerrado: { bg: '#F59E0B', texto: '#000000', ponto: '#000000' },
};

const iconeModalidade = (valor) => {
  const m = MODALIDADES.find((item) => item.valor === valor);
  return m ? m.icone : 'help-circle-outline';
};

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const INICIAIS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const pad = (n) => String(n).padStart(2, '0');

// '2026-03-15' -> '15/03/2026' (null -> '')
const formatarData = (dataISO) => {
  if (!dataISO) return '';

  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

// '2026-03-15' -> 20260315 (número) para comparação de datas sem timezone
const chaveISO = (dataISO) => (!dataISO ? null : Number(dataISO.replace(/-/g, '')));

// Limites de seleção (calculados uma vez ao abrir o app)
const HOJE = new Date();
const HOJE_ISO = `${HOJE.getFullYear()}-${pad(HOJE.getMonth() + 1)}-${pad(HOJE.getDate())}`;

// Limite retroativo aprovado: hoje menos 1 mês
const LIMITE_ISO = (() => {
  const limite = new Date(HOJE.getFullYear(), HOJE.getMonth() - 1, HOJE.getDate());
  return `${limite.getFullYear()}-${pad(limite.getMonth() + 1)}-${pad(limite.getDate())}`;
})();

// ============================================================
// Animação de entrada (fade + rise) — padrão do design system
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
// Mini-calendário de seleção de data (dentro do bottom sheet)
// ============================================================

function MiniCalendario({ valorISO, minimoISO, aoSelecionar }) {
  // Mês exibido: o mês do valor já escolhido, ou o mês atual
  const [mesVisivel, setMesVisivel] = useState(() => {
    const [ano, mes] = (valorISO || HOJE_ISO).split('-').map(Number);
    return { ano, mes };
  });

  const valorChave = chaveISO(valorISO);
  const minimoChave = chaveISO(minimoISO);
  const hojeChave = chaveISO(HOJE_ISO);

  // Seta ‹ trava quando o mês exibido é o mês do limite mínimo
  const [minAno, minMes] = minimoISO.split('-').map(Number);
  const podeVoltar =
    mesVisivel.ano * 12 + mesVisivel.mes > minAno * 12 + minMes;

  const primeiroDiaSemana = new Date(mesVisivel.ano, mesVisivel.mes - 1, 1).getDay();
  const diasNoMes = new Date(mesVisivel.ano, mesVisivel.mes, 0).getDate();

  // Células do grid: null = espaço vazio antes do dia 1
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);

  const avancarMes = () =>
    setMesVisivel((atual) =>
      atual.mes === 12 ? { ano: atual.ano + 1, mes: 1 } : { ...atual, mes: atual.mes + 1 }
    );

  const voltarMes = () =>
    setMesVisivel((atual) =>
      atual.mes === 1 ? { ano: atual.ano - 1, mes: 12 } : { ...atual, mes: atual.mes - 1 }
    );

  return (
    <View style={styles.calendario}>
      {/* Navegação de mês */}
      <View style={styles.calendarioNav}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!podeVoltar}
          onPress={voltarMes}
          style={styles.calendarioSeta}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={podeVoltar ? '#CCCCCC' : '#333333'}
          />
        </TouchableOpacity>

        <Text style={styles.calendarioMes}>
          {NOMES_MESES[mesVisivel.mes - 1]} de {mesVisivel.ano}
        </Text>

        <TouchableOpacity activeOpacity={0.7} onPress={avancarMes} style={styles.calendarioSeta}>
          <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
        </TouchableOpacity>
      </View>

      {/* Cabeçalho da semana */}
      <View style={styles.calendarioGrade}>
        {INICIAIS_SEMANA.map((inicial, indice) => (
          <View key={`sem-${indice}`} style={styles.calendarioCelula}>
            <Text style={styles.calendarioInicial}>{inicial}</Text>
          </View>
        ))}
      </View>

      {/* Dias */}
      <View style={styles.calendarioGrade}>
        {celulas.map((dia, indice) => {
          if (dia === null) {
            return <View key={`vazio-${indice}`} style={styles.calendarioCelula} />;
          }

          const chave = mesVisivel.ano * 10000 + mesVisivel.mes * 100 + dia;
          const desabilitado = chave < minimoChave;
          const selecionado = chave === valorChave;
          const ehHoje = chave === hojeChave;

          if (desabilitado) {
            return (
              <View key={`dia-${dia}`} style={styles.calendarioCelula}>
                <View style={styles.calendarioDiaBase}>
                  <Text style={styles.calendarioDiaTextoDesabilitado}>{dia}</Text>
                </View>
              </View>
            );
          }

          return (
            <View key={`dia-${dia}`} style={styles.calendarioCelula}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  aoSelecionar(`${mesVisivel.ano}-${pad(mesVisivel.mes)}-${pad(dia)}`)
                }
                style={[
                  styles.calendarioDiaBase,
                  ehHoje && !selecionado && styles.calendarioDiaHoje,
                  selecionado && styles.calendarioDiaSelecionado,
                ]}
              >
                <Text
                  style={[
                    styles.calendarioDiaTexto,
                    selecionado && styles.calendarioDiaTextoSelecionado,
                  ]}
                >
                  {dia}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Card de campeonato
// ============================================================

function CartaoCampeonato({
  campeonato,
  indice,
  ehOrganizador,
  aoAbrir,
  aoEditar,
  aoExcluir,
}) {
  const statusEstilo = STATUS_ESTILO[campeonato.status] || STATUS_ESTILO.planejado;

  return (
    <Animado delay={Math.min(indice, 8) * 60}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={aoAbrir}
        style={styles.card}
      >
        <View style={styles.cardTopo}>
          <Text style={styles.cardNome} numberOfLines={2}>
            {campeonato.nome}
          </Text>

          {ehOrganizador && (
            <View style={styles.cardAcoes}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={aoEditar}
                style={styles.acaoBotao}
              >
                <Ionicons name="create-outline" size={16} color="#AAAAAA" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={aoExcluir}
                style={styles.acaoBotao}
              >
                <Ionicons name="trash-outline" size={16} color="#AAAAAA" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cardBadges}>
          <View style={styles.badgeModalidade}>
            <MaterialCommunityIcons
              name={iconeModalidade(campeonato.modalidade)}
              size={12}
              color="#4CAF50"
            />
            <Text style={styles.badgeModalidadeTexto}>
              {MODALIDADE_LABEL[campeonato.modalidade]} ·{' '}
              {CATEGORIA_LABEL[campeonato.categoria]}
            </Text>
          </View>

          <View style={[styles.badgeStatus, { backgroundColor: statusEstilo.bg }]}>
            <View style={[styles.badgeStatusPonto, { backgroundColor: statusEstilo.ponto }]} />
            <Text style={[styles.badgeStatusTexto, { color: statusEstilo.texto }]}>
              {STATUS_TEXTO[campeonato.status] || 'Planejado'}
            </Text>
          </View>
        </View>

        <View style={styles.metaLinha}>
          <Ionicons name="calendar-outline" size={13} color="#666666" />
          <Text style={styles.metaTexto}>
            {formatarData(campeonato.data_inicio)}
            {campeonato.data_fim ? ` → ${formatarData(campeonato.data_fim)}` : ''}
          </Text>
        </View>

        <View style={styles.metaLinha}>
          <Ionicons name="people-outline" size={13} color="#666666" />
          <Text style={styles.metaTexto}>
            {campeonato.total_equipes}{' '}
            {campeonato.total_equipes === 1 ? 'equipe' : 'equipes'} ·{' '}
            {campeonato.total_jogos} {campeonato.total_jogos === 1 ? 'jogo' : 'jogos'}
          </Text>
        </View>

        {campeonato.nome_campeao && (
          <View style={styles.campeaoBox}>
            <Ionicons name="trophy" size={14} color="#F59E0B" />
            <Text style={styles.campeaoTexto}>
              Campeão: {campeonato.nome_campeao}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animado>
  );
}

// ============================================================
// Tela
// ============================================================

export default function TelaEL({
  token,
  usuario,
  irParaELDetalhes,
  irParaInicial,
  irParaCalendario,
  irParaNotificacoes,
  irParaPerfil,
}) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const ehOrganizador = usuario?.perfil === 'organizador';

  // ----- Sheet de campeonato (criar/editar) -----
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null); // null = novo
  const [modalidade, setModalidade] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dataAberta, setDataAberta] = useState(null); // 'inicio' | 'fim' | null
  const [salvando, setSalvando] = useState(false);

  // ------------------------------------------------------------
  // Nome automático: "Modalidade + MASC/FEM/MISTO + ano do início"
  // ------------------------------------------------------------
  const gerarNomeCampeonato = () => {
    if (!modalidade || !categoria || !dataInicio) return null;

    const ano = dataInicio.substring(0, 4);
    return `${MODALIDADE_LABEL[modalidade]} ${ABREVIACAO_CATEGORIA[categoria]} ${ano}`;
  };

  // Limites dos calendários:
  // - Início: hoje - 1 mês; na edição, permite até o mês da data atual
  //   do campeonato (para não travar o próprio valor existente).
  // - Fim: nunca antes da data de início; na edição, permite até a
  //   data de fim atual do campeonato (mesma válvula de escape).
  const minimoInicio =
    editando && editando.data_inicio && editando.data_inicio < LIMITE_ISO
      ? editando.data_inicio
      : LIMITE_ISO;

  const minimoFimBase =
    dataInicio && dataInicio > LIMITE_ISO ? dataInicio : LIMITE_ISO;

  const minimoFim =
    editando && editando.data_fim && editando.data_fim < minimoFimBase
      ? editando.data_fim
      : minimoFimBase;

  // ------------------------------------------------------------
  // Carregar campeonatos (GET /api/el/campeonatos)
  // ------------------------------------------------------------
  const carregarCampeonatos = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/el/campeonatos`, {
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

      setCampeonatos(dados.campeonatos);
      setErroCarregamento(false);
    } catch (error) {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarCampeonatos();
  }, [carregarCampeonatos]);

  // ------------------------------------------------------------
  // Pull-to-refresh + retry pelo card de erro
  // ------------------------------------------------------------
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarCampeonatos();
    setAtualizando(false);
  }, [carregarCampeonatos]);

  const tentarNovamente = useCallback(() => {
    setCarregando(true);
    carregarCampeonatos();
  }, [carregarCampeonatos]);

  // ------------------------------------------------------------
  // Sheet: abrir novo / abrir edição
  // ------------------------------------------------------------
  const abrirNovo = () => {
    setEditando(null);
    setModalidade(null);
    setCategoria(null);
    setDataInicio('');
    setDataFim('');
    setDataAberta(null);
    setModalAberto(true);
  };

  const abrirEdicao = (campeonato) => {
    setEditando(campeonato);
    setModalidade(campeonato.modalidade);
    setCategoria(campeonato.categoria);
    setDataInicio(campeonato.data_inicio || '');
    setDataFim(campeonato.data_fim || '');
    setDataAberta(null);
    setModalAberto(true);
  };

  // Fechar: bloqueado durante salvamento (não perder seleções)
  const fecharModal = () => {
    if (salvando) return;
    setModalAberto(false);
  };

  // Seleção de dia no mini-calendário
  const aoSelecionarData = (dataISO) => {
    if (dataAberta === 'inicio') {
      setDataInicio(dataISO);
    } else if (dataAberta === 'fim') {
      setDataFim(dataISO);
    }
    setDataAberta(null);
  };

  // ------------------------------------------------------------
  // Salvar (POST novo / PUT edição)
  // ------------------------------------------------------------
  const salvarCampeonato = async () => {
    if (!modalidade) {
      Alert.alert('Atenção', 'Selecione a modalidade.');
      return;
    }

    if (!categoria) {
      Alert.alert('Atenção', 'Selecione a categoria.');
      return;
    }

    if (!dataInicio) {
      Alert.alert('Atenção', 'Selecione a data de início.');
      return;
    }

    if (dataFim !== '' && dataFim < dataInicio) {
      Alert.alert('Atenção', 'A data de fim não pode ser anterior à data de início.');
      return;
    }

    setSalvando(true);

    try {
      const nomeCampeonato = gerarNomeCampeonato();

      const corpo = {
        nome: nomeCampeonato,
        modalidade,
        categoria,
        data_inicio: dataInicio,
      };

      if (editando) {
        // TEMPORÁRIO: envia o status atual até o backend passar a
        // controlar o status automaticamente (etapa de backend).
        corpo.status = editando.status;

        corpo.data_fim = dataFim === '' ? null : dataFim;
      } else if (dataFim !== '') {
        corpo.data_fim = dataFim;
      }

      const resposta = await fetch(
        editando
          ? `${API_URL}/el/campeonatos/${editando.id_campeonato}`
          : `${API_URL}/el/campeonatos`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(corpo),
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

      if (!resposta.ok || !dados.success) {
        Alert.alert('Não foi possível salvar', dados.message || 'Verifique os dados e tente novamente.');
        return;
      }

      setModalAberto(false);
      await carregarCampeonatos();
      Alert.alert('Pronto', editando ? 'Campeonato atualizado.' : 'Campeonato criado com sucesso.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setSalvando(false);
    }
  };

  // ------------------------------------------------------------
  // Excluir (DELETE) — regras vêm do backend
  // ------------------------------------------------------------
  const excluirCampeonato = (campeonato) => {
    Alert.alert(
      'Excluir campeonato',
      `Excluir "${campeonato.nome}"?\n\nSó é possível excluir campeonatos sem campeão registrado e quando outro campeonato estiver em andamento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => confirmarExclusao(campeonato),
        },
      ]
    );
  };

  const confirmarExclusao = async (campeonato) => {
    try {
      const resposta = await fetch(
        `${API_URL}/el/campeonatos/${campeonato.id_campeonato}`,
        {
          method: 'DELETE',
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

      if (!resposta.ok || !dados.success) {
        Alert.alert('Não foi possível excluir', dados.message || 'Tente novamente.');
        return;
      }

      await carregarCampeonatos();
      Alert.alert('Pronto', 'Campeonato excluído.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando.'
      );
    }
  };

  const nomePreview = gerarNomeCampeonato();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />

        <View style={styles.headerLinha}>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>ETEC League</Text>
            <Text style={styles.headerSubtitulo}>Campeonatos da escola</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={irParaNotificacoes}
            style={styles.botaoSino}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/*
        Botão "Novo campeonato" (organizador): IRMÃO do ScrollView,
        flutua sobre o header (regra do design system).
      */}
      {ehOrganizador && (
        <Animado>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={abrirNovo}
            style={styles.botaoNovo}
          >
            <Ionicons name="add" size={20} color="#000000" />
            <Text style={styles.botaoNovoTexto}>Novo campeonato</Text>
          </TouchableOpacity>
        </Animado>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Carregando */}
        {carregando && (
          <View style={styles.areaStatus}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.textoStatus}>Carregando campeonatos...</Text>
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
                <Ionicons name="cloud-offline-outline" size={26} color="#F87171" />
              </View>
              <View style={styles.erroTextos}>
                <Text style={styles.erroTitulo}>Não foi possível carregar</Text>
                <Text style={styles.erroTexto}>
                  Verifique a conexão com o servidor e toque para tentar novamente.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#444444" />
            </TouchableOpacity>
          </Animado>
        )}

        {/* Vazio */}
        {!carregando && !erroCarregamento && campeonatos.length === 0 && (
          <Animado>
            <View style={styles.vazio}>
              <View style={styles.vazioIcone}>
                <Ionicons name="trophy-outline" size={30} color="#4CAF50" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhum campeonato ainda</Text>
              <Text style={styles.vazioTexto}>
                {ehOrganizador
                  ? 'Crie o primeiro campeonato da temporada.'
                  : 'Quando o organizador criar os campeonatos, eles aparecerão aqui.'}
              </Text>
            </View>
          </Animado>
        )}

        {/* Lista de campeonatos */}
        {!carregando &&
          !erroCarregamento &&
          campeonatos.map((campeonato, indice) => (
            <CartaoCampeonato
              key={campeonato.id_campeonato}
              campeonato={campeonato}
              indice={indice}
              ehOrganizador={ehOrganizador}
              aoAbrir={() => irParaELDetalhes(campeonato.id_campeonato)}
              aoEditar={() => abrirEdicao(campeonato)}
              aoExcluir={() => excluirCampeonato(campeonato)}
            />
          ))}
      </ScrollView>

      {/*
        Bottom sheet de criar/editar campeonato.
        Sem TextInput: nenhuma etapa abre o teclado.
        Toque fora NÃO fecha (seleções feitas à mão); fecha pelo X,
        "Cancelar" ou botão voltar do Android.
      */}
      <Modal
        visible={modalAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharModal}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollConteudo}
          showsVerticalScrollIndicator={false}
        >
          {modalAberto && (
            <View style={styles.sheetPainel}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetCabecalho}>
                <View style={styles.sheetCabecalhoIcone}>
                  <Ionicons
                    name={editando ? 'create-outline' : 'trophy-outline'}
                    size={19}
                    color="#4CAF50"
                  />
                </View>
                <Text style={styles.sheetTitulo}>
                  {editando ? 'Editar campeonato' : 'Novo campeonato'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={fecharModal}
                  disabled={salvando}
                  style={styles.sheetFechar}
                >
                  <Ionicons name="close" size={18} color="#888888" />
                </TouchableOpacity>
              </View>

              {/* Preview do nome automático */}
              <View style={styles.preview}>
                <View style={styles.previewIcone}>
                  <Ionicons name="trophy" size={15} color="#4CAF50" />
                </View>
                <View style={styles.previewTextos}>
                  <Text style={styles.previewLabel}>Nome do campeonato</Text>
                  <Text style={nomePreview ? styles.previewValor : styles.previewDica}>
                    {nomePreview ||
                      'Definido automaticamente com modalidade, categoria e data'}
                  </Text>
                </View>
              </View>

              {/* Modalidade */}
              <Text style={styles.sheetLabel}>Modalidade</Text>
              <View style={styles.chipsLinha}>
                {MODALIDADES.map((m) => {
                  const ativo = modalidade === m.valor;

                  return (
                    <TouchableOpacity
                      key={m.valor}
                      activeOpacity={0.7}
                      onPress={() => setModalidade(m.valor)}
                      style={[styles.chip, ativo && styles.chipAtivo]}
                    >
                      <MaterialCommunityIcons
                        name={m.icone}
                        size={15}
                        color={ativo ? '#4CAF50' : '#888888'}
                      />
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Categoria */}
              <Text style={styles.sheetLabel}>Categoria</Text>
              <View style={styles.chipsLinha}>
                {CATEGORIAS.map((c) => {
                  const ativo = categoria === c.valor;

                  return (
                    <TouchableOpacity
                      key={c.valor}
                      activeOpacity={0.7}
                      onPress={() => setCategoria(c.valor)}
                      style={[styles.chip, ativo && styles.chipAtivo]}
                    >
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Data de início */}
              <Text style={styles.sheetLabel}>Data de início</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setDataAberta(dataAberta === 'inicio' ? null : 'inicio')
                }
                style={[
                  styles.campoData,
                  dataAberta === 'inicio' && styles.campoDataAberto,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={dataAberta === 'inicio' ? '#4CAF50' : '#666666'}
                />
                <Text
                  style={[styles.campoDataTexto, !dataInicio && styles.campoDataPlaceholder]}
                >
                  {dataInicio ? formatarData(dataInicio) : 'Selecionar data'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666666" />
              </TouchableOpacity>

              {dataAberta === 'inicio' && (
                <MiniCalendario
                  valorISO={dataInicio}
                  minimoISO={minimoInicio}
                  aoSelecionar={aoSelecionarData}
                />
              )}

              {/* Data de fim (opcional) */}
              <Text style={styles.sheetLabel}>Data de fim (opcional)</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDataAberta(dataAberta === 'fim' ? null : 'fim')}
                style={[
                  styles.campoData,
                  dataAberta === 'fim' && styles.campoDataAberto,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={dataAberta === 'fim' ? '#4CAF50' : '#666666'}
                />
                <Text
                  style={[styles.campoDataTexto, !dataFim && styles.campoDataPlaceholder]}
                >
                  {dataFim ? formatarData(dataFim) : 'Selecionar data'}
                </Text>

                {dataFim !== '' ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setDataFim('')}
                    style={styles.campoDataLimpar}
                  >
                    <Ionicons name="close" size={15} color="#888888" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={16} color="#666666" />
                )}
              </TouchableOpacity>

              {dataAberta === 'fim' && (
                <MiniCalendario
                  valorISO={dataFim}
                  minimoISO={minimoFim}
                  aoSelecionar={aoSelecionarData}
                />
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={salvarCampeonato}
                style={[styles.sheetSalvar, salvando && styles.sheetSalvarDesabilitado]}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons
                    name={editando ? 'checkmark' : 'add'}
                    size={19}
                    color="#000000"
                  />
                )}
                <Text style={styles.sheetSalvarTexto}>
                  {salvando
                    ? 'Salvando...'
                    : editando
                      ? 'Salvar alterações'
                      : 'Criar campeonato'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={fecharModal}
                style={styles.sheetCancelar}
                disabled={salvando}
              >
                <Text style={styles.sheetCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Modal>

      {/* Menu Inferior — identidade preto + verde da League */}
      <MenuInferiorLeague
        telaAtiva="league"
        irParaInicial={irParaInicial}
        irParaCalendario={irParaCalendario}
        irParaPerfil={irParaPerfil}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ---------- Header ----------
  header: {
    backgroundColor: '#000000',
    paddingTop: 54,
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
    backgroundColor: 'rgba(76, 175, 80, 0.10)',
    right: -45,
    top: -60,
  },
  circuloPequeno: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
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
    color: '#777777',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  botaoSino: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },

  // ---------- Botão Novo campeonato (flutuante) ----------
  botaoNovo: {
    backgroundColor: '#4CAF50',
    marginTop: -20,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  botaoNovoTexto: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 7,
  },

  // ---------- Conteúdo ----------
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 14,
  },

  // Carregando
  areaStatus: {
    alignItems: 'center',
    marginTop: 56,
  },
  textoStatus: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
    marginTop: 14,
  },

  // Erro
  cardErro: {
    backgroundColor: '#111111',
    marginTop: 24,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  erroIcone: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#1A1A1A',
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
    color: '#FFFFFF',
  },
  erroTexto: {
    fontSize: 12.5,
    color: '#888888',
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
    borderColor: '#2A2A2A',
    backgroundColor: '#111111',
    alignItems: 'center',
  },
  vazioIcone: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  vazioTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vazioTexto: {
    fontSize: 12.5,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
  },

  // ---------- Card de campeonato ----------
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  cardTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardNome: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  cardAcoes: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  acaoBotao: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  cardBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  badgeModalidade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexShrink: 1,
  },
  badgeModalidadeTexto: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginLeft: 8,
  },
  badgeStatusPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeStatusTexto: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  metaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaTexto: {
    fontSize: 12.5,
    color: '#888888',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },

  campeaoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  campeaoTexto: {
    fontSize: 12.5,
    color: '#F59E0B',
    fontWeight: '800',
    marginLeft: 7,
  },

  // ---------- Bottom sheet ----------
  sheetScroll: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheetScrollConteudo: {
    justifyContent: 'flex-end',
  },
  sheetPainel: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    marginBottom: 14,
  },
  sheetCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetCabecalhoIcone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetTitulo: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetFechar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Preview do nome automático
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  previewIcone: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  previewTextos: {
    flex: 1,
    flexShrink: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#777777',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewValor: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  previewDica: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#666666',
    marginTop: 3,
    lineHeight: 16,
  },

  sheetLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#AAAAAA',
    marginTop: 18,
    marginBottom: 8,
  },

  chipsLinha: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    marginHorizontal: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  chipAtivo: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  chipTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    marginLeft: 5,
  },
  chipTextoAtivo: {
    color: '#4CAF50',
  },

  // Campo de data (botão que abre o mini-calendário)
  campoData: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  campoDataAberto: {
    borderColor: '#4CAF50',
  },
  campoDataTexto: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  campoDataPlaceholder: {
    color: '#666666',
    fontWeight: '500',
  },
  campoDataLimpar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mini-calendário
  calendario: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
  },
  calendarioNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarioSeta: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarioMes: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  calendarioGrade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarioCelula: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 1,
  },
  calendarioInicial: {
    fontSize: 10,
    fontWeight: '800',
    color: '#666666',
  },
  calendarioDiaBase: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarioDiaHoje: {
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  calendarioDiaSelecionado: {
    backgroundColor: '#4CAF50',
  },
  calendarioDiaTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
    fontVariant: ['tabular-nums'],
  },
  calendarioDiaTextoSelecionado: {
    color: '#000000',
    fontWeight: '800',
  },
  calendarioDiaTextoDesabilitado: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    fontVariant: ['tabular-nums'],
  },

  // Botões do sheet
  sheetSalvar: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
    elevation: 5,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  sheetSalvarDesabilitado: {
    opacity: 0.55,
  },
  sheetSalvarTexto: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  sheetCancelar: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  sheetCancelarTexto: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '700',
  },
});