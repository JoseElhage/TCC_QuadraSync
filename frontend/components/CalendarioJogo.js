import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PainelInferior from './PainelInferior';
import CampoSeletor from './CampoSeletor';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ALTURA_CELULA = 42;

function vibrar(leve = true) {
  try {
    const acao = leve ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (acao && typeof acao.catch === 'function') acao.catch(() => {});
  } catch (e) {}
}

function pad2(n) { return String(n).padStart(2, '0'); }
function formatarAAAAMMDD(ano, mes, dia) { return `${ano}-${pad2(mes + 1)}-${pad2(dia)}`; }
function formatarExibicao(valorISO) {
  const [a, m, d] = valorISO.split('-');
  return `${d}/${m}/${a}`;
}

function gerarGrade(ano, mes) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= totalDiasMes; dia++) celulas.push(dia);
  while (celulas.length % 7 !== 0) celulas.push(null);
  const linhas = [];
  for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
  return linhas;
}

export default function CalendarioJogo({ label, valor, aoSelecionar }) {
  const [aberto, setAberto] = useState(false);

  const dataSelecionada = useMemo(() => {
    if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [a, m, d] = valor.split('-').map(Number);
      return { ano: a, mes: m - 1, dia: d };
    }
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth(), dia: hoje.getDate() };
  }, [valor]);

  const [mesVisivel, setMesVisivel] = useState(dataSelecionada.mes);
  const [anoVisivel, setAnoVisivel] = useState(dataSelecionada.ano);
  const translateXGrid = useRef(new Animated.Value(0)).current;

  const abrir = useCallback(() => {
    vibrar(true);
    setMesVisivel(dataSelecionada.mes);
    setAnoVisivel(dataSelecionada.ano);
    setAberto(true);
  }, [dataSelecionada]);

  const fechar = useCallback(() => setAberto(false), []);

  const deslizarPara = useCallback((direcao) => {
    translateXGrid.setValue(direcao * 24);
    Animated.timing(translateXGrid, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [translateXGrid]);

  const mudarMes = useCallback((delta) => {
    vibrar(true);
    let novoMes = mesVisivel + delta;
    let novoAno = anoVisivel;
    if (novoMes > 11) { novoMes = 0; novoAno += 1; }
    if (novoMes < 0) { novoMes = 11; novoAno -= 1; }
    setMesVisivel(novoMes);
    setAnoVisivel(novoAno);
    deslizarPara(delta > 0 ? 1 : -1);
  }, [mesVisivel, anoVisivel, deslizarPara]);

  const pularAno = useCallback((delta) => {
    vibrar(false);
    setAnoVisivel((a) => a + delta);
    deslizarPara(delta > 0 ? 1 : -1);
  }, [deslizarPara]);

  const selecionarDia = useCallback((dia) => {
    if (!dia) return;
    vibrar(true);
    aoSelecionar && aoSelecionar(formatarAAAAMMDD(anoVisivel, mesVisivel, dia));
    setAberto(false);
  }, [anoVisivel, mesVisivel, aoSelecionar]);

  const irParaHoje = useCallback(() => {
    vibrar(false);
    const hoje = new Date();
    aoSelecionar && aoSelecionar(formatarAAAAMMDD(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    setAberto(false);
  }, [aoSelecionar]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -30) mudarMes(1);
        else if (g.dx >= 30) mudarMes(-1);
      },
    })
  ).current;

  const linhas = useMemo(() => gerarGrade(anoVisivel, mesVisivel), [anoVisivel, mesVisivel]);

  const ehHoje = useCallback((dia) => {
    const hoje = new Date();
    return dia === hoje.getDate() && mesVisivel === hoje.getMonth() && anoVisivel === hoje.getFullYear();
  }, [mesVisivel, anoVisivel]);

  const ehSelecionado = useCallback((dia) =>
    dia === dataSelecionada.dia && mesVisivel === dataSelecionada.mes && anoVisivel === dataSelecionada.ano,
  [dataSelecionada, mesVisivel, anoVisivel]);

  return (
    <>
      <CampoSeletor
        label={label}
        icone="calendar-outline"
        valor={valor ? formatarExibicao(valor) : null}
        placeholder="Selecionar data"
        aoPressionar={abrir}
      />

      <PainelInferior
        visivel={aberto}
        titulo="Selecionar Data"
        icone="calendar-outline"
        aoFechar={fechar}
        maxHeight="68%"
        alturaDesejada={60 + 44 + 30 + ALTURA_CELULA * 6 + 70}
        rodape={
          <Pressable style={estilos.botaoHoje} onPress={irParaHoje}>
            <Ionicons name="today-outline" size={16} color="#000" />
            <Text style={estilos.botaoHojeTexto}>Hoje</Text>
          </Pressable>
        }
      >
        <View style={estilos.conteudo}>
          <View style={estilos.navegacao}>
            <Pressable onPress={() => mudarMes(-1)} onLongPress={() => pularAno(-1)} delayLongPress={380} hitSlop={10} style={estilos.botaoNav}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>

            <Text style={estilos.tituloMes} numberOfLines={1}>{MESES[mesVisivel]} {anoVisivel}</Text>

            <Pressable onPress={() => mudarMes(1)} onLongPress={() => pularAno(1)} delayLongPress={380} hitSlop={10} style={estilos.botaoNav}>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={estilos.linhaSemana}>
            {DIAS_SEMANA.map((d, i) => (
              <View key={i} style={estilos.celulaCabecalho}>
                <Text style={estilos.textoCabecalho}>{d}</Text>
              </View>
            ))}
          </View>

          <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX: translateXGrid }] }}>
            {linhas.map((linha, indiceLinha) => (
              <View key={indiceLinha} style={estilos.linhaGrid}>
                {linha.map((dia, indiceDia) => {
                  if (!dia) return <View key={indiceDia} style={estilos.celulaDia} />;
                  const selecionado = ehSelecionado(dia);
                  const hoje = ehHoje(dia);
                  return (
                    <Pressable key={indiceDia} style={estilos.celulaDia} onPress={() => selecionarDia(dia)}>
                      <View style={[estilos.bolhaDia, hoje && estilos.bolhaHoje, selecionado && estilos.bolhaSelecionada]}>
                        <Text style={[estilos.textoDia, hoje && estilos.textoHoje, selecionado && estilos.textoSelecionado]}>
                          {dia}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        </View>
      </PainelInferior>
    </>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
  navegacao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  botaoNav: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },
  tituloMes: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' },

  linhaSemana: { flexDirection: 'row', marginBottom: 4 },
  celulaCabecalho: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  textoCabecalho: { color: '#666', fontSize: 11, fontWeight: '700' },

  linhaGrid: { flexDirection: 'row' },
  celulaDia: { flex: 1, height: ALTURA_CELULA, alignItems: 'center', justifyContent: 'center' },
  bolhaDia: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bolhaHoje: { borderWidth: 1, borderColor: '#4CAF50' },
  bolhaSelecionada: { backgroundColor: '#4CAF50' },
  textoDia: { color: '#ccc', fontSize: 13 },
  textoHoje: { color: '#4CAF50', fontWeight: '700' },
  textoSelecionado: { color: '#000', fontWeight: '800' },

  botaoHoje: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 12,
  },
  botaoHojeTexto: { color: '#000', fontWeight: '800', fontSize: 14 },
});