# Checklist de Deploy - Vercel

## Pré-Deploy

- [ ] Verificar que o build funciona localmente
  ```bash
  cd dashboard-sgi
  npm install
  npm run build
  ```

- [ ] Testar preview local
  ```bash
  npm run preview
  ```

- [ ] Verificar variáveis de ambiente necessárias
  - `VITE_API_BASE_URL` (opcional - se não definir, usa mock)

- [ ] Verificar que não há erros no console
  - Build sem erros
  - Sem dependências faltando

## Deploy

### Via CLI

- [ ] Instalar Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Navegar para pasta: `cd dashboard-sgi`
- [ ] Deploy preview: `vercel`
- [ ] Deploy produção: `vercel --prod`
- [ ] Configurar variáveis de ambiente via CLI ou painel

### Via GitHub

- [ ] Código commitado e push para repositório
- [ ] Conta Vercel conectada ao GitHub
- [ ] Criar novo projeto na Vercel
- [ ] Selecionar repositório e pasta `dashboard-sgi`
- [ ] Configurar variáveis de ambiente no painel
- [ ] Deploy automático ao fazer push

## Pós-Deploy

- [ ] Verificar que o site está acessível
- [ ] Testar navegação entre páginas
- [ ] Verificar console do browser (sem erros críticos)
- [ ] Testar funcionalidades principais:
  - [ ] Login/Logout
  - [ ] Dashboard carrega
  - [ ] Navegação funciona
  - [ ] Dados carregam (se backend configurado)

## Configurações Opcionais

- [ ] Configurar domínio customizado
- [ ] Configurar analytics na Vercel
- [ ] Configurar alertas de erro
- [ ] Revisar logs de build

## Notas Importantes

1. **Backend**: Se usar backend separado, configure CORS para permitir o domínio Vercel
2. **Mock Mode**: Se não configurar `VITE_API_BASE_URL`, o frontend usa dados mock
3. **Environment Variables**: Configurar no painel da Vercel (Settings > Environment Variables)
4. **Cache**: Assets são cached automaticamente (configurado no vercel.json)

## Problemas Comuns

- **404 ao recarregar página**: Verificar que vercel.json tem rewrites configurados ✅
- **Variáveis não funcionam**: Verificar que começam com `VITE_` e estão no painel
- **CORS**: Configurar no backend para permitir domínio Vercel


