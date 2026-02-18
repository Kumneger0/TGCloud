import { ReactNode } from "react"
import { create } from "zustand"

interface GlobalModalState {
    isOpen: boolean
    title?: string
    content?: ReactNode
    className?: string
    onClose?: () => void
    forceDialog?: boolean
    size?: 'sm' | 'md' | 'lg'
    openModal: (params: { title?: string; content: ReactNode; onClose?: () => void; forceDialog?: boolean; size?: 'sm' | 'md' | 'lg' }) => void
    closeModal: () => void
}

export const useGlobalModal = create<GlobalModalState>((set) => ({
    isOpen: false,
    title: undefined,
    content: null,
    onClose: undefined,
    size: 'sm',
    className: "",
    forceDialog: false,
    openModal: ({ title, content, onClose, forceDialog, size }) =>
        set({ isOpen: true, title, content, onClose, forceDialog, size: size ?? 'sm' }),
    closeModal: () =>
        set((state) => {
            state.onClose?.()
            return {
                isOpen: false,
                title: undefined,
                content: null,
                onClose: undefined,
                className: "",
                size: 'sm',
                forceDialog: false,
            }
        }),
}))
