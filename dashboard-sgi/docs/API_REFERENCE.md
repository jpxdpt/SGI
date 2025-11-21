# Referência da API - SGI

Documentação completa da API REST do Sistema de Gestão Integrada.

## 🔗 Base URL

```
Desenvolvimento: http://localhost:5801/api
Produção: https://api.sgi.exemplo.pt/api
```

## 📚 Documentação Interativa

Acessa `http://localhost:5801/api/docs` para ver a documentação Swagger interativa.

## 🔐 Autenticação

A maioria dos endpoints requer autenticação JWT.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@demo.local",
  "password": "admin123"
}
```

**Resposta**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "name": "Administrador",
    "email": "admin@demo.local",
    "role": "ADMIN",
    "tenantId": "tenant-default",
    "tenant": {
      "id": "tenant-default",
      "name": "Empresa Padrão"
    }
  }
}
```

### Usar Token

```http
GET /api/audits/internal
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Refresh Token

```http
POST /api/auth/refresh
Cookie: refreshToken=...
```

## 🌐 Multi-tenant

Envia o header `x-tenant-id` para trabalhar com múltiplas empresas:

```http
GET /api/audits/internal
Authorization: Bearer TOKEN
x-tenant-id: empresa-123
```

## 📄 Paginação

Todos os endpoints GET suportam paginação:

```
GET /api/audits/internal?page=1&limit=20
```

**Resposta**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 📡 Endpoints

### Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/login` | Login | ❌ |
| POST | `/auth/refresh` | Renovar token | ❌ |
| POST | `/auth/logout` | Logout | ✅ |
| GET | `/auth/me` | Informações do utilizador | ✅ |

### Auditorias Internas

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/audits/internal` | Listar (com paginação) | ✅ |
| POST | `/audits/internal` | Criar | ✅ |
| PUT | `/audits/internal/:id` | Atualizar | ✅ |
| DELETE | `/audits/internal/:id` | Eliminar | ✅ |

**Payload (POST/PUT)**:
```json
{
  "id": "INT-001",
  "ano": 2025,
  "setor": "Qualidade",
  "responsavel": "Maria Fonseca",
  "descricao": "Revisão do SGQ",
  "dataPrevista": "2025-02-15",
  "execucao": 95,
  "status": "Executada",
  "acoesGeradas": 4
}
```

**Status válidos**: `"Planeada" | "Em execução" | "Exec+Atraso" | "Atrasada" | "Executada"`

### Auditorias Externas

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/audits/external` | Listar (com paginação) | ✅ |
| POST | `/audits/external` | Criar | ✅ |
| PUT | `/audits/external/:id` | Atualizar | ✅ |
| DELETE | `/audits/external/:id` | Eliminar | ✅ |

**Payload (POST/PUT)**:
```json
{
  "id": "EXT-001",
  "ano": 2025,
  "entidadeAuditora": "Bureau Veritas",
  "setor": "Qualidade",
  "responsavel": "João Silva",
  "descricao": "Auditoria ISO 9001",
  "dataPrevista": "2025-03-01",
  "execucao": 0,
  "status": "Planeada",
  "acoesGeradas": 0,
  "conclusoes": "Aguardando execução"
}
```

### Ações

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/actions` | Listar (com paginação) | ✅ |
| POST | `/actions` | Criar | ✅ |
| PUT | `/actions/:id` | Atualizar | ✅ |
| DELETE | `/actions/:id` | Eliminar | ✅ |

**Payload (POST/PUT)**:
```json
{
  "id": "AC-1001",
  "origem": "Interna",
  "acaoRelacionada": "INT-001",
  "setor": "Qualidade",
  "descricao": "Atualizar instruções",
  "dataAbertura": "2025-01-01",
  "dataLimite": "2025-03-01",
  "dataConclusao": null,
  "impacto": "Médio",
  "status": "Em andamento"
}
```

**Valores válidos**:
- `origem`: `"Interna" | "Externa" | "Ocorrência"`
- `impacto`: `"Baixo" | "Médio" | "Alto"`
- `status`: `"Concluída" | "Em andamento" | "Atrasada"`

### Ocorrências

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/occurrences` | Listar (com paginação) | ✅ |
| POST | `/occurrences` | Criar | ✅ |
| PUT | `/occurrences/:id` | Atualizar | ✅ |
| DELETE | `/occurrences/:id` | Eliminar | ✅ |

**Payload (POST/PUT)**:
```json
{
  "id": "O-201",
  "setor": "Operações",
  "responsavel": "Carlos Silva",
  "data": "2025-02-01",
  "descricao": "Desvio detectado",
  "gravidade": "Alta",
  "acaoGerada": "AC-1003",
  "status": "Em mitigação"
}
```

**Valores válidos**:
- `gravidade`: `"Baixa" | "Média" | "Alta" | "Crítica"`
- `status`: `"Aberta" | "Em mitigação" | "Resolvida"`

### Setores

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/sectors` | Listar | ✅ |
| POST | `/sectors` | Criar | ✅ |
| PUT | `/sectors/:id` | Atualizar | ✅ |
| DELETE | `/sectors/:id` | Eliminar | ✅ |

**Payload (POST/PUT)**:
```json
{
  "id": "SET-01",
  "nome": "Qualidade",
  "responsavel": "Maria Fonseca",
  "email": "maria@empresa.pt",
  "telefone": "+351 912 345 678",
  "descricao": "Gestão do SGQ",
  "ativo": true
}
```

### Dashboard Summary

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/summary` | Resumo para dashboard | ✅ |

**Resposta**:
```json
{
  "totalInternas": 45,
  "totalExternas": 12,
  "totalAcoes": 89,
  "totalOcorrencias": 23,
  "setoresAtivos": 8
}
```

### Anexos

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/attachments` | Upload de ficheiro | ✅ |
| GET | `/attachments/:entityType/:entityId` | Listar anexos | ✅ |
| GET | `/attachments/:id/download` | Download | ✅ |
| DELETE | `/attachments/:id` | Eliminar | ✅ |

**Upload (POST)**:
```http
POST /api/attachments
Content-Type: multipart/form-data

entityType: InternalAudit
entityId: INT-001
file: [arquivo]
```

**Tipos de entidade**: `"InternalAudit" | "ExternalAudit" | "ActionItem" | "Occurrence"`

### Comentários

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/comments` | Criar comentário | ✅ |
| GET | `/comments/:entityType/:entityId` | Listar comentários | ✅ |
| PUT | `/comments/:id` | Atualizar | ✅ |
| DELETE | `/comments/:id` | Eliminar | ✅ |

**Payload (POST)**:
```json
{
  "entityType": "InternalAudit",
  "entityId": "INT-001",
  "content": "Comentário sobre a auditoria"
}
```

### Aprovações

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/approvals` | Solicitar aprovação | ✅ |
| GET | `/approvals/:entityType/:entityId` | Obter aprovação | ✅ |
| PUT | `/approvals/:id` | Aprovar/Rejeitar | ✅ |

**Payload (POST)**:
```json
{
  "entityType": "InternalAudit",
  "entityId": "INT-001",
  "requestedBy": "user-123"
}
```

**Payload (PUT - Aprovar)**:
```json
{
  "status": "APPROVED",
  "comments": "Aprovado após revisão"
}
```

**Status**: `"PENDING" | "APPROVED" | "REJECTED"`

### Audit Trail (Logs)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/logs` | Listar logs (com filtros) | ✅ |

**Query Parameters**:
- `page`: Número da página (default: 1)
- `limit`: Itens por página (default: 20)
- `action`: Filtrar por ação (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `IMPORT`)
- `entity`: Filtrar por entidade (ex: `InternalAudit`)
- `startDate`: Data inicial (ISO 8601)
- `endDate`: Data final (ISO 8601)

**Exemplo**:
```
GET /api/logs?page=1&limit=50&action=CREATE&entity=InternalAudit
```

### Health Checks

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/health` | Status do servidor | ❌ |
| GET | `/ready` | Verificação de BD | ❌ |

## 🔒 Rate Limiting

- **Geral**: 300 req/min (dev) ou 100 req/min (prod)
- **Autenticação**: 5 tentativas/15min
- **Criação**: 10 operações/min

Headers de resposta incluem:
- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset

## ❌ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

## 📝 Exemplos de Uso

### Criar Auditoria Interna

```bash
curl -X POST http://localhost:5801/api/audits/internal \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-default" \
  -d '{
    "id": "INT-001",
    "ano": 2025,
    "setor": "Qualidade",
    "responsavel": "Maria Fonseca",
    "descricao": "Revisão do SGQ",
    "dataPrevista": "2025-02-15",
    "execucao": 0,
    "status": "Planeada",
    "acoesGeradas": 0
  }'
```

### Listar com Filtros

```bash
curl "http://localhost:5801/api/audits/internal?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

### Upload de Anexo

```bash
curl -X POST http://localhost:5801/api/attachments \
  -H "Authorization: Bearer TOKEN" \
  -F "entityType=InternalAudit" \
  -F "entityId=INT-001" \
  -F "file=@documento.pdf"
```

## 🔗 Recursos Adicionais

- [Swagger UI](http://localhost:5801/api/docs) - Documentação interativa
- [Guia de Deployment](../DEPLOYMENT.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
