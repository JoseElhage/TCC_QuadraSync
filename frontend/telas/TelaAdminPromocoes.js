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
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config/api';
import MenuInferiorAdmin from '../components/MenuInferiorAdmin';

// ============================================================
// Agrupar usuários por turma (mantendo a ordem alfabética)
// ============================================================
const agruparPorTurma = (usuarios) => {
  const grupos = {};

  usuarios.forEach((u) => {
    if (!grupos[u.turma]) {
      grupos[u.turma] = [];
    }
    grupos[u.turma].push(u);
  });

  return Object.keys(grupos)
    .sort()
    .map((turma) => ({ turma, usuarios: grupos[turma] }));
};

// "Gabriel Henrique da Silva" -> "GS"
const obterIniciais = (nome) => {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0] ? partes[0].charAt(0) : '';
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
  return (primeira + ultima).toUpperCase();
};

// ============================================================
// Animação de entrada (fade + rise)
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
// Card de usuário (linha da lista por turma)
// ============================================================

function CartaoUsuario({ usuario, indice, aoAlterar, processandoId }) {
  const ehOrganizador = usuario.perfil === 'organizador';
  const processando = processandoId !== null;
  const ehEste = processandoId === usuario.id_usuario;

  return (
    <Animado delay={Math.min(indice, 8) * 60}>
      <View style={styles.usuarioCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{obterIniciais(usuario.nome)}</Text>
        </View>

        <View style={styles.usuarioInfo}>
          <View style={styles.nomeLinha}>
            <Text style={styles.usuarioNome} numberOfLines={1}>
              {usuario.nome}
            </Text>
            {ehOrganizador ? (
              <View style={styles.badgeOrganizador}>
                <Ionicons name="ribbon" size={10} color="#D97706" />
                <Text style={styles.badgeOrganizadorTexto}>Organizador</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.usuarioEmail} numberOfLines={1}>
            {usuario.email}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => aoAlterar(usuario)}
          disabled={processando}
          style={[
            ehOrganizador ? styles.botaoRebaixar : styles.botaoPromover,
            processando && styles.botaoDesabilitado,
          ]}
        >
          {ehEste ? (
            <ActivityIndicator size="small" color={ehOrganizador ? '#64748B' : '#1565C0'} />
          ) : (
            <Ionicons
              name={ehOrganizador ? 'arrow-down' : 'arrow-up'}
              size={14}
              color={ehOrganizador ? '#64748B' : '#1565C0'}
            />
          )}
          <Text
            style={
              ehOrganizador ? styles.botaoRebaixarTexto : styles.botaoPromoverTexto
            }
          >
            {ehEste ? 'Aguarde...' : ehOrganizador ? 'Rebaixar' : 'Promover'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animado>
  );
}

// ============================================================
// Tela
// ============================================================

export default function TelaAdminPromocoes({
  token,
  usuario,
  irParaAdminReservas,
  irParaAdminHorarios,
  irParaAdminNotificacoes,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);

  const totalAlunos = usuarios.filter((u) => u.perfil === 'aluno').length;
  const totalOrganizadores = usuarios.filter((u) => u.perfil === 'organizador').length;

  // ------------------------------------------------------------
  // Carregar alunos e organizadores
  // ------------------------------------------------------------
  const carregarUsuarios = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/admin/usuarios/alunos`, {
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

      setUsuarios(dados.usuarios);
      setErroCarregamento(false);
    } catch (error) {
      setErroCarregamento(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  // ------------------------------------------------------------
  // Pull-to-refresh + retry pelo card de erro
  // ------------------------------------------------------------
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarUsuarios();
    setAtualizando(false);
  }, [carregarUsuarios]);

  const tentarNovamente = useCallback(() => {
    setCarregando(true);
    carregarUsuarios();
  }, [carregarUsuarios]);

  // ------------------------------------------------------------
  // Promover / Rebaixar (PUT /api/admin/usuarios/:id/perfil)
  // ------------------------------------------------------------
  const alterarPerfil = (alvo) => {
    const promovendo = alvo.perfil === 'aluno';

    Alert.alert(
      promovendo ? 'Promover a Organizador' : 'Rebaixar a Aluno',
      promovendo
        ? `Promover ${alvo.nome} (${alvo.turma}) a organizador? Ele(a) poderá gerenciar o ETEC League.`
        : `Remover o acesso de organizador de ${alvo.nome}? Ele(a) voltará a ser aluno.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: promovendo ? 'Promover' : 'Rebaixar',
          style: promovendo ? 'default' : 'destructive',
          onPress: () => confirmarAlteracao(alvo),
        },
      ]
    );
  };

  const confirmarAlteracao = async (alvo) => {
    const novoPerfil = alvo.perfil === 'aluno' ? 'organizador' : 'aluno';

    setProcessandoId(alvo.id_usuario);

    try {
      const resposta = await fetch(
        `${API_URL}/admin/usuarios/${alvo.id_usuario}/perfil`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ perfil: novoPerfil }),
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

      if (resposta.ok && dados.success) {
        await carregarUsuarios();
        Alert.alert('Pronto', dados.message || 'Perfil alterado com sucesso.');
        return;
      }

      Alert.alert('Não foi possível alterar', dados.message || 'Tente novamente em instantes.');
    } catch (error) {
      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está funcionando e se o celular está na mesma rede Wi-Fi do computador.'
      );
    } finally {
      setProcessandoId(null);
    }
  };

  const turmas = agruparPorTurma(usuarios);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circuloGrande} />
        <View style={styles.circuloPequeno} />

        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>Promoções</Text>
          <Text style={styles.headerSubtitulo}>Organizadores do ETEC League</Text>
        </View>
      </View>

      {/*
        Resumo (alunos/organizadores): IRMÃO do ScrollView (regra do
        design system — o ScrollView recorta marginTop negativo).
      */}
      {!carregando && !erroCarregamento && usuarios.length > 0 && (
        <Animado>
          <View style={styles.resumo}>
            <View style={styles.resumoColuna}>
              <View style={styles.resumoIconeAlunos}>
                <Ionicons name="school-outline" size={18} color="#1565C0" />
              </View>
              <View>
                <Text style={styles.resumoNumero}>{totalAlunos}</Text>
                <Text style={styles.resumoRotulo}>
                  {totalAlunos === 1 ? 'aluno' : 'alunos'}
                </Text>
              </View>
            </View>

            <View style={styles.resumoDivisor} />

            <View style={styles.resumoColuna}>
              <View style={styles.resumoIconeOrganizadores}>
                <Ionicons name="ribbon-outline" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.resumoNumero}>{totalOrganizadores}</Text>
                <Text style={styles.resumoRotulo}>
                  {totalOrganizadores === 1 ? 'organizador' : 'organizadores'}
                </Text>
              </View>
            </View>
          </View>
        </Animado>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={['#1565C0']}
          />
        }
      >
        {/* Carregando */}
        {carregando && (
          <View style={styles.areaStatus}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.textoStatus}>Carregando usuários...</Text>
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
                <Ionicons name="cloud-offline-outline" size={26} color="#DC2626" />
              </View>
              <View style={styles.erroTextos}>
                <Text style={styles.erroTitulo}>Não foi possível carregar</Text>
                <Text style={styles.erroTexto}>
                  Verifique a conexão com o servidor e toque para tentar novamente.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </Animado>
        )}

        {/* Vazio */}
        {!carregando && !erroCarregamento && usuarios.length === 0 && (
          <Animado>
            <View style={styles.vazio}>
              <View style={styles.vazioIcone}>
                <Ionicons name="people-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhum aluno cadastrado</Text>
              <Text style={styles.vazioTexto}>
                Assim que os alunos criarem contas, eles aparecem aqui agrupados por turma.
              </Text>
            </View>
          </Animado>
        )}

        {/* Lista por turma */}
        {!carregando &&
          !erroCarregamento &&
          (() => {
            let indiceCard = 0;

            return turmas.map((grupo) => (
              <View key={grupo.turma} style={styles.turmaSecao}>
                <View style={styles.turmaCabecalho}>
                  <Ionicons name="people-outline" size={13} color="#94A3B8" />
                  <Text style={styles.turmaTitulo}>{grupo.turma}</Text>
                  <View style={styles.turmaContagem}>
                    <Text style={styles.turmaContagemTexto}>
                      {grupo.usuarios.length}
                    </Text>
                  </View>
                </View>

                {grupo.usuarios.map((u) => {
                  const indice = indiceCard++;

                  return (
                    <CartaoUsuario
                      key={u.id_usuario}
                      usuario={u}
                      indice={indice}
                      aoAlterar={alterarPerfil}
                      processandoId={processandoId}
                    />
                  );
                })}
              </View>
            ));
          })()}
      </ScrollView>

      {/* Menu Inferior Admin */}
      <MenuInferiorAdmin
        telaAtiva="promocoes"
        irParaAdminReservas={irParaAdminReservas}
        irParaAdminHorarios={irParaAdminHorarios}
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

  // ---------- Conteúdo ----------
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 8,
  },

  // Resumo flutuante (irmão do ScrollView)
  resumo: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  resumoColuna: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumoIconeAlunos: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resumoIconeOrganizadores: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resumoNumero: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  resumoRotulo: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  resumoDivisor: {
    width: 1,
    height: 34,
    backgroundColor: '#E8EDF5',
  },

  // ---------- Seção por turma ----------
  turmaSecao: {
    marginTop: 18,
  },
  turmaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    marginBottom: 8,
  },
  turmaTitulo: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  turmaContagem: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: 'center',
    marginLeft: 8,
  },
  turmaContagemTexto: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1565C0',
    fontVariant: ['tabular-nums'],
  },

  // ---------- Card de usuário ----------
  usuarioCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
  },
  usuarioInfo: {
    flex: 1,
    flexShrink: 1,
  },
  nomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  usuarioNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
    marginRight: 6,
  },
  badgeOrganizador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeOrganizadorTexto: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 4,
  },
  usuarioEmail: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },

  // ---------- Botões promover/rebaixar ----------
  botaoPromover: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#C7DDF7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginLeft: 10,
  },
  botaoPromoverTexto: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  botaoRebaixar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginLeft: 10,
  },
  botaoRebaixarTexto: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },

  // ---------- Carregando ----------
  areaStatus: {
    alignItems: 'center',
    marginTop: 56,
  },
  textoStatus: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 14,
  },

  // ---------- Erro ----------
  cardErro: {
    backgroundColor: '#FFFFFF',
    marginTop: 24,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  erroIcone: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
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
    color: '#0F172A',
  },
  erroTexto: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },

  // ---------- Vazio ----------
  vazio: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D8DFEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  vazioIcone: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  vazioTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  vazioTexto: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
  },
});