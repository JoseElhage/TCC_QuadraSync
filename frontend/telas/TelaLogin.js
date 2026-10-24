import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import { mostrarAlerta } from '../components/AlertaGlobal';

// ============================================================
// COMPONENTE INTERNO — campo de texto padronizado do app
// ============================================================
function CampoTexto({
  label,
  icone,
  placeholder,
  valor,
  aoMudar,
  nomeCampo,
  campoFocado,
  aoFocar,
  aoDesfocar,
  teclado,
  autoCapitalizacao,
  seguro,
  semCorrecao,
  acaoDireita,
  dica,
}) {
  const ativo = campoFocado === nomeCampo;

  return (
    <View style={styles.campoWrap}>
      <Text style={styles.campoLabel}>{label}</Text>

      <View style={[styles.campoInput, ativo && styles.campoInputAtivo]}>
        <Ionicons
          name={icone}
          size={18}
          color={ativo ? '#1565C0' : '#94A3B8'}
          style={styles.campoIcone}
        />
        <TextInput
          style={styles.campoTexto}
          placeholder={placeholder}
          placeholderTextColor="#A8B3C4"
          value={valor}
          onChangeText={aoMudar}
          onFocus={aoFocar}
          onBlur={aoDesfocar}
          keyboardType={teclado}
          autoCapitalize={autoCapitalizacao}
          autoCorrect={semCorrecao ? false : undefined}
          secureTextEntry={seguro}
        />
        {acaoDireita}
      </View>

      {dica ? <Text style={styles.campoDica}>{dica}</Text> : null}
    </View>
  );
}

export default function TelaLogin({ irParaCadastro, irParaBoasVindas, aoLogar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Qual campo está focado (apenas efeito visual da borda/ícone)
  const [focado, setFocado] = useState(null);

  // ===== Animações de entrada =====
  const entradaHeader = useRef(new Animated.Value(0)).current;
  const entradaCartao = useRef(new Animated.Value(0)).current;
  const entradaRodape = useRef(new Animated.Value(0)).current;
  const entradaFundo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entradaHeader, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.timing(entradaCartao, {
      toValue: 1,
      duration: 520,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(entradaRodape, {
      toValue: 1,
      duration: 520,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Fundo aparece por último, bem devagar
    Animated.timing(entradaFundo, {
      toValue: 1,
      duration: 900,
      delay: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  // Logo "respirando" devagar — quase imperceptível, só dá vida
  const respirar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(respirar, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(respirar, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [respirar]);

  const escalaLogo = respirar.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  const rise = (valor) => ({
    opacity: valor,
    transform: [{ translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  // ============================================================
  // LÓGICA DE LOGIN
  // ============================================================
  const handleLogin = async () => {
    if (!email.trim() || !senha) {
      mostrarAlerta('Atenção', 'Preencha todos os campos.', null, 'aviso');
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(API_URL + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta(
          'Não foi possível entrar',
          dados.message || 'Verifique seu e-mail e senha e tente novamente.',
          null,
          'erro'
        );
        return;
      }

      aoLogar({ token: dados.token, usuario: dados.usuario });
    } catch (error) {
      console.error('Erro no login:', error);

      mostrarAlerta(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está conectado à mesma rede Wi-Fi do computador.',
        null,
        'erro'
      );
    } finally {
      setCarregando(false);
    }
  };

  const esqueciSenha = () => {
    mostrarAlerta(
      'Esqueci minha senha',
      'Procure o administrador da quadra para recuperar seu acesso.',
      null,
      'info'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      {/* ==================== FUNDO DECORADO ==================== */}
      <Animated.View style={[styles.fundoDecor, { opacity: entradaFundo }]}>
        <View style={styles.fundoBlob1} />
        <View style={styles.fundoAnel} />
        <View style={styles.fundoBlob2} />
        <View style={styles.fundoPonto1} />
        <View style={styles.fundoPonto2} />
        <View style={styles.fundoPonto3} />
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <ScrollView
          contentContainerStyle={styles.conteudo}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ==================== HEADER ==================== */}
          <Animated.View style={[styles.header, { opacity: entradaHeader }]}>
            <View style={styles.headerDecor1} />
            <View style={styles.headerDecor2} />
            <View style={styles.headerDecor3} />
            <View style={styles.headerDecor4} />
            <View style={styles.headerDecor5} />

            <TouchableOpacity
              style={styles.voltarBtn}
              activeOpacity={0.7}
              onPress={irParaBoasVindas}
            >
              <Ionicons name="chevron-back" size={21} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.logoArea}>
              <Animated.Image
                source={require('../assets/QuadraSync_SemNome-Photoroom.png')}
                style={[styles.logo, { transform: [{ scale: escalaLogo }] }]}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* ==================== FORMULÁRIO ==================== */}
          <Animated.View style={[styles.cartao, rise(entradaCartao)]}>
            {/* Detalhes do fundo branco — mesmo truque do header azul */}
            <View style={styles.cartaoDecor1} />
            <View style={styles.cartaoDecor2} />
            <View style={styles.cartaoDecor3} />

            <View style={styles.cartaoTopo}>
              <View style={styles.cartaoSelo}>
                <Ionicons name="log-in-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.cartaoTopoTexto}>
                <Text style={styles.cartaoTitulo}>Acesse sua conta</Text>
                <Text style={styles.cartaoSubtitulo}>Entre para reservar a quadra</Text>
              </View>
            </View>
            <View style={styles.cartaoDivisor} />

            <CampoTexto
              label="E-mail"
              icone="mail-outline"
              placeholder="seuemail@exemplo.com"
              valor={email}
              aoMudar={setEmail}
              nomeCampo="email"
              campoFocado={focado}
              aoFocar={() => setFocado('email')}
              aoDesfocar={() => setFocado(null)}
              teclado="email-address"
              autoCapitalizacao="none"
              semCorrecao
            />

            <CampoTexto
              label="Senha"
              icone="lock-closed-outline"
              placeholder="Digite sua senha"
              valor={senha}
              aoMudar={setSenha}
              nomeCampo="senha"
              campoFocado={focado}
              aoFocar={() => setFocado('senha')}
              aoDesfocar={() => setFocado(null)}
              seguro={!senhaVisivel}
              autoCapitalizacao="none"
              semCorrecao
              acaoDireita={
                <TouchableOpacity
                  style={styles.campoAcao}
                  activeOpacity={0.6}
                  onPress={() => setSenhaVisivel(!senhaVisivel)}
                >
                  <Ionicons
                    name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={styles.esqueciLink}
              activeOpacity={0.7}
              onPress={esqueciSenha}
            >
              <Ionicons name="help-circle-outline" size={14} color="#1565C0" />
              <Text style={styles.esqueciTexto}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              style={[styles.botaoPrincipal, carregando && styles.botaoCarregando]}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.botaoIcone} />
              ) : (
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={styles.botaoIcone} />
              )}
              <Text style={styles.botaoTexto}>
                {carregando ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Respiro decorado — o espaço vazio vive aqui */}
          <View style={styles.espacador} />

          {/* ==================== BASE ==================== */}
          <Animated.View style={rise(entradaRodape)}>
            <View style={styles.divisor}>
              <View style={styles.divisorLinha} />
              <Text style={styles.divisorTexto}>ou</Text>
              <View style={styles.divisorLinha} />
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={irParaCadastro}
              style={styles.botaoOutline}
            >
              <Ionicons name="person-add-outline" size={17} color="#1565C0" style={styles.botaoIcone} />
              <Text style={styles.botaoOutlineTexto}>Criar uma conta</Text>
            </TouchableOpacity>

            <View style={styles.baseBolinhas}>
              <View style={[styles.bolinha, styles.bolinhaEscura]} />
              <View style={styles.bolinhaMedia} />
              <View style={[styles.bolinha, styles.bolinhaEscura]} />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },

  // ==================== FUNDO DECORADO ====================
  // Formas fixas atrás de tudo — dão cor ao espaço livre
  // sem adicionar nenhuma informação na tela
  fundoDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  fundoBlob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.05)',
    right: -110,
    top: '42%',
  },
  fundoAnel: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 101, 192, 0.09)',
    left: -55,
    top: '36%',
  },
  fundoBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.04)',
    left: 70,
    bottom: 90,
  },
  fundoPonto1: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.16)',
    left: '24%',
    top: '41%',
  },
  fundoPonto2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.13)',
    right: '30%',
    top: '53%',
  },
  fundoPonto3: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.11)',
    left: '58%',
    top: '60%',
  },

  // ==================== LAYOUT ====================
  conteudo: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  espacador: {
    flex: 1,
    minHeight: 10,
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 34,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',

    // eleva o header do fundo (sombra azulada, sutil)
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },

  // ---- Decoração (5 camadas, ordem = de trás pra frente) ----
  headerDecor1: {
    // halo gigante atrás (topo-direita)
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.045)',
    right: -95,
    top: -140,
  },
  headerDecor2: {
    // círculo principal (topo-direita)
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -45,
    top: -60,
  },
  headerDecor3: {
    // anel — só contorno, dá profundidade sem pesar
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    left: 42,
    bottom: -58,
  },
  headerDecor4: {
    // bolinha sólida na borda esquerda
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    left: -16,
    bottom: 20,
  },
  headerDecor5: {
    // pontinho na base direita — fecha a composição
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: 84,
    bottom: -6,
  },

  voltarBtn: {
    position: 'absolute',
    top: 44,
    left: 14,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginTop: 6,
  },
  logo: {
    width: 170,
    height: 110,
  },
  headerSubtitulo: {
    color: '#BFDBFE',
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 4,
  },

  // ==================== CARTÃO DO FORMULÁRIO ====================
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 15,
    marginTop: -18, // sobrepõe o header
    overflow: 'hidden', // corta as decorações na borda
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    gap: 10,
  },

  // ---- Detalhes do fundo branco (mesma ideia do header azul) ----
  cartaoDecor1: {
    // círculo suave no canto superior direito
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.05)',
    right: -55,
    top: -55,
  },
  cartaoDecor2: {
    // anel cortado no canto inferior esquerdo
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 101, 192, 0.10)',
    left: -35,
    bottom: -35,
  },
  cartaoDecor3: {
    // pontinho na lateral esquerda
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
    left: -5,
    top: 58,
  },

  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  cartaoSelo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cartaoTopoTexto: {
    flex: 1,
  },
  cartaoTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cartaoSubtitulo: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  cartaoDivisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // ==================== CAMPOS ====================
  campoWrap: {
    // agrupa label + input + dica
  },
  campoLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  campoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    paddingRight: 6,
  },
  campoInputAtivo: {
    borderColor: '#1565C0',
    backgroundColor: '#F5F9FF',
  },
  campoIcone: {
    marginLeft: 14,
    marginRight: 10,
  },
  campoTexto: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  campoAcao: {
    paddingVertical: 9,
    paddingLeft: 12,
    paddingRight: 8,
  },
  campoDica: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },

  // ==================== LINK "ESQUECI MINHA SENHA" ====================
  esqueciLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 5,
    paddingVertical: 2,
  },
  esqueciTexto: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1565C0',
  },

  // ==================== BOTÃO PRINCIPAL ====================
  botaoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  botaoCarregando: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  botaoIcone: {
    marginRight: 8,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ==================== DIVISOR + BOTÃO OUTLINE ====================
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: '#DCE5F0',
  },
  divisorTexto: {
    paddingHorizontal: 14,
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  botaoOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C9DAEF',
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  botaoOutlineTexto: {
    color: '#1565C0',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ==================== ASSINATURA VISUAL DA BASE ====================
  baseBolinhas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },
  bolinha: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.25)',
  },
  bolinhaMedia: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 101, 192, 0.45)',
  },
});