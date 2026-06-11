# Marmoraria JV — Contexto para IA

## O que é
ERP para marmoraria. React 19 + Vite + Tailwind + Supabase (PostgreSQL + Auth + Realtime + Edge Functions).
Deploy: PWA + Electron (desktop) + Capacitor (Android).

## Regras de Código (OBRIGATÓRIO)
- Complexidade ciclomática ≤ 10 por função
- Funções ≤ 20 linhas
- Zero `console.log` em produção
- Todo Supabase call via `src/services/` — NUNCA direto nas pages
- Todo Supabase call deve ter `.catch()` ou `try/catch` com feedback ao usuário
- Keys em listas React: nunca usar index — usar ID único
- Promises paralelas independentes: sempre `Promise.all()`
- Estado complexo de modal/formulário: `useReducer`, não múltiplos `useState`

## Arquitetura de Pastas
```
src/
├── pages/          # UI only — sem lógica de negócio, sem Supabase direto
├── components/     # Componentes reutilizáveis
├── services/       # TODA lógica Supabase aqui (criar aqui se não existir)
│   ├── materiais.js
│   ├── vendas.js
│   ├── clientes.js
│   └── ...
├── lib/
│   ├── AuthContext.jsx   # Sessão + permissões
│   ├── supabase.js       # Cliente singleton
│   ├── backup.js         # Backup/restore
│   ├── exportar.js       # Excel export
│   └── pdfOrcamento.js   # PDF geração
└── hooks/          # Custom hooks (criar se precisar)
```

## Banco de Dados (Tabelas principais)
- `materiais` — estoque de chapas/pedras
- `vendas` + `itens_venda` — vendas realizadas
- `orcamentos` + `itens_orcamento` — orçamentos
- `clientes` — cadastro de clientes
- `fornecedores` — cadastro de fornecedores
- `entradas` — entrada de material
- `perdas` — registro de perdas
- `pedidos` — pedidos em andamento
- `perfis` — usuários + perfil (admin/operador)

## Permissões
- `perfil.perfil === 'admin'` — acesso total
- `perfil.perfil === 'operador'` — sem: relatórios, backup, gerenciar usuários, apagar registros
- Hook: `const { pode, isAdmin, perfil } = useAuth()`

## Problemas Conhecidos (NÃO CORRIGIDOS ainda)
- [ ] Sem error handling nas queries Supabase (crítico)
- [ ] backup.js apaga dados antes de reinserir sem transação (crítico — risco de perda)
- [ ] N+1 queries em Estoque.jsx:146 (excluir material)
- [ ] Bug de data em Dashboard.jsx:108 (mês negativo)
- [ ] Keys com index em listas (Dashboard, Vendas, Orcamentos)
- [ ] Supabase chamado direto nas pages (sem camada de serviço)
- [ ] Estado modal com 7-8 useState (Vendas, Orcamentos)

## Edge Functions (Supabase / Deno)
- `criar-usuario` — cria usuário + perfil com service_role
- `interpretar-geometria` — IA para calcular área de peças

## Padrão de Notificação ao Usuário
Usar o `PopupProvider` via `usePopup()`:
```jsx
const { showPopup } = usePopup()
showPopup('Mensagem de sucesso', 'success')  // 'success' | 'error' | 'warning'
```

## Testes
- Framework: Vitest + @testing-library/react
- Rodar: `npm test`
- Um erro = não está corrigido. Só está corrigido quando `npm test` passa.
- Testar: services/ (unit) + components/ (integration)

## Como rodar
```bash
npm run dev          # web (localhost:5173)
npm run dev:desktop  # electron
npm run build        # produção web/PWA
npm test             # testes
npm run lint         # lint
```
