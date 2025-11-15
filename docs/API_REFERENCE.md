# API real para o Dashboard SGI

Esta aplicação já consegue alternar automaticamente entre dados mock e uma API real. Para ligares o teu backend basta:

1. Criar um ficheiro `.env` na raiz do projeto com  
   `VITE_API_BASE_URL=https://o-teu-servidor/api`
2. Reiniciar `npm run dev` ou `npm run build`.

Quando `VITE_API_BASE_URL` está definido, todas as chamadas passam a usar os endpoints abaixo. Caso alguma falhe, o mock local entra em ação automaticamente (fallback).

---

## Endpoints esperados

| Endpoint              | Método | Descrição                                           |
|-----------------------|--------|-----------------------------------------------------|
| `/audits/internal`    | GET    | Lista de auditorias internas                        |
| `/audits/external`    | GET    | Lista de auditorias externas                        |
| `/actions`            | GET    | Ações geradas (internas, externas ou ocorrências)   |
| `/occurrences`        | GET    | Ocorrências internas                                |
| `/sectors`            | GET    | Setores e responsáveis                              |
| `/import`             | POST   | Atualiza coleções enviadas (merge)                  |
| `/import/replace`     | POST   | Substitui TODAS as coleções pelo payload enviado    |
| `/import/reset`       | DELETE | Limpa todos os dados armazenados                    |

> TIP: se quiseres expor estes endpoints num único servidor Node/Express, basta criar rotas que devolvam JSON com os formatos seguintes.

---

## Estrutura dos objetos

### Auditorias internas (`InternalAudit`)
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
`status` deve ser um dos: `"Planeada" | "Em execução" | "Exec+Atraso" | "Atrasada" | "Executada"`.

### Auditorias externas (`ExternalAudit`)
Mesmo payload das internas **+** campos:
```json
{
  "entidadeAuditora": "Bureau Veritas",
  "conclusoes": "Texto livre com conclusões"
}
```

### Ações (`ActionItem`)
```json
{
  "id": "AC-1001",
  "origem": "Interna",
  "acaoRelacionada": "INT-001",
  "setor": "Qualidade",
  "descricao": "Actualizar instruções",
  "dataAbertura": "2025-01-01",
  "dataLimite": "2025-03-01",
  "dataConclusao": "2025-02-20",
  "impacto": "Médio",
  "status": "Concluída"
}
```
- `origem`: `"Interna" | "Externa" | "Ocorrência"`
- `impacto`: `"Baixo" | "Médio" | "Alto"`
- `status`: `"Concluída" | "Em andamento" | "Atrasada"`

### Ocorrências (`Occurrence`)
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
- `gravidade`: `"Baixa" | "Média" | "Alta" | "Crítica"`
- `status`: `"Aberta" | "Em mitigação" | "Resolvida"`

### Setores (`Sector`)
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

---

## Checklist para ligares o backend

1. **Modelos**: garante que o teu backend devolve JSON exatamente como acima (podes reutilizar `types/models.ts` no servidor se for TypeScript).
2. **CORS**: ativa CORS para permitir chamadas do `localhost:5173`.
3. **Autenticação** (opcional): se precisares de token, basta usar `fetch` com `headers`. Ajusta `fetchFromApi` em `src/services/mockApi.ts`.
4. **Importa dados reais (opcional)**: podes enviar um JSON completo para `POST /api/import/replace` ou ir atualizando por partes com `POST /api/import`.
5. **Testa**: define a env, corre `npm run dev`, abre a página de Configurações e confirma que “Fonte atual” mudou para “API remota”.

Se precisares de um exemplo de backend (Node/Express ou Fastify) posso gerar a estrutura rapidamente. Podes também expor estes dados através de um serviço serverless (Cloudflare Workers, Vercel, etc.) desde que respeite o contrato acima.***

