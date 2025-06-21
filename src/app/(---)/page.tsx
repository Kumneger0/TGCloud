import { HomePage } from '@/components/home-page';

export const dynamic = 'force-static';
export const dynamicParams = false;

export default async function Home() {
	return <HomePage />;
}
