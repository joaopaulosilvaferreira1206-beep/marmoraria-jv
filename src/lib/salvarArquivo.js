import { Capacitor } from '@capacitor/core'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const isNative = Capacitor.isNativePlatform()

function mime(nome) {
  if (nome.endsWith('.pdf'))  return 'application/pdf'
  if (nome.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'application/octet-stream'
}

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function salvarArquivo(dados, nomeArquivo) {
  if (isElectron) {
    const buffer = Array.from(new Uint8Array(dados))
    await window.electronAPI.salvarArquivo({ buffer, defaultName: nomeArquivo })
    return
  }

  if (isNative) {
    // Capacitor Android/iOS: salva no cache e abre via Share sheet
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')

    const base64 = arrayBufferToBase64(dados)
    await Filesystem.writeFile({
      path: nomeArquivo,
      data: base64,
      directory: Directory.Cache,
    })
    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: nomeArquivo,
    })
    await Share.share({
      title: nomeArquivo,
      url: uri,
      dialogTitle: `Salvar ${nomeArquivo}`,
    })
    return
  }

  // Browser / PWA
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
