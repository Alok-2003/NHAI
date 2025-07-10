import React, { useEffect, useRef } from 'react';

const ReportDialog = ({ open, onClose, report }) => {
  const dialogRef = useRef(null);
  
  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target) && open) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);
  
  // Load Chart.js dynamically when dialog opens
  useEffect(() => {
    if (open) {
      // Check if Chart.js is already loaded
      if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.async = true;
        script.onload = () => {
          // Trigger any DOMContentLoaded events that our report might be waiting for
          document.dispatchEvent(new Event('DOMContentLoaded'));
        };
        document.head.appendChild(script);
        
        return () => {
          document.head.removeChild(script);
        };
      } else {
        // If Chart.js is already loaded, just trigger the DOMContentLoaded event
        setTimeout(() => {
          document.dispatchEvent(new Event('DOMContentLoaded'));
        }, 100);
      }
    }
  }, [open]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto py-10">
      <div 
        ref={dialogRef}
        className="bg-white text-black rounded-lg shadow-2xl w-full max-w-5xl p-6 relative mx-4 my-auto"
      >
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b z-10">
          <h2 className="text-2xl font-bold text-blue-700">Road Condition Analysis Report</h2>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-sm"
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Road Condition Analysis Report</title>
                      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                    </head>
                    <body class="bg-white p-8">
                      ${report ? report.props.dangerouslySetInnerHTML.__html : ''}
                    </body>
                    <script>
                      document.addEventListener('DOMContentLoaded', function() {
                        setTimeout(() => {
                          window.print();
                        }, 1000);
                      });
                    </script>
                  </html>
                `);
                printWindow.document.close();
              }}
            >
              Print Report
            </button>
            <button
              className="p-2 text-gray-700 hover:text-red-500 text-2xl rounded-full hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[70vh] pr-2 report-container">
          {report}
        </div>
        
        <div className="mt-4 pt-2 border-t text-right">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition font-medium"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .report-container {
          scroll-behavior: smooth;
          scrollbar-width: thin;
        }
        .report-container::-webkit-scrollbar {
          width: 8px;
        }
        .report-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .report-container::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .report-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default ReportDialog;
