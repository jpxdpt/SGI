# Testes E2E com Playwright

Este diretório contém testes end-to-end (E2E) usando Playwright para validar os fluxos críticos da aplicação.

## Configuração

Os testes estão configurados em `playwright.config.ts` e suportam:
- Múltiplos browsers (Chromium, Firefox, WebKit)
- Dispositivos móveis (Chrome Mobile, Safari Mobile)
- Screenshots e vídeos em falhas
- Relatórios HTML interativos

## Executar testes

```bash
# Executar todos os testes
npm run test:e2e

# Executar com interface gráfica
npm run test:e2e:ui

# Executar em modo debug
npm run test:e2e:debug

# Executar com browser visível
npm run test:e2e:headed

# Ver relatório HTML
npm run test:e2e:report
```

## Estrutura dos testes

- `auth.spec.ts` - Testes de autenticação (login, logout, navegação por teclado)
- `crud.spec.ts` - Testes de operações CRUD (criar, editar, eliminar auditorias)
- `filters.spec.ts` - Testes de filtros e pesquisa
- `dashboard.spec.ts` - Testes do dashboard (KPIs, gráficos, notificações)
- `attachments.spec.ts` - Testes de anexos e comentários
- `accessibility.spec.ts` - Testes de acessibilidade (a11y) em todas as páginas

## Pré-requisitos

1. O frontend deve estar a correr em `http://localhost:8081` (ou configurar `PLAYWRIGHT_TEST_BASE_URL`)
2. Deve existir um utilizador de teste:
   - Email: `admin@example.com`
   - Password: `admin123`

## Notas

- Os testes utilizam `test.skip()` quando elementos não são encontrados, permitindo execução parcial
- Os testes de acessibilidade usam `@axe-core/playwright` para verificar violações WCAG
- Todos os testes incluem verificações de navegação por teclado
- Screenshots e vídeos são gerados apenas em falhas para economizar espaço











