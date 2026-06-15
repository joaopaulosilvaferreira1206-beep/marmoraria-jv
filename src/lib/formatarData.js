export function formatarDataHora(registro) {
  const criado = registro.criado_em
  const data = registro.data
  if (criado) {
    const utc = criado.endsWith('Z') ? criado : criado + 'Z'
    return new Date(utc).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  }
  if (data) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }
  return '—'
}
