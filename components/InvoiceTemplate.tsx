"use client";
import React from 'react';
import Image from 'next/image';

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
  { name: 'supplied and and installed 11 kw of double sided solar panels ', barcode: '123456789', quantity: 0, unitPrice: 10, total: 4540.00 },
  { name: 'Supplied and installed deye 8kw hybrid inverter and twenty five (25) kw of deye solar back up batteries', barcode: '987654321', quantity: 1, unitPrice: 15, total: 11489.00 },
  { name: 'Supplied and installed custom made rooftop waterproof solar battery storage cabinet', barcode: '987654321', quantity: 1, unitPrice: 15, total: 700.00 },

];

export default function InvoiceTemplate({
  invoiceNumber = '38159',
  date = '2026-03-19',
  products = placeholderProducts,
  subtotal = 35,
  total = 35,
}: InvoiceTemplateProps) {
  void total;
  const kdvRate = 0.16;
  const kdvAmount = subtotal * kdvRate;
  const totalWithKdv = subtotal + kdvAmount;
  return (
    <div className="invoice-container max-w-5xl mx-auto bg-white font-sans text-[11px] print:bg-white">
      <div className="border border-gray-800 p-3">
        {/* Header */}
        <div className="grid grid-cols-[200px_1fr_260px] items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-14 flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <div className="text-[11px] font-semibold whitespace-nowrap">ALEMDAR TEKNİK LTD</div>
          </div>
          <div className="relative min-h-[80px]">
            <div className="absolute left-1/2 top-20 -translate-x-1/2 text-center">
              <div className="text-base font-bold tracking-wide">FATURA</div>
              <div className="mt-1 text-xs">Telefon</div>
              <div className="text-xs font-semibold">+90 542 877 2005</div>
            </div>
          </div>
          <div className="text-right text-[10px] leading-tight">
            <div className="text-xs font-semibold">ALEMDAR TEKNİK LTD</div>
            <div>Polis Sokak, No: 4 Suriariçi/Lefkoşa</div>
            <div>Tel: +90 542 877 2005</div>
            <div className="flex items-center justify-end gap-1">
              <svg className="h-3 w-3" viewBox="-2.73 0 1225.016 1225.016" aria-hidden="true">
                <path
                  fill="#E0E0E0"
                  d="M1041.858 178.02C927.206 63.289 774.753.07 612.325 0 277.617 0 5.232 272.298 5.098 606.991c-.039 106.986 27.915 211.42 81.048 303.476L0 1225.016l321.898-84.406c88.689 48.368 188.547 73.855 290.166 73.896h.258.003c334.654 0 607.08-272.346 607.222-607.023.056-162.208-63.052-314.724-177.689-429.463zm-429.533 933.963h-.197c-90.578-.048-179.402-24.366-256.878-70.339l-18.438-10.93-191.021 50.083 51-186.176-12.013-19.087c-50.525-80.336-77.198-173.175-77.16-268.504.111-278.186 226.507-504.503 504.898-504.503 134.812.056 261.519 52.604 356.814 147.965 95.289 95.36 147.728 222.128 147.688 356.948-.118 278.195-226.522 504.543-504.693 504.543z"
                />
                <linearGradient id="wa_grad" gradientUnits="userSpaceOnUse" x1="609.77" y1="1190.114" x2="609.77" y2="21.084">
                  <stop offset="0" stopColor="#20b038" />
                  <stop offset="1" stopColor="#60d66a" />
                </linearGradient>
                <path
                  fill="url(#wa_grad)"
                  d="M27.875 1190.114l82.211-300.18c-50.719-87.852-77.391-187.523-77.359-289.602.133-319.398 260.078-579.25 579.469-579.25 155.016.07 300.508 60.398 409.898 169.891 109.414 109.492 169.633 255.031 169.57 409.812-.133 319.406-260.094 579.281-579.445 579.281-.023 0 .016 0 0 0h-.258c-96.977-.031-192.266-24.375-276.898-70.5l-307.188 80.548z"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  fill="#FFF"
                  d="M462.273 349.294c-11.234-24.977-23.062-25.477-33.75-25.914-8.742-.375-18.75-.352-28.742-.352-10 0-26.25 3.758-39.992 18.766-13.75 15.008-52.5 51.289-52.5 125.078 0 73.797 53.75 145.102 61.242 155.117 7.5 10 103.758 166.266 256.203 226.383 126.695 49.961 152.477 40.023 179.977 37.523s88.734-36.273 101.234-71.297c12.5-35.016 12.5-65.031 8.75-71.305-3.75-6.25-13.75-10-28.75-17.5s-88.734-43.789-102.484-48.789-23.75-7.5-33.75 7.516c-10 15-38.727 48.773-47.477 58.773-8.75 10.023-17.5 11.273-32.5 3.773-15-7.523-63.305-23.344-120.609-74.438-44.586-39.75-74.688-88.844-83.438-103.859-8.75-15-.938-23.125 6.586-30.602 6.734-6.719 15-17.508 22.5-26.266 7.484-8.758 9.984-15.008 14.984-25.008 5-10.016 2.5-18.773-1.25-26.273s-32.898-81.67-46.234-111.326z"
                />
                <path
                  fill="#FFF"
                  d="M1036.898 176.091C923.562 62.677 772.859.185 612.297.114 281.43.114 12.172 269.286 12.039 600.137 12 705.896 39.633 809.13 92.156 900.13L7 1211.067l318.203-83.438c87.672 47.812 186.383 73.008 286.836 73.047h.255.003c330.812 0 600.109-269.219 600.25-600.055.055-160.343-62.328-311.108-175.649-424.53zm-424.601 923.242h-.195c-89.539-.047-177.344-24.086-253.93-69.531l-18.227-10.805-188.828 49.508 50.414-184.039-11.875-18.867c-49.945-79.414-76.312-171.188-76.273-265.422.109-274.992 223.906-498.711 499.102-498.711 133.266.055 258.516 52 352.719 146.266 94.195 94.266 146.031 219.578 145.992 352.852-.118 274.999-223.923 498.749-498.899 498.749z"
                />
              </svg>
              <span>Gsm: +90 542 877 2005 - Fax: +90 542 877 2005</span>
            </div>
            <div className="mt-2">Fatura Tarihi: <span className="font-semibold">{date}</span></div>
            <div className="mt-1 text-lg font-semibold">№ {invoiceNumber}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mt-2 grid grid-cols-[260px_1fr_180px] items-start gap-2">
          <div className="relative p-2 pt-4 min-h-[70px]">
            <div className="absolute top-1 left-3 bg-white px-1 text-[10px]">Sayın</div>
            <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-gray-700" />
            <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-gray-700" />
            <div className="absolute left-0 bottom-0 h-3 w-3 border-l border-b border-gray-700" />
            <div className="absolute right-0 bottom-0 h-3 w-3 border-r border-b border-gray-700" />
            <div className="pl-2 font-semibold">The pied piper pest control company limited 301 hall lane London E48nu</div>
          </div>
          <div />
          <div className="text-right text-xs">
          </div>
        </div>

        {/* Products */}
        <div className="mt-2 relative">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-semibold tracking-widest text-gray-200">
            ÖDENMİŞTİR
          </div>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-black text-white text-[10px] print:[-webkit-print-color-adjust:exact] print:[color-adjust:exact]">
                <th className="border border-gray-700 px-2 py-1 w-[9%]">ADET</th>
                <th className="border border-gray-700 px-2 py-1">A Ç I K L A M A</th>
                <th className="border border-gray-700 px-2 py-1 w-[11%]">B.Fiyat</th>
                <th className="border border-gray-700 px-2 py-1 w-[8%]">KDV</th>
                <th className="border border-gray-700 px-2 py-1 w-[12%]">TUTAR</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-700 px-2 py-2 text-center">-</td>
                  <td className="border border-gray-700 px-2 py-2">{p.name}</td>
                  <td className="border border-gray-700 px-2 py-2 text-right">-</td>
                  <td className="border border-gray-700 px-2 py-2 text-center">Included</td>
                  <td className="border border-gray-700 px-2 py-2 text-right">{p.total.toFixed(2)}£</td>
                </tr>
              ))}
              <tr>
                <td className="border border-gray-700 px-2 py-16" />
                <td className="border border-gray-700 px-2 py-16" />
                <td className="border border-gray-700 px-2 py-16" />
                <td className="border border-gray-700 px-2 py-16" />
                <td className="border border-gray-700 px-2 py-16" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-2 grid grid-cols-[1fr_220px] gap-2">
          <div className="border border-gray-700 bg-white px-2 py-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span>Yazı ile Yalnız:</span>
              <span className="flex-1 border-b border-dotted border-gray-700 h-4" />
            </div>
            <div className="mt-1">Son sterling Bakiyeniz 16,726 £ Dir</div>
            <div className="mt-1">
              Fatura tarihinden itibaren 15 gün içerisinde ödenmeyen faturalar için fatura
              tutarı üzerinden yasal en yüksek banka faizi alınır.
            </div>
          </div>
          <div className="border border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-700 px-2 py-1">
              <span>TUTAR</span>
              <span>16,726 £</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-700 px-2 py-1">
              <span>KDV</span>
              <span>Included £</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 font-semibold">
              <span>G. TOPLAM</span>
              <span>16,726 £</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 grid grid-cols-2 items-end gap-2 text-[10px]">
          <div className="flex items-end gap-2">
            <span>TESLİM ALAN</span>
            <span className="flex-1 border-b border-dotted border-gray-700" />
          </div>
          <div>
            <div className="text-center text-[10px]">Buse</div>
            <div className="flex items-end gap-2 justify-end">
              <span>TESLİM EDEN</span>
              <span className="flex-1 border-b border-dotted border-gray-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="mt-3 border border-gray-800 px-3 py-1 text-[10px] print:hidden"
        >
          Print Invoice
        </button>
      </div>

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
