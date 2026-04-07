'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'

const PRODUTOS = [
  { id: 1, nome: 'Picanha Emporio', cat: 'Carnes Bovinas', fat: 4495, custo: 2776, lucro: 448, margem: 9.98 },
  { id: 2, nome: 'Costela Bovina', cat: 'Carnes Bovinas', fat: 3820, custo: 2100, lucro: 380, margem: 9.95 },
  { id: 3, nome: 'Queijo Canastra', cat: 'Laticinios', fat: 3200, custo: 1600, lucro: 620, margem: 19.4 },
  { id: 4, nome: 'File Mignon', cat: 'Carnes Bovinas', fat: 5100, custo: 3400, lucro: 590, margem: 11.6 },
  { id: 5, nome: 'Mortadela Bolonha', cat: 'Embutidos', fat: 1800, custo: 900, lucro: 310, margem: 17.2 },
  { id: 6, nome: 'Presunto Cozido', cat: 'Embutidos', fat: 1600, custo: 900, lucro: 210, margem: 13.1 },
  { id: 7, nome: 'Mussarela Fatiada', cat: 'Laticinios', fat: 2800, custo: 1500, lucro: 420, margem: 15.0 },
  { id: 8, nome: 'Alcatra Bovina', cat: 'Carnes Bovinas', fat: 3600, custo: 2300, lucro: 360, margem: 10.0 },
  { id: 9, nome: 'Calabresa Defumada', cat: 'Embutidos', fat: 1200, custo: 600, lucro: 230, margem: 19.2 },
  { id: 10, nome: 'Requeijao Cremoso', cat: 'Laticinios', fat: 900, custo: 400, lucro: 180, margem: 20.0 },
  { id: 11, nome: 'Contra-file', cat: 'Carnes Bovinas', fat: 2900, custo: 2000, lucro: 120, margem: 4.1 },
  { id: 12, nome: 'Bacon Fatiado', cat: 'Carnes Suinas', fat: 800, custo: 550, lucro: -18, margem: -2.3 },
  { id: 13, nome: 'Lombo Suino', cat: 'Carnes Suinas', fat: 1200, custo: 900, lucro: -32, margem: -2.7 },
  { id: 14, nome: 'Linguica Defumada', cat: 'Embutidos', fat: 950, custo: 500, lucro: 180, margem: 18.9 },
]

export default function ProdutosPage() {
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [prodSelecionado, setProdSelecionado] = useState<typeof PRODUTOS[0] | null>(null)
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

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const produtosFiltrados = PRODUTOS.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchCat = categoria === '' || p.cat === categoria
    return matchBusca && matchCat
  })

  const categorias = [...new Set(PRODUTOS.map(p => p.cat))]

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  if (prodSelecionado) {
    const desp = Math.round(26004 * prodSelecionado.fat / 98500)
    const perdas = Math.round(prodSelecionado.fat * 0.02)
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setProdSelecionado(null)}
              className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2"
            >
              &larr; Voltar para produtos
            </button>
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-xl font-medium text-gray-900">{prodSelecionado.nome}</h1>
                  <p className="text-sm text-gray-500 mt-1">{prodSelecionado.cat}</p>
                </div>
                <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">Ativo</span>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Faturamento</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(prodSelecionado.fat)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Custo</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(prodSelecionado.custo)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lucro</p>
                  <p className={`text-lg font-medium ${prodSelecionado.lucro < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(prodSelecionado.lucro)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Margem</p>
                  <p className={`text-lg font-medium ${prodSelecionado.margem < 0 ? 'text-red-600' : 'text-gray-900'}`}>{prodSelecionado.margem.toFixed(1)}%</p>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Demonstrativo de resultado</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">(+) Faturamento</td>
                      <td className="py-2 text-right font-mono text-gray-900">{fmt(prodSelecionado.fat)}</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">(-) Custo dos produtos</td>
                      <td className="py-2 text-right font-mono text-red-600">- {fmt(prodSelecionado.custo)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-900">(=) Margem bruta</td>
                      <td className="py-2 text-right font-mono font-medium text-gray-900">{fmt(prodSelecionado.fat - prodSelecionado.custo)}</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">(-) Perdas estimadas</td>
                      <td className="py-2 text-right font-mono text-red-600">- {fmt(perdas)}</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">(-) Despesas rateadas</td>
                      <td className="py-2 text-right font-mono text-red-600">- {fmt(desp)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-900">(=) Lucro liquido</td>
                      <td className={`py-3 text-right font-mono font-medium ${prodSelecionado.lucro < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(prodSelecionado.lucro)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-medium text-gray-900">Produtos</h1>
              <p className="text-sm text-gray-500 mt-1">{PRODUTOS.length} produtos cadastrados</p>
            </div>
          </div>
          <div className="flex gap-3 mb-6">
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {produtosFiltrados.map(p => {
              const cls = p.lucro < 0 ? 'text-red-600' : p.margem < 5 ? 'text-amber-600' : 'text-green-700'
              const badge = p.lucro < 0 ? 'bg-red-50 text-red-700' : p.margem < 5 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
              return (
                <div
                  key={p.id}
                  onClick={() => setProdSelecionado(p)}
                  className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${badge}`}>{p.margem.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">{p.cat}</p>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Faturamento</span>
                    <span className="font-mono text-gray-900">{fmt(p.fat)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Custo</span>
                    <span className="font-mono text-gray-900">{fmt(p.custo)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                    <span>Lucro liquido</span>
                    <span className={`font-mono font-medium ${cls}`}>{fmt(p.lucro)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}