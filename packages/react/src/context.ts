import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from "shared/ReactSymbols"

import type { ReactContext } from "shared/ReactTypes"

function createContext<T>(initialValue: T): ReactContext<T> {
  const context: ReactContext<T> = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    _currentValue: initialValue
  }
  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context
  }

  return context
}

export {
  createContext
}
