const isElectron = typeof window !== 'undefined' && !!window.electronAPI

function mime(nome) {
  if (nome.endsWith('.pdf'))  return 'application/pdf'
  if (nome.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'application/octet-stream'
}

export async function salvarArquivo(dados, nomeArquivo) {
  if (isElectron) {
    const buffer = Array.from(new Uint8Array(dados))
    await window.electronAPI.salvarArquivo({ buffer, defaultName: nomeArquivo })
    return
  }
  // Browser / Android WebView
  const blob = new Blob([dados], { type: mime(nomeArquivo) })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
