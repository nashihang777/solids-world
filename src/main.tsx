import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

window.solids.log('info', `perf renderer:module-loaded +${Math.round(performance.now())}ms`)

const container = document.getElementById('root')
if (!container) throw new Error('#root 元素不存在')

createRoot(container).render(<App />)
