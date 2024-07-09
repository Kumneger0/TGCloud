'use client'

import { saveTelegramCredentials } from "@/actions";
import { Button } from "@/components/ui/button";
import { env } from "@/env";
import { useUser } from '@clerk/nextjs';
import Image from "next/image";
import { redirect } from "next/navigation";
import { SVGProps, useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { useCookies } from 'next-client-cookies';


async function getPhoneNumber() {
    return await Swal.fire({
        title: 'Enter your phone number',
        input: 'text',
        inputLabel: 'Phone Number',
        inputPlaceholder: 'Please Input Your Phone Number',
        showCancelButton: true
    }).then(result => result.value as number);
}
async function getCode() {
    return await Swal.fire({
        title: 'Enter the verification code',
        input: 'text',
        inputLabel: 'Verification Code',
        inputPlaceholder: 'Please Input the code',
        showCancelButton: true
    }).then(result => result.value as number);
}
async function getPassword() {
    return await Swal.fire({
        title: 'Enter Your Password',
        input: 'text',
        inputLabel: 'Password',
        inputPlaceholder: 'Please Enter Your password',
        showCancelButton: true
    }).then(result => result.value as number);
}


export default function Component() {
    const cookies = useCookies()

    const [channelDeteails, setChannelDetails] = useState<string | null>(null)

    const { isSignedIn, user } = useUser()
    const [isLoading, setIsLoading] = useState<boolean>()
    async function connectTelegram() {
        if (!isSignedIn) return redirect('/auth/login')
        const session = cookies.get('tgSession')
        const SESSION = new StringSession(session ?? '')
        let client: TelegramClient | undefined
        try {
            setIsLoading(true)
            client = new TelegramClient(SESSION, env.NEXT_PUBLIC_TELEGRAM_API_ID, env.NEXT_PUBLIC_TELEGRAM_API_HASH, { connectionRetries: 5 })

            if (!session) {
                await client.start({
                    phoneNumber: async () => await getPhoneNumber() as unknown as string,
                    password: async () => await getPassword() as unknown as string,
                    phoneCode: async () => await getCode() as unknown as string,
                    onError: (err) => console.log(err),
                });
                const session = client.session.save() as unknown as string
                cookies.set('tgSession', session)
            }
            if (!client.connected) await client.connect()
            createChannel(client)
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
            client?.disconnect()
        }

    }

    async function createChannel(client: TelegramClient) {
        if (!user) throw new Error('failed to create channel')

        const channleName = `${user.firstName}Drive`
        const result = await client.invoke(
            new Api.channels.CreateChannel(
                {
                    title: channleName,
                    about: "some string here",
                    broadcast: true,
                }
            )
        ) as { chats: Array<any> }

        const channel = result?.chats?.[0]

        await client.sendMessage(channel.id.value, { message: 'hellow' })
        const session = cookies.get('tgSession')

        const saveTelegramResult = await saveTelegramCredentials(channel.id.value, session!)

        console.log(channel)

        setChannelDetails(JSON.stringify(saveTelegramResult))

    }

    // if (channelDeteails) return <div>{channelDeteails}</div>

    return (
        <div className="w-full bg-white py-20 md:py-32 lg:py-40">
            <div className="container flex flex-col items-center justify-between gap-10 px-4 md:flex-row md:gap-16">
                <div className="max-w-md space-y-6 text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl md:text-5xl">
                        Connect Your Telegram Account
                    </h1>
                    <p className="text-lg text-[#00b894]/90 md:text-xl">
                        Link your Telegram account to our cloud platform and enjoy seamless
                        file storage and sharing.
                    </p>
                    <div className="flex flex-col items-center gap-4 md:flex-row">
                        <Button disabled={isLoading} variant={'secondary'} onClick={() => connectTelegram()} className="w-full md:w-auto">
                            <TextIcon className="mr-2 h-5 w-5" />
                            {isLoading ? 'please wait...' : ' Connect Telegram'}
                        </Button>
                    </div>
                </div>
                <div className="w-full max-w-md">
                    <Image
                        src={'/tgConnect.jpg'}
                        alt="Connect Telegram"
                        width={500}
                        height={500}
                        className="mx-auto"
                    />
                </div>
            </div>
        </div>
    );
}


function TextIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 6.1H3" />
            <path d="M21 12.1H3" />
            <path d="M15.1 18H3" />
        </svg>
    );
}











