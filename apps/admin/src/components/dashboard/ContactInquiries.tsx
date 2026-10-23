import React, { useState, useEffect, useContext } from 'react';
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    Grouping,
    GroupPanel,
    Paging,
    Pager,
    HeaderFilter,
    Selection,
    Sorting,
    FilterRow,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { UserContext } from '../../context/UserContext';
import { Eye } from 'lucide-react';
import { createGridExportHandler } from '../../utils/dataGridExport';


export default function ContactInquiries() {
  const userContext = useContext(UserContext);
  const token = userContext?.user?.token;
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceiverEmail, setSelectedReceiverEmail] = useState<string | null>(null);
  const [isReceiverModalOpen, setIsReceiverModalOpen] = useState(false);

  const renderSubmittedAtCell = (cellData: any) => {
    const dateText = cellData.text;
    const receiverEmail = cellData.data.receiverEmail || "N/A";
    return (
      <div className="flex items-center justify-between gap-2">
        <span>{dateText}</span>
        <button 
          onClick={() => {
            setSelectedReceiverEmail(receiverEmail);
            setIsReceiverModalOpen(true);
          }}
          className="text-gray-500 hover:text-blue-600 focus:outline-none transition-colors p-1 rounded hover:bg-gray-100 flex items-center justify-center"
          title={`Receiver: ${receiverEmail}`}
        >
          <Eye size={16} />
        </button>
      </div>
    );
  };


  const renderMessageCell = (cellData: any) => {
    return (
      <button 
        onClick={() => {
          setSelectedMessage(cellData.data.message);
          setIsModalOpen(true);
        }}
        className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
      >
        View Message
      </button>
    );
  };

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const base = (import.meta as any).env.VITE_BACKEND_API;
        const response = await fetch(`${base}/contact/inquiries`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch contact inquiries');
        }

        const result = await response.json();
        setData(result.data || []);
      } catch (error) {
        console.error(error);
        alert('Error fetching contact inquiries');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInquiries();
    } else {
      setLoading(false);
    }
  }, [token]);

  return (
    <>
      <style>{`
      `}</style>
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Feedback</h1>
              </div>
            </div>

            <div className="bg-white border border-black overflow-hidden flex flex-col min-h-[600px]">
              {loading ? (
                <div className="flex justify-center items-center min-h-[600px]">
                  <img
                    src="/images/tube-spinner.svg"
                    alt="Loading"
                    className="w-12 h-12 sm:w-16 sm:h-16 animate-spin"
                  />
                </div>
              ) : (
                <div className="h-full">
                  <DataGrid
                    dataSource={data}
                    keyExpr="submissionId"
                    showBorders={false}
                    hoverStateEnabled={true}
                    showColumnLines={false}
                    showRowLines={false}
                    allowColumnResizing={true}
                    allowColumnReordering={true}
                    wordWrapEnabled={true}
                    columnAutoWidth={true}
                    loadPanel={{ enabled: false }}
                    noDataText="No feedback found"
                    height="auto"
                    elementAttr={{ class: 'allstories-datagrid' }}
                    onExporting={createGridExportHandler('ContactInquiries')}
                  >
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                    <Grouping autoExpandAll={false} />
                    <ColumnChooser enabled={true} mode="select" />
                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                    <Selection mode="multiple" showCheckBoxesMode="always" />
                    <FilterRow visible={true} applyFilter="auto" />
                    <FilterPanel visible={true} />
                    <FilterBuilderPopup width={700} height={500} />
                    <HeaderFilter visible={true} />
                    
                    <Column dataField="firstName" caption="First Name" allowGrouping />
                    <Column dataField="lastName" caption="Last Name" allowGrouping />
                    <Column dataField="email" caption="Email" allowGrouping />
                    <Column dataField="phoneNumber" caption="Phone Number" allowGrouping={false} />
                    <Column dataField="topic" caption="Topic" allowGrouping />
                    <Column 
                      dataField="message" 
                      caption="Message" 
                      cellRender={renderMessageCell}
                      minWidth={150}
                      allowGrouping={false}
                    />
                    <Column 
                      dataField="createdAt" 
                      caption="Submitted At" 
                      dataType="date"
                      sortOrder="desc"
                      format="shortDate"
                      cellRender={renderSubmittedAtCell}
                      allowGrouping
                    />
                    
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                  </DataGrid>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal for viewing the full message */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-lg overflow-hidden flex flex-col border border-black transform transition-all">
              <div className="px-6 py-4 border-b border-black flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold text-gray-900">Contact Message</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-black hover:text-gray-600 transition-colors focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[60vh] bg-white">
                <p className="text-black whitespace-pre-wrap leading-relaxed text-base font-medium">
                  {selectedMessage || "No message provided."}
                </p>
              </div>
              <div className="px-6 py-4 border-t border-black flex justify-end bg-white">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-semibold text-sm border border-black focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal for viewing the Receiver Email */}
        {isReceiverModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-md overflow-hidden flex flex-col border border-black transform transition-all">
              <div className="px-6 py-4 border-b border-black flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold text-gray-900">Receiver Email</h3>
                <button 
                  onClick={() => setIsReceiverModalOpen(false)}
                  className="text-black hover:text-gray-600 transition-colors focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-8 bg-white">
                <div className="space-y-2">
                  <p className="text-black text-lg font-semibold break-all">
                    {selectedReceiverEmail || "No receiver email provided."}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-black flex justify-end bg-white">
                <button
                  onClick={() => setIsReceiverModalOpen(false)}
                  className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-semibold text-sm border border-black focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
