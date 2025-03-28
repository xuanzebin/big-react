import { FulfilledThenable, PendingThenable, RejectedThenable, Thenable } from "shared/ReactTypes";

let suspendedThenable: Thenable<any> | null = null

export const SuspenseException = new Error(
  '这不是个真实的错误，而是Suspense工作的一部分。如果你捕获到这个错误，请将它继续抛出去'
)

export function getSuspenseThenable() {
  if (suspendedThenable === null) {
    throw new Error('suspendedThenable 不应该是 null')
  }
  const thenable = suspendedThenable
  suspendedThenable = null
  return thenable
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

export function trackUsedThenable<T>(thenable: Thenable<T>) {
  switch (thenable.status) {
    case 'fulfilled':
      return thenable.value
    case 'rejected':
      throw thenable.reason
    default:
      if (typeof thenable.status === 'string') {
        thenable.then(noop, noop)
      } else {
        const pending = thenable as unknown as PendingThenable<T, void, any>
        pending.status = 'pending'
        pending.then(
          (val) => {
            if (pending.status === 'pending') {
              const fulfilled = pending as unknown as FulfilledThenable<T, void, any>
              fulfilled.status = 'fulfilled'
              fulfilled.value = val
            }
          },
          (err) => {
            if (pending.status === 'pending') {
              const rejected = pending as unknown as RejectedThenable<T, void, any>
              rejected.status = 'rejected'
              rejected.reason = err
            }
          }
        )
      }
  }

  suspendedThenable = thenable
  throw SuspenseException
}