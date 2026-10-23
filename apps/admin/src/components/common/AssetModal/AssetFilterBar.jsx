import { useEffect, useState } from 'react';
import SelectBox from '@/components/ui/kit/select-box';
import TextBox from '@/components/ui/kit/text-box';
import PropTypes from 'prop-types';
import CustomButton from '../CustomButton';
import CustomCalendar from '../CustomCalendar';
import { withSelectedDisabled } from '../DAM/utils/selectOptions';
 
 
import {
  DATE_UPDATED_OPTIONS,
  FILE_TYPE_OPTIONS,
  SORT_BY_OPTIONS,
} from './constants';

const getDateRange = (value) => (
  Array.isArray(value) && value.length === 2 ? value : [null, null]
);

const syncRangeValue = (rangeValue, index, nextValue) => {
  const nextRange = [...getDateRange(rangeValue)];
  nextRange[index] = nextValue ?? null;
  const [startDate, endDate] = nextRange;
  if (startDate && endDate && startDate > endDate) {
    nextRange[index === 0 ? 1 : 0] = nextValue;
  }
  return nextRange;
};
 
const AssetFilterBar = ({
  accordionArrowTemplate,
  searchValue,
  onSearchChange,
  dateUpdatedValue,
  onDateUpdatedChange,
  showCustomDate,
  dateRangeValue = null,
  onDateRangeChange,
  fileTypeValue,
  onFileTypeChange,
  sortByValue,
  onSortByChange,
  onShowUpload,
}) => {
  const [selectedDateUpdatedValue, setSelectedDateUpdatedValue] = useState(dateUpdatedValue);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(dateRangeValue));
  const [startDate, endDate] = draftDateRange;

  useEffect(() => {
    if (dateUpdatedValue !== 'custom') setSelectedDateUpdatedValue(dateUpdatedValue);
  }, [dateUpdatedValue]);

  const handleDateUpdatedChange = (value) => {
    setSelectedDateUpdatedValue(value);
    if (value === 'custom') {
      setDraftDateRange(getDateRange(dateRangeValue));
      setIsCustomDateRangeOpen(true);
      return;
    }
    setIsCustomDateRangeOpen(false);
    onDateUpdatedChange(value);
  };

  const handleDateChange = (index) => ({ value }) => {
    setDraftDateRange((current) => syncRangeValue(current, index, value));
  };

  const handleClear = () => {
    setDraftDateRange([null, null]);
    setSelectedDateUpdatedValue('all');
    setIsCustomDateRangeOpen(false);
    onDateRangeChange([null, null]);
    onDateUpdatedChange('all');
  };

  const datePicker = (
    <div className="custom-date-range mt-2 bg-white border border-black p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CustomCalendar value={startDate} onValueChanged={handleDateChange(0)} placeholder="Start date" displayFormat="MMMM d, yyyy" showTimeHeader={false} disablePastDates={false} showClearButton max={endDate || new Date()} />
        <CustomCalendar value={endDate} onValueChanged={handleDateChange(1)} placeholder="End date" displayFormat="MMMM d, yyyy" showTimeHeader={false} disablePastDates={false} showClearButton min={startDate || undefined} max={new Date()} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={handleClear} className="border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Clear</button>
        <button type="button" onClick={() => { onDateRangeChange(draftDateRange); onDateUpdatedChange('custom'); setIsCustomDateRangeOpen(false); }} disabled={!startDate || !endDate} className="bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300">Apply</button>
      </div>
    </div>
  );

  return (
  <div className="header-bar-inside-cardview">
    <div className="relume-filter-container">
      {/* Mobile: Grid layout, Desktop: Horizontal flex */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-72 lg:w-80 min-w-[240px]">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4b5563"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <TextBox
              className="search-input w-full"
              inputClassName="pl-9 h-10 border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black text-sm"
              placeholder="Search With aI..."
              value={searchValue}
              valueChangeEvent="input"
              height={40}
              onValueChanged={(e) => onSearchChange(e.value)}
            />
          </div>
 
          <div className="min-w-[155px] relative">
            <SelectBox
              dataSource={withSelectedDisabled(DATE_UPDATED_OPTIONS, selectedDateUpdatedValue)}
              displayExpr="text"
              valueExpr="value"
              value={selectedDateUpdatedValue}
              onValueChanged={(e) => handleDateUpdatedChange(e.value)}
              placeholder="Date updated"
              height={42}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
            {selectedDateUpdatedValue === 'custom' && isCustomDateRangeOpen && (
              <div className="absolute top-full left-0 z-10 w-[420px] max-w-[calc(100vw-2rem)]">
                {datePicker}
              </div>
            )}
          </div>
 
          <div className="min-w-[135px]">
            <SelectBox
              dataSource={withSelectedDisabled(FILE_TYPE_OPTIONS, fileTypeValue)}
              displayExpr="text"
              valueExpr="value"
              value={fileTypeValue}
              onValueChanged={(e) => onFileTypeChange(e.value)}
              placeholder="File type"
              height={42}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
 
          <div className="min-w-[155px]">
            <SelectBox
              dataSource={withSelectedDisabled(SORT_BY_OPTIONS, sortByValue)}
              displayExpr="text"
              valueExpr="value"
              value={sortByValue}
              onValueChanged={(e) => onSortByChange(e.value)}
              placeholder="Sort by"
              height={42}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
        </div>
 
        <div className="flex-shrink-0">
          <CustomButton onClick={onShowUpload}>Upload</CustomButton>
        </div>
      </div>
 
      {/* Mobile Grid Layout */}
      <div className="md:hidden flex flex-col gap-3">
        {/* Search - Full Width */}
        <div className="w-full relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4b5563"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <TextBox
            className="search-input w-full"
            inputClassName="pl-9 h-10 border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black text-sm"
            placeholder="Search With aI..."
            value={searchValue}
            valueChangeEvent="input"
            height={40}
            onValueChanged={(e) => onSearchChange(e.value)}
          />
        </div>
 
        {/* First Row: Date + File Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <SelectBox
              dataSource={withSelectedDisabled(DATE_UPDATED_OPTIONS, selectedDateUpdatedValue)}
              displayExpr="text"
              valueExpr="value"
              value={selectedDateUpdatedValue}
              onValueChanged={(e) => handleDateUpdatedChange(e.value)}
              placeholder="Date updated"
              height={40}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
 
          <div>
            <SelectBox
              dataSource={withSelectedDisabled(FILE_TYPE_OPTIONS, fileTypeValue)}
              displayExpr="text"
              valueExpr="value"
              value={fileTypeValue}
              onValueChanged={(e) => onFileTypeChange(e.value)}
              placeholder="File type"
              height={40}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
        </div>
        {selectedDateUpdatedValue === 'custom' && isCustomDateRangeOpen && datePicker}
 
        {/* Second Row: Sort + Upload */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SelectBox
              dataSource={withSelectedDisabled(SORT_BY_OPTIONS, sortByValue)}
              displayExpr="text"
              valueExpr="value"
              value={sortByValue}
              onValueChanged={(e) => onSortByChange(e.value)}
              placeholder="Sort by"
              height={40}
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
 
          <div>
            <CustomButton onClick={onShowUpload}>Upload</CustomButton>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
 
AssetFilterBar.propTypes = {
  accordionArrowTemplate: PropTypes.func,
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  dateUpdatedValue: PropTypes.string.isRequired,
  onDateUpdatedChange: PropTypes.func.isRequired,
  showCustomDate: PropTypes.bool.isRequired,
  dateRangeValue: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    PropTypes.oneOf([null]),
  ]),
  onDateRangeChange: PropTypes.func.isRequired,
  fileTypeValue: PropTypes.string.isRequired,
  onFileTypeChange: PropTypes.func.isRequired,
  sortByValue: PropTypes.string.isRequired,
  onSortByChange: PropTypes.func.isRequired,
};
 
 
export default AssetFilterBar;