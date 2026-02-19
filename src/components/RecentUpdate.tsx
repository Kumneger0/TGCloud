import { getLatestChangelogDate, UPDATE_BANNER_DURATION_DAYS } from '@/lib/latestUpdate';
import UpdateBannerClient from './recentUpdateClient';

function getIsRecentUpdateDate() {
	const latestUpdateDate = getLatestChangelogDate();
	if (!latestUpdateDate) return false;
	return latestUpdateDate;
}

export default function UpdateBanner() {
	const result = getIsRecentUpdateDate();
	if (!result) return null;
	return <UpdateBannerClient recentUpdateDate={result} />;
}
