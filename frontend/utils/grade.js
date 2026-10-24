export function dividirEmLinhas(itens, colunas) {
  const linhas = [];
  for (let i = 0; i < itens.length; i += colunas) {
    linhas.push(itens.slice(i, i + colunas));
  }
  return linhas;
}

export function numeroColunasResponsivo(larguraTela) {
  if (larguraTela >= 600) return 4; // tablet
  if (larguraTela < 360) return 2;  // telas bem estreitas
  return 3;
}