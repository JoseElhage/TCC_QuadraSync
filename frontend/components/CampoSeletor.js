import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CampoSeletor({ label, valor, placeholder = 'Selecionar', icone, aoPressionar }) {
  return (
    <Pressable style={estilos.campo} onPress={aoPressionar} android_ripple={{ color: '#222' }}>
      <View style={estilos.linhaTopo}>
        {icone ? <Ionicons name={icone} size={13} color="#4CAF50" style={{ marginRight: 5 }} /> : null}
        <Text style={estilos.label} numberOfLines={1}>{label}</Text>
      </View>
      <View style={estilos.linhaValor}>
        <Text style={estilos.valor} numberOfLines={1} ellipsizeMode="tail">
          {valor || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  campo: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { color: '#666', fontSize: 11, flexShrink: 1 },
  linhaValor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  valor: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1, minWidth: 0 },
});