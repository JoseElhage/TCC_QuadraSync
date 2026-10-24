import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';

export default function TelaSplash({ irParaBoasVindas }) {
  // ------------------------------------------------------------
  // Lógica de navegação (intacta): 2s e segue para as Boas-vindas
  // ------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      irParaBoasVindas();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // ------------------------------------------------------------
  // Animações de entrada: logo (fade + zoom) em cascata até o rodapé
  // ------------------------------------------------------------
  const logoAnim = useRef(new Animated.Value(0)).current;
  const nomeAnim = useRef(new Animated.Value(0)).current;
  const divisorAnim = useRef(new Animated.Value(0)).current;
  const rodapeAnim = useRef(new Animated.Value(0)).current;

  // Pontinhos do divisor: cada um com seu pulso de opacidade
  const pulso1 = useRef(new Animated.Value(0.35)).current;
  const pulso2 = useRef(new Animated.Value(0.35)).current;
  const pulso3 = useRef(new Animated.Value(0.35)).current;
  const pulsos = [pulso1, pulso2, pulso3];

  useEffect(() => {
    const animacoes = [];

    animacoes.push(
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    animacoes.push(
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(nomeAnim, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    animacoes.push(
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(divisorAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    animacoes.push(
      Animated.sequence([
        Animated.delay(760),
        Animated.timing(rodapeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulso contínuo dos pontinhos (um começando após o outro)
    pulsos.forEach((pulso, indice) => {
      animacoes.push(
        Animated.sequence([
          Animated.delay(700 + indice * 220),
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulso, {
                toValue: 1,
                duration: 380,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(pulso, {
                toValue: 0.35,
                duration: 380,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
              }),
            ])
          ),
        ])
      );
    });

    animacoes.forEach((animacao) => animacao.start());

    return () => animacoes.forEach((animacao) => animacao.stop());
  }, []);

  const estiloLogo = {
    opacity: logoAnim,
    transform: [
      { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) },
    ],
  };

  const estiloNome = {
    opacity: nomeAnim,
    transform: [
      { translateY: nomeAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    ],
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#0D47A1" />

      {/* Decorações de fundo */}
      <View style={styles.circuloTopo} />
      <View style={styles.circuloBaixo} />
      <View style={styles.circuloPequeno} />

      <View style={styles.conteudo}>
        <Animated.Image
          source={require('../assets/QuadraSync_SemNome-Photoroom.png')}
          style={[styles.logo, estiloLogo]}
          resizeMode="contain"
        />

        <Animated.View style={estiloNome}>
          <Text style={styles.nome}>QuadraSync</Text>
        </Animated.View>

        <Animated.View style={[styles.divisor, { opacity: divisorAnim }]}>
          <Animated.View style={[styles.ponto, { opacity: pulso1 }]} />
          <Animated.View style={[styles.ponto, styles.pontoEspaco, { opacity: pulso2 }]} />
          <Animated.View style={[styles.ponto, styles.pontoEspaco, { opacity: pulso3 }]} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.rodape, { opacity: rodapeAnim }]}>
        <Text style={styles.rodapeTexto}>ETEC Profª Ilza Nascimento Pintus</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Decorações de fundo (círculos translúcidos)
  circuloTopo: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  circuloBaixo: {
    position: 'absolute',
    bottom: -90,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circuloPequeno: {
    position: 'absolute',
    top: 120,
    left: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  conteudo: {
    alignItems: 'center',
  },

  logo: {
    width: 600,
    height: 600,
    marginBottom: 20,
  },

  nome: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(3, 35, 82, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },

  divisor: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  pontoEspaco: {
    marginLeft: 14,
  },

  rodape: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rodapeTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.4,
  },
});