# Discovery Document

## 1. Entidades Principais
- **Auditorias Internas**: id, ano, setor, responsável, descrição, dataPrevista, execucao, status, acoesGeradas
- **Auditorias Externas**: id, ano, setor, responsável, descrição, dataPrevista, execucao, status, acoesGeradas, entidadeAuditora, conclusoes
- **Ações**: id, origem, acaoRelacionada, setor, descricao, dataAbertura, dataLimite, dataConclusao, impacto, status
- **Ocorrências**: id, setor, responsável, data, descricao, gravidade, acaoGerada, status
- **Setores**: id, nome, responsável, email, telefone, descricao, ativo
- **Utilizadores**: id, nome, email, passwordHash, role (admin, auditor, gestor), tenantId
- **Tenants (Empresas)**: id, nome, dominio, configuracoes

## 2. Processos de Negócio
1. **Criação de Auditoria** – formulário → validação → POST `/audits/internal` ou `/audits/external`.
2. **Gestão de Ações** – criação/edição → vínculo a auditoria ou ocorrência → POST `/actions`.
3. **Registo de Ocorrências** – captura de incidente → POST `/occurrences`.
4. **Importação de Dados** – upload Excel → parsing → validação → endpoint `/import` (merge/replace).
5. **Relatórios e KPIs** – consultas agregadas via `/summary` para dashboards.
6. **Gestão de Setores** – CRUD de setores → `/sectors`.
7. **Autenticação e Autorização** – login → JWT → middleware RBAC.

## 3. Requisitos Legais e de Conformidade
- **LGPD / GDPR**:
  - Dados pessoais (nome, email, telefone) devem ser armazenados criptografados.
  - Consentimento explícito para coleta de dados de auditoria.
  - Direito ao esquecimento – endpoint de exclusão de utilizador e anonimização de registros.
- **ISO 9001 / ISO 14001**:
  - Manter histórico de auditorias por no mínimo 5 anos.
  - Garantir integridade e rastreabilidade (audit logs).
- **Retenção de Dados**:
  - Configurável por tenant (ex.: 2‑5 anos).
  - Backup diário e retenção de logs por 30 dias.
- **Segurança**:
  - Comunicação HTTPS.
  - Senhas hash com Argon2.
  - Tokens JWT com expiração curta e refresh token.

## 4. Próximos Passos de Discovery
- Validar lista de campos com stakeholders.
- Definir mapeamento de colunas do Excel para cada entidade.
- Documentar fluxos de UI (wireframes) para criação/edição.
- Priorizar requisitos de compliance para a primeira release.

---
*Este documento será a base para a fase de arquitetura e para a modelagem do banco de dados.*





