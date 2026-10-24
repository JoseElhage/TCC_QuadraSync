import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// Menu inferior do aluno DENTRO do ETEC League — mesma estrutura do
// MenuInferior (4 abas, ativo não clicável), mas com a identidade
// preto + verde #4CAF50 própria da tela.
export default function MenuInferiorLeague({
  telaAtiva,
  irParaInicial,
  irParaCalendario,
  irParaEL,
  irParaPerfil,
}) {
  const itens = [
    { chave: 'inicio', label: 'Início', icone: 'home', acao: irParaInicial },
    { chave: 'calendario', label: 'Calendário', icone: 'calendar', acao: irParaCalendario },
    { chave: 'league', label: 'ETEC League', icone: 'trophy', acao: irParaEL },
    { chave: 'perfil', label: 'Perfil', icone: 'person', acao: irParaPerfil },
  ];

  return (
    <View style={styles.container}>
      {itens.map((item) => {
        const ativo = telaAtiva === item.chave;

        const conteudo = (
          <View style={styles.item}>
            <Ionicons
              name={ativo ? item.icone : `${item.icone}-outline`}
              size={22}
              color={ativo ? '#4CAF50' : '#777777'}
            />
            <Text style={[styles.label, ativo && styles.labelAtiva]}>{item.label}</Text>
          </View>
        );

        if (ativo) {
          return (
            <View key={item.chave} style={styles.areaToque}>
              {conteudo}
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.chave}
            activeOpacity={0.6}
            onPress={item.acao}
            style={styles.areaToque}
          >
            {conteudo}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: '#0A0A0A',
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  areaToque: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#777777',
    marginTop: 3,
  },
  labelAtiva: {
    color: '#4CAF50',
    fontWeight: '800',
  },
});