import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================
// POPUP PERSONALIZADO DO APP (substitui o Alert.alert nativo)
//
// Uso — tema do app (azul):
//   import { mostrarAlerta } from '../components/AlertaGlobal';
//   mostrarAlerta('Atenção', 'Preencha todos os campos.', null, 'aviso');
//
// Uso — tema ETEC League (preto + verde):
//   import { mostrarAlertaLeague } from '../components/AlertaGlobal';
//   mostrarAlertaLeague('Remover equipe', 'Tem certeza?', [
//     { text: 'Manter' },
//     { text: 'Remover', style: 'destructive', onPress: removerEquipe },
//   ], 'aviso');
//
// Assinatura: (titulo, mensagem, botoes, tipo)
//   botoes: array de { text, onPress?, style? } — ou null (mostra "OK")
//     * o ÚLTIMO botão do array é o destacado (cheio);
//       os anteriores ficam outline
//     * style: 'destructive' pinta o destacado de vermelho
//   tipo: 'info' | 'sucesso' | 'aviso' | 'erro' (cor do selo)
//
// O componente <AlertaGlobal /> fica montado no App.js — é ele
// quem desenha o popup na tela. As funções apenas "enviam" o pedido.
// ============================================================

// ------------ Ponte entre as funções e o componente ------------
let listener = null;

export const mostrarAlerta = (titulo, mensagem, botoes = null, tipo = 'info') => {
  if (listener) listener({ titulo, mensagem, botoes, tipo, tema: 'app' });
};

export const mostrarAlertaLeague = (titulo, mensagem, botoes = null, tipo = 'info') => {
  if (listener) listener({ titulo, mensagem, botoes, tipo, tema: 'league' });
};

const registrarListener = (resolver) => {
  listener = resolver;

  return () => {
    listener = null;
  };
};

// ------------ Paletas (edite aqui pra refinar os temas) ------------
const TEMAS = {
  app: {
    overlay: 'rgba(15, 23, 42, 0.55)',
    fundo: '#FFFFFF',
    borda: '#E8EDF5',
    titulo: '#0F172A',
    mensagem: '#64748B',
    decor1: 'rgba(21, 101, 192, 0.05)',
    decor2: 'rgba(21, 101, 192, 0.09)',
    botao: '#1565C0',
    botaoTexto: '#FFFFFF',
    outlineBorda: '#C9DAEF',
    outlineTexto: '#1565C0',
    perigo: '#DC2626',
    perigoTexto: '#FFFFFF',
    selo: {
      info: '#1565C0',
      sucesso: '#059669',
      aviso: '#D97706',
      erro: '#DC2626',
    },
  },
  league: {
    overlay: 'rgba(0, 0, 0, 0.65)',
    fundo: '#0D0D0D',
    borda: '#2A2A2A',
    titulo: '#FFFFFF',
    mensagem: '#AAAAAA',
    decor1: 'rgba(76, 175, 80, 0.07)',
    decor2: 'rgba(76, 175, 80, 0.05)',
    botao: '#4CAF50',
    botaoTexto: '#0A0A0A',
    outlineBorda: '#2A2A2A',
    outlineTexto: '#4CAF50',
    perigo: '#DC2626',
    perigoTexto: '#FFFFFF',
    selo: {
      info: '#4CAF50',
      sucesso: '#4CAF50',
      aviso: '#F59E0B',
      erro: '#DC2626',
    },
  },
};

const ICONES = {
  info: 'information-circle',
  sucesso: 'checkmark-circle',
  aviso: 'warning',
  erro: 'alert-circle',
};

export default function AlertaGlobal() {
  const [alerta, setAlerta] = useState(null);
  const entrada = useRef(new Animated.Value(0)).current;
  const fechando = useRef(false);

  useEffect(() => registrarListener(setAlerta), []);

  // Entrada: overlay em fade + card nascendo (escala + fade)
  useEffect(() => {
    if (alerta) {
      entrada.setValue(0);

      Animated.timing(entrada, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [alerta]);

  // Saída rápida — o callback do botão roda DEPOIS de fechar
  const fechar = (botao) => {
    if (fechando.current) return;

    fechando.current = true;

    Animated.timing(entrada, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      fechando.current = false;

      if (finished) {
        setAlerta(null);

        if (botao && typeof botao.onPress === 'function') {
          botao.onPress();
        }
      }
    });
  };

  if (!alerta) return null;

  const tema = TEMAS[alerta.tema] || TEMAS.app;
  const tipo = alerta.tipo && ICONES[alerta.tipo] ? alerta.tipo : 'info';
  const botoes = alerta.botoes && alerta.botoes.length > 0 ? alerta.botoes : [{ text: 'OK' }];

  const escalaCard = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => fechar(null)}
    >
      <View style={styles.overlayWrap}>
        <Animated.View
          style={[styles.overlay, { backgroundColor: tema.overlay, opacity: entrada }]}
        />

        <View style={styles.centro}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: tema.fundo,
                borderColor: tema.borda,
                opacity: entrada,
                transform: [{ scale: escalaCard }],
              },
            ]}
          >
            {/* Decoração — mesma família dos cartões do app */}
            <View style={[styles.decor1, { backgroundColor: tema.decor1 }]} />
            <View style={[styles.decor2, { borderColor: tema.decor2 }]} />

            <View style={[styles.selo, { backgroundColor: tema.selo[tipo] }]}>
              <Ionicons name={ICONES[tipo]} size={26} color="#FFFFFF" />
            </View>

            <Text style={[styles.titulo, { color: tema.titulo }]}>{alerta.titulo}</Text>

            {alerta.mensagem ? (
              <Text style={[styles.mensagem, { color: tema.mensagem }]}>{alerta.mensagem}</Text>
            ) : null}

            <View style={styles.botoes}>
              {botoes.map((botao, indice) => {
                const destacado = indice === botoes.length - 1;
                const perigoso = botao.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={String(botao.text)}
                    activeOpacity={0.8}
                    onPress={() => fechar(botao)}
                    style={[
                      styles.botao,
                      destacado ? styles.botaoDestacado : styles.botaoOutline,
                      destacado && { borderColor: tema.botao },
                      !destacado && { borderColor: tema.outlineBorda },
                      destacado && {
                        backgroundColor: perigoso ? tema.perigo : tema.botao,
                        shadowColor: perigoso ? tema.perigo : tema.botao,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.botaoTexto,
                        {
                          color: destacado
                            ? (perigoso ? tema.perigoTexto : tema.botaoTexto)
                            : tema.outlineTexto,
                        },
                      ]}
                    >
                      {botao.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayWrap: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  // ---- Card (espaço pré-definido do popup) ----
  card: {
    width: '100%',
    maxWidth: 330,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    paddingTop: 24,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  decor1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 999,
    right: -50,
    top: -50,
  },
  decor2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    borderWidth: 1.5,
    left: -35,
    bottom: -35,
  },
  selo: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  mensagem: {
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
    paddingHorizontal: 4,
  },

  // ---- Botões ----
  botoes: {
    alignSelf: 'stretch',
    marginTop: 20,
    gap: 9,
  },
  botao: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDestacado: {
    elevation: 4,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
  },
  botaoOutline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  botaoTexto: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});