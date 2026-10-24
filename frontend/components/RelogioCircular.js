import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PainelInferior from './PainelInferior';
import CampoSeletor from './CampoSeletor';

const ITEM = 46;
const JANELA = 5;
const ALTURA_RODA = ITEM * JANELA;
const PADDING_RODA = ITEM * Math.floor(JANELA / 2);

const HORAS_DISPONIVEIS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS_DISPONIVEIS = Array.from({ length: 12 }, (_, i) => i * 5);

function vibrar(leve = true) {
  try {
    const acao = leve ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (acao && typeof acao.catch === 'function') acao.catch(() => {});
  } catch (e) {}
}

function pad2(n) { return String(n).padStart(2, '0'); }

function RodaNumerica({ dados, valorSelecionado, aoMudar }) {
  const refScroll = useRef(null);
  const indiceInicial = Math.max(0, dados.indexOf(valorSelecionado));

  useEffect(() => {
    requestAnimationFrame(() => {
      refScroll.current?.scrollTo({ y: indiceInicial * ITEM, animated: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aoFinalizarScroll = useCallback((e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const indice = Math.min(dados.length - 1, Math.max(0, Math.round(offsetY / ITEM)));
    vibrar(true);
    aoMudar(dados[indice]);
  }, [dados, aoMudar]);

  return (
    <View style={estilos.colunaRoda}>
      <View pointerEvents="none" style={estilos.destaqueRoda} />
      <ScrollView
        ref={refScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING_RODA }}
        onMomentumScrollEnd={aoFinalizarScroll}
        nestedScrollEnabled
      >
        {dados.map((valor) => {
          const selecionado = valor === valorSelecionado;
          return (
            <View key={valor} style={estilos.itemRoda}>
              <Text style={[estilos.itemTexto, selecionado && estilos.itemTextoSelecionado]}>
                {pad2(valor)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function RelogioCircular({ label, valor, aoSelecionar }) {
  const [aberto, setAberto] = useState(false);

  const [hora, minuto] = useMemo(() => {
    if (valor && /^\d{2}:\d{2}$/.test(valor)) {
      const [h, m] = valor.split(':').map(Number);
      return [h, MINUTOS_DISPONIVEIS.includes(m) ? m : 0];
    }
    const agora = new Date();
    return [agora.getHours(), Math.floor(agora.getMinutes() / 5) * 5];
  }, [valor]);

  const [horaTemp, setHoraTemp] = useState(hora);
  const [minutoTemp, setMinutoTemp] = useState(minuto);

  useEffect(() => {
    if (aberto) { setHoraTemp(hora); setMinutoTemp(minuto); }
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = useCallback(() => { vibrar(true); setAberto(true); }, []);
  const fechar = useCallback(() => setAberto(false), []);

  const confirmar = useCallback(() => {
    vibrar(false);
    aoSelecionar && aoSelecionar(`${pad2(horaTemp)}:${pad2(minutoTemp)}`);
    setAberto(false);
  }, [horaTemp, minutoTemp, aoSelecionar]);

  const usarAgora = useCallback(() => {
    vibrar(false);
    const agora = new Date();
    setHoraTemp(agora.getHours());
    setMinutoTemp(Math.round(agora.getMinutes() / 5) * 5 % 60);
  }, []);

  return (
    <>
      <CampoSeletor
        label={label}
        icone="time-outline"
        valor={valor}
        placeholder="Selecionar horário"
        aoPressionar={abrir}
      />

      <PainelInferior
        visivel={aberto}
        titulo="Selecionar Horário"
        icone="time-outline"
        aoFechar={fechar}
        maxHeight="60%"
        alturaDesejada={60 + ALTURA_RODA + 90}
        rodape={
          <Pressable style={estilos.botaoConcluir} onPress={confirmar}>
            <Text style={estilos.botaoConcluirTexto}>Concluir</Text>
          </Pressable>
        }
      >
        <View style={estilos.conteudoRelogio}>
          <Pressable style={estilos.botaoAgora} onPress={usarAgora}>
            <Ionicons name="flash-outline" size={14} color="#4CAF50" />
            <Text style={estilos.botaoAgoraTexto}>Agora</Text>
          </Pressable>

          <View style={estilos.linhaRodas}>
            <RodaNumerica dados={HORAS_DISPONIVEIS} valorSelecionado={horaTemp} aoMudar={setHoraTemp} />
            <Text style={estilos.separador}>:</Text>
            <RodaNumerica dados={MINUTOS_DISPONIVEIS} valorSelecionado={minutoTemp} aoMudar={setMinutoTemp} />
          </View>
        </View>
      </PainelInferior>
    </>
  );
}

const estilos = StyleSheet.create({
  conteudoRelogio: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  botaoAgora: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#2A2A2A',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 10,
  },
  botaoAgoraTexto: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },

  linhaRodas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ALTURA_RODA },
  colunaRoda: { flex: 1, maxWidth: 120, height: ALTURA_RODA },
  destaqueRoda: {
    position: 'absolute', top: PADDING_RODA, left: 0, right: 0, height: ITEM,
    backgroundColor: '#1a2a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2A3A2A',
  },
  itemRoda: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  itemTexto: { color: '#555', fontSize: 20, fontWeight: '600' },
  itemTextoSelecionado: { color: '#fff', fontSize: 24, fontWeight: '800' },
  separador: { color: '#fff', fontSize: 24, fontWeight: '800', width: 20, textAlign: 'center' },

  botaoConcluir: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botaoConcluirTexto: { color: '#000', fontWeight: '800', fontSize: 15 },
});