'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'

const D = [
  { id: 1, nome: 'Folha funcionarios', tipo: 'fixa', valor: 9000 },
  { id: 2, nome: 'Aluguel', tipo: 'fixa', valor: 3900 },
  { id: 3, nome: 'Energia', tipo: 'fixa', valor: 3300 },
  { id: 4, nome: 'Pro labore', tipo: 'fixa', valor: 4000 },
  { id: 5, nome: 'GPS', tipo: 'variavel', valor: 800 },
  { id: 6, nome: 'Simples Nacional', tipo: 'variavel', valor: 1600 },
  { id: 7, nome: 'Juros maquinha', tipo: 'variavel', valor: 1000 },
  { id: 8, nome: 'Transporte', tipo: 'variavel', valor: 679 },
  { id: 9, nome: 'Contador', tipo: 'fixa', valor: 560 },
  { id: 10, nome: 'FGTS', tipo: 'fixa', valor: 720 },
  { id: 11, nome: 'Internet', tipo: 'fixa', valor: 99 },
  { id: 12, nome: 'Telefone', tipo: 'fixa', valor: 80 },
  { id: 13, nome: 'Sistema', tipo: 'fixa', valor: 99 },
  { id: 14, nome: 'Tarifa banco', tipo: 'variavel', valor: 106 },
  { id: 15, nome: 'Condominio', tipo: 'fixa', valor: 60 },
]

export default function DespesasPage() {
  const [carregando, setCarregando] = useState(true)
  const [despesas, setDespesas] = useState(D)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('fixa')
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

  function addDespesa() {
    if (!nome || !valor) return
    setDespesas([...despesas, { id: Date.now(), nome, tipo, valor: parseFloat(valor) }])
    setNome('')
    setValor('')
  }

  const total = despesas.reduce((s, d) => s + d.valor, 0)
  const fixas = despesas.filter(d => d.tipo === 'fixa').reduce((s, d) => s + d.valor, 0)
  const variaveis = despesas.filter(d => d.tipo === 'variavel').reduce((s, d) => s + d.valor, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-xl font-medium text-gray-900">Despesas</h1>
            <p className="text-sm text-gray-500 mt-1">Marco / 2026</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total</p>
              <p className="text-2xl font-medium text-gray-900">{fmt(total)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Fixas</p>
              <p className="text-2xl font-medium text-gray-900">{fmt(fixas)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Variaveis</p>
              <p className="text-2xl font-medium text-gray-900">{fmt(variaveis)}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Adicionar despesa</p>
            <div className="flex gap-3">
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <input
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="Valor"
                type="number"
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="fixa">Fixa</option>
                <option value="variavel">Variavel</option>
              </select>
              <button
                onClick={addDespesa}
                className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-700"
              >
                + Adicionar
              </button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase font-medium">Despesa</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase font-medium">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase font-medium">Valor</th>
                  <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900">{d.nome}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${d.tipo === 'fixa' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {d.tipo === 'fixa' ? 'Fixa' : 'Variavel'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900">{fmt(d.valor)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{(d.valor / total * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}