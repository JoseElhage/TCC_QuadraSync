import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PainelInferior from './PainelInferior';
import { dividirEmLinhas, numeroColunasResponsivo } from '../utils/grade';

function vibrar() {
  try {
    const acao = Haptics.selectionAsync();
    if (acao && typeof acao.catch === 'function') acao.catch(() => {});
  } catch (e) {}
}

function normalizar(texto = '') {
  return texto.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Extrai uma chave estável pra cada equipe, com fallback em cascata.
// Protege contra: API usando "_id" em vez de "id", itens sem id nenhum,
// ou (pior caso) ids duplicados — qualquer um desses cenários causava
// o aviso "Each child in a list should have a unique key prop".
function obterChaveEquipe(equipe, indiceFallback) {
  if (equipe && equipe.id !== undefined && equipe.id !== null) return String(equipe.id);
  if (equipe && equipe._id !== undefined && equipe._id !== null) return String(equipe._id);
  return `indice-${indiceFallback}`;
}

function equipesIguais(a, b) {
  if (!a || !b) return false;
  return obterChaveEquipe(a, -1) === obterChaveEquipe(b, -2) && obterChaveEquipe(a, -1) !== 'indice--1';
}

const ALTURA_CARD = 92;
const ESPACO_GRID = 10;

export default function SeletorConfronto({ equipes = [], equipe1, equipe2, aoEscolher1, aoEscolher2 }) {
  const { width: larguraTela } = useWindowDimensions();
  const [painelAberto, setPainelAberto] = useState(null); // null | 'equipe1' | 'equipe2'
  const [busca, setBusca] = useState('');
  const posicaoScroll = useRef({ equipe1: 0, equipe2: 0 });
  const refLista = useRef(null);

  const numColunas = numeroColunasResponsivo(larguraTela);

  // equipes com chave já resolvida, calculada uma única vez
  const equipesComChave = useMemo(
    () => equipes.map((e, i) => ({ ...e, _chave: obterChaveEquipe(e, i) })),
    [equipes]
  );

  const equipesOrdenadas = useMemo(
    () => [...equipesComChave].sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome))),
    [equipesComChave]
  );

  const equipesFiltradas = useMemo(() => {
    if (!busca.trim()) return equipesOrdenadas;
    const alvo = normalizar(busca);
    return equipesOrdenadas.filter((e) => normalizar(e.nome).includes(alvo));
  }, [equipesOrdenadas, busca]);

  const temBusca = equipesOrdenadas.length > 5;

  const linhas = useMemo(
    () => dividirEmLinhas(equipesFiltradas, numColunas),
    [equipesFiltradas, numColunas]
  );

  const alturaDesejada = useMemo(() => {
    const numLinhasVisiveis = Math.min(linhas.length || 1, 3);
    const alturaGrid = numLinhasVisiveis * ALTURA_CARD + (numLinhasVisiveis - 1) * ESPACO_GRID + 20;
    return 64 + (temBusca ? 58 : 0) + alturaGrid + 16;
  }, [linhas.length, temBusca]);

  const abrirPainel = useCallback((slot) => {
    vibrar();
    setBusca('');
    setPainelAberto(slot);
    requestAnimationFrame(() => {
      refLista.current?.scrollToOffset({ offset: posicaoScroll.current[slot] || 0, animated: false });
    });
  }, []);

  const fecharPainel = useCallback(() => setPainelAberto(null), []);

  const escolher = useCallback(
    (equipe) => {
      vibrar();
      if (painelAberto === 'equipe1') aoEscolher1 && aoEscolher1(equipe);
      if (painelAberto === 'equipe2') aoEscolher2 && aoEscolher2(equipe);
      setPainelAberto(null);
    },
    [painelAberto, aoEscolher1, aoEscolher2]
  );

  const renderLinha = ({ item: linha }) => (
    <View style={estilos.linhaGrid}>
      {linha.map((equipe) => {
        const selecionada =
          painelAberto === 'equipe1' ? equipesIguais(equipe1, equipe) : equipesIguais(equipe2, equipe);
        return (
          <Pressable
            key={equipe._chave}
            onPress={() => escolher(equipe)}
            style={({ pressed }) => [
              estilos.card,
              selecionada && estilos.cardSelecionado,
              pressed && estilos.cardPressionado,
            ]}
          >
            {selecionada && (
              <View style={estilos.badgeCheck}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            )}
            {equipe.logo ? (
              <Image source={{ uri: equipe.logo }} style={estilos.logo} />
            ) : (
              <View style={estilos.logoPlaceholder}>
                <Ionicons name="shield-outline" size={20} color="#555" />
              </View>
            )}
            <Text style={estilos.cardTexto} numberOfLines={2} ellipsizeMode="tail">
              {equipe.nome}
            </Text>
          </Pressable>
        );
      })}
      {linha.length < numColunas &&
        Array.from({ length: numColunas - linha.length }).map((_, i) => (
          <View key={`vazio-${i}`} style={estilos.cardVazio} />
        ))}
    </View>
  );

  return (
    <View>
      <View style={estilos.linha}>
        <Pressable style={estilos.campo} onPress={() => abrirPainel('equipe1')}>
          <Text style={estilos.campoLabel} numberOfLines={1}>Equipe 1</Text>
          <Text style={estilos.campoValor} numberOfLines={1} ellipsizeMode="tail">
            {equipe1?.nome || 'Selecionar'}
          </Text>
        </Pressable>

        <View style={estilos.vsBox}>
          <Text style={estilos.vsTexto}>VS</Text>
        </View>

        <Pressable style={estilos.campo} onPress={() => abrirPainel('equipe2')}>
          <Text style={estilos.campoLabel} numberOfLines={1}>Equipe 2</Text>
          <Text style={estilos.campoValor} numberOfLines={1} ellipsizeMode="tail">
            {equipe2?.nome || 'Selecionar'}
          </Text>
        </Pressable>
      </View>

      {/*
        PainelInferior é quem implementa o "arrastar pra baixo pra fechar"
        (handle + header com PanResponder) — exatamente o mesmo componente
        usado por RelogioCircular e CalendarioJogo. Se o gesto não fechar
        aqui, o app não está usando este arquivo.
      */}
      <PainelInferior
        visivel={painelAberto !== null}
        titulo={`Selecionar Equipe (${equipesOrdenadas.length})`}
        icone="people-outline"
        aoFechar={fecharPainel}
        maxHeight="66%"
        alturaDesejada={alturaDesejada}
      >
        {temBusca && (
          <View style={estilos.buscaBox}>
            <Ionicons name="search" size={16} color="#666" style={{ marginRight: 6 }} />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar equipe..."
              placeholderTextColor="#555"
              style={estilos.buscaInput}
              autoCorrect={false}
            />
            {busca.length > 0 && (
              <Pressable onPress={() => setBusca('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#666" />
              </Pressable>
            )}
          </View>
        )}

        {linhas.length === 0 ? (
          <View style={estilos.vazio}>
            <Ionicons name="alert-circle-outline" size={28} color="#444" />
            <Text style={estilos.vazioTexto}>Nenhuma equipe encontrada</Text>
          </View>
        ) : (
          <FlatList
            ref={refLista}
            data={linhas}
            keyExtractor={(linha, i) => (linha[0] ? `linha-${linha[0]._chave}` : `linha-${i}`)}
            renderItem={renderLinha}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}
            onScroll={(e) => {
              if (painelAberto) posicaoScroll.current[painelAberto] = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={32}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </PainelInferior>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  campo: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  campoLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  campoValor: { color: '#fff', fontSize: 14, fontWeight: '600' },
  vsBox: { paddingHorizontal: 4 },
  vsTexto: { color: '#4CAF50', fontWeight: '800', fontSize: 13 },

  buscaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    height: 40,
  },
  buscaInput: { flex: 1, minWidth: 0, color: '#fff', fontSize: 14, height: '100%' },

  linhaGrid: { flexDirection: 'row', gap: ESPACO_GRID, marginBottom: ESPACO_GRID },
  card: {
    flex: 1,
    minWidth: 0,
    height: ALTURA_CARD,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  cardVazio: { flex: 1 },
  cardSelecionado: { borderColor: '#4CAF50', backgroundColor: '#132313' },
  cardPressionado: { backgroundColor: '#1a1a1a' },
  badgeCheck: { position: 'absolute', top: 6, right: 6 },
  logo: { width: 32, height: 32, borderRadius: 16, marginBottom: 6 },
  logoPlaceholder: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#1d1d1d',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  cardTexto: { color: '#fff', fontSize: 11, textAlign: 'center', lineHeight: 14 },

  vazio: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  vazioTexto: { color: '#555', fontSize: 13 },
});