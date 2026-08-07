'use client'
import { createContext, useContext, useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
const KEY = 'warko-theme'
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void }>({ preference:'system', setPreference:()=>{} })

function valid(value: string | null): ThemePreference { return value === 'light' || value === 'dark' ? value : 'system' }
function apply(value: ThemePreference) {
  const dark = value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.warkoTheme = dark ? 'dark' : 'light'
}
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const notify = () => { apply(valid(localStorage.getItem(KEY))); callback() }
  window.addEventListener('storage', notify); window.addEventListener('warko-theme', notify); media.addEventListener('change', notify)
  return () => { window.removeEventListener('storage', notify); window.removeEventListener('warko-theme', notify); media.removeEventListener('change', notify) }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(subscribe, () => valid(localStorage.getItem(KEY)), () => 'system' as const)
  function setPreference(value: ThemePreference) { localStorage.setItem(KEY, value); apply(value); window.dispatchEvent(new Event('warko-theme')) }
  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
}
export function useTheme() { return useContext(ThemeContext) }
