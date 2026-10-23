import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// Recursos do app apresentados em chips
const RECURSOS = [
  { icone: 'calendar-outline', rotulo: 'Reservas' },
  { icone: 'trophy-outline', rotulo: 'ETEC League' },
  { icone: 'notifications-outline', rotulo: 'Avisos' },
];

// Padrão do design system: fade + sobe
const rise = (valor) => ({
  opacity: valor,
  transform: [
    { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
  ],
});

export default function TelaBoasVindas({ irParaLogin, irParaCadastro }) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const tituloAnim = useRef(new Animated.Value(0)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;
  const recursosAnim = useRef(new Animated.Value(0)).current;
  const botoesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo primeiro (fade + zoom leve)
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Depois o restante em cascata
      Animated.stagger(90, [
        Animated.timing(tituloAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sloganAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(recursosAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(botoesAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const estiloLogo = {
    opacity: logoAnim,
    transform: [
      { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden barStyle="dark-content" backgroundColor="#F3F5F9" />

      {/* Decorações de fundo */}
      <View style={styles.circuloTopo} />
      <View style={styles.circuloBaixo} />

      <View style={styles.conteudo}>
        <Animated.Image
          source={require('../assets/QuadraSync_SemNome-Photoroom.png')}
          style={[styles.logo, estiloLogo]}
          resizeMode="contain"
        />

        <Animated.View style={rise(tituloAnim)}>
          <Text style={styles.titulo}>QuadraSync</Text>
        </Animated.View>

        <Animated.View style={rise(sloganAnim)}>
          <Text style={styles.slogan}>Seu aplicativo de reservas de quadras</Text>
        </Animated.View>

      </View>

      <Animated.View style={rise(botoesAnim)}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={irParaLogin}
          style={styles.botaoPrimario}
        >
          <Ionicons name="log-in-outline" size={19} color="#FFFFFF" />
          <Text style={styles.botaoPrimarioTexto}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={irParaCadastro}
          style={styles.botaoSecundario}
        >
          <Ionicons name="person-add-outline" size={19} color="#1565C0" />
          <Text style={styles.botaoSecundarioTexto}>Criar conta</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
    paddingHorizontal: 28,
    paddingTop: 46,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },

  // Decorações de fundo
  circuloTopo: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
  },
  circuloBaixo: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(21, 101, 192, 0.06)',
  },

  // Conteúdo central
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 400,
    height: 400,
    marginBottom: -80,
  },

  titulo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  slogan: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },

  // Chips de recursos
  recursos: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  recurso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recursoEspaco: {
    marginLeft: 8,
  },
  recursoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 6,
  },

  // Botões
  botaoPrimario: {
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  botaoPrimarioTexto: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    marginLeft: 8,
  },

  botaoSecundario: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1565C0',
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  botaoSecundarioTexto: {
    color: '#1565C0',
    fontSize: 15.5,
    fontWeight: '700',
    marginLeft: 8,
  },
});