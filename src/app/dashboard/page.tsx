'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificarLogin() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
      } else {
        setCarregando(false)
      }
    }
    verificarLogin()
  }, [])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Visão geral do negócio</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Faturamento', valor: 'R$ 98.500' },
              { label: 'Custo total', valor: 'R$ 44.500' },
              { label: 'Despesas', valor: 'R$ 26.004' },
              { label: 'Lucro líquido', valor: 'R$ 27.996' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                <p className="text-2xl font-medium text-gray-900">{card.valor}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm font-medium text-gray-900 mb-4">Sistema funcionando!</p>
            <p className="text-sm text-gray-500">
              O banco de dados está conectado e o login está funcionando. 
              As próximas etapas são construir as telas de importação, produtos e despesas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}