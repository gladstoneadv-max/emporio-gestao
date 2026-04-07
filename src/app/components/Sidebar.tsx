'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

const menus = [
  { nome: 'Dashboard', caminho: '/dashboard', icone: '◉' },
  { nome: 'Produtos', caminho: '/produtos', icone: '▦' },
  { nome: 'Importações', caminho: '/importacoes', icone: '↑' },
  { nome: 'Despesas', caminho: '/despesas', icone: '≡' },
  { nome: 'Configurações', caminho: '/configuracoes', icone: '⚙' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="w-48 min-w-48 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-900 uppercase tracking-widest">Empório Gestão</p>
        <p className="text-xs text-gray-400 mt-1">Painel gerencial</p>
      </div>

      <nav className="flex-1 p-2 flex flex-col gap-1 mt-2">
        {menus.map((menu) => (
          <button
            key={menu.caminho}
            onClick={() => router.push(menu.caminho)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors ${
              pathname === menu.caminho
                ? 'bg-white border border-gray-200 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-white hover:text-gray-900'
            }`}
          >
            <span className="text-xs">{menu.icone}</span>
            {menu.nome}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleSair}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
        >
          <span className="text-xs">→</span>
          Sair
        </button>
      </div>
    </div>
  )
}