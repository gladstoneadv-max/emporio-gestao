'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarMes(periodo: string) {
  if (!periodo) return ''
  const [mes, ano] = periodo.split('/')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(mes) - 1]}/${ano?.slice(2)}`
}

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true)
  const [totais, setTotais] = useState<any>(null)
  const [vendasMes, setVendasMes] = useState<any[]>([])
  const [topProdutos, setTopProdutos] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) { router.push('/login'); return }

      const { data: t } = await supabase.from('dashboard_totais').select('*').single()
      setTotais(t)

      const { data: vm } = await supabase.from('vendas_por_mes').select('*')
      setVendasMes((vm || []).slice(-6))

      const { data: tp } = await supabase.from('top_produtos').select('*')
      setTopProdutos(tp || [])

      setCarregando(false)
    }
    carregar()
  }, [])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  const faturamento = parseFloat(totais?.faturamento || 0)
  const custoTotal = parseFloat(totais?.custo_total || 0)
  const despesas = parseFloat(totais?.despesas || 0)
  const lucroLiquido = faturamento - custoTotal - despesas
  const maxVendas = Math.max(...vendasMes.map(v => parseFloat(v.total) || 0), 1)

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Visão geral do negócio</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Faturamento', valor: faturamento, cor: 'text-gray-900' },
              { label: 'Custo Total', valor: custoTotal, cor: 'text-gray-900' },
              { label: 'Despesas', valor: despesas, cor: 'text-gray-900' },
              { label: 'Lucro Líquido', valor: lucroLiquido, cor: lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                <p className={`text-2xl font-medium ${card.cor}`}>{formatarMoeda(card.valor)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Vendas realizadas', valor: parseInt(totais?.total_vendas || 0), sufixo: 'itens' },
              { label: 'Compras realizadas', valor: parseInt(totais?.total_compras || 0), sufixo: 'itens' },
              { label: 'Produtos cadastrados', valor: parseInt(totais?.total_produtos || 0), sufixo: 'produtos' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                <p className="text-2xl font-medium text-gray-900">
                  {card.valor.toLocaleString('pt-BR')} <span className="text-sm font-normal text-gray-400">{card.sufixo}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm font-medium text-gray-900 mb-6">Faturamento por mês</p>
              <div className="flex items-end gap-2 h-40">
                {vendasMes.map((v) => (
                  <div key={v.periodo_ref} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-500 text-center leading-tight">
                      {formatarMoeda(parseFloat(v.total)).replace('R$\xa0', '')}
                    </p>
                    <div
                      className="w-full bg-gray-900 rounded-t"
                      style={{ height: `${Math.max(4, (parseFloat(v.total) / maxVendas) * 100)}px` }}
                    />
                    <p className="text-xs text-gray-400">{formatarMes(v.periodo_ref)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm font-medium text-gray-900 mb-6">Top produtos por faturamento</p>
              <div className="space-y-3">
                {topProdutos.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-700 truncate max-w-48">{p.nome}</p>
                      <p className="text-xs font-medium text-gray-900">{formatarMoeda(parseFloat(p.total))}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full"
                        style={{ width: `${(parseFloat(p.total) / parseFloat(topProdutos[0]?.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}


 
   
   
  
    
     
        
              
           
