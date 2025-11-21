<!-- 76c9fc02-f28e-48fd-908d-7986b9035053 f3eb2efd-e581-42e9-96dc-a49ce8ea16e5 -->
# Plano de Implementação de BI (Business Intelligence)

## Objetivos

- Implementar painel de analytics dedicado (`/analytics`) separado das operações diárias.
- Fornecer insights visuais (KPIs, tendências, distribuições).
- Permitir filtragem avançada e exportação de dados.
- Garantir performance e estabilidade do sistema existente.

## Estratégia de Implementação Segura

Para garantir que o código existente não quebre:

1.  **Isolamento**: Todo o código novo de BI ficará em módulos separados (`AnalyticsController`, `AnalyticsPage`, `AnalyticsService`).
2.  **Read-Only**: As queries de BI serão estritamente de leitura.
3.  **Lazy Loading**: O módulo de frontend será carregado sob demanda.
4.  **Non-Blocking**: Endpoints de analytics não bloquearão a thread principal (uso de `Promise.all` e queries otimizadas).

## Etapas de Implementação

### 1. Backend: Camada de Dados (Analytics Service)

Criar endpoints dedicados para agregação de dados, evitando sobrecarregar os endpoints de listagem padrão.

-   **Novos Ficheiros**:
    -   `server/src/controllers/analyticsController.ts`: Lógica de controle.
    -   `server/src/services/analyticsService.ts`: Queries complexas com Prisma (groupBy, count, avg).
    -   `server/src/routes/analytics.ts`: Novas rotas (`/api/analytics/summary`, `/api/analytics/trends`).

-   **Funcionalidades**:
    -   `getDashboardKPIs`: Totais de auditorias, ações em atraso, conformidade global.
    -   `getTrends`: Evolução mensal de não conformidades e auditorias realizadas.
    -   `getSectorPerformance`: Comparativo de conformidade por setor.

### 2. Frontend: Módulo de Visualização

Criar uma nova seção na aplicação dedicada à análise.

-   **Novos Ficheiros**:
    -   `dashboard-sgi/src/pages/AnalyticsPage.tsx`: Página principal.
    -   `dashboard-sgi/src/components/analytics/KPICard.tsx`: Componente visual para números chave.
    -   `dashboard-sgi/src/components/analytics/TrendCharts.tsx`: Gráficos de linha/área (usando Recharts).
    -   `dashboard-sgi/src/components/analytics/SectorHeatmap.tsx`: Visualização de risco por setor.

-   **Integração**:
    -   Adicionar rota `/analytics` no `App.tsx` (com `lazy`).
    -   Adicionar item no `Sidebar.tsx` (visível apenas para roles autorizadas).

### 3. Funcionalidades de BI

-   **Painel Interativo**:
    -   Filtro global de datas (DateRangePicker).
    -   Filtro por Departamento/Setor.
    -   Gráficos dinâmicos que respondem aos filtros.
-   **Relatórios**:
    -   Botão "Exportar Análise" que gera PDF/Excel baseado na visualização atual.

## Todos de Implementação

1.  **Setup Backend**: Criar estrutura de rotas e controller para Analytics.
2.  **Service Layer**: Implementar queries de agregação no Prisma (KPIs e Tendências).
3.  **Frontend Route**: Criar página base `AnalyticsPage` e adicionar ao router/sidebar.
4.  **Componentes Visuais**: Implementar componentes de gráficos (reaproveitando Recharts existente, mas com configurações avançadas).
5.  **Integração**: Conectar frontend aos novos endpoints de analytics.
6.  **Filtros**: Adicionar lógica de filtragem por data e setor.
7.  **Testes**: Validar performance das queries e renderização dos gráficos.

## Tecnologias

-   **Backend**: Node.js, Prisma (Aggregation API).
-   **Frontend**: React, Recharts (já instalado), Date-fns.
-   **Export**: jspdf, jspdf-autotable (já instalados).

### To-dos

- [ ] Completar análise detalhada de mercado com pesquisa de preços e feature comparison
- [ ] Implementar workflow engine configurável com definições no BD e executor
- [ ] Sistema de gestão de documentos com versionamento e aprovação
- [ ] Sistema de notificações com templates e múltiplos canais (email/SMS)
- [ ] Módulo completo de gestão de fornecedores com certificações
- [ ] Sistema de gestão de riscos com matriz e planos de mitigação
- [ ] Motor de relatórios avançado com BI integrado e templates
- [ ] App React Native para acesso mobile e offline
- [ ] Sistema de integrações com email, calendar e webhooks
- [ ] Serviço de AI/ML para análise preditiva e recomendações