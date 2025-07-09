import React from 'react';

const ReportDialog = ({ open, onClose, report }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50">
      <div className="bg-white text-black rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
        <button
          className="absolute top-2 right-4 text-gray-700 hover:text-red-500 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">CSV Report</h2>
        <div className="overflow-y-auto max-h-[60vh]">
          {report}
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
