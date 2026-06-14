import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const PopupContext = createContext(null)

const toneStyles = {
    info: 'bg-gray-700 border-blue-500 text-blue-300',
    success: 'bg-gray-700 border-green-500 text-green-300',
    warning: 'bg-gray-700 border-gray-600 text-gray-100',
    error: 'bg-gray-700 border-red-500 text-red-300',
}

export function PopupProvider({ children }) {
    const [popup, setPopup] = useState(null)
    const popupRef = useRef(null)

    useEffect(() => {
        popupRef.current = popup
    }, [popup])

    // Fecha o popup ao trocar de rota (hashchange)
    useEffect(() => {
        function onHashChange() {
            if (popupRef.current) {
                popupRef.current.resolve(false)
                setPopup(null)
            }
        }
        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    function openPopup(config) {
        return new Promise((resolve) => {
            setPopup({ ...config, resolve })
        })
    }

    function closePopup(result = true) {
        if (!popup) return
        popup.resolve(result)
        setPopup(null)
    }

    const api = useMemo(() => ({
        showInfo: (message, title = 'Aviso') => openPopup({ type: 'info', title, message, confirmOnly: true }),
        showSuccess: (message, title = 'Sucesso') => openPopup({ type: 'success', title, message, confirmOnly: true }),
        showWarning: (message, title = 'Atenção') => openPopup({ type: 'warning', title, message, confirmOnly: true }),
        showError: (message, title = 'Erro') => openPopup({ type: 'error', title, message, confirmOnly: true }),
        confirm: (message, title = 'Confirmação') => openPopup({ type: 'warning', title, message, confirmOnly: false }),
    }), [])

    return (
        <PopupContext.Provider value={api}>
            {children}

            {popup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className={`w-full max-w-md border rounded-xl shadow-xl p-5 ${toneStyles[popup.type] || toneStyles.info}`}>
                        <h3 className="text-lg font-semibold">{popup.title}</h3>
                        <p className="mt-2 whitespace-pre-line">{popup.message}</p>
                        <div className="mt-5 flex justify-end gap-3">
                            {!popup.confirmOnly && (
                                <button
                                    onClick={() => closePopup(false)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                onClick={() => closePopup(true)}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PopupContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePopup() {
    const ctx = useContext(PopupContext)
    if (!ctx) {
        throw new Error('usePopup deve ser usado dentro de PopupProvider')
    }
    return ctx
}
