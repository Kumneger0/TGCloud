import { ReactNode } from "react"
import { create } from "zustand"

interface GlobalModalState {
    isOpen: boolean
    title?: string
    content?: ReactNode
    className?: string
    closeMediaOnClose?: boolean
    onClose?: (closeMediaOnClose: boolean) => void
    forceDialog?: boolean
    size?: 'sm' | 'md' | 'lg'
    openModal: (params: { title?: string; content: ReactNode; onClose?: (closeMediaOnClose: boolean) => void; forceDialog?: boolean; size?: 'sm' | 'md' | 'lg'; closeMediaOnClose?: boolean }) => void
    closeModal: (closeMediaOnClose?: boolean) => void
}

export const useGlobalModal = create<GlobalModalState>((set) => ({
    isOpen: false,
    title: undefined,
    content: null,
    onClose: undefined,
    size: 'sm',
    className: "",
    forceDialog: false,
    openModal: (state) =>
        set({ isOpen: true, ...state }),
    closeModal: (closeMediaOnClose?: boolean) =>
        set((state) => {
            state.onClose?.(closeMediaOnClose ?? state.closeMediaOnClose ?? true)
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
