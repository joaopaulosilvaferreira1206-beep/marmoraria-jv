import { createContext, useContext, useState } from "react";

const BuscaContext = createContext(null);

export function BuscaProvider({ children }) {
  const [itemDestacado, setItemDestacado] = useState(null); // { tabela, id }

  function destacar(tabela, id) {
    setItemDestacado({ tabela, id });
    setTimeout(() => setItemDestacado(null), 1000);
  }

  return (
    <BuscaContext.Provider value={{ itemDestacado, destacar }}>
      {children}
    </BuscaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusca() {
  return useContext(BuscaContext);
}
