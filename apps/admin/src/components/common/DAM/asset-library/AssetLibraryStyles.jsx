const AssetLibraryStyles = () => (
  <style>{`
        .dragging { opacity: 0.4; }
        .kanban-scroll-container { scroll-behavior: smooth; overscroll-behavior: contain; }
        .kanban-scroll-container::-webkit-scrollbar { width: 8px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background-color: rgb(255, 255, 255); border-radius: 4px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.3); }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* ✅ Fix DevExpress CardView rounded corners */
        .dx-cardview-card {
          border-radius: 0 !important;
          overflow: visible !important;
          background: transparent !important;
          border: none !important;
          padding: 15px 5px !important;
          margin: 0 !important;
          box-shadow: none !important;
        }

        /* ✅ DevExpress Button Styling */
        .dx-cardview-header-container {
          flex-direction: row !important;
        }

        .dx-cardview-header-container .dx-button {
          border: 1px solid black !important;
          background: white !important;
          color: black !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 8px 16px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          transition: background-color 0.2s ease !important;
          min-width: max-content !important;
          height: auto !important;
        }

        .dx-cardview-header-container .dx-button:hover {
          background-color: #f3f4f6 !important;
          border-color: black !important;
        }

        .dx-cardview-header-container .dx-button.dx-state-disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          background: white !important;
          border-color: black !important;
        }

        .dx-cardview-header-container .dx-button-content {
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        .dx-cardview-header-container .dx-button-text {
          font-size: 12px !important;
          font-weight: 500 !important;
          color: black !important;
        }

        .dx-cardview-header-container .dx-icon {
          font-size: 12px !important;
          color: black !important;
        }

        /* ✅ Compact Pagination */
        .dx-pagination {
          padding: 20px 0 !important;
          margin: 0 !important;
          border-top: 0px solid #e5e7eb !important;
          background: transparent !important;
        }

        /* Mobile pagination - move higher from bottom */
        @media (max-width: 768px) {
          .dx-pagination {
            margin-bottom: 50px !important;
          }
        }

        .dx-pagination .dx-pages {
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .dx-pagination .dx-info {
          font-size: 11px !important;
          color: #6b7280 !important;
          padding: 0 16px 0 0 !important;
          margin: 0 !important;
          order: -1 !important;
        }

        .dx-pagination .dx-page {
          border: 1px solid black !important;
          background: white !important;
          color: black !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 4px 8px !important;
          margin: 0 1px !important;
          border-radius: 0 !important;
          min-height: 28px !important;
          min-width: 28px !important;
          transition: background-color 0.2s ease !important;
        }

        .dx-pagination .dx-page:hover {
          background-color: #f3f4f6 !important;
        }
        .dx-pagination .dx-page.dx-selection {
          background: white !important;
          color: black !important;
          border-bottom: 2px solid black !important;
          text-decoration: underline !important;
          text-underline-offset: 2px !important;
        }

        .dx-pagination .dx-navigate-button {
          border: 1px solid black !important;
          background: white !important;
          color: black !important;
          padding: 4px 6px !important;
          margin: 0 1px !important;
          border-radius: 0 !important;
          min-height: 28px !important;
          min-width: 28px !important;
          transition: background-color 0.2s ease !important;
        }

        .dx-pagination .dx-navigate-button:hover:not(.dx-button-disable) {
          background-color: #f3f4f6 !important;
        }

        .dx-pagination .dx-navigate-button.dx-button-disable {
          opacity: 0.3 !important;
          cursor: not-allowed !important;
        }

        .dx-pagination .dx-page-indexes {
          display: flex !important;
          align-items: center !important;
          gap: 1px !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .dx-pagination .dx-navigate-button::before {
          font-size: 12px !important;
          color: inherit !important;
        }

        .dx-pagination .dx-pages > * {
          margin: 0 !important;
        }
        .dx-cardview {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          padding-bottom: 0px !important;
        }
        .dx-widget .dx-cardview {
          padding: 0 !important;
        }
        .dx-cardview .dx-scrollable {
          flex: 1 1 auto !important;
          height: auto !important;
        }
        .dx-pagination, .dx-pager {
          flex: 0 0 auto !important;
          margin-top: auto !important;
        }

        /* Custom grid layout for assets */
        .dx-cardview .dx-scrollable-container {
          width: 100% !important;
          padding: 0px;
          overflow: hidden;
        }

        /* neutral when not focused */
        .custom-date-range .custom-calendar-datebox .dx-texteditor-container {
          border-bottom: 1px solid #d1d5db !important;
        }

        /* black only on focused input */
        .custom-date-range .custom-calendar-datebox.dx-state-focused .dx-texteditor-container {
          border-bottom: 1px solid black !important;
        }

        .dx-cardview .dx-scrollable-content::before,
        .dx-cardview .dx-scrollable-content::after {
          display: none;
        }

        .dx-cardview .dx-scrollable-content > .dx-cardview-content {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)) !important;
          gap: 24px;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 16px 24px;
          box-sizing: border-box !important;
        }

        /* Ensure cards maintain consistent width */
        .dx-cardview .dx-card {
          width: 100% !important;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .dx-cardview .dx-scrollable-content > .dx-cardview-content {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
            gap: 16px;
            padding: 0 12px 12px 12px;
          }

          .header-bar-inside-cardview {
            padding: 12px 12px 12px 12px !important;
          }
        }

        @media (max-width: 480px) {
          .dx-cardview .dx-scrollable-content > .dx-cardview-content {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
            gap: 12px;
            padding: 0 10px 10px 10px;
          }

          .header-bar-inside-cardview {
            padding: 10px 10px 10px 10px !important;
          }
        }

        .dx-cardview .dx-card {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
        }

        .dx-accordion-item{
          border-bottom: 1px solid black;
        }
        .dx-accordion-wrapper{
          border-bottom: 1px solid black;
        }
        .dx-texteditor.dx-editor-outlined{
          border: none;
          border-bottom: 1px solid black;
          border-radius: 0px;
        }
        .dx-textarea .dx-texteditor-input{
          border-bottom:none !important;
          border-radius: 0px;
        }
        .dx-overlay-content .dx-list-item{
          border: none;
        }
        /* Filter dropdown option hover - matches sidebar nav hover:bg-gray-100 */
        .dx-overlay-content .dx-list-item.dx-state-hover:not(.dx-list-item-selected):not(.dx-state-disabled){
          background-color: #f3f4f6 !important;
        }
        .dx-dropdownlist-popup-wrapper.dx-popup-wrapper .dx-overlay-content{
          border-radius: 0px;
          border: 1px solid black;
        }
        .dx-button-mode-contained.dx-button-default{
          background-color: black;
        }
        .dx-overlay-content .dx-list{
          border: none !important;
          border-radius: 0px !important;
        }
        .relume-filter-container .dx-textbox, .relume-filter-container .dx-selectbox, .relume-filter-container .dx-daterangebox{
          border:none;
          border-radius: 0px !important;
          box-shadow:none;
        }
        .dx-texteditor-container{
          border-bottom: 1px solid black;
        }

        .dx-overlay-content.dx-popup-normal.dx-resizable {
          transform: translateY(3rem) !important;
        }

        /* ADD THIS CSS FOR HEADER ALIGNMENT */
        .header-bar-inside-cardview {
          width: 100% !important;
          margin: 0 !important;
          padding: 16px 24px 0 24px !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }

        .header-bar-inside-cardview .relume-filter-container {
          max-width: none !important;
          width: 100% !important;
        }

        /* Pro Search bar width */
        .header-bar-inside-cardview .search-input {
          width: 420px !important;
          max-width: 100% !important;
        }

        /* Responsive alignment - matches existing card breakpoints */
        @media (max-width: 1279px) {
          .header-bar-inside-cardview {
        padding: 16px 24px 0 24px !important;
          }
        }

        @media (max-width: 1024px) {
          .header-bar-inside-cardview {
        padding: 14px 14px 0 14px !important;
          }
        }

        @media (max-width: 768px) {
          .header-bar-inside-cardview {
        padding: 12px 12px 0 12px !important;
          }
        }

        @media (max-width: 480px) {
          .header-bar-inside-cardview {
        padding: 10px 10px 0 10px !important;
          }
        }
        dx-pager .dx-pages .dx-info, .dx-pagination .dx-pages .dx-info{
          display:none;
        }

        .dx-pager .dx-pages .dx-next-button, .dx-pager .dx-pages .dx-prev-button, .dx-pagination .dx-pages .dx-next-button, .dx-pagination .dx-pages .dx-prev-button{
          border:none !important;
        }

        .dx-pager .dx-pages .dx-page, .dx-pagination .dx-pages .dx-page{
          border:none !important;
        }

        /* Mobile Header Responsive Styles - ADD THIS */
        @media (max-width: 767px) {
          .header-bar-inside-cardview {
        padding: 12px 12px 16px 12px !important;
          }

          .header-bar-inside-cardview .relume-filter-container {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
          }

          .header-bar-inside-cardview .dx-textbox,
          .header-bar-inside-cardview .dx-selectbox {
        width: 100% !important;
        font-size: 14px !important;
          }

          .header-bar-inside-cardview .search-input {
        width: 100% !important;
          }

          .header-bar-inside-cardview button {
        width: 100% !important;
        justify-content: center !important;
        text-align: center !important;
          }

          /* Mobile grid for filters */
          .header-bar-inside-cardview .grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
          }
        }

        /* Mobile Drawer Styles */
        @media (max-width: 768px) {
          .fixed.right-0.z-30 {
            width: 100vw !important;
            left: 0 !important;
          }
        }

        /* Upload Component Mobile Styles */
        @media (max-width: 640px) {
          .card {
            padding: 1rem !important;
          }
          
          .max-w-md {
            max-width: 100% !important;
            padding: 0 0.5rem !important;
          }
        }
      `}</style>
);

export default AssetLibraryStyles;
