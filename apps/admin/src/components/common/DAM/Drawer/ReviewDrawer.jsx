// src/components/common/DAM/Drawer/ReviewDrawer.jsx

import Accordion from '@/components/ui/dx/accordion';
import TextArea from '@/components/ui/dx/text-area';
import { useState, useCallback , useEffect} from 'react';
import CustomButton from '../../CustomButton';

// Decision options
const decisionOptions = [
  { id: 'approve', name: 'Approve' },
  { id: 'hold', name: 'Hold' },
  { id: 'reject', name: 'Reject' },
];

export default function ReviewDrawer({ asset = {}, onClose }) {
  const [formData, setFormData] = useState({
    editorComments: '',
    decision: '',
  });
const isFormValid = ()=>{
  return (
 formData.editorComments && formData.decision
  );
};
  // Simplified state management using DevExtreme's selectedItems approach
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    setSelectedItems([{ ID: 'editorComments', field: "section" }]);
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear selection to close accordion immediately after selection
    if (field === 'decision') {
      setSelectedItems([]);
    }
  }, []);

  const handleAccordionSelectionChanged = useCallback((e) => {
    setSelectedItems(e.component.option('selectedItems'));
  }, []);

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Close button clicked', { onClose });
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('onClose prop is not provided or not a function');
    }
  };

  const handleSubmit = () => {
    console.log('Form data:', formData);
    if (onClose) onClose();
  };

  const getDisplayValue = (field, options) => {
    const value = formData[field];
    if (!value) return null;
    const selected = options?.find((opt) => opt.id === value);
    return selected?.name || null;
  };

  const renderOptionsList = (options, field) => {
    return (
      <div className="options-list">
        {options.map((option) => (
          <div
            key={option.id}
            className="option-item"
            onClick={() => handleInputChange(field, option.id)}
          >
            {option.name}
          </div>
        ))}
      </div>
    );
  };

  const accordionData = [
    {
      ID: 'editorComments',
      title: "Editor's comments",
      field: 'editorComments',
      placeholder: "Editor's comments",
      displayValue: formData.editorComments ?
        (formData.editorComments.substring(0, 50) +
         (formData.editorComments.length > 50 ? '...' : '')) : null,
      content: (
        <div className="custom-textarea">
          <TextArea
            value={formData.editorComments}
            onValueChanged={(e) => handleInputChange('editorComments', e.value)}
            height={150}
            stylingMode="outlined"
            className="border border-black"
            placeholder="Enter your comments..."
          />
        </div>
      ),
    },
    {
      ID: 'decision',
      title: 'Decision*',
      field: 'decision',
      placeholder: 'Decision',
      displayValue: getDisplayValue('decision', decisionOptions),
      options: decisionOptions,
      content: renderOptionsList(decisionOptions, 'decision'),
    },
  ];

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-black">
          <h2 className="font-bold text-black">Review</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 font-bold"
            type="button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-4 pb-4 pt-0">
          <Accordion
            dataSource={accordionData}
            keyExpr="ID"
            displayExpr="title"
            selectedItems={selectedItems}
            onSelectionChanged={handleAccordionSelectionChanged}
            collapsible={true}
            multiple={false}
            animationDuration={200}
            height="auto"
            className="custom-accordion"
            itemTitleRender={(item) => (
              <div className="accordion-title-wrapper">
                <span className={item.displayValue ? 'text-black' : 'text-gray-500'}>
                  {item.displayValue || item.placeholder}
                  {item.ID === 'decision' && (
                    <span className="text-gray-700 font-semibold"> *</span>
                  )}
                </span>
              </div>
            )}
            itemRender={(item) => (
              <div className="accordion-content-wrapper">
                {item.content}
              </div>
            )}
          />

          <div className="flex justify-center">
            <CustomButton variant="black" className="px-8" onClick={handleSubmit} disabled={!isFormValid()}>
              Done
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        /* Accordion styling to look like SelectBox */
        .dx-accordion {
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .dx-accordion-item {
          border: none !important;
          margin-bottom: 2px !important;
          position: relative;
          border-bottom: 1px solid black !important;
          padding-bottom: 12px;
          margin-bottom: 2px !important;
        }

        .dx-accordion-item-title {
          border: none !important;
          border-radius: 4px !important;
          padding: 0 !important;
          background: white !important;
          min-height: 40px !important;
          display: flex !important;
          align-items: center !important;
        }

        .dx-accordion-item-title .dx-item-content {
          padding: 0 !important;
        }

        /* Hide accordion arrow */
        .dx-accordion-item-title::after {
          display: none !important;
        }

        /* Closed items */
        .dx-accordion-item.dx-accordion-item-closed .dx-item-content {
          height: 0 !important;
          overflow: hidden !important;
        }

        .dx-accordion-item-opened .dx-accordion-item-title {
          border: none !important;
        }

        .dx-accordion-item-body {
          border: none !important;
          border-top: none !important;
          border-radius: 0 0 4px 4px !important;
          padding: 0 0 0 0 !important;
        }

        /* Opened items */
        .dx-accordion-item-opened .dx-accordion-item-body {
          padding: 8px 0 0 0 !important;
        }

        .accordion-title-wrapper {
          font-family: 'Inter', sans-serif !important;
          font-size: 15px !important;
          font-weight: 400 !important;
          width: 100%;
          padding: 0;
        }

        .accordion-content-wrapper {
          padding: 0 !important;
        }

        /* Options List Styling */
        .options-list {
          display: flex;
          flex-direction: column;
          border: 1px solid black;
          padding-top: 0;
          padding-bottom: 8px;
        }

        /* Remove DevExtreme hover/selected tints */
        .dx-accordion .dx-accordion-item.dx-state-hover,
        .dx-accordion .dx-accordion-item.dx-state-focused,
        .dx-accordion .dx-accordion-item-title.dx-state-hover,
        .dx-accordion .dx-accordion-item-title.dx-state-focused,
        .dx-accordion .dx-item-selected {
          background: transparent !important;
          box-shadow: none !important;
        }

        .option-item {
          font-family: 'Inter', sans-serif !important;
          font-size: 15px !important;
          color: #111 !important;
          font-weight: 400 !important;
          padding: 3px 16px !important;
          cursor: pointer;
        }

        .option-item:hover {
          background-color: #f9fafb;
        }

        .dx-texteditor,
        .dx-texteditor-input {
          border-radius: 0 !important;
        }

        .custom-textarea .dx-texteditor:hover {
          background: #f9fafb !important;
        }

        .custom-textarea .dx-texteditor-input {
          font-family: 'Inter', sans-serif !important;
          font-size: 15px !important;
          padding: 12px !important;
        }

        /* Ensure TextArea border stays consistent */
        .custom-textarea .dx-texteditor {
          border: 1px solid black !important;
        }

        .custom-textarea .dx-texteditor.dx-state-focused {
          border-color: black !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}
