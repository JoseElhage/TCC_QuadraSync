import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================
// MENU INFERIOR PADRÃO DO APP (telas do aluno)
//
// Uso:
// <MenuInferior
//    telaAtiva="calendario"
//    irParaInicial={irParaInicial}
//    irParaCalendario={irParaCalendario}  // dispensável se for a tela ativa
//    irParaEL={irParaEL}
//    irParaPerfil={irParaPerfil}
// />
// ============================================================

const ITENS = [
  { chave: 'inicio', label: 'Início', icone: 'home' },
  { chave: 'calendario', label: 'Calendário', icone: 'calendar' },
  { chave: 'league', label: 'ETEC League', icone: 'trophy' },
  { chave: 'perfil', label: 'Perfil', icone: 'person' },
];

export default function MenuInferior({
  telaAtiva,
  irParaInicial,
  irParaCalendario,
  irParaEL,
  irParaPerfil,
}) {
  // Chave do item -> função de navegação recebida via props
  const acoes = {
    inicio: irParaInicial,
    calendario: irParaCalendario,
    league: irParaEL,
    perfil: irParaPerfil,
  };

  return (
    <View style={styles.menuContainer}>
      {ITENS.map((item) => {
        const ativo = item.chave === telaAtiva;

        const conteudo = (
          <>
            <Ionicons
              name={ativo ? item.icone : `${item.icone}-outline`}
              size={21}
              color={ativo ? '#1565C0' : '#94A3B8'}
            />
            <Text style={[styles.menuLabel, ativo && styles.menuLabelAtivo]}>
              {item.label}
            </Text>
          </>
        );

        // Item ativo não é clicável (já estamos nele)
        if (ativo) {
          return (
            <View key={item.chave} style={styles.menuItem}>
              {conteudo}
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.chave}
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={acoes[item.chave]}
          >
            {conteudo}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  menuLabelAtivo: {
    fontWeight: '800',
    color: '#1565C0',
  },
});