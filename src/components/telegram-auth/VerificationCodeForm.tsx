"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface VerificationCodeFormProps {
    onConfirm: (code: string) => void
    onCancel: () => void
}

export function VerificationCodeForm({ onConfirm, onCancel }: VerificationCodeFormProps) {
    const [code, setCode] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!/^\d{5}$/.test(code)) {
            setError("Please enter a valid 5-digit verification code.")
            return
        }
        onConfirm(code)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="code-input">Verification Code</Label>
                <Input
                    id="code-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter the 5-digit code"
                    value={code}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 5)
                        setCode(val)
                        setError("")
                    }}
                    autoFocus
                    className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">
                    Please enter the code you received from Telegram.
                </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="bg-black hover:bg-black/90 text-white">
                    Verify
                </Button>
            </div>
        </form>
    )
}
