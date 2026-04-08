'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'

interface DadosDashboard {
  faturamento: number
  custoTotal: number
  despesas: number
  lucroLiquido: number
  totalVendas: number
  totalCompras: number
  totalProdutos: number
  vendasPorMes: { mes: string; total: number }[]
  topProdutos: { nome: string; total: number }[]
}

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
  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [mesSelecionado, setMesSelecionado] = useState<string>('todos')
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) { router.push('/login'); return }

      // Buscar meses disponíveis das vendas
      const { data: meses } = await supabase
        .from('vendas')
        .select('periodo_ref')
        .not('periodo_ref', 'is', null)

      const mesesUnicos = [...new Set((meses || []).map(v => v.periodo_ref).filter(Boolean))].sort()
      setMesesDisponiveis(mesesUnicos)

      await buscarDados('todos')
    }
    carregar()
  }, [])

  async function buscarDados(mes: string) {
    setCarregando(true)

    // Faturamento (vendas)
    let queryVendas = supabase.from('vendas').select('valor_total, periodo_ref, produto_id')
    if (mes !== 'todos') queryVendas = queryVendas.eq('periodo_ref', mes)
    const { data: vendas } = await queryVendas

    // Custo (compras)
    let queryCompras = supabase.from('compras').select('valor_total, data')
    if (mes !== 'todos') {
      const [m, a] = mes.split('/')
      const inicio = `${a}-${m.padStart(2,'0')}-01`
      const fim = `${a}-${m.padStart(2,'0')}-31`
      queryCompras = queryCompras.gte('data', inicio).lte('data', fim)
    }
    const { data: compras } = await queryCompras

    // Despesas
    let queryDespesas = supabase.from('despesas').select('valor, mes_referencia')
    if (mes !== 'todos') queryDespesas = queryDespesas.eq('mes_referencia', mes)
    const { data: despesas } = await queryDespesas

    // Produtos
    const { count: totalProdutos } = await supabase.from('produtos').select('id', { count: 'exact', head: true })

    // Calcular totais
    const faturamento = (vendas || []).reduce((s, v) => s + (parseFloat(v.valor_total) || 0), 0)
    const custoTotal = (compras || []).reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
    const totalDespesas = (despesas || []).reduce((s, d) => s + (parseFloat(d.valor) || 0), 0)
    const lucroLiquido = faturamento - custoTotal - totalDespesas

    // Vendas por mês (últimos 6 meses)
    const { data: vendasMes } = await supabase
      .from('vendas')
      .select('valor_total, periodo_ref')
      .not('periodo_ref', 'is', null)

    const porMes: Record<string, number> = {}
    ;(vendasMes || []).forEach(v => {
      if (v.periodo_ref) {
        porMes[v.periodo_ref] = (porMes[v.periodo_ref] || 0) + (parseFloat(v.valor_total) || 0)
      }
    })
    const vendasPorMes = Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, total]) => ({ mes, total }))

    // Top 5 produtos por faturamento
    const produtoTotais: Record<string, { nome: string; total: number }> = {}
    ;(vendas || []).forEach(v => {
      if (v.produto_id) {
        if (!produtoTotais[v.produto_id]) produtoTotais[v.produto_id] = { nome: v.produto_id, total: 0 }
        produtoTotais[v.produto_id].total += parseFloat(v.valor_total) || 0
      }
    })

    // Buscar nomes dos top produtos
    const topIds = Object.entries(produtoTotais)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 5)
      .map(([id]) => id)

    const { data: produtosNomes } = await supabase
      .from('produtos')
      .select('id, nome')
      .in('id', topIds)

    const topProdutos = topIds.map(id => ({
      nome: produtosNomes?.find(p => p.id === id)?.nome || id,
      total: produtoTotais[id].total
    }))

    setDados({
      faturamento,
      custoTotal,
      despesas: totalDespesas,
      lucroLiquido,
      totalVendas: (vendas || []).length,
      totalCompras: (compras || []).length,
      totalProdutos: totalProdutos || 0,
      vendasPorMes,
      topProdutos,
    })
    setCarregando(false)
  }

  function handleMes(mes: string) {
    setMesSelecionado(mes)
    buscarDados(mes)
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  const maxVendas = Math.max(...(dados?.vendasPorMes.map(v => v.total) || [1]))

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Visão geral do negócio</p>
            </div>
            {/* Filtro por mês */}
            <select
              value={mesSelecionado}
              onChange={(e) => handleMes(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="todos">Todos os períodos</option>
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{formatarMes(m)}</option>
              ))}
            </select>
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Faturamento', valor: dados?.faturamento || 0, cor: 'text-gray-900' },
              { label: 'Custo Total', valor: dados?.custoTotal || 0, cor: 'text-gray-900' },
              { label: 'Despesas', valor: dados?.despesas || 0, cor: 'text-gray-900' },
              { label: 'Lucro Líquido', valor: dados?.lucroLiquido || 0, cor: (dados?.lucroLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                <p className={`text-2xl font-medium ${card.cor}`}>{formatarMoeda(card.valor)}</p>
              </div>
            ))}
          </div>

          {/* Cards secundários */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Vendas realizadas', valor: dados?.totalVendas || 0, sufixo: 'itens' },
              { label: 'Compras realizadas', valor: dados?.totalCompras || 0, sufixo: 'itens' },
              { label: 'Produtos cadastrados', valor: dados?.totalProdutos || 0, sufixo: 'produtos' },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                <p className="text-2xl font-medium text-gray-900">{card.valor.toLocaleString('pt-BR')} <span className="text-sm font-normal text-gray-400">{card.sufixo}</span></p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Gráfico de vendas por mês */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm font-medium text-gray-900 mb-6">Faturamento por mês</p>
              <div className="flex items-end gap-2 h-40">
                {(dados?.vendasPorMes || []).map((v) => (
                  <div key={v.mes} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-500">{formatarMoeda(v.total).replace('R$\xa0', '')}</p>
                    <div
                      className="w-full bg-gray-900 rounded-t"
                      style={{ height: `${Math.max(4, (v.total / maxVendas) * 120)}px` }}
                    />
                    <p className="text-xs text-gray-400">{formatarMes(v.mes)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top produtos */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-sm font-medium text-gray-900 mb-6">Top produtos por faturamento</p>
              <div className="space-y-3">
                {(dados?.topProdutos || []).map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-700 truncate max-w-48">{p.nome}</p>
                      <p className="text-xs font-medium text-gray-900">{formatarMoeda(p.total)}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full"
                        style={{ width: `${(p.total / (dados?.topProdutos[0]?.total || 1)) * 100}%` }}
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