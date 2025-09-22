import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('analista');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name, role);
      }
      onClose();
    } catch (err: any) {
      console.error('Erro detalhado no cadastro:', err);
      
      // Mostrar mensagem específica baseada no erro
      if (err.message.includes('Cadastro realizado! Verifique seu email')) {
        // Para cadastros que requerem confirmação de email
        alert(err.message);
        onClose();
      } else {
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRole('analista');
    setError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
              </h2>
              <p className="text-sm text-gray-500">Sistema de Licenciamento Ambiental</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Digite seu nome completo"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Digite seu email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Digite sua senha"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perfil de Usuário
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="analista">Analista Ambiental</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-green-600 hover:text-green-700 transition-colors"
            >
              {isLogin ? 'Não tem conta? Criar nova conta' : 'Já tem conta? Fazer login'}
            </button>
          </div>
        </form>

        {/* Demo Credentials and Setup Instructions */}
        {isLogin && (
          <div className="px-6 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Primeiros Passos:</h4>
              <div className="text-xs text-blue-800 space-y-2">
                <div>
                  <p className="font-medium">1. Criar sua primeira conta:</p>
                  <p>Clique em "Não tem conta? Criar nova conta" abaixo</p>
                </div>
                <div>
                  <p className="font-medium">2. Ou use contas de teste (se já criadas):</p>
                  <p><strong>Analista:</strong> ana.silva@meioambiente.gov.br / 123456</p>
                  <p><strong>Gestor:</strong> maria.costa@meioambiente.gov.br / 123456</p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>⚠️ Configuração Importante:</strong> No Supabase Dashboard → Authentication → Settings, certifique-se que <strong>"Enable email confirmations" está DESABILITADO</strong> para desenvolvimento.
                </p>
              </div>
              <div className="mt-2">
                <button
                  onClick={async () => {
                    try {
                      // Create demo users
                      await signUp('ana.silva@meioambiente.gov.br', '123456', 'Ana Silva', 'analista');
                      await signUp('maria.costa@meioambiente.gov.br', '123456', 'Maria Costa', 'gestor');
                      alert('Contas de demonstração criadas com sucesso! Agora você pode fazer login com elas.');
                    } catch (error) {
                      console.error('Error creating demo users:', error);
                      alert('Erro ao criar contas de demonstração: ' + (error as Error).message);
                    }
                  }}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  🔧 Criar Contas de Demonstração
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}