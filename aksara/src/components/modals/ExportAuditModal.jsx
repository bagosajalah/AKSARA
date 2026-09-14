import React, { useState, forwardRef } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';

const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div className="relative cursor-pointer" onClick={onClick} ref={ref}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
      <Calendar className="h-4 w-4 text-gray-400" />
    </div>
    <input
      type="text"
      readOnly
      value={value}
      className="w-full rounded-xl border border-gray-200 dark:border-[#2A2D31] bg-white dark:bg-[#121315] text-gray-900 dark:text-white focus:bg-gray-50 dark:focus:bg-[#0D0E10] shadow-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 sm:text-sm py-2.5 pl-10 pr-4 transition-colors outline-none cursor-pointer"
    />
  </div>
));

export default function ExportAuditModal({ isOpen, onClose }) {
  const [dateRange, setDateRange] = useState([new Date(2026, 5, 30), new Date(2026, 6, 8)]);
  const [startDate, endDate] = dateRange;
  const [filterData, setFilterData] = useState("Semua Data");
  const [format, setFormat] = useState("csv");

  const handleProcess = (e) => {
    e.preventDefault();
    const rangeStr = startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : "Semua waktu";
    alert(`Memproses unduhan laporan audit...\nFormat: ${format.toUpperCase()}\nFilter: ${filterData}\nRentang: ${rangeStr}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unduh Laporan Audit" maxWidth="max-w-md">
      <form onSubmit={handleProcess} className="space-y-5">
        
        {/* Rentang Waktu */}
        <div>
          <label className="block text-xs uppercase font-medium text-gray-400 mb-1.5">Rentang Waktu</label>
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            dateFormat="dd MMM yyyy"
            customInput={<CustomDateInput />}
          />
        </div>

        {/* Filter Data */}
        <div>
          <label className="block text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-1.5">Filter Data</label>
          <select 
            value={filterData}
            onChange={(e) => setFilterData(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-[#2A2D31] bg-white dark:bg-[#121315] text-gray-900 dark:text-white focus:bg-gray-50 dark:focus:bg-[#0D0E10] shadow-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 sm:text-sm py-2.5 px-3 transition-colors outline-none appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
          >
            <option value="Semua Data" className="bg-white dark:bg-[#25272C] text-gray-900 dark:text-white">Semua Data</option>
            <option value="Hanya Dinas Kesehatan" className="bg-white dark:bg-[#25272C] text-gray-900 dark:text-white">Hanya Dinas Kesehatan</option>
            <option value="Hanya Diskominfo" className="bg-white dark:bg-[#25272C] text-gray-900 dark:text-white">Hanya Diskominfo</option>
          </select>
        </div>

        {/* Format Laporan */}
        <div>
          <label className="block text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">Format Laporan</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${format === 'csv' ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-[#2A2D31] bg-white dark:bg-[#121315] hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <input 
                type="radio" 
                name="format" 
                value="csv" 
                checked={format === 'csv'} 
                onChange={() => setFormat('csv')}
                className="sr-only"
              />
              <FileSpreadsheet className={`w-6 h-6 mb-2 ${format === 'csv' ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <span className={`text-sm font-medium ${format === 'csv' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-600 dark:text-gray-400'}`}>.CSV (Excel)</span>
            </label>

            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${format === 'pdf' ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-[#2A2D31] bg-white dark:bg-[#121315] hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <input 
                type="radio" 
                name="format" 
                value="pdf" 
                checked={format === 'pdf'} 
                onChange={() => setFormat('pdf')}
                className="sr-only"
              />
              <FileText className={`w-6 h-6 mb-2 ${format === 'pdf' ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <span className={`text-sm font-medium ${format === 'pdf' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-600 dark:text-gray-400'}`}>.PDF (Dokumen)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" icon={Download}>
            Proses Unduhan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
