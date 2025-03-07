import { ReactContext } from "shared/ReactTypes"

const prevContextValueStack: any[] = []

export const pushProvider = <T>(context: ReactContext<T>, newValue: T) => {
  prevContextValueStack.push(context._currentValue)
  context._currentValue = newValue
}

export const popProvider = <T>(context: ReactContext<T>) => {
  context._currentValue = prevContextValueStack.pop()
}
