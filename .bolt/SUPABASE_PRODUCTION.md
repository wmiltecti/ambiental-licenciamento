# 🚀 Configuração do Supabase para Produção

## 📋 Passos Obrigatórios

### 1. 🗄️ Configurar Storage (Bucket para Documentos)

No painel do Supabase:

1. **Vá para Storage** no menu lateral
2. **Crie um bucket** chamado `documents`
3. **Configure como público** se necessário, ou mantenha privado com políticas RLS

### 2. 🔐 Configurar Políticas de Segurança (RLS)

Execute estes comandos SQL no **SQL Editor** do Supabase:

```sql
-- Políticas para o bucket de documentos
-- Usuários podem fazer upload de seus próprios documentos
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem baixar seus próprios documentos
CREATE POLICY "Users can download own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem excluir seus próprios documentos
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. 📧 Configurar Autenticação

No painel do Supabase:

1. **Vá para Authentication > Settings**
2. **Desabilite "Enable email confirmations"** (já está configurado no código)
3. **Configure o Site URL** para: `https://sistema-de-licenciam-q759.bolt.host`
4. **Adicione URLs de redirecionamento** se necessário

### 3.1. 🔧 Configuração Específica de URLs

No painel do Supabase, vá para **Authentication > URL Configuration**:

1. **Site URL**: `https://sistema-de-licenciam-q759.bolt.host`
2. **Redirect URLs**: Adicione:
   - `https://sistema-de-licenciam-q759.bolt.host`
   - `https://sistema-de-licenciam-q759.bolt.host/**`
   - `https://sistema-de-licenciam-q759.bolt.host/auth/callback`

### 3.2. 📧 Templates de Email

Se necessário, configure os templates de email em **Authentication > Email Templates**:
- **Confirm signup**: Altere `{{ .SiteURL }}` para `https://sistema-de-licenciam-q759.bolt.host`
- **Magic Link**: Altere `{{ .SiteURL }}` para `https://sistema-de-licenciam-q759.bolt.host`
- **Change Email Address**: Altere `{{ .SiteURL }}` para `https://sistema-de-licenciam-q759.bolt.host`

### 4. 🌐 Configurar URLs de Produção

1. **No painel do Supabase**, vá para **Settings > API**
2. **Copie sua URL do projeto** e **Anon key**
3. **Configure as variáveis de ambiente** no seu serviço de deploy:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 5. 🔒 Verificar Políticas RLS das Tabelas

Certifique-se que todas as tabelas têm RLS habilitado:

```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Se alguma tabela não tiver RLS, habilite:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### 6. 🚨 Corrigir Recursão Infinita em Políticas RLS

**CRÍTICO**: Se houver erros de "infinite recursion detected in policy", execute:

```sql
-- Remover políticas que causam recursão
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;

-- Criar políticas simples e seguras
CREATE POLICY "license_processes_select_own" ON license_processes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "license_processes_insert_own" ON license_processes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_update_own" ON license_processes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_delete_own" ON license_processes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "process_collaborators_select_own" ON process_collaborators
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "process_collaborators_manage_as_owner" ON process_collaborators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM license_processes WHERE id = process_collaborators.process_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM license_processes WHERE id = process_collaborators.process_id AND user_id = auth.uid()));
```

## ✅ Checklist de Produção

- [ ] Bucket `documents` criado no Storage
- [ ] Políticas de Storage configuradas
- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas de RLS configuradas para todas as tabelas
- [ ] **Políticas RLS corrigidas para evitar recursão infinita**
- [ ] Email confirmation desabilitado
- [ ] Site URL configurado
- [ ] Variáveis de ambiente configuradas no deploy
- [ ] Testado upload/download de documentos
- [ ] Testado autenticação (login/registro)
- [ ] Testado criação de processos

## 🚨 Problemas Comuns

### Erro de Recursão Infinita
```
Error: infinite recursion detected in policy for relation "license_processes"
```
**Solução**: Executar o SQL de correção de políticas RLS (seção 6)

### Erro de Storage
```
Error: The resource was not found
```
**Solução**: Verificar se o bucket `documents` existe

### Erro de Permissão
```
Error: new row violates row-level security policy
```
**Solução**: Verificar políticas RLS das tabelas

### Erro de Autenticação
```
Error: Invalid JWT
```
**Solução**: Verificar se as variáveis de ambiente estão corretas

## 🔧 Comandos Úteis para Debug

```sql
-- Verificar buckets existentes
SELECT * FROM storage.buckets;

-- Verificar políticas de storage
SELECT * FROM storage.policies;

-- Verificar usuários
SELECT * FROM auth.users LIMIT 5;

-- Verificar dados de teste
SELECT COUNT(*) FROM license_processes;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM process_documents;
```

## 📊 Monitoramento

Após o deploy, monitore:

1. **Logs de erro** no painel do Supabase
2. **Uso de Storage** (limite gratuito: 1GB)
3. **Número de requisições** (limite gratuito: 50.000/mês)
4. **Usuários ativos**

---

**⚠️ IMPORTANTE**: Faça backup dos dados antes de aplicar mudanças em produção!