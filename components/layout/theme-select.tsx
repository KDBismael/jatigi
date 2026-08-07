'use client'
import { Select } from '@/components/ui/select'
import { useTheme } from './theme-provider'
export function ThemeSelect({ compact=false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme()
  return <Select aria-label="Thème" label={compact ? undefined : 'Apparence'} value={preference} onChange={e=>setPreference(e.target.value as 'system'|'light'|'dark')}
    options={[{value:'system',label:'Système'},{value:'light',label:'Clair'},{value:'dark',label:'Sombre'}]} className={compact?'py-1.5 text-xs':''}/>
}
