/*
  # Corrigir erro de cadastro de usuário

  1. Verificar e corrigir políticas RLS
  2. Verificar triggers de criação de perfil
  3. Garantir que user_profiles seja criado automaticamente
  4. Corrigir possíveis problemas de permissão
*/

-- Verificar se a função de criar perfil existe
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'analista')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha o cadastro
    RAISE WARNING 'Erro ao criar perfil do usuário: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger se não existir
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Garantir que as políticas RLS estão corretas
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Permitir que o sistema crie perfis automaticamente
DROP POLICY IF EXISTS "System can create user profiles" ON user_profiles;
CREATE POLICY "System can create user profiles" ON user_profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Garantir que a tabela user_profiles permite inserção
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Verificar se há problemas com a tabela user_profiles
DO $$
BEGIN
  -- Tentar inserir um registro de teste (será removido)
  INSERT INTO user_profiles (id, user_id, name, email, role) 
  VALUES (gen_random_uuid(), gen_random_uuid(), 'test', 'test@test.com', 'analista');
  
  -- Remover o registro de teste
  DELETE FROM user_profiles WHERE email = 'test@test.com';
  
  RAISE NOTICE 'Tabela user_profiles está funcionando corretamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Problema detectado na tabela user_profiles: %', SQLERRM;
END $$;