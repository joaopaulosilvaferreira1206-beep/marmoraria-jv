# Marmoraria JV — Sistema de Gestão

> ERP interno para marmoraria. Estoque, vendas, orçamentos, clientes, fornecedores, controle de perdas e relatórios — em uma única base de código que roda como **PWA** e **Desktop (Electron)**.

---

## Stack

| Camada | Tecnologia |
|:---|:---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Realtime | Supabase Realtime (WebSocket) |
| Funções server-side | Supabase Edge Functions (Deno) |
| Desktop | Electron |
| PWA | vite-plugin-pwa |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |

---

## Funcionalidades

### Dashboard
KPIs em tempo real via Supabase Realtime: total de materiais, valor do estoque, vendas do mês, orçamentos pendentes, alertas de estoque baixo e perdas do mês. Gráfico de barras com vendas dos últimos 6 meses. Atualização automática ao detectar mudanças nas tabelas `materiais`, `vendas`, `perdas` e `orcamentos`.

### Estoque
CRUD completo de materiais com foto, SKU automático, controle de saldo mínimo/máximo, alerta visual de estoque baixo, exportação PDF e Excel.

### Entradas
Registro de entradas de material com atualização automática de saldo e cálculo de valor médio ponderado.

### Vendas
Registro com múltiplos itens, cálculo automático de área (largura × comprimento), desconto por item, tipo de trabalho, validação de saldo disponível em tempo real. Exportação PDF e Excel.

### Orçamentos
Criação com múltiplos itens, geração de PDF profissional com logo e dados da empresa, conversão direta em venda, alertas de vencimento. Orçamentos vencidos são cancelados automaticamente ao abrir a página.

### Pedidos
Controle de pedidos a fornecedores com lançamento automático no estoque ao marcar como "Recebido".

### Clientes / Fornecedores
CRUD completo com exportação PDF e Excel. Exclusão em cascata de todos os registros vinculados.

### Perdas
Registro de perdas de material com desconto automático do saldo em estoque.

### Busca Global
Pesquisa em tempo real por clientes, materiais, fornecedores, vendas e orçamentos. Ativada pelo botão **Buscar** no header ou pelo atalho `Ctrl+K`. Navega e destaca o item na página correspondente.

### Relatórios
Visão financeira consolidada com filtro por período e tipo. Exportação PDF e Excel. Acesso restrito a admin.

### Usuários
Criação e gestão via Edge Function com `SERVICE_ROLE_KEY` — somente admins autenticados podem criar contas.

### Backup
Exportação completa dos dados em JSON. Acionado automaticamente ao iniciar sessão no desktop e a cada 24h. Acesso restrito a admin.

---

## Perfis de Acesso

| Permissão | Operador | Admin |
|:---|:---:|:---:|
| Estoque, entradas, vendas, orçamentos, pedidos, clientes, fornecedores, perdas | ✅ | ✅ |
| Relatórios financeiros | ❌ | ✅ |
| Apagar registros | ❌ | ✅ |
| Backup | ❌ | ✅ |
| Gerenciar usuários | ❌ | ✅ |

---

## Pré-requisitos

- **Node.js** 18+
- Conta no [Supabase](https://supabase.com) com projeto configurado
- **Desktop:** nenhum requisito adicional (Electron instalado via npm)

---

## Configuração

```bash
# 1. Clone o repositório
git clone https://github.com/joaopaulosilvaferreira1206-beep/marmoraria-jv.git
cd marmoraria-jv

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

`.env` esperado:

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
```

```bash
# 4. Inicie em modo desenvolvimento
npm run dev
```

---

## Scripts

| Comando | Descrição |
|:---|:---|
| `npm run dev` | Servidor de desenvolvimento web — `localhost:5173` |
| `npm run dev:desktop` | App Electron em modo dev |
| `npm run build` | Build de produção web/PWA |
| `npm run build:desktop` | Build do instalador Windows (`.exe` via NSIS) |
| `npm test` | Testes unitários com Vitest |
| `npm run lint` | Lint com ESLint |
| `npm run lint:fix` | Corrige erros de lint automaticamente |

---

## Estrutura do Projeto

```
src/
├── pages/          # Uma página por módulo (Estoque, Vendas, Orcamentos...)
├── components/     # Componentes compartilhados (Header, Sidebar, Popups...)
├── services/       # Camada de acesso ao banco — toda query passa por aqui
├── lib/            # Supabase client, AuthContext, backup, exportar, PDF
└── assets/         # Imagens e ícones

supabase/
├── functions/
│   └── criar-usuario/   # Cria usuário + perfil com service_role (admin only)
└── migrations/          # Migrations SQL (índices, RLS, segurança)

electron/   # Entry points do Electron (main + preload)
```

---

## Deploy

### Web / PWA (Vercel)

O deploy para produção é automático via **GitHub Actions** (`.github/workflows/deploy.yml`).
Qualquer push para `main` aciona o workflow, que chama a API do Vercel com o SHA exato do commit e dispara um deploy de produção.

Para configurar em um fork, adicione o secret `VERCEL_TOKEN` nas configurações do repositório (`Settings → Secrets → Actions`).

URL de produção: **https://marmoraria-jv.vercel.app**

### Edge Functions

```bash
supabase functions deploy criar-usuario
```

---

## Observações técnicas

- **Realtime:** O Dashboard assina múltiplas tabelas via Supabase Realtime e atualiza todos os KPIs automaticamente sem polling.
- **Backup desktop:** Acionado via Electron API no login e repetido a cada 24h; armazena JSON local com todos os dados.
- **Criação de usuários:** Feita exclusivamente via Edge Function com `SERVICE_ROLE_KEY` — a anon key não tem permissão para criar usuários.
- **Orçamentos vencidos:** Cancelados automaticamente via `UPDATE WHERE status = 'pendente' AND validade < hoje` ao abrir a página de Orçamentos.
- **RLS:** Todas as tabelas têm Row Level Security ativa. Dados acessíveis somente para usuários autenticados — a anon key não acessa dados de negócio.
