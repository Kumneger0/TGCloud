"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PhoneNumberFormProps {
    onConfirm: (phoneNumber: string) => void
    onCancel: () => void
}

export function PhoneNumberForm({ onConfirm, onCancel }: PhoneNumberFormProps) {
    const [phoneNumber, setPhoneNumber] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!/^\+\d{1,3}\s?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ""))) {
            setError("Please enter a valid phone number with the country code, e.g., +1 (555) 555-5555")
            return
        }
        onConfirm(phoneNumber)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="phone-input">Phone Number (include country code, e.g., +1)</Label>
                <Input
                    id="phone-input"
                    type="tel"
                    placeholder="+1 (555) 555-5555"
                    value={phoneNumber}
                    onChange={(e) => {
                        setPhoneNumber(e.target.value)
                        setError("")
                    }}
                    autoFocus
                    className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="bg-black hover:bg-black/90 text-white">
                    Next
                </Button>
            </div>
        </form>
    )
}
