export default function AuthLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <div className="min-h-[90svh] bg-white">{children}</div>;
}
