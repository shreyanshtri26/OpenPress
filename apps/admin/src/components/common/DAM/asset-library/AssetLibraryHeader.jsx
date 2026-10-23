import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import TextBox from '@/components/ui/kit/text-box';
import SelectBox from '@/components/ui/kit/select-box';
import toast from 'react-hot-toast'; // ✅ ADDED
import CustomCalendar from '../../CustomCalendar';
import { withSelectedDisabled } from '../utils/selectOptions';

const getDateRange = (value) => (
  Array.isArray(value) && value.length === 2 ? value : [null, null]
);

const syncRangeValue = (rangeValue, index, nextValue) => {
  const nextRange = [...getDateRange(rangeValue)];
  nextRange[index] = nextValue ?? null;

  const [startDate, endDate] = nextRange;
  if (startDate && endDate && startDate > endDate) {
    if (index === 0) {
      nextRange[1] = startDate;
    } else {
      nextRange[0] = endDate;
    }
  }

  return nextRange;
};

export const AssetLibraryDesktopHeader = ({
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  dateUpdatedOptions = [],
  dateUpdatedValue = 'all',
  onDateUpdatedChange,
  showCustomDate = false,
  dateRangeValue = null,
  onDateRangeChange,
  fileTypeOptions = [],
  fileTypeValue = 'all',
  onFileTypeChange,
  sortByOptions = [],
  sortByValue = 'newest',
  onSortByChange,
  onShowUpload,
  accordionArrowTemplate,
}) => {
  const [isDateUpdatedDropdownOpen, setIsDateUpdatedDropdownOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(showCustomDate);
  const [selectedDateUpdatedValue, setSelectedDateUpdatedValue] = useState(dateUpdatedValue);
  const customDateRangeRef = useRef(null);
  const shouldShowCustomDate = selectedDateUpdatedValue === 'custom' && isCustomDateRangeOpen && !isDateUpdatedDropdownOpen;
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(dateRangeValue));
  const [startDate, endDate] = draftDateRange;

  useEffect(() => {
    if (dateUpdatedValue !== 'custom') {
      setSelectedDateUpdatedValue(dateUpdatedValue);
    }
    if (showCustomDate) {
      setDraftDateRange(getDateRange(dateRangeValue));
      setIsCustomDateRangeOpen(true);
    }
  }, [showCustomDate, dateRangeValue, dateUpdatedValue]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (
        customDateRangeRef.current?.contains(target) ||
        target.closest?.('.kit-popup-overlay')
      ) {
        return;
      }
      setIsCustomDateRangeOpen(false);
    };

    if (shouldShowCustomDate) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [shouldShowCustomDate]);

  const handleDateChange = (index) => ({ value }) => {
    setDraftDateRange((current) => syncRangeValue(current, index, value));
  };

  const handleClearDateRange = () => {
    setDraftDateRange([null, null]);
    setSelectedDateUpdatedValue('all');
    onDateRangeChange?.([null, null]);
    onDateUpdatedChange?.('all');
  };

  const handleDateUpdatedValueChange = (value) => {
    setSelectedDateUpdatedValue(value);
    if (value === 'custom') {
      setDraftDateRange(getDateRange(dateRangeValue));
      setIsCustomDateRangeOpen(true);
      return;
    }
    onDateUpdatedChange?.(value);
  };
  
  return (
    <div className="header-bar-inside-cardview pb-3">
      <div className="relume-filter-container flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">

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
              placeholder="search with AI..."
              value={searchValue}
              valueChangeEvent="input"
              height={40}
              onValueChanged={(e) => onSearchChange?.(e.value)}
              onEnterKey={(e) => {
                e.event.preventDefault();
                const query = searchValue.trim();
                if (!query) {
                  toast.error('Please type something before searching');
                  return;
                }
                onSearchSubmit?.(query);
              }}
            />
          </div>

          <div className="min-w-[155px] relative">
            <SelectBox
              dataSource={withSelectedDisabled(dateUpdatedOptions, selectedDateUpdatedValue)}
              displayExpr="text"
              valueExpr="value"
              value={selectedDateUpdatedValue}
              onValueChanged={(e) => handleDateUpdatedValueChange(e.value)}
              placeholder="Date updated"
              height={42}
              inputClassName="h-[42px] border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black text-sm"
              dropDownButtonTemplate={accordionArrowTemplate}
              onOpened={() => setIsDateUpdatedDropdownOpen(true)}
              onClosed={() => {
                setIsDateUpdatedDropdownOpen(false);
                if (selectedDateUpdatedValue === 'custom') setIsCustomDateRangeOpen(true);
              }}
            />
            {shouldShowCustomDate && (
              <div ref={customDateRangeRef} className="custom-date-range absolute top-full left-0 mt-2 z-30 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-black shadow-lg p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">Start date</label>
                    <CustomCalendar
                      value={startDate}
                      onValueChanged={handleDateChange(0)}
                      placeholder="Start date"
                      displayFormat="MMMM d, yyyy"
                      showTimeHeader={false}
                      disablePastDates={false}
                      showClearButton={true}
                      max={endDate || new Date()}
                      dropDownOptions={{
                        shading: false,
                        closeOnOutsideClick: true,
                        hideOnOutsideClick: true,
                        closeOnValueChange: true,
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">End date</label>
                    <CustomCalendar
                      value={endDate}
                      onValueChanged={handleDateChange(1)}
                      placeholder="End date"
                      displayFormat="MMMM d, yyyy"
                      showTimeHeader={false}
                      disablePastDates={false}
                      showClearButton={true}
                      min={startDate || undefined}
                      max={new Date()}
                      dropDownOptions={{
                        shading: false,
                        closeOnOutsideClick: true,
                        hideOnOutsideClick: true,
                        closeOnValueChange: true,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClearDateRange}
                    className="border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDateRangeChange?.(draftDateRange);
                      onDateUpdatedChange?.('custom');
                    }}
                    disabled={!startDate || !endDate}
                    className="bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 rounded"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-[135px]">
            <SelectBox
              dataSource={withSelectedDisabled(fileTypeOptions, fileTypeValue)}
              displayExpr="text"
              valueExpr="value"
              value={fileTypeValue}
              onValueChanged={(e) => onFileTypeChange?.(e.value)}
              placeholder="File type"
              height={42}
              inputClassName="h-[42px] border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black text-sm"
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>

          <div className="min-w-[155px]">
            <SelectBox
              dataSource={withSelectedDisabled(sortByOptions, sortByValue)}
              displayExpr="text"
              valueExpr="value"
              value={sortByValue}
              onValueChanged={(e) => onSortByChange?.(e.value)}
              placeholder="Sort by"
              height={42}
              inputClassName="h-[42px] border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black text-sm"
              dropDownButtonTemplate={accordionArrowTemplate}
            />
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={onShowUpload}
            className="h-10 px-5 bg-black text-white rounded-md text-xs font-semibold hover:bg-gray-800 border border-black transition-colors whitespace-nowrap flex items-center justify-center shadow-sm"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

export const AssetLibraryMobileHeader = ({
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  dateUpdatedOptions = [],
  dateUpdatedValue = 'all',
  onDateUpdatedChange,
  showCustomDate = false,
  dateRangeValue = null,
  onDateRangeChange,
  fileTypeOptions = [],
  fileTypeValue = 'all',
  onFileTypeChange,
  sortByOptions = [],
  sortByValue = 'newest',
  onSortByChange,
  onShowUpload,
  accordionArrowTemplate,
  onToggleSidebar,
}) => {
  const [draftDateRange, setDraftDateRange] = useState(() => getDateRange(dateRangeValue));
  const [selectedDateUpdatedValue, setSelectedDateUpdatedValue] = useState(dateUpdatedValue);
  const [startDate, endDate] = draftDateRange;

  useEffect(() => {
    if (dateUpdatedValue !== 'custom') setSelectedDateUpdatedValue(dateUpdatedValue);
    if (showCustomDate) setDraftDateRange(getDateRange(dateRangeValue));
  }, [showCustomDate, dateRangeValue, dateUpdatedValue]);

  const handleDateChange = (index) => ({ value }) => {
    setDraftDateRange((current) => syncRangeValue(current, index, value));
  };

  const handleClearDateRange = () => {
    setDraftDateRange([null, null]);
    setSelectedDateUpdatedValue('all');
    onDateRangeChange?.([null, null]);
    onDateUpdatedChange?.('all');
  };

  const handleDateUpdatedValueChange = (value) => {
    setSelectedDateUpdatedValue(value);
    if (value !== 'custom') onDateUpdatedChange?.(value);
  };

  return (
  <div className="header-bar-inside-cardview">
    {/* Mobile Sidebar Toggle */}
    {onToggleSidebar && (
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-2 text-gray-800 focus:outline-none mb-2"
        aria-label="Open sidebar"
      >
        <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    )}

    <div className="relume-filter-container flex flex-col gap-3">

      {/* ✅ FIXED: Changed from <form> to <div> */}
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
          placeholder="search with AI..."
          value={searchValue}
          valueChangeEvent="input"
          onValueChanged={(e) => onSearchChange?.(e.value)}
          height={40}
          onEnterKey={(e) => {
            e.event.preventDefault();
            const query = searchValue.trim();
            if (!query) {
              toast.error('Please type something before searching');
              return;
            }
            onSearchSubmit?.(query);
          }}
        />
      </div>

      {/* Rest of filters in grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <SelectBox
            dataSource={withSelectedDisabled(dateUpdatedOptions, selectedDateUpdatedValue)}
            displayExpr="text"
            valueExpr="value"
            value={selectedDateUpdatedValue}
            onValueChanged={(e) => handleDateUpdatedValueChange(e.value)}
            placeholder="Updated"
            height={38}
            inputClassName="h-[38px] border border-gray-300 rounded-md text-xs focus:border-black focus:ring-1 focus:ring-black"
            dropDownButtonTemplate={accordionArrowTemplate}
          />
        </div>

        <div>
          <SelectBox
            dataSource={withSelectedDisabled(fileTypeOptions, fileTypeValue)}
            displayExpr="text"
            valueExpr="value"
            value={fileTypeValue}
            onValueChanged={(e) => onFileTypeChange?.(e.value)}
            placeholder="Type"
            height={38}
            inputClassName="h-[38px] border border-gray-300 rounded-md text-xs focus:border-black focus:ring-1 focus:ring-black"
            dropDownButtonTemplate={accordionArrowTemplate}
          />
        </div>

        <div>
          <SelectBox
            dataSource={withSelectedDisabled(sortByOptions, sortByValue)}
            displayExpr="text"
            valueExpr="value"
            value={sortByValue}
            onValueChanged={(e) => onSortByChange?.(e.value)}
            placeholder="Sort"
            height={38}
            inputClassName="h-[38px] border border-gray-300 rounded-md text-xs focus:border-black focus:ring-1 focus:ring-black"
            dropDownButtonTemplate={accordionArrowTemplate}
          />
        </div>

        <div>
          <button
            onClick={onShowUpload}
            className="w-full h-[38px] border border-black bg-black text-white px-3 py-2 text-xs font-semibold rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center shadow-sm"
          >
            Upload
          </button>
        </div>
      </div>
      {selectedDateUpdatedValue === 'custom' && (
        <div
          className="custom-date-range"
          style={{
          marginTop: '15px',
          paddingBottom: '5px',
          }}
        >
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
          Select date range
        </label>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">Start date</label>
            <CustomCalendar
              value={startDate}
              onValueChanged={handleDateChange(0)}
              placeholder="Start date"
              displayFormat="MMMM d, yyyy"
              showTimeHeader={false}
              disablePastDates={false}
              showClearButton={true}
              max={endDate || new Date()}
              dropDownOptions={{
                shading: false,
                closeOnOutsideClick: true,
                hideOnOutsideClick: true,
                closeOnValueChange: true,
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">End date</label>
            <CustomCalendar
              value={endDate}
              onValueChanged={handleDateChange(1)}
              placeholder="End date"
              displayFormat="MMMM d, yyyy"
              showTimeHeader={false}
              disablePastDates={false}
              showClearButton={true}
              min={startDate || undefined}
              max={new Date()}
              dropDownOptions={{
                shading: false,
                closeOnOutsideClick: true,
                hideOnOutsideClick: true,
                closeOnValueChange: true,
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClearDateRange}
            className="border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onDateRangeChange?.(draftDateRange);
              onDateUpdatedChange?.('custom');
            }}
            disabled={!startDate || !endDate}
            className="bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Apply
          </button>
        </div>
        </div>
      )}


    </div>
  </div>
  );
};



AssetLibraryDesktopHeader.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onSearchSubmit: PropTypes.func,
  dateUpdatedOptions: PropTypes.array,
  dateUpdatedValue: PropTypes.string,
  onDateUpdatedChange: PropTypes.func,
  showCustomDate: PropTypes.bool,
  dateRangeValue: PropTypes.array,
  onDateRangeChange: PropTypes.func,
  fileTypeOptions: PropTypes.array,
  fileTypeValue: PropTypes.string,
  onFileTypeChange: PropTypes.func,
  sortByOptions: PropTypes.array,
  sortByValue: PropTypes.string,
  onSortByChange: PropTypes.func,
  onShowUpload: PropTypes.func,
  accordionArrowTemplate: PropTypes.func,
};

AssetLibraryMobileHeader.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onSearchSubmit: PropTypes.func,
  dateUpdatedOptions: PropTypes.array,
  dateUpdatedValue: PropTypes.string,
  onDateUpdatedChange: PropTypes.func,
  showCustomDate: PropTypes.bool,
  dateRangeValue: PropTypes.array,
  onDateRangeChange: PropTypes.func,
  fileTypeOptions: PropTypes.array,
  fileTypeValue: PropTypes.string,
  onFileTypeChange: PropTypes.func,
  sortByOptions: PropTypes.array,
  sortByValue: PropTypes.string,
  onSortByChange: PropTypes.func,
  onShowUpload: PropTypes.func,
  accordionArrowTemplate: PropTypes.func,
  onToggleSidebar: PropTypes.func,
};
