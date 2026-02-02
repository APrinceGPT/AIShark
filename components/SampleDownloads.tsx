'use client';

import { Download, FileArchive, Info } from 'lucide-react';

interface SampleFile {
  name: string;
  description: string;
  filename: string;
  size: string;
}

const sampleFiles: SampleFile[] = [
  {
    name: 'DNS Traffic',
    description: 'DNS query and response packets showing domain resolution',
    filename: 'dns1.pcap',
    size: '32 KB',
  },
  {
    name: 'HTTP Traffic (Google)',
    description: 'HTTP request/response traffic to Google services',
    filename: 'http-google101.pcapng',
    size: '379 KB',
  },
  {
    name: 'SMTP Email Traffic',
    description: 'SMTP protocol packets showing email transmission',
    filename: 'smtp1.pcapng',
    size: '37 KB',
  },
  {
    name: 'SMTP Email (Alternative)',
    description: 'Additional SMTP traffic sample for email analysis',
    filename: 'smtp2.pcap',
    size: '12 KB',
  },
];

export default function SampleDownloads() {
  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/samples/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileArchive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sample PCAP Files
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Don&apos;t have a PCAP file? Download one of our samples to test AIShark&apos;s analysis capabilities.
        </p>

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Download a sample file, then upload it using the analyzer above to see AIShark in action.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sampleFiles.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {file.description}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{file.size}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(file.filename)}
                className="ml-3 shrink-0 inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
