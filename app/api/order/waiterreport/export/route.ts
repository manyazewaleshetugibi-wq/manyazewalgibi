// app/api/order/export/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { format, data, dateRange, startDate, endDate, waiterId } = body;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `orders_report_${timestamp}`;

    if (format === 'pdf') {
      // For PDF generation, you'd use a library like pdfkit or puppeteer
      // This is a placeholder - you'll need to implement PDF generation
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      
      // Set response headers
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      
      // Generate PDF content
      doc.fontSize(20).text('Sales Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`);
      doc.text(`Waiter: ${waiterId === 'all' ? 'All Waiters' : waiterId}`);
      doc.moveDown();
      
      // Add summary stats (with null safety)
      const stats = data?.stats || {};
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12).text(`Total Orders: ${stats.totalOrders || 0}`);
      doc.text(`Total Sales: $${(stats.totalSales || 0).toFixed(2)}`);
      doc.text(`Average Order: $${(stats.averageOrderValue || 0).toFixed(2)}`);
      doc.moveDown();
      
      // Add orders table
      doc.fontSize(14).text('Orders', { underline: true });
      (data?.orders || []).forEach((order: any) => {
        doc.fontSize(10).text(
          `${order.orderNumber} | ${order.date} | ${order.customer} | $${(order.total || 0).toFixed(2)}`
        );
      });
      
      // Convert PDF to buffer - wait for doc to finish writing
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        doc.end();
      });
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      });
      
    } else if (format === 'excel') {
      // For Excel generation, you'd use a library like exceljs
      // This is a placeholder
      return NextResponse.json(
        { error: 'Excel export not implemented yet' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid export format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
