"use client"

import { useGlobalModal } from "@/store/global-modal"
import { PhoneNumberForm } from "@/components/telegram-auth/PhoneNumberForm"
import { VerificationCodeForm } from "@/components/telegram-auth/VerificationCodeForm"
import { PasswordForm } from "@/components/telegram-auth/PasswordForm"

const getAuthInput = <T,>(params: {
    title: string
    render: (resolve: (value: T) => void, reject: (reason?: any) => void) => React.ReactNode
}): Promise<T> => {
    const { openModal, closeModal } = useGlobalModal.getState()

    return new Promise((resolve, reject) => {
        openModal({
            title: params.title,
            forceDialog: true,
            onClose: () => reject(new Error("Input cancelled")),
            content: params.render(
                (value: T) => {
                    useGlobalModal.setState({ onClose: undefined })
                    closeModal()
                    resolve(value)
                },
                (reason) => {
                    useGlobalModal.setState({ onClose: undefined })
                    closeModal()
                    reject(reason || new Error("Input cancelled"))
                }
            )
        })
    })
}

export async function getPhoneNumber(): Promise<string> {
    return getAuthInput<string>({
        title: "Enter your phone number",
        render: (resolve, reject) => (
            <PhoneNumberForm 
                onConfirm={resolve} 
                onCancel={() => reject(new Error("Phone number entry cancelled"))} 
            />
        )
    })
}

export async function getCode(): Promise<string> {
    return getAuthInput<string>({
        title: "Enter the verification code",
        render: (resolve, reject) => (
            <VerificationCodeForm 
                onConfirm={resolve} 
                onCancel={() => reject(new Error("Verification code entry cancelled"))} 
            />
        )
    })
}

export async function getPassword(): Promise<string> {
    return getAuthInput<string>({
        title: "Enter Your Password",
        render: (resolve, reject) => (
            <PasswordForm 
                onConfirm={resolve} 
                onCancel={() => reject(new Error("Password entry cancelled"))} 
            />
        )
    })
}
