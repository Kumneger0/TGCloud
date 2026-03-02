"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface PasswordFormProps {
    onConfirm: (password: string) => void
    onCancel: () => void
}

export function PasswordForm({ onConfirm, onCancel }: PasswordFormProps) {
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) {
            setError("Please enter your password.")
            return
        }
        onConfirm(password)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="password-input">Password</Label>
                <Input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your 2FA password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value)
                        setError("")
                    }}
                    autoFocus
                    className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                        id="show-password"
                        checked={showPassword}
                        onCheckedChange={(checked) => setShowPassword(checked as boolean)}
                    />
                    <Label
                        htmlFor="show-password"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Show Password
                    </Label>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="bg-black hover:bg-black/90 text-white">
                    Submit
                </Button>
            </div>
        </form>
    )
}
