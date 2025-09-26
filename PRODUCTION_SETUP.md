# 🚀 Configuração para Produção

## 📋 Pré-requisitos

### 1. Configurar Supabase Storage
```sql
-- No painel do Supabase, execute:
-- 1. Vá para Storage
-- 2. Crie um bucket chamado "documents"
-- 3. Configure as políticas de segurança:

-- Política para upload (usuários autenticados podem fazer upload)
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para download (usuários podem baixar seus próprios documentos)
CREATE POLICY "Users can download own documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para exclusão (usuários podem excluir seus próprios documentos)
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Variáveis de Ambiente
Certifique-se que o arquivo `.env` contém:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

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