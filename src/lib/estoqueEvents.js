const listeners = []

export function onEstoqueAtualizado(fn) {
    listeners.push(fn)
    return () => {
        const index = listeners.indexOf(fn)
        if (index > -1) listeners.splice(index, 1)
    }
}

export function emitirEstoqueAtualizado() {
    listeners.forEach(fn => fn())
}