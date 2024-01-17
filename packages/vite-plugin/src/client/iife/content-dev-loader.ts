declare const __CLIENT__: string
declare const __SCRIPT__: string
;(async () => {
  const runtimeIdStorageKey = '__crxjs__DEV__runtimeId__'
  // console.log('dombro runtime id', chrome.runtime?.id, localStorage.getItem(runtimeIdStorageKey))
  if (chrome.runtime?.id) localStorage.setItem(runtimeIdStorageKey, chrome.runtime?.id)
  const runtimeId = chrome.runtime?.id || localStorage.getItem(runtimeIdStorageKey)
  if (!runtimeId) throw new Error('dombro 无法加载：' + __SCRIPT__)
  const getURL = (url: string) => {
    if (chrome.runtime.getURL) return chrome.runtime.getURL(url)
    return `chrome-extension://${runtimeId}/` + url
  }
  // this is the entry point of the content script, it will run each time this script is injected
  import(/* @vite-ignore */ getURL(__SCRIPT__))
  import(/* @vite-ignore */ getURL(__CLIENT__))
})().catch(console.error)

export {}
