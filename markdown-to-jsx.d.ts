declare module 'markdown-to-jsx' {
	import { ComponentType } from 'react';

	interface MarkdownProps {
		children: string;
		options?: any;
	}

	const Markdown: ComponentType<MarkdownProps>;
	export default Markdown;
}
