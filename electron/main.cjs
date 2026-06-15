const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

// Pasta de backups
function getPastaBackups() {
    const docs = app.getPath('documents')
    const pasta = path.join(docs, 'MarmorariaJV', 'backups')
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true })
    return pasta
}

// Salvar backup
ipcMain.handle('salvar-backup', async (_, dados) => {
    try {
        const pasta = getPastaBackups()
        const agora = new Date().toLocaleString('sv-SE', {
            timeZone: 'America/Sao_Paulo'
        }).replace(/[: ]/g, '-').replace(/T/, '_')
        const arquivo = path.join(pasta, `backup_${agora}.json`)
        fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), 'utf-8')

        // Manter só os 30 mais recentes
        const arquivos = fs.readdirSync(pasta)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort()
        if (arquivos.length > 30) {
            arquivos.slice(0, arquivos.length - 30).forEach(f =>
                fs.unlinkSync(path.join(pasta, f))
            )
        }
        return { ok: true, arquivo }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
})

// Listar backups disponíveis
ipcMain.handle('listar-backups', async () => {
    try {
        const pasta = getPastaBackups()
        const arquivos = fs.readdirSync(pasta)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort()
            .reverse()
        return arquivos.map(f => ({
            nome: f,
            caminho: path.join(pasta, f),
            data: f.replace('backup_', '').replace('.json', '').replace(/_/, ' ').replace(/-/g, ':').substring(0, 16)
        }))
    } catch {
        return []
    }
})

// Salvar arquivo com diálogo nativo
ipcMain.handle('salvar-arquivo', async (_, { buffer, defaultName }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [
            { name: 'PDF',   extensions: ['pdf']  },
            { name: 'Excel', extensions: ['xlsx'] },
            { name: 'Todos', extensions: ['*']    },
        ],
    })
    if (canceled || !filePath) return { ok: false }
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return { ok: true, filePath }
})

// Ler backup específico
ipcMain.handle('ler-backup', async (_, caminho) => {
    try {
        const conteudo = fs.readFileSync(caminho, 'utf-8')
        return { ok: true, dados: JSON.parse(conteudo) }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
})

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/icon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.cjs')
        },
    })

    if (isDev) {
        win.loadURL('http://localhost:5173')
        win.webContents.openDevTools({ mode: 'detach' })
        return
    }

    win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})