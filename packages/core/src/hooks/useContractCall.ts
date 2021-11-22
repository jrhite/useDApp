import { Interface } from '@ethersproject/abi'
import { useMemo } from 'react'
import { ContractMethodNames, Falsy, Params, TypedContract, Awaited } from '../model/types'
import { useChainCalls } from './useChainCalls'
import { ChainCall } from '../providers/chainState/callsReducer'

function warnOnInvalidContractCall(call: ContractCall | Falsy) {
  console.warn(
    `Invalid contract call: address=${call && call.address} method=${call && call.method} args=${call && call.args}`
  )
}

function encodeCallData(call: ContractCall | Falsy): ChainCall | Falsy {
  if (!call || !call.address || !call.method) {
    warnOnInvalidContractCall(call)
    return undefined
  }
  try {
    return { address: call.address, data: call.abi.encodeFunctionData(call.method, call.args) }
  } catch {
    warnOnInvalidContractCall(call)
    return undefined
  }
}

export interface ContractCall {
  abi: Interface
  address: string
  method: string
  args: any[]
}

export function useTypedContractCall<T extends TypedContract, MN extends ContractMethodNames<T>>(call: {
  contract: T
  method: MN
  args: Params<T, MN>
}): Awaited<ReturnType<T['functions'][MN]>> | undefined {
  let contractCall: ContractCall | Falsy
  if (call.contract) {
    contractCall = {
      abi: call.contract.interface,
      address: call.contract.address,
      method: call.method,
      args: call.args,
    }
  }
  return useContractCall(contractCall) as any
}

export function useTypedContractCalls<T extends TypedContract, MN extends ContractMethodNames<T>>(
  calls: {
    contract: T
    method: MN
    args: Params<T, MN>
  }[]
): Awaited<ReturnType<T['functions'][MN]>> | undefined[] {
  const contractCalls: (ContractCall | Falsy)[] = calls.map((call) => {
    if (call.contract) {
      return {
        abi: call.contract.interface,
        address: call.contract.address,
        method: call.method,
        args: call.args,
      }
    } else {
      return undefined
    }
  })
  return useContractCalls(contractCalls) as any
}

export function useContractCall(call: ContractCall | Falsy): any[] | undefined {
  return useContractCalls([call])[0]
}

export function useContractCalls(calls: (ContractCall | Falsy)[]): (any[] | undefined)[] {
  const results = useChainCalls(calls.map(encodeCallData))

  return useMemo(
    () =>
      results.map((result, idx) => {
        const call = calls[idx]
        if (result === '0x') {
          warnOnInvalidContractCall(call)
          return undefined
        }
        return call && result ? (call.abi.decodeFunctionResult(call.method, result) as any[]) : undefined
      }),
    [results]
  )
}
