import TextBox from '@/components/ui/kit/text-box';
import SelectBox from '@/components/ui/kit/select-box';
import DateRangeBox from '@/components/ui/kit/date-range-box';

const AssetFilters = ({
    searchValue,
    fileTypeValue,
    dateUpdatedValue,
    sortByValue,
    dateRangeValue,
    showCustomDate = false,
    dateUpdatedOptions = [],
    fileTypeOptions = [],
    sortByOptions = [],
    onSearchChange,
    onFileTypeChange,
    onDateUpdatedChange,
    onSortByChange,
    onDateRangeChange,
    onShowUpload,
    accordionArrowTemplate = () => {}
}) => {
    return (
        <div className="header-bar-inside-cardview">
            <div className="relume-filter-container flex flex-wrap gap-3 md:flex-row flex-col items-center justify-between">
                {/* Search */}
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <TextBox
                        placeholder="Looking for something?"
                        value={searchValue}
                        onValueChanged={(e) => onSearchChange(e.value)}
                        buttons={[{
                            name: 'search',
                            location: 'before',
                            options: { icon: 'search', stylingMode: 'text' }
                        }]}
                    />
                </div>

                {/* Date Updated */}
                <div className="relative min-w-[155px]">
                    <SelectBox
                        dataSource={dateUpdatedOptions}
                        displayExpr="text"
                        valueExpr="value"
                        value={dateUpdatedValue}
                        onValueChanged={e => onDateUpdatedChange(e.value)}
                        placeholder="Date updated"
                        height={42}
                        dropDownButtonTemplate={accordionArrowTemplate}
                    />
                    {showCustomDate && (
                        <div className="custom-date-range absolute top-full left-0 z-10 mt-2 w-full">
                            <DateRangeBox
                                value={dateRangeValue}
                                onValueChanged={e => onDateRangeChange(e.value)}
                                height={40}
                                startDatePlaceholder="Start date"
                                endDatePlaceholder="End date"
                                dropDownButtonTemplate={accordionArrowTemplate}
                            />
                        </div>
                    )}
                </div>

                {/* File Type */}
                <div className="min-w-[135px]">
                    <SelectBox
                        dataSource={fileTypeOptions}
                        displayExpr="text"
                        valueExpr="value"
                        value={fileTypeValue}
                        onValueChanged={e => onFileTypeChange(e.value)}
                        placeholder="File type"
                        height={42}
                        dropDownButtonTemplate={accordionArrowTemplate}
                    />
                </div>

                {/* Sort By */}
                <div className="min-w-[155px]">
                    <SelectBox
                        dataSource={sortByOptions}
                        displayExpr="text"
                        valueExpr="value"
                        value={sortByValue}
                        onValueChanged={e => onSortByChange(e.value)}
                        placeholder="Sort by"
                        height={42}
                        dropDownButtonTemplate={accordionArrowTemplate}
                    />
                </div>

                {/* Upload Button */}
                <div className="flex-shrink-0">
                    <button
                        onClick={onShowUpload}
                        className="border bg-black text-white px-4 py-2 text-xs font-medium hover:bg-gray-100 whitespace-nowrap"
                        style={{ minWidth: 'max-content', height: '40px' }}
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetFilters;
