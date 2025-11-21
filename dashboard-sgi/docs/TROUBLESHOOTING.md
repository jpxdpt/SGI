# Guia de Troubleshooting - SGI

Soluções para problemas comuns no Sistema de Gestão Integrada.

## 🔴 Problemas do Frontend

### Erro: "Cannot read properties of undefined"

**Causa**: Dados não carregados ainda ou estrutura incorreta.

**Solução**:
```typescript
// Sempre usar optional chaining e valores padrão
const data = query.data ?? [];
```

### Erro: "React Hooks order changed"

**Causa**: Hooks chamados condicionalmente ou após early return.

**Solução**: Todos os hooks devem ser chamados antes de qualquer `return`:

```typescript
// ❌ ERRADO
if (loading) return <Loading />;
const filtered = useMemo(...);

// ✅ CORRETO
const filtered = useMemo(...);
if (loading) return <Loading />;
```

### Erro: "429 Too Many Requests"

**Causa**: Rate limiting muito restritivo.

**Solução**:
1. Verificar configuração do rate limiter no backend
2. Aumentar limites em desenvolvimento
3. Reduzir frequência de polling

### Dashboard não carrega dados

**Verificações**:
1. `VITE_API_BASE_URL` está definido?
2. Backend está a correr?
3. CORS configurado corretamente?
4. Verificar console do browser para erros

**Solução**:
```bash
# Verificar variável de ambiente
echo $VITE_API_BASE_URL

# Testar conexão
curl http://localhost:5801/api/health
```

### Erros de acessibilidade nos testes

**Causa**: Contraste de cores insuficiente ou falta de labels.

**Solução**:
- Usar `text-slate-600 dark:text-slate-300` em vez de `text-slate-500`
- Adicionar `aria-label` a todos os botões sem texto
- Garantir que inputs têm `<label htmlFor={id}>`

## 🔴 Problemas do Backend

### Erro: "PrismaClientInitializationError"

**Causa**: Base de dados não acessível ou `DATABASE_URL` incorreto.

**Solução**:
```bash
# Verificar conexão
psql $DATABASE_URL

# Verificar variável
echo $DATABASE_URL

# Regenerar cliente Prisma
npx prisma generate
```

### Erro: "JWT_SECRET not defined"

**Causa**: Variável de ambiente não configurada.

**Solução**:
```bash
# Adicionar ao .env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Erro: "CORS policy blocked"

**Causa**: `FRONTEND_URL` não inclui a origem do frontend.

**Solução**:
```env
# .env do backend
FRONTEND_URL=http://localhost:8081
# ou em produção
FRONTEND_URL=https://sgi.exemplo.pt
```

### Rate limiting bloqueando requisições

**Causa**: Limites muito baixos para desenvolvimento.

**Solução**: Em desenvolvimento, o rate limiter permite 300 req/min. Se ainda assim houver problemas:

```typescript
// server/src/middleware/rateLimiter.ts
max: process.env.NODE_ENV === 'production' ? 100 : 500,
```

### Upload de ficheiros falha

**Verificações**:
1. Pasta `uploads/` existe e tem permissões?
2. Tamanho do ficheiro dentro do limite (10MB)?
3. Tipo MIME permitido?

**Solução**:
```bash
# Criar pasta e dar permissões
mkdir -p uploads
chmod 755 uploads
```

### Migrações falham

**Causa**: Schema desatualizado ou conflitos.

**Solução**:
```bash
# Reset (CUIDADO: apaga dados)
npx prisma migrate reset

# Ou criar nova migração
npx prisma migrate dev --name fix_schema
```

## 🔴 Problemas de Base de Dados

### Erro: "relation does not exist"

**Causa**: Tabelas não criadas.

**Solução**:
```bash
npx prisma migrate deploy
```

### Erro: "connection timeout"

**Causa**: PostgreSQL não acessível ou firewall bloqueando.

**Solução**:
```bash
# Verificar se PostgreSQL está a correr
sudo systemctl status postgresql

# Verificar porta
sudo netstat -tlnp | grep 5432

# Testar conexão
psql -h localhost -U sgi_user -d sgi
```

### Performance lenta

**Soluções**:
1. Adicionar índices:
```prisma
// schema.prisma
model InternalAudit {
  @@index([tenantId, status])
  @@index([dataPrevista])
}
```

2. Verificar queries lentas:
```bash
# Ativar query logging no Prisma
# prisma.ts
log: ['query', 'error', 'warn'],
```

## 🔴 Problemas de Autenticação

### Login falha sempre

**Verificações**:
1. Utilizador existe na BD?
2. Password está corretamente hasheada?
3. `JWT_SECRET` está definido?

**Solução**:
```bash
# Criar utilizador via seed
npm run prisma:seed

# Ou manualmente
npx prisma studio
```

### Token expira muito rápido

**Causa**: Tempo de expiração configurado.

**Solução**: Ajustar em `server/src/middleware/auth.ts`:
```typescript
expiresIn: '15m' // Access token
expiresIn: '7d'  // Refresh token
```

### Refresh token não funciona

**Verificações**:
1. Cookie `refreshToken` está a ser enviado?
2. `JWT_REFRESH_SECRET` está definido?
3. Cookie tem `httpOnly` e `secure` em produção?

## 🔴 Problemas de Multi-tenant

### Dados de uma empresa aparecem noutra

**Causa**: `x-tenant-id` não está a ser enviado ou `DEFAULT_TENANT_ID` incorreto.

**Solução**:
1. Verificar header no frontend
2. Verificar `DEFAULT_TENANT_ID` no backend
3. Verificar isolamento na BD

## 🔴 Problemas de Build

### Build do frontend falha

**Causa**: Erros de TypeScript ou dependências.

**Solução**:
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar erros TypeScript
npm run build
```

### Build do backend falha

**Solução**:
```bash
# Verificar TypeScript
npx tsc --noEmit

# Limpar dist
rm -rf dist
npm run build
```

## 🔴 Problemas de Deploy

### Servidor não inicia

**Verificações**:
1. Porta já em uso?
2. Variáveis de ambiente definidas?
3. Base de dados acessível?

**Solução**:
```bash
# Verificar porta
lsof -i :5801

# Verificar logs
pm2 logs
# ou
docker-compose logs
```

### Frontend mostra página em branco

**Causa**: Rota incorreta ou assets não carregados.

**Solução**:
1. Verificar `base` no `vite.config.ts`
2. Verificar Nginx config (SPA routing)
3. Verificar console do browser

### Erros 404 em rotas do frontend

**Causa**: Servidor web não configurado para SPA.

**Solução**: Adicionar ao Nginx:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 📊 Debugging

### Frontend

```bash
# Modo desenvolvimento com logs
npm run dev

# Verificar variáveis de ambiente
console.log(import.meta.env)

# React DevTools
# Instalar extensão do browser
```

### Backend

```bash
# Logs detalhados
NODE_ENV=development npm run dev

# Prisma Studio (GUI para BD)
npx prisma studio

# Ver queries SQL
# Adicionar log: ['query'] no Prisma client
```

## 🆘 Ainda com problemas?

1. Verificar logs completos
2. Verificar documentação da API (Swagger)
3. Verificar issues no repositório
4. Contactar suporte técnico

## 📝 Checklist de Diagnóstico

- [ ] Variáveis de ambiente definidas?
- [ ] Base de dados acessível?
- [ ] Portas não bloqueadas?
- [ ] Dependências instaladas?
- [ ] Migrações aplicadas?
- [ ] Logs sem erros críticos?
- [ ] CORS configurado?
- [ ] SSL válido (produção)?





