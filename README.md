# Marmoraria JV — Sistema de Gestão

Sistema ERP interno para gestão completa de marmoraria: estoque de materiais, vendas, clientes, fornecedores, orçamentos com PDF, controle de perdas e relatórios financeiros.

Roda como **Progressive Web App (PWA)**, aplicativo **Desktop (Electron)** e **Android (Capacitor)** a partir de uma única base de código.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Realtime | Supabase Realtime (WebSocket) |
| Funções server-side | Supabase Edge Functions (Deno) |
| Desktop | Electron |
| Mobile | Capacitor (Android) |
| PWA | vite-plugin-pwa |
| PDF | jsPDF + jspdf-autotable |
| Visualização 3D | Three.js |

---

## Funcionalidades

- **Dashboard** — KPIs em tempo real: total de materiais, valor do estoque, vendas do mês, orçamentos pendentes, alertas de estoque baixo
- **Estoque** — Cadastro e controle de materiais (chapas, pedras), entradas e saídas
- **Vendas** — Registro de vendas com vinculação a clientes
- **Orçamentos** — Criação e exportação de orçamentos em PDF
- **Pedidos** — Controle de pedidos em andamento
- **Clientes / Fornecedores** — Cadastro completo
- **Perdas** — Registro de perdas de material por período
- **Relatórios** — Visão financeira consolidada (acesso restrito a admin)
- **Usuários** — Criação e gestão de usuários via Edge Function (acesso restrito a admin)
- **Backup** — Exportação de dados (acesso restrito a admin)

---

## Perfis de Acesso

| Permissão | Operador | Admin |
|---|---|---|
| Estoque, vendas, clientes, fornecedores, pedidos | ✅ | ✅ |
| Ver custos | ✅ | ✅ |
| Relatórios | ❌ | ✅ |
| Apagar registros | ❌ | ✅ |
| Backup | ❌ | ✅ |
| Gerenciar usuários | ❌ | ✅ |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com projeto configurado
- Para desktop: nenhum requisito adicional (Electron é instalado via npm)
- Para Android: Android Studio + JDK 17

---

## Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/joaopaulosilvaferreira1206-beep/marmoraria-jv.git
   cd marmoraria-jv
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na raiz com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
   ```

4. Inicie em modo desenvolvimento:
   ```bash
   npm run dev
   ```

---

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento web (localhost:5173) |
| `npm run dev:desktop` | Abre o app no Electron em modo dev |
| `npm run build` | Build de produção para web/PWA |
| `npm run build:desktop` | Build do instalador Windows (.exe via NSIS) |
| `npm run lint` | Lint com ESLint |

---

## Estrutura do Projeto

```
src/
├── pages/          # Uma página por módulo de negócio
├── components/     # Componentes compartilhados (Header, Sidebar, etc.)
├── lib/            # Supabase client, AuthContext, utilitários (PDF, backup, export)
└── assets/         # Imagens e ícones

supabase/
└── functions/
    ├── criar-usuario/          # Criação de usuários com perfil (admin only)
    └── interpretar-geometria/  # Cálculo de geometria de peças via IA

android/            # Projeto nativo Android (Capacitor)
electron/           # Entry points do Electron (main + preload)
```

---

## Deploy das Edge Functions

```bash
supabase functions deploy criar-usuario
supabase functions deploy interpretar-geometria
```

---

## Observações

- O backup automático é acionado via `Electron API` ao iniciar sessão no desktop e se repete a cada 24h.
- O Dashboard usa **Supabase Realtime** para atualizar KPIs automaticamente sem reload ao detectar mudanças nas tabelas `materiais`, `vendas`, `perdas` e `orcamentos`.
- Criação de usuários é feita exclusivamente via Edge Function com `SERVICE_ROLE_KEY` para garantir que apenas admins autenticados possam criar contas.
