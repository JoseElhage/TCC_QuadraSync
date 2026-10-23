import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import MenuInferiorAdmin from '../components/MenuInferiorAdmin';

// Mock decorativo (não interativo) do que a tela vai mostrar na etapa A3
const PREVIA_BLOQUEIOS = [
  { dia: 'Segunda-feira', horario: '08:00 às 12:00' },
  { dia: 'Quarta-feira', horario: '13:00 às 15:00' },
];

// Padrão do design system: fade + sobe
const rise = (valor) => ({
  opacity: valor,
  transform: [
    { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
  ],
});

export default function TelaAdminHorarios({
  irParaAdminReservas,
  irParaAdminPromocoes,
  irParaAdminNotificacoes,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />

        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>Horários</Text>
          <Text style={styles.headerSubtitulo}>Bloqueios recorrentes da quadra</Text>
        </View>
      </View>

      {/* Placeholder — irmão do "conteúdo", flutua sobre o azul */}
      <Animated.View style={rise(anim)}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name="construct-outline" size={11} color="#D97706" />
            <Text style={styles.badgeTexto}>Em desenvolvimento</Text>
          </View>

          <View style={styles.cardIcone}>
            <Ionicons name="time-outline" size={30} color="#1565C0" />
          </View>

          <Text style={styles.cardTitulo}>Bloqueio de horários</Text>
          <Text style={styles.cardTexto}>
            Bloqueie horários fixos por dia da semana — como as aulas de educação
            física — e as reservas já agendadas nesse período são canceladas
            automaticamente, com aviso aos alunos.
          </Text>

          {/* Prévia decorativa (não interativa) */}
          <View style={styles.previa}>
            <Text style={styles.previaRotulo}>Como vai funcionar</Text>

            {PREVIA_BLOQUEIOS.map((item) => (
              <View key={item.dia} style={styles.previaLinha}>
                <Ionicons name="lock-closed" size={13} color="#DC2626" />
                <Text style={styles.previaDia}>{item.dia}</Text>
                <View style={styles.previaChip}>
                  <Text style={styles.previaChipTexto}>{item.horario}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.cardRodape}>
            Esta funcionalidade será liberada na próxima etapa de desenvolvimento.
          </Text>
        </View>
      </Animated.View>

      {/*
        irParaAdminHorarios não é necessário aqui: a aba Horários é a
        tela ativa (item não clicável no MenuInferiorAdmin).
      */}
      <MenuInferiorAdmin
        telaAtiva="horarios"
        irParaAdminReservas={irParaAdminReservas}
        irParaAdminPromocoes={irParaAdminPromocoes}
        irParaAdminNotificacoes={irParaAdminNotificacoes}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },

  // ---------- Header ----------
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 45,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    right: -45,
    top: -60,
  },
  circuloPequeno: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    left: -30,
    bottom: -35,
  },
  headerTextos: {
    flexShrink: 1,
  },
  headerTitulo: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitulo: {
    color: '#BFDBFE',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },

  // ---------- Card placeholder ----------
  card: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 20,
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 5,
  },
  cardIcone: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardTexto: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  // Prévia decorativa
  previa: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  previaRotulo: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  previaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  previaDia: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 8,
  },
  previaChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  previaChipTexto: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },

  cardRodape: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
});