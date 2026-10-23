'use client'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { parsePrinterSettings, type PrinterSettings } from '@/lib/printer-settings'

const memory = new Map<string, string>()
const event = 'warko-printer-settings'
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(event, listener)
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(event, listener) }
}
export function usePrinterSettings(scope: string) {
  const key = `warko:printer:${scope}`
  const read = useCallback(() => {
    try { return window.localStorage.getItem(key) ?? memory.get(key) ?? null }
    catch { return memory.get(key) ?? null }
  }, [key])
  const raw = useSyncExternalStore(subscribe, read, () => null)
  const settings = useMemo(() => parsePrinterSettings(raw), [raw])
  function save(value: PrinterSettings) {
    const serialized = JSON.stringify(value)
    memory.set(key, serialized)
    try { window.localStorage.setItem(key, serialized) } catch { /* Device storage may be disabled. */ }
    window.dispatchEvent(new Event(event))
  }
  return { settings, hasPreferences: raw !== null, save }
}
