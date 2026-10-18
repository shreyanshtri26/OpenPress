import CustomButton from '../../common/CustomButton';
import { StoryFilter, StoryFilterKey } from './types';

interface StoryFiltersProps {
  filters: StoryFilter[];
  activeFilter: StoryFilterKey;
  onSelect: (filter: StoryFilterKey) => void;
}

export function StoryFilters({ filters, activeFilter, onSelect }: StoryFiltersProps) {
  return (
    <div 
      role="tablist" 
      aria-label="Story filters"
      className="flex flex-wrap gap-2 sm:gap-3"
    >
      {filters.map((tab) => (
        <CustomButton
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          variant={activeFilter === tab.key ? 'black' : 'white'}
          disableHover
          className="text-xs sm:text-sm py-2 px-3 sm:px-4"
        >
          {tab.label}
        </CustomButton>
      ))}
    </div>
  );
}
