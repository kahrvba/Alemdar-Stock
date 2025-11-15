"use client";
import React from 'react';

interface InvoiceProduct {
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceTemplateProps {
  invoiceNumber?: string;
  date?: string;
  products?: InvoiceProduct[];
  subtotal?: number;
  total?: number;
}

const placeholderProducts: InvoiceProduct[] = [
  { name: 'Product 1', barcode: '123456789', quantity: 2, unitPrice: 10, total: 20 },
  { name: 'Product 2', barcode: '987654321', quantity: 1, unitPrice: 15, total: 15 },
];

export default function InvoiceTemplate({
  invoiceNumber = 'INV-2024-001',
  date = '2024-05-17 12:00',
  products = placeholderProducts,
  subtotal = 35,
  total = 35,
}: InvoiceTemplateProps) {
  return (
    <div className="invoice-container max-w-xl mx-auto p-6 bg-white font-sans print:bg-white">
      {/* Header */}
      <div className="border-b-2 border-gray-800 mb-4 pb-2">
        <div className="flex items-center justify-between w-full">
          <div className="text-3xl font-bold">Alemdar Teknik</div>
          <div className="text-xl font-bold text-right text-gray-700">Teslim fisi</div>
        </div>
        <div className="flex flex-col mt-1">
          <div>Polis Sokak, No: 4 Suriariçi/Lefkoşa</div>
          <div>Phone: +90 542 877 2005 | Email: info@alemdarteknik.com</div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="flex justify-between mb-4">
        <div><span className="font-semibold">Invoice #:</span> {invoiceNumber}</div>
        <div><span className="font-semibold">Date:</span> {date}</div>
      </div>

      {/* Product Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Product Name</th>
              <th className="border border-gray-300 p-2">Barcode</th>
              <th className="border border-gray-300 p-2">Quantity</th>
              <th className="border border-gray-300 p-2">Unit Price</th>
              <th className="border border-gray-300 p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr key={idx}>
                <td className="border border-gray-300 p-2">{p.name}</td>
                <td className="border border-gray-300 p-2">{p.barcode}</td>
                <td className="border border-gray-300 p-2 text-center">{p.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{p.unitPrice.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-right">{p.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end mb-6">
        <div className="min-w-[200px]">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 print:hidden"
        >
          Print Invoice
        </button>
      </div>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-container, .invoice-container * { visibility: visible; }
          .invoice-container { position: absolute; left: 0; top: 0; width: 100vw; background: #fff; }
        }
      `}</style>
    </div>
  );
}

