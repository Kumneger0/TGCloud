import { ImageResponse } from 'next/og';

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const text = searchParams.get('text') || '👋 Hello';
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 60,
					fontWeight: 'bold',
					color: 'white',
					background: 'linear-gradient(90deg, #000 0%, #222 50%, #111 100%)',
					width: '100%',
					height: '100%',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					textAlign: 'center',
					padding: '0 100px'
				}}
			>
				{text}
			</div>
		),
		{
			width: 1200,
			height: 630
		}
	);
}
