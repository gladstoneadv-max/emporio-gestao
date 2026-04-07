'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import * as XLSX from 'xlsx'

// ─── tipos ────────────────────────────────────────────────────────────────────
type TipoImport = 'vendas' | 'compras' | 'despesas'

interface ResultadoImport {
  total: number
  inseridos: number
  erros: string[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseDateValue(val: unknown): string | null {
  if (!val) return null
  // Excel serial number
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      const d = new Date(Date.UTC(date.y, date.m - 1, date.d))
      return d.toISOString()
    }
  }
  // JS Date object (from xlsx library)
  if (val instanceof Date) return val.toISOString()
  // string
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

function parseNum(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0
  return 0
}

function getMesReferencia(data: string | null): string {
  if (!data) return ''
  const d = new Date(data)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${mes}/${ano}`
}

// ─── importadores ─────────────────────────────────────────────────────────────

async function importarCompras(
  rows: any[][],
  supabase: ReturnType<typeof createClient>,
  importacaoId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { total: 0, inseridos: 0, erros: [] }

  // Cabeçalho esperado: N° NF | Modelo | Fornecedor | Data da Compra | CFOP | Produto | Quantidade | Preço de Compra | Desconto | Total NF
  const dataRows = rows.slice(1).filter(r => r.some(c => c != null && c !== ''))
  resultado.total = dataRows.length

  // Cache de produtos e fornecedores
  const produtoCache: Record<string, string> = {}
  const fornecedorCache: Record<string, string> = {}

  for (const row of dataRows) {
    try {
      const nfNumero = String(row[0] ?? '').trim()
      const fornecedorNome = String(row[2] ?? '').trim()
      const dataCompra = parseDateValue(row[3])
      const nomeProduto = String(row[5] ?? '').trim()
      const quantidade = parseNum(row[6])
      const precoCompra = parseNum(row[7])
      const desconto = parseNum(row[8])
      const totalNf = parseNum(row[9])

      if (!nomeProduto || !dataCompra) continue

      // Buscar ou criar produto
      if (!produtoCache[nomeProduto]) {
        let { data: prod } = await supabase
          .from('produtos')
          .select('id')
          .ilike('nome', nomeProduto)
          .maybeSingle()

        if (!prod) {
          // Criar produto automaticamente
          const { data: novoProd, error: errProd } = await supabase
            .from('produtos')
            .insert({ nome: nomeProduto, ativo: true })
            .select('id')
            .single()
          if (errProd) throw new Error(`Produto: ${errProd.message}`)
          prod = novoProd
        }
        produtoCache[nomeProduto] = prod!.id
      }

      // Buscar ou criar fornecedor
      if (fornecedorNome && !fornecedorCache[fornecedorNome]) {
        let { data: forn } = await supabase
          .from('fornecedores')
          .select('id')
          .ilike('nome', fornecedorNome)
          .maybeSingle()

        if (!forn) {
          const { data: novoForn } = await supabase
            .from('fornecedores')
            .insert({ nome: fornecedorNome })
            .select('id')
            .single()
          forn = novoForn
        }
        if (forn) fornecedorCache[fornecedorNome] = forn.id
      }

      const { error } = await supabase.from('compras').insert({
        produto_id: produtoCache[nomeProduto],
        fornecedor_id: fornecedorCache[fornecedorNome] ?? null,
        data: dataCompra,
        quantidade,
        valor_unitario: precoCompra,
        desconto,
        valor_total: totalNf || quantidade * precoCompra - desconto,
        nf_numero: nfNumero || null,
        importacao_id: importacaoId,
      })

      if (error) resultado.erros.push(`NF ${nfNumero} / ${nomeProduto}: ${error.message}`)
      else resultado.inseridos++
    } catch (e: any) {
      resultado.erros.push(e.message)
    }
  }

  return resultado
}

async function importarDespesas(
  rows: any[][],
  supabase: ReturnType<typeof createClient>,
  importacaoId: string,
  mesReferencia: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { total: 0, inseridos: 0, erros: [] }

  // A planilha de despesas tem seções: "Despesas Fixas", "Despesas Variáveis"
  // Formato: col B = nome, col C = valor
  let tipoAtual = 'Fixo'

  for (const row of rows) {
    const colB = String(row[1] ?? '').trim()
    const colC = row[2]

    if (!colB) continue

    // Detectar seção
    if (colB.toLowerCase().includes('fixas')) { tipoAtual = 'Fixo'; continue }
    if (colB.toLowerCase().includes('variáveis') || colB.toLowerCase().includes('variaveis')) { tipoAtual = 'Variável'; continue }
    if (colB.toLowerCase().includes('total') || colB.toLowerCase().includes('compras') || colB.toLowerCase().includes('controle')) continue

    const valor = parseNum(colC)
    if (!valor || valor <= 0) continue

    resultado.total++

    const { error } = await supabase.from('despesas').insert({
      nome: colB,
      tipo: tipoAtual,
      valor,
      mes_referencia: mesReferencia,
      importacao_id: importacaoId,
    })

    if (error) resultado.erros.push(`${colB}: ${error.message}`)
    else resultado.inseridos++
  }

  return resultado
}

async function importarVendas(
  rows: any[][],
  supabase: ReturnType<typeof createClient>,
  importacaoId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { total: 0, inseridos: 0, erros: [] }

  // Detectar cabeçalho automaticamente
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    const joined = row.map(c => String(c ?? '').toLowerCase()).join(' ')
    if (joined.includes('produto') || joined.includes('data') || joined.includes('quantidade')) {
      headerIdx = i
      break
    }
  }

  const header = rows[headerIdx].map(c => String(c ?? '').toLowerCase().trim())
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => c != null && c !== ''))
  resultado.total = dataRows.length

  const idxProduto = header.findIndex(h => h.includes('produto') || h.includes('descrição') || h.includes('descricao') || h.includes('item'))
  const idxData = header.findIndex(h => h.includes('data'))
  const idxQtd = header.findIndex(h => h.includes('qtd') || h.includes('quantidade') || h.includes('quant'))
  const idxValUnit = header.findIndex(h => h.includes('unit') || h.includes('preço') || h.includes('preco') || h.includes('valor unit'))
  const idxValTotal = header.findIndex(h => h.includes('total') || h.includes('valor total'))
  const idxNF = header.findIndex(h => h.includes('nf') || h.includes('nota'))

  const produtoCache: Record<string, string> = {}

  for (const row of dataRows) {
    try {
      const nomeProduto = String(row[idxProduto] ?? '').trim()
      const dataVenda = idxData >= 0 ? parseDateValue(row[idxData]) : null
      const quantidade = idxQtd >= 0 ? parseNum(row[idxQtd]) : 1
      const valorUnit = idxValUnit >= 0 ? parseNum(row[idxValUnit]) : 0
      const valorTotal = idxValTotal >= 0 ? parseNum(row[idxValTotal]) : quantidade * valorUnit
      const nfNumero = idxNF >= 0 ? String(row[idxNF] ?? '').trim() : null

      if (!nomeProduto || !dataVenda) continue

      // Buscar ou criar produto
      if (!produtoCache[nomeProduto]) {
        let { data: prod } = await supabase
          .from('produtos')
          .select('id')
          .ilike('nome', nomeProduto)
          .maybeSingle()

        if (!prod) {
          const { data: novoProd, error: errProd } = await supabase
            .from('produtos')
            .insert({ nome: nomeProduto, ativo: true })
            .select('id')
            .single()
          if (errProd) throw new Error(`Produto: ${errProd.message}`)
          prod = novoProd
        }
        produtoCache[nomeProduto] = prod!.id
      }

      const { error } = await supabase.from('vendas').insert({
        produto_id: produtoCache[nomeProduto],
        data: dataVenda,
        quantidade,
        valor_unitario: valorUnit,
        valor_total: valorTotal || quantidade * valorUnit,
        nf_numero: nfNumero || null,
        periodo_ref: getMesReferencia(dataVenda),
        importacao_id: importacaoId,
      })

      if (error) resultado.erros.push(`${nomeProduto}: ${error.message}`)
      else resultado.inseridos++
    } catch (e: any) {
      resultado.erros.push(e.message)
    }
  }

  return resultado
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function ImportacoesPage() {
  const [carregando, setCarregando] = useState(true)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoImport>('vendas')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[][]>([])
  const [allRows, setAllRows] = useState<any[][]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date()
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verificarLogin() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) router.push('/login')
      else setCarregando(false)
    }
    verificarLogin()
  }, [])

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    setResultado(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][]
      setAllRows(json)
      setPreview(json.slice(0, 6))
    }
    reader.readAsBinaryString(file)
  }

  async function handleImportar() {
    if (!arquivo || !allRows.length) return
    setImportando(true)
    setResultado(null)

    try {
      // Criar registro de importação
      const { data: importacao, error: errImport } = await supabase
        .from('importacoes')
        .insert({
          tipo: tipoSelecionado,
          arquivo_nome: arquivo.name,
          status: 'processando',
        })
        .select('id')
        .single()

      if (errImport || !importacao) throw new Error('Erro ao criar registro de importação')

      let res: ResultadoImport

      if (tipoSelecionado === 'compras') {
        res = await importarCompras(allRows, supabase, importacao.id)
      } else if (tipoSelecionado === 'despesas') {
        res = await importarDespesas(allRows, supabase, importacao.id, mesReferencia)
      } else {
        res = await importarVendas(allRows, supabase, importacao.id)
      }

      // Atualizar status da importação
      await supabase
        .from('importacoes')
        .update({
          status: res.erros.length === 0 ? 'concluido' : 'concluido_com_erros',
          total_registros: res.total,
          registros_inseridos: res.inseridos,
        })
        .eq('id', importacao.id)

      setResultado(res)
    } catch (e: any) {
      setResultado({ total: 0, inseridos: 0, erros: [e.message] })
    } finally {
      setImportando(false)
    }
  }

  function resetar() {
    setArquivo(null)
    setPreview([])
    setAllRows([])
    setResultado(null)
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

          {/* Tipo de importação */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Tipo de importação</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { tipo: 'vendas' as TipoImport, icone: '📊', nome: 'Vendas', desc: 'Relatorio_Vendas_*.xls' },
                { tipo: 'compras' as TipoImport, icone: '📦', nome: 'Compras', desc: 'relatorio_compra_*.xlsx' },
                { tipo: 'despesas' as TipoImport, icone: '💰', nome: 'Despesas', desc: 'planilha_Despesas_*.xlsx' },
              ].map((item) => (
                <button
                  key={item.tipo}
                  onClick={() => { setTipoSelecionado(item.tipo); resetar() }}
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

            {/* Campo mês referência para despesas */}
            {tipoSelecionado === 'despesas' && (
              <div className="mt-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">
                  Mês de referência
                </label>
                <input
                  type="text"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  placeholder="MM/AAAA"
                  className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-40 focus:outline-none focus:border-gray-400"
                />
              </div>
            )}
          </div>

          {/* Upload */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Arquivo</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-gray-400 transition-colors">
              <div className="text-3xl mb-3">⬆</div>
              <p className="text-sm font-medium text-gray-900">
                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-gray-400 mt-1">.xls e .xlsx suportados</p>
              <input type="file" accept=".xls,.xlsx" onChange={handleArquivo} className="hidden" />
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Prévia — primeiras linhas
                </p>
                <p className="text-xs text-gray-400">{allRows.length} linhas no total</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {preview.map((linha, i) => (
                      <tr key={i} className={i === 0 ? 'bg-gray-50 font-medium' : ''}>
                        {linha.slice(0, 8).map((cel, j) => (
                          <td key={j} className="border border-gray-100 px-2 py-1 text-gray-700 max-w-32 truncate">
                            {String(cel ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!resultado && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleImportar}
                    disabled={importando}
                    className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {importando ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Importando...
                      </>
                    ) : (
                      'Confirmar importação'
                    )}
                  </button>
                  <button
                    onClick={resetar}
                    className="border border-gray-200 text-gray-500 rounded-lg px-5 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Resultado da importação</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Total de registros</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-green-700">{resultado.inseridos}</p>
                  <p className="text-xs text-gray-500 mt-1">Inseridos com sucesso</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-semibold text-red-600">{resultado.erros.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Erros</p>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 mb-2">Erros encontrados:</p>
                  {resultado.erros.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 mb-1">• {e}</p>
                  ))}
                  {resultado.erros.length > 20 && (
                    <p className="text-xs text-red-400">...e mais {resultado.erros.length - 20} erros</p>
                  )}
                </div>
              )}

              {resultado.inseridos > 0 && (
                <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg mb-4">
                  ✓ {resultado.inseridos} registros importados com sucesso!
                </p>
              )}

              <button
                onClick={resetar}
                className="border border-gray-200 text-gray-500 rounded-lg px-5 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                Nova importação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}