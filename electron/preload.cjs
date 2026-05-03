const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    salvarBackup: (dados) => ipcRenderer.invoke('salvar-backup', dados),
    listarBackups: () => ipcRenderer.invoke('listar-backups'),
    lerBackup: (caminho) => ipcRenderer.invoke('ler-backup', caminho),
})