import { useTheme } from '../lib/theme'
import { SunIcon, MoonIcon } from './icons'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      style={{ border: '1px solid var(--line)' }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
