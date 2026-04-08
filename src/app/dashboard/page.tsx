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
  const [faturamento, setFaturamento] = useState(0)
  const [custoTotal, setCustoTotal] = useState(0)
  const [despesas, setDespesas] = useState(0)
  const [totalVendas, setTotalVendas] = useState(0)
  const [totalCompras, setTotalCompras] = useState(0)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [vendasMes, setVendasMes] = useState<any[]>([])
  const [topProdutos, setTopProdutos] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) { router.push('/login'); return }

      // Faturamento - buscar em lotes
      let fatTotal = 0
      let page = 0
      while (true) {
        const { data } = await supabase
          .from('vendas')
          .select('valor_total')
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        fatTotal += data.reduce((s, v) => s + (parseFloat(v.valor_total) || 0), 0)
        if (data.length < 1000) break
        page++
      }
      setFaturamento(fatTotal)
      setTotalVendas(page * 1000 + (fatTotal > 0 ? 1 : 0))

      // Custo total compras
      let custoTot = 0
      page = 0
      while (true) {
        const { data } = await supabase
          .from('compras')
          .select('valor_total')
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        custoTot += data.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
        if (data.length < 1000) break
        page++
      }
      setCustoTotal(custoTot)

      // Despesas
      const { data: desp } = await supabase.from('despesas').select('valor')
      setDespesas((desp || []).reduce((s, d) => s + (parseFloat(d.valor) || 0), 0))

      // Contagens
      const { count: cv } = await supabase.from('vendas').select('id', { count: 'exact', head: true })
      setTotalVendas(cv || 0)
      const { count: cc } = await supabase.from('compras').select('id', { count: 'exact', head: true })
      setTotalCompras(cc || 0)
      const { count: cp } = await supabase.from('produtos').select('id', { count: 'exact', head: true })
      setTotalProdutos(cp || 0)

      // Vendas por mês - buscar agrupado
      const { data: vm } = await supabase
        .from('vendas')
        .select('periodo_ref, valor_total')
        .not('periodo_ref', 'is', null)
        .order('periodo_ref')
      
      const porMes: Record<string, number> = {}
      ;(vm || []).forEach(v => {
        if (v.periodo_ref) {
          porMes[v.periodo_ref] = (porMes[v.periodo_ref] || 0) + (parseFloat(v.valor_total) || 0)
        }
      })
      const meses = Object.entries(porMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mes, total]) => ({ mes, total }))
      setVendasMes(meses)

      // Top produtos
      const { data: tp } = await supabase
        .from('vendas')
        .select('produto_id, valor_total, produtos(nome)')
        .not('produto_id', 'is', null)
      
      const porProduto: Record<string, { nome: string; total: number }> = {}
      ;(tp || []).forEach((v: any) => {
        const nome = v.produtos?.nome || v.produto_id
        if (!porProduto[nome]) porProduto[nome] = { nome, total: 0 }
        porProduto[nome].total += parseFloat(v.valor_total) || 0
      })
      const top = Object.values(porProduto)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
      setTopProdutos(top)

      setCarregando(false)
    }
    carregar()
  }, [])

  const lucroLiquido = faturamento - custoTotal - despesas
  const maxVendas = Math.max(...vendasMes.map(v => v.total), 1)

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
              { label: 'Vendas realizadas', valor: totalVendas, sufixo: 'itens' },
              { label: 'Compras realizadas', valor: totalCompras, sufixo: 'itens' },
              { label: 'Produtos cadastrados', valor: totalProdutos, sufixo: 'produtos' },
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
                  <div key={v.mes} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-500 text-center leading-tight">
                      {formatarMoeda(v.total).replace('R$\xa0', '')}
                    </p>
                    <div
                      className="w-full bg-gray-900 rounded-t"
                      style={{ height: `${Math.max(4, (v.total / maxVendas) * 100)}px` }}
                    />
                    <p className="text-xs text-gray-400">{formatarMes(v.mes)}</p>
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
                      <p className="text-xs font-medium text-gray-900">{formatarMoeda(p.total)}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full"
                        style={{ width: `${(p.total / (topProdutos[0]?.total || 1)) * 100}%` }}
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
