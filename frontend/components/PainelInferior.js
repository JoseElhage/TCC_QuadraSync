import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Animated, PanResponder,
  TouchableWithoutFeedback, Pressable, LayoutAnimation, Platform, UIManager, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function vibrar() {
  try {
    const acao = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (acao && typeof acao.catch === 'function') acao.catch(() => {});
  } catch (e) {}
}

export default function PainelInferior({
  visivel, titulo, icone, aoFechar, children, rodape,
  maxHeight = '82%', alturaDesejada, alturaMinima = 260,
}) {
  const { height: alturaJanela } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const alturaMaximaPorcentagem =
    typeof maxHeight === 'string'
      ? alturaJanela * (parseFloat(maxHeight) / 100)
      : maxHeight;

  // nunca deixa o painel invadir a área do notch/status bar
  const alturaMaximaSegura = alturaJanela - insets.top - 24;
  const alturaMaximaPx = Math.min(alturaMaximaPorcentagem, alturaMaximaSegura);

  const alturaSheet = alturaDesejada
    ? Math.min(Math.max(alturaDesejada, alturaMinima), alturaMaximaPx)
    : alturaMaximaPx;

  const [montado, setMontado] = useState(visivel);
  const translateY = useRef(new Animated.Value(alturaJanela)).current;
  const opacidade = useRef(new Animated.Value(0)).current;
  const estadoRef = useRef('fechado');

  useEffect(() => {
    if (montado && estadoRef.current === 'aberto') {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleY)
      );
    }
  }, [alturaDesejada]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visivel) {
      setMontado(true);
      estadoRef.current = 'abrindo';
      translateY.setValue(alturaJanela);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => { estadoRef.current = 'aberto'; });
    } else if (estadoRef.current !== 'fechado') {
      estadoRef.current = 'fechando';
      Animated.parallel([
        Animated.timing(translateY, { toValue: alturaJanela, duration: 220, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        if (estadoRef.current === 'fechando') { estadoRef.current = 'fechado'; setMontado(false); }
      });
    }
  }, [visivel]); // eslint-disable-line react-hooks/exhaustive-deps

  const fecharComGesto = () => {
    estadoRef.current = 'fechando';
    Animated.parallel([
      Animated.timing(translateY, { toValue: alturaJanela, duration: 200, useNativeDriver: true }),
      Animated.timing(opacidade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      estadoRef.current = 'fechado';
      setMontado(false);
      aoFechar && aoFechar();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > alturaSheet * 0.28 || g.vy > 0.8) { vibrar(); fecharComGesto(); }
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
    })
  ).current;

  if (!montado) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => aoFechar && aoFechar()}>
      <View style={estilos.wrapper}>
        <TouchableWithoutFeedback onPress={() => aoFechar && aoFechar()}>
          <Animated.View style={[estilos.backdrop, { opacity: opacidade }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[estilos.sheet, { height: alturaSheet, paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers}>
            <View style={estilos.handleArea}>
              <View style={estilos.handle} />
            </View>
            <View style={estilos.header}>
              <View style={estilos.headerEsquerda}>
                {icone ? <Ionicons name={icone} size={18} color="#4CAF50" style={{ marginRight: 8 }} /> : null}
                <Text style={estilos.titulo} numberOfLines={1} ellipsizeMode="tail">{titulo}</Text>
              </View>
              <Pressable onPress={() => aoFechar && aoFechar()} hitSlop={10}>
                <Ionicons name="close" size={22} color="#888" />
              </Pressable>
            </View>
          </View>

          <View style={estilos.conteudo}>{children}</View>

          {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#333' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  headerEsquerda: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  titulo: { flexShrink: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  conteudo: { flex: 1 },
  rodape: { borderTopWidth: 1, borderTopColor: '#2A2A2A', padding: 12 },
});