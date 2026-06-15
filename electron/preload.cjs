const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    salvarBackup: (dados) => ipcRenderer.invoke('salvar-backup', dados),
    listarBackups: () => ipcRenderer.invoke('listar-backups'),
    lerBackup: (caminho) => ipcRenderer.invoke('ler-backup', caminho),
    salvarArquivo: (opts) => ipcRenderer.invoke('salvar-arquivo', opts),
    instalarAtualizacao: () => ipcRenderer.send('instalar-atualizacao'),
    onAtualizacao: (cb) => {
        ipcRenderer.on('atualizacao-status', (_e, status) => cb(status))
    },
})