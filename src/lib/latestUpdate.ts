export const UPDATE_BANNER_DURATION_DAYS = 2;
import fs from 'fs';
import path from 'path';

export function getLatestChangelogDate() {
	const changelogDir = path.join(process.cwd(), 'src/app/(---)/changelog');
	const files = fs.readdirSync(changelogDir);
	const dateFiles = files
		.filter((f) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(f))
		.map((f) => f.replace('.mdx', ''))
		.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	return dateFiles.length > 0 ? dateFiles[0] : null;
}
