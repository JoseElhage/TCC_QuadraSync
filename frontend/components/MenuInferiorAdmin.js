import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// Menu inferior exclusivo do perfil administrador.
// Mesmo padrão visual do MenuInferior do aluno: 4 abas com
// label, ícone preenchido quando ativo, item ativo não clicável.
export default function MenuInferiorAdmin({
  telaAtiva,
  irParaAdminReservas,
  irParaAdminPromocoes,
  irParaAdminHorarios,
  irParaAdminNotificacoes,
}) {
  const itens = [
    { chave: 'reservas', label: 'Reservas', icone: 'clipboard', acao: irParaAdminReservas },
    { chave: 'promocoes', label: 'Promoções', icone: 'star', acao: irParaAdminPromocoes },
    { chave: 'horarios', label: 'Horários', icone: 'time', acao: irParaAdminHorarios },
    { chave: 'notificacoes', label: 'Notificações', icone: 'notifications', acao: irParaAdminNotificacoes },
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
              color={ativo ? '#1565C0' : '#94A3B8'}
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
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
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
    color: '#94A3B8',
    marginTop: 3,
  },
  labelAtiva: {
    color: '#1565C0',
    fontWeight: '800',
  },
});