/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CrxHMRPayload } from 'src/types'
import type { HMRPayload } from 'vite'

declare const __CRX_HMR_TIMEOUT__: number

function isCrxHMRPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

export class HMRPort {
  private port: chrome.runtime.Port | undefined
  private callbacks = new Map<string, Set<(event: any) => void>>()

  constructor() {
    /**
     * To keep extension background alive:
     *
     * - Ping service worker every 5 seconds
     * - Re-initialize port every 5 minutes
     */
    setInterval(() => {
      try {
        if (!chrome.runtime?.id) return
        this.port?.postMessage({ data: 'ping' })
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Extension context invalidated.')
        ) {
          // TODO: hook into error overlay?
          // location.reload()
        } else {
          // fix: Attempting to use a disconnected port object
          console.log('dombrooo', error)
        }
      }
    }, __CRX_HMR_TIMEOUT__)
    setInterval(this.initPort, 5 * 60 * 1000)
    this.initPort()
  }

  initPort = () => {
    // fix: Extension context invalidated.
    if (!chrome.runtime?.id) return
    this.port?.disconnect()
    const runtimeId = chrome.runtime?.id || localStorage.getItem('__crxjs__DEV__runtimeId__')
    // @ts-expect-error for content-script MAIN
    this.port = chrome.runtime.connect(runtimeId, { name: '@crx/client' })
    this.port.onDisconnect.addListener(this.handleDisconnect.bind(this))
    this.port.onMessage.addListener(this.handleMessage.bind(this))
    this.port.postMessage({ type: 'connected' })
  }

  handleDisconnect = () => {
    if (this.callbacks.has('close'))
      for (const cb of this.callbacks.get('close')!) {
        cb({ wasClean: true })
      }
  }

  handleMessage = (message: any) => {
    const forward = (data: string) => {
      if (this.callbacks.has('message'))
        for (const cb of this.callbacks.get('message')!) {
          cb({ data })
        }
    }

    const payload: HMRPayload | CrxHMRPayload = JSON.parse(message.data)
    if (isCrxHMRPayload(payload)) {
      if (payload.event === 'crx:runtime-reload') {
        // delayed page reload; let background finish restart
        console.log('[crx] dombro hmr-content-port runtime reload')
        setTimeout(() => !document.hidden && location.reload(), 500)
      } else {
        // unpack hmr payloads; forward to vite client
        // console.log('[crx] content payload', payload)
        forward(JSON.stringify(payload.data))
      }
    } else {
      // forward things like connected messages
      // console.log('[crx] forwarding', message)
      forward(message.data)
    }
  }

  addEventListener = (event: string, callback: (event: any) => void) => {
    const cbs = this.callbacks.get(event) ?? new Set()
    cbs.add(callback)
    this.callbacks.set(event, cbs)
  }

  send = (data: string) => {
    console.log('dombro chrome.runtime?.id', chrome.runtime?.id)
    // fix vite server 重启后报错：Extension context invalidated.
    if (!chrome.runtime?.id) return
    if (this.port) {
      this.port.postMessage({ data })
    }
    else throw new Error('HMRPort is not initialized')
  }
}
