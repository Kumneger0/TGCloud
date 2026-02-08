'use client';
import React, { use } from 'react';
import { FilterIcon } from './Icons/icons';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { useGlobalStore } from '@/store/global-store';

function SortBy() {
	const sortBy = useGlobalStore((state) => state.sortBy);
	const setSortBy = useGlobalStore((state) => state.setSortBy);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
					<FilterIcon className="h-4 w-4" />
					<span className="sr-only">Filter</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Sort by</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value={sortBy}>
					<DropdownMenuRadioItem onSelect={(e) => setSortBy('name')} value="name">
						Name
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem onSelect={(e) => setSortBy('date')} value="date">
						Date
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem onSelect={(e) => setSortBy('size')} value="size">
						Size
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem onSelect={(e) => setSortBy('type')} value="type">
						Type
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default SortBy;
