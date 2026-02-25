"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { useGlobalModal } from "@/store/global-modal"
import { useMediaQuery } from "./useMediaQuery"

export const GlobalModal = () => {
    const { isOpen, title, content, closeModal, className, forceDialog, size } = useGlobalModal()
    const isDesktop = useMediaQuery('(min-width: 768px)')

    const sizeClasses = {
        sm: "sm:max-w-[425px]",
        md: "md:min-w-[760px]",
        lg: "md:min-w-[760px] lg:min-w-[1000px] h-full"
    }

    const isLarge = size === 'lg'


    const modalContenetKey = title + (isOpen ? "open" : "closed")

    if (isDesktop || forceDialog) {
        return (
            <Dialog key={modalContenetKey} open={isOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className={cn(
                    "max-h-[90dvh] overflow-y-auto w-full",
                    sizeClasses[size || 'sm'],
                    className
                )}>
                    <DialogHeader>
                        <DialogTitle>{title ?? ""}</DialogTitle>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer key={modalContenetKey} open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <DrawerContent className={cn(
                isLarge ? "h-[90dvh]" : "max-h-[90dvh]",
                className
            )}>
                <div className="p-4 font-semibold text-lg">{title}</div>
                <div className="overflow-y-auto px-4 pb-8">
                    {content}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
