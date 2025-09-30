# Instruções de Deploy - Supabase

## 1. Criar Bucket de Storage

Execute o SQL no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/create_docs_storage_bucket.sql
```

Este script cria:
- Bucket privado 'docs' com limite de 50MB
- Políticas RLS para controle de acesso
- Permissões para upload/download/delete apenas para donos de processos

## 2. Adicionar Campos ao Schema

Execute o SQL no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/add_procuracao_fields.sql
```

Este script adiciona:
- `procuracao_file_id` - ID único do arquivo
- `procuracao_storage_path` - Caminho no bucket
- `procuracao_file_metadata` - Metadados do arquivo (JSONB)

## 3. Deploy da Edge Function

### Opção A: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em "Edge Functions"
3. Clique em "Deploy new function"
4. Nome: `getSignedUploadUrl`
5. Copie o conteúdo de `supabase/functions/getSignedUploadUrl/index.ts`
6. Cole no editor
7. Clique em "Deploy function"

### Opção B: Via CLI (se disponível)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy da função
supabase functions deploy getSignedUploadUrl
```

## 4. Verificar Deployment

### Testar a Edge Function

```bash
curl -X POST \
  'https://SEU_PROJECT_ID.supabase.co/functions/v1/getSignedUploadUrl' \
  -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "process_id": "UUID_DO_PROCESSO",
    "filename": "procuracao.pdf",
    "contentType": "application/pdf"
  }'
```

### Resposta Esperada

```json
{
  "uploadUrl": "https://...",
  "storagePath": "process_id/timestamp-random-filename.pdf",
  "fileId": "unique_token"
}
```

## 5. Configuração do Frontend

O frontend já está configurado para usar a Edge Function. Certifique-se de que:

1. O arquivo `.env` contém:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```

2. O componente `ProcurationUpload` é usado em `CollaborationPanel`

## 6. Fluxo de Upload

1. Usuário seleciona arquivo PDF/imagem/documento
2. Frontend valida arquivo (tamanho, tipo)
3. Frontend chama Edge Function para obter URL assinada
4. Edge Function valida permissões do usuário
5. Edge Function retorna URL assinada
6. Frontend faz upload direto para Storage
7. Frontend salva referência no banco de dados

## 7. Segurança

- Bucket é privado (public=false)
- RLS ativo em todas as políticas
- Apenas donos de processos podem fazer upload
- URLs assinadas expiram automaticamente
- Validação de tipo e tamanho de arquivo

## 8. Troubleshooting

### Erro: "Missing authorization header"
- Verificar se o token de autenticação está sendo enviado
- Verificar se o usuário está logado

### Erro: "Process not found"
- Verificar se o process_id existe
- Verificar se o usuário tem permissão no processo

### Erro: "Failed to create signed upload URL"
- Verificar se o bucket 'docs' foi criado
- Verificar as políticas RLS no storage.objects

### Erro de CORS
- Verificar se os headers CORS estão configurados na Edge Function
- Verificar se os headers incluem: Content-Type, Authorization, X-Client-Info, Apikey

## 9. Monitoramento

Acesse o Supabase Dashboard:
- Edge Functions → Logs para ver execuções
- Storage → docs para ver arquivos
- Database → Tables → process_collaborators para ver metadados
