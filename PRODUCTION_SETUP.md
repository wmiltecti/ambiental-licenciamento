# 🚀 Configuração para Produção

## 📋 Pré-requisitos

### 1. Executar Migrations do Banco de Dados

Execute na ordem no Supabase SQL Editor:

#### Migration 1: Adicionar Campos ao Processo
```sql
-- Arquivo: supabase/migrations/add_process_fields.sql
-- Adiciona campos: location, area, coordinates, environmental_impact, estimated_value
```

#### Migration 2: Criar Bucket de Storage
```sql
-- Arquivo: supabase/migrations/create_docs_storage_bucket.sql
-- Cria bucket privado 'docs' com políticas RLS
```

#### Migration 3: Adicionar Campos de Procuração
```sql
-- Arquivo: supabase/migrations/add_procuracao_fields.sql
-- Adiciona campos para upload de procuração
```

### 2. Deploy Edge Function

**Via Supabase Dashboard:**
1. Acesse Edge Functions
2. New Function → Nome: `getSignedUploadUrl`
3. Cole código de `supabase/functions/getSignedUploadUrl/index.ts`
4. Deploy

**Via CLI (opcional):**
```bash
supabase functions deploy getSignedUploadUrl
```

### 3. Variáveis de Ambiente
Certifique-se que o arquivo `.env` contém:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 🔄 Fluxo de Criação de Processo

### Wizard de 4 Passos

**Passo 1 - Informações Básicas:**
- Tipo de Licença (LP/LI/LO)
- Impacto Ambiental
- Razão Social, CNPJ, Atividade
- ✅ Validação: campos obrigatórios

**Passo 2 - Localização:**
- Estado, Município, Endereço
- Área e Coordenadas GPS (opcionais)
- ✅ Validação: localização completa

**Passo 3 - Detalhes do Projeto:**
- Descrição detalhada
- Valor estimado (opcional)
- ✅ Validação: descrição obrigatória

**Passo 4 - Documentação:**
- Upload de múltiplos PDFs/documentos
- Lista de documentos obrigatórios
- ✅ Validação: opcional (pode criar sem docs)

### Salvamento no Banco

Quando o usuário clica em **"Criar Processo"**:

1. **Valida** todos os campos obrigatórios
2. **Cria empresa** na tabela `companies`
3. **Cria processo** na tabela `license_processes` com todos os dados:
   - Informações básicas
   - Localização completa
   - Detalhes do projeto
   - Status inicial: `submitted`
   - Progresso: 0%
4. **Faz upload** de documentos (se houver):
   - Para cada arquivo:
     - Obtém URL assinada via Edge Function
     - Upload direto para Storage (bucket 'docs')
     - Salva metadados em `process_documents`
5. **Atualiza UI** automaticamente

## 🔧 Passos para Deploy

### 1. Build do Projeto
```bash
npm run build
```

### 2. Deploy
Você pode usar qualquer uma dessas opções:

#### Opção A: Netlify
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Opção B: Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Opção C: Bolt Hosting (Recomendado)
Use o botão de deploy no próprio Bolt para deploy automático.

## ✅ Funcionalidades em Produção

### 📤 Upload Real
- ✅ Arquivos salvos no Supabase Storage
- ✅ Metadados no banco de dados
- ✅ Validação de tipos de arquivo
- ✅ Controle de tamanho

### 📥 Download Real
- ✅ Download direto do Storage
- ✅ Arquivos originais preservados
- ✅ Nomes de arquivo mantidos

### 👁️ Visualização
- ✅ Arquivos de texto: conteúdo real
- ✅ PDFs: download para visualização
- ✅ Imagens: download para visualização
- ✅ Outros: informações + download

### 🗑️ Exclusão
- ✅ Remove do Storage
- ✅ Remove do banco de dados
- ✅ Verificação de propriedade
- ✅ Cleanup automático

## 🔒 Segurança

### RLS (Row Level Security)
- ✅ Usuários só veem seus documentos
- ✅ Usuários só podem excluir seus documentos
- ✅ Upload restrito a usuários autenticados

### Storage Policies
- ✅ Acesso baseado em autenticação
- ✅ Estrutura de pastas por usuário
- ✅ Controle de permissões

## 📊 Monitoramento

### Logs de Produção
- ✅ Upload/download tracking
- ✅ Error logging
- ✅ Performance monitoring

### Métricas
- ✅ Número de documentos
- ✅ Tamanho total de storage
- ✅ Atividade por usuário

## 🚨 Troubleshooting

### Problemas Comuns:

1. **Erro de Storage**: Verificar se o bucket "documents" existe
2. **Erro de Permissão**: Verificar políticas RLS
3. **Upload Falha**: Verificar tamanho do arquivo (limite padrão: 50MB)
4. **Download Falha**: Verificar se o arquivo existe no storage

### Debug:
```javascript
// Verificar se o storage está configurado
const { data, error } = await supabase.storage.listBuckets();
console.log('Buckets:', data);
```

## 🎯 Próximos Passos

1. **Deploy** usando uma das opções acima
2. **Testar** upload/download em produção
3. **Configurar** monitoramento
4. **Otimizar** performance se necessário

**Agora o sistema está pronto para produção com storage real!** 🚀