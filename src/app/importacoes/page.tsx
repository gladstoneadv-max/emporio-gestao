'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import * as XLSX from 'xlsx'

export default function ImportacoesPage() {
  const [carregando, setCarregando] = useState(true)
  const [tipoSelecionado, setTipoSelecionado] = useState('vendas')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [status, setStatus] = useState('')
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

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    setStatus('')
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[]
      setPreview(json.slice(0, 6))
    }
    reader.readAsBinaryString(file)
  }

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
            <h1 className="text-xl font-medium text-gray-900">Importações</h1>
            <p className="text-sm text-gray-500 mt-1">Faça upload das suas planilhas</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Tipo de importação</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { tipo: 'vendas', icone: '📊', nome: 'Vendas', desc: 'Relatorio_Vendas_*.xls' },
                { tipo: 'compras', icone: '📦', nome: 'Compras', desc: 'relatorio_compra_*.xlsx' },
                { tipo: 'despesas', icone: '💰', nome: 'Despesas', desc: 'planilha_Despesas_*.xlsx' },
              ].map((item) => (
                <button
                  key={item.tipo}
                  onClick={() => {
                    setTipoSelecionado(item.tipo)
                    setPreview([])
                    setArquivo(null)
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    tipoSelecionado === item.tipo
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{item.icone}</div>
                  <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Arquivo</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-gray-400 transition-colors">
              <div className="text-3xl mb-3">⬆</div>
              <p className="text-sm font-medium text-gray-900">
                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-gray-400 mt-1">.xls e .xlsx suportados</p>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleArquivo}
                className="hidden"
              />
            </label>
          </div>

          {preview.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
                Prévia — primeiras linhas do arquivo
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {preview.map((linha, i) => (
                      <tr key={i} className={i === 0 ? 'bg-gray-50' : ''}>
                        {(linha as any[]).slice(0, 8).map((cel, j) => (
                          <td key={j} className="border border-gray-100 px-2 py-1 text-gray-700 max-w-32 truncate">
                            {String(cel ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setStatus('Arquivo validado! Pronto para importar.')}
                  className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Confirmar importação
                </button>
                <button
                  onClick={() => {
                    setPreview([])
                    setArquivo(null)
                  }}
                  className="border border-gray-200 text-gray-500 rounded-lg px-5 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              {status && (
                <p className="mt-3 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">{status}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}