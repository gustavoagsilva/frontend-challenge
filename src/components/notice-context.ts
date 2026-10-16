import { createContext, useContext } from 'react'
export const NoticeContext = createContext<(name: string) => void>(() => {})
export const useNotice = () => useContext(NoticeContext)
