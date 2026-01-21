/**
 * PDF Export Utility
 * Generates professional PDF reports from analysis sessions
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisSession, AIInsight, SessionStatistics } from '@/types/database';

interface ExportData {
  session: AnalysisSession;
  statistics: SessionStatistics;
  insights: AIInsight[];
  shareToken?: string;
  shareUrl?: string;
}

export async function generatePDF(data: ExportData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('AIShark Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(new Date().toLocaleString(), pageWidth / 2, yPosition, { align: 'center' });

  // Session Information
  yPosition += 15;
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.text('Session Information', 14, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81); // Gray-700
  
  const sessionInfo = [
    ['Session Name', data.session.name],
    ['File Name', data.session.file_name],
    ['File Size', formatFileSize(data.session.file_size)],
    ['Total Packets', data.session.packet_count.toLocaleString()],
    ['Created', new Date(data.session.created_at).toLocaleString()],
  ];

  if (data.shareUrl) {
    sessionInfo.push(['Share URL', data.shareUrl]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: sessionInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Protocol Distribution
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text('Protocol Distribution', 14, yPosition);

  yPosition += 8;
  const protocolData = Object.entries(data.statistics.protocol_distribution)
    .sort(([, a], [, b]) => b - a)
    .map(([protocol, count]) => [
      protocol,
      count.toLocaleString(),
      ((count / data.session.packet_count) * 100).toFixed(2) + '%',
    ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Protocol', 'Count', 'Percentage']],
    body: protocolData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Top Talkers
  if (data.statistics.top_talkers && data.statistics.top_talkers.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('Top Talkers', 14, yPosition);

    yPosition += 8;
    const talkerData = data.statistics.top_talkers.slice(0, 10).map((talker: any) => [
      talker.address || `${talker.source} → ${talker.destination}`,
      (talker.packets || 0).toLocaleString(),
      formatFileSize(talker.bytes || 0),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Address/Flow', 'Packets', 'Bytes']],
      body: talkerData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Network Issues
  if (data.statistics.anomaly_data) {
    const anomalyData = data.statistics.anomaly_data as any;
    const hasErrors = anomalyData.errors?.length > 0;
    const hasLatency = anomalyData.latencyIssues?.length > 0;

    if (hasErrors || hasLatency) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55);
      doc.text('Network Issues', 14, yPosition);

      yPosition += 8;

      if (hasErrors) {
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`⚠ ${anomalyData.errors.length} Error(s) Detected`, 14, yPosition);
        yPosition += 6;

        const errorData = anomalyData.errors.slice(0, 5).map((error: any) => [
          error.packet || 'N/A',
          error.type || 'Unknown',
          (error.description || '').substring(0, 60),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Packet', 'Type', 'Description']],
          body: errorData,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      if (hasLatency) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(234, 179, 8); // Yellow-500
        doc.text(`⚠ ${anomalyData.latencyIssues.length} Latency Issue(s)`, 14, yPosition);
        yPosition += 6;

        const latencyData = anomalyData.latencyIssues.slice(0, 5).map((issue: any) => [
          issue.packet || 'N/A',
          issue.latency ? `${issue.latency}ms` : 'N/A',
          (issue.description || '').substring(0, 60),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Packet', 'Latency', 'Description']],
          body: latencyData,
          theme: 'striped',
          headStyles: { fillColor: [234, 179, 8], textColor: 255 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
    }
  }

  // AI Insights
  if (data.insights && data.insights.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('AI Insights', 14, yPosition);

    yPosition += 8;

    data.insights.forEach((insight, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      // Insight type badge
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const typeColors: { [key: string]: [number, number, number] } = {
        summary: [37, 99, 235], // Blue
        anomaly: [220, 38, 38], // Red
        troubleshoot: [234, 179, 8], // Yellow
        suggestion: [34, 197, 94], // Green
        explanation: [168, 85, 247], // Purple
      };
      const bgColor = typeColors[insight.insight_type] || [107, 114, 128];
      doc.setFillColor(...bgColor);
      doc.roundedRect(14, yPosition - 4, 30, 6, 1, 1, 'F');
      doc.text(insight.insight_type.toUpperCase(), 15, yPosition);

      yPosition += 8;

      // Question (if exists)
      if (insight.question) {
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text('Query:', 14, yPosition);
        yPosition += 5;
        doc.setTextColor(55, 65, 81);
        const promptLines = doc.splitTextToSize(insight.question, pageWidth - 28);
        doc.text(promptLines, 14, yPosition);
        yPosition += promptLines.length * 4 + 4;
      }

      // Response
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Response:', 14, yPosition);
      yPosition += 5;
      doc.setTextColor(31, 41, 55);
      const responseLines = doc.splitTextToSize(insight.response, pageWidth - 28);
      
      // Handle pagination for long responses
      let remainingLines = responseLines;
      while (remainingLines.length > 0) {
        const availableLines = Math.floor((pageHeight - yPosition - 20) / 4);
        const linesToPrint = remainingLines.slice(0, availableLines);
        doc.text(linesToPrint, 14, yPosition);
        yPosition += linesToPrint.length * 4;
        remainingLines = remainingLines.slice(availableLines);

        if (remainingLines.length > 0) {
          doc.addPage();
          yPosition = 20;
        }
      }

      yPosition += 10;

      // Separator
      if (index < data.insights.length - 1) {
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.line(14, yPosition, pageWidth - 14, yPosition);
        yPosition += 10;
      }
    });
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.text(
      `Page ${i} of ${totalPages} • Generated by AIShark • ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
