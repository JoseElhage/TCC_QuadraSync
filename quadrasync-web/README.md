# QuadraSync · Painel Administrativo 

Frontend da aplicação web **exclusiva para administradores** (funcionários da secretaria) do QuadraSync —
o sistema de reservas da quadra escolar. Esta aplicação é separada do app mobile dos alunos e concentra
tudo que a secretaria precisa operar: aprovar reservas, bloquear horários, gerenciar moderadores da
**Etec League** e acompanhar as notificações da quadra.

> Protótipo funcional 100% front-end: os dados são simulados e persistidos em `localStorage`,
> então todos os fluxos (aprovar, recusar, bloquear, promover, remover…) funcionam de verdade no navegador.

---

## 🚀 Como executar

Não há build nem dependências — é HTML + CSS + JS puro.

```bash
# opção 1: abrir direto
#   abra index.html (ou pages/login.html) no navegador

# opção 2: servidor local (recomendado)
python3 -m http.server 8080
#   → http://localhost:8080
```

### 🔑 Credenciais de demonstração

| Campo | Valor |
|---|---|
| E-mail | `claudia.ferreira@etec.sp.gov.br` |
| Senha  | `quadra123` |

A tela de login tem um botão **“Preencher”** que insere essas credenciais. Também é possível criar uma
nova conta de administrador pela tela de **cadastro**.

Para zerar tudo e voltar ao estado inicial: **Meu perfil → Segurança e acesso → Restaurar dados de demonstração**.

---

## 🗂️ Estrutura de páginas

| Arquivo | Página |
|---|---|
| `pages/login.html` | Login do administrador (validação, mostrar/ocultar senha, lembrar e-mail) |
| `pages/cadastro.html` | Cadastro de novo administrador (matrícula funcional, força de senha, termos) |
| `pages/index.html` | **Dashboard**: indicadores, fila de aprovações, ocupação da semana, notificações e atividade |
| `pages/reservas.html` | **Aprovação de reservas**: filtros por status/período/esporte, busca, aprovar, recusar, cancelar, detalhes, aprovação em lote |
| `pages/calendario.html` | **Calendário**: ocupação dia a dia, painel de horários (18h00–21h30), **bloqueio de intervalo por motivo**, liberação de bloqueios e conflitos com reservas |
| `pages/notificacoes.html` | **Notificações**: filtros, não lidas, marcar como lida, excluir, atalho para a reserva |
| `pages/moderadores.html` | **Moderadores**: promover aluno, alterar permissão, remover moderador, histórico |
| `pages/perfil.html` | **Perfil**: dados funcionais, troca de senha, sessões ativas, preferências (tema claro/escuro, avisos) e regras da quadra |

### Arquivos de apoio

| Arquivo | Papel |
|---|---|
| `css/style.css` | Design system completo (tokens da paleta, componentes, responsivo, tema escuro) |
| `js/data.js` | Ícones SVG, seed de demonstração, storage, sessão, toasts, helpers de data |
| `js/shell.js` | Sidebar/topbar compartilhadas, badges dinâmicos, sistema de modais e validação |
| `js/actions.js` | Regras de negócio do front: aprovar/recusar/cancelar reserva, bloquear/liberar horário, cards |

---

## ✨ Funcionalidades por tela

- **Login / Cadastro** — validação em campo, medidor de força de senha, política de uso, redirecionamento
  automático quando já há sessão.
- **Dashboard** — visão limpa com 4 indicadores, banner da Etec League, fila de aprovações com ação
  direta (aprovar/recusar sem sair da tela) e os próximos horários confirmados.
- **Reservas** — seis filtros de status com contadores, busca por aluno/turma/finalidade, filtro de período,
  esporte e ordenação; aprovar com mensagem ao aluno, recusar com motivo + justificativa, cancelar reserva
  confirmada, ver detalhes e aprovar em lote.
- **Calendário** — grade mensal com chips de horário coloridos por status, painel lateral com os 7 horários
  do dia (disponível / pendente / reservado / concluído / bloqueado), bloqueio de qualquer intervalo com
  motivo e detalhes, aviso de conflito quando o bloqueio atinge reservas existentes (com opção de cancelá-las),
  liberação de bloqueio e lista de bloqueios do mês. Domingos são tratados como indisponíveis.
- **Notificações** — geradas automaticamente por aprovações, recusas, bloqueios e mudanças de moderação;
  filtros por tipo, marcar como lida/não lida, excluir e limpar lidas.
- **Moderadores** — tabela da equipe com permissão (placar / chaveamento / completa), promoção de aluno com
  escolha de permissão, alteração de permissão, remoção com motivo e histórico de movimentações.
- **Perfil** — edição dos dados funcionais (reflete nos registros), troca de senha com validação, sessões
  ativas, preferências de notificação, **tema claro/escuro** e zona de risco para restaurar a demonstração.

---

## 🎨 Paleta

Implementada como *design tokens* em `:root` (`css/style.css`), exatamente como fornecida:
primária `#1565C0` / `#0D47A1` / `#E3F2FD` / `#DBEAFE`, neutros `#F8FAFC`→`#0F172A`,
status semânticos (verde/âmbar/vermelho/cinza/azul) e acentos da Etec League (âmbar, roxo, ciano).
O tema escuro reutiliza os mesmos tokens com superfícies escuras.

---

## 📦 Publicando no repositório (GitHub)

O frontend é **autocontido**: copie apenas a pasta `quadrasync-web/` (ou renomeie-a, ex.: `admin-web/`,
para conviver com a aplicação original do QuadraSync no mesmo repositório). Nenhum arquivo oculto
(`.config`, `.cache`, `.npm`, markers de sudo etc.) é necessário — esses itens eram apenas resíduos do
ambiente de teste e não fazem parte da aplicação.

```
quadrasync-web/
├── index.html            → redireciona para o login
├── README.md
├── css/
│   └── style.css         → design system completo (paleta, componentes, responsivo, tema escuro)
├── js/
│   ├── data.js           → ícones, seed de demonstração, storage, sessão, toasts
│   ├── shell.js          → sidebar/topbar, modais, validação
│   └── actions.js        → regras de reserva/bloqueio e cards compartilhados
└── pages/
    ├── login.html  cadastro.html  index.html  reservas.html
    ├── calendario.html  notificacoes.html  moderadores.html  perfil.html
```

```bash
# exemplo: adicionar ao repositório existente sem tocar na .config original
cp -r quadrasync-admin admin-web
git add admin-web && git commit -m "feat: painel administrativo web (QuadraSync Admin)"
```

Não há build, dependências, `package.json` ou segredos: é HTML + CSS + JS puro servido estaticamente
(GitHub Pages, Netlify, Vercel ou qualquer servidor estático funcionam direto).

---

## ✅ Qualidade

- Fluxos cobertos por um smoke-test automatizado (jsdom) com **98 verificações** de comportamento
  (login, cadastro, aprovar, recusar, bloquear, liberar, notificações, promover, remover, perfil, tema).
- Layout verificado por capturas em desktop (1440 px) e mobile (390 px), incluindo menu lateral e modais.
- Sem dependências externas, sem fontes/CDN: funciona offline.
