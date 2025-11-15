# Invoice System - Complete Code Documentation

## Table of Contents
1. [State Variables](#state-variables)
2. [Cart Management Functions](#cart-management-functions)
3. [Invoice Creation Logic](#invoice-creation-logic)
4. [Invoice Fetching Functions](#invoice-fetching-functions)
5. [UI Components - Cart Display](#ui-components---cart-display)
6. [Invoice Template Component](#invoice-template-component)
7. [Invoice Listing Page](#invoice-listing-page)
8. [Invoice Detail Page](#invoice-detail-page)
9. [API Routes](#api-routes)
10. [Database Schema](#database-schema)

---

## State Variables

```typescript
// Cart state
const [cart, setCart] = useState<any[]>([]);
const [latestInvoiceNumber, setLatestInvoiceNumber] = useState<number>(0);

// Supporting states
const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
const [barcodeInput, setBarcodeInput] = useState<string>('');
const [alertMessage, setAlertMessage] = useState<AlertMessage | null>(null);
```

---

## Cart Management Functions

### 1. Add to Cart

```typescript
const handleAddToCart = useCallback(() => {
  if (!barcodeInput || selectedQuantity <= 0) {
    toast.error('Please enter a valid barcode and quantity');
    setAlertMessage({ type: 'error', message: 'Please select a valid quantity and enter a barcode before adding to cart.' });
    return;
  }
  const product = products.find((p) => p.barcode === barcodeInput);
  if (!product) {
    toast.error('Product not found');
    setAlertMessage({ type: 'error', message: 'Product not found for the entered barcode.' });
    return;
  }
  if (product.quantity < selectedQuantity) {
    toast.error(`Not enough stock for ${product.english_names}`);
    setAlertMessage({ type: 'error', message: `Not enough stock for ${product.english_names}` });
    return;
  }
  // Check if already in cart
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    // Update quantity and total
    setCart((prev) => prev.map((item) =>
      item.productId === product.id
        ? { ...item, quantity: item.quantity + selectedQuantity, total: Number(product.price) * (item.quantity + selectedQuantity) }
        : item
    ));
  } else {
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.english_names,
        barcode: product.barcode,
        quantity: selectedQuantity,
        unitPrice: Number(product.price),
        total: Number(product.price) * selectedQuantity,
      },
    ]);
  }
  setBarcodeInput('');
  setSelectedQuantity(0);
}, [barcodeInput, selectedQuantity, products, cart]);
```

**Features:**
- Validates barcode and quantity input
- Checks if product exists
- Validates stock availability
- Handles duplicate items (updates quantity instead of adding new)
- Calculates total price automatically
- Clears input fields after adding

### 2. Remove from Cart

```typescript
const handleRemoveFromCart = (productId: number) => {
  setCart((prev) => prev.filter((item) => item.productId !== productId));
};
```

---

## Invoice Creation Logic

### Handle Sell All (Creates Invoice)

```typescript
const handleSellAll = useCallback(async () => {
  if (cart.length === 0) {
    toast.error('Cart is empty');
    setAlertMessage({ type: 'error', message: 'Cart is empty. Please add products to the cart before selling.' });
    return;
  }
  // Check stock for all items
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.quantity < item.quantity) {
      toast.error(`Not enough stock for ${item.name}`);
      setAlertMessage({ type: 'error', message: `Not enough stock for ${item.name}` });
      return;
    }
  }
  // Update product quantities in DB
  try {
    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const updatedProduct = { ...product, quantity: product.quantity - item.quantity };
      await fetch('/api/arduino', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });
    }
    // Fetch latest invoice number and increment
    const latestInvoiceNumber = await fetchLatestInvoiceNumber();
    const newInvoiceNumber = latestInvoiceNumber + 1;
    // Create invoice
    const invoiceData = {
      invoiceNumber: String(newInvoiceNumber),
      date: new Date().toISOString(),
      products: cart.map(item => ({
        ...item,
        barcode: item.barcode // Ensure barcode is from product itself
      })),
      subtotal: cart.reduce((sum, item) => sum + item.total, 0),
      total: cart.reduce((sum, item) => sum + item.total, 0),
    };
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });
    toast.success('Invoice created and products sold!');
    setAlertMessage({ type: 'success', message: 'Products sold! You can view the invoice in the Invoices tab.' });
    setCart([]);
    fetchProducts();
  } catch (error) {
    toast.error('Error processing sale');
    setAlertMessage({ type: 'error', message: 'Error processing sale. Please try again.' });
  }
}, [cart, products, fetchProducts]);
```

**Process Flow:**
1. Validates cart is not empty
2. Checks stock availability for all items
3. Updates product quantities in database (reduces stock)
4. Fetches latest invoice number and increments it
5. Creates invoice with cart items
6. Clears cart and refreshes products
7. Shows success/error messages

---

## Invoice Fetching Functions

### Fetch Latest Invoice Number

```typescript
const fetchLatestInvoiceNumber = async () => {
  try {
    const res = await fetch('/api/invoices');
    const data = await res.json();
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      // Try to parse the last invoice number as integer
      const lastInvoice = data.invoices[0]; // Sorted DESC by date
      const lastNumber = parseInt(lastInvoice.invoice_number, 10);
      if (!isNaN(lastNumber)) {
        return lastNumber;
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
};
```

### Initialize Invoice Number on Page Load

```typescript
useEffect(() => {
  const fetchAndSetInvoiceNumber = async () => {
    const num = await fetchLatestInvoiceNumber();
    setLatestInvoiceNumber(num);
  };
  fetchAndSetInvoiceNumber();
}, []);
```

---

## UI Components - Cart Display

### Cart Section UI

```tsx
{/* Cart Section */}
{cart.length > 0 && (
  <div className="bg-white rounded-lg shadow p-6 mb-8">
    <h2 className="text-lg font-bold mb-4">Cart</h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm mb-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Product</th>
            <th className="p-2">Barcode</th>
            <th className="p-2">Quantity</th>
            <th className="p-2">Unit Price</th>
            <th className="p-2">Total</th>
            <th className="p-2">Remove</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => (
            <tr key={item.productId} className="border-b last:border-b-0">
              <td className="p-2">{item.name}</td>
              <td className="p-2">{item.barcode}</td>
              <td className="p-2 text-center">{item.quantity}</td>
              <td className="p-2 text-right">{item.unitPrice.toFixed(2)}</td>
              <td className="p-2 text-right">{item.total.toFixed(2)}</td>
              <td className="p-2 text-center">
                <Button size="sm" className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleRemoveFromCart(item.productId)}>
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex justify-end mt-4">
      <Button onClick={handleSellAll} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
        Sell All
      </Button>
    </div>
  </div>
)}
```

### Add to Cart Input Controls

```tsx
<div className="flex flex-col md:flex-row gap-4 flex-1">
  <Select
    value={selectedQuantity.toString()}
    onValueChange={(value) => setSelectedQuantity(Number(value))}
  >
    <SelectTrigger className="w-full md:w-24">
      <SelectValue placeholder="Quantity" />
    </SelectTrigger>
    <SelectContent className='bg-white'>
      <SelectItem value="1">1</SelectItem>
      <SelectItem value="2">2</SelectItem>
      <SelectItem value="3">3</SelectItem>
      <SelectItem value="4">4</SelectItem>
      <SelectItem value="5">5</SelectItem>
    </SelectContent>
  </Select>
  <Input
    value={barcodeInput}
    onChange={(e) => setBarcodeInput(e.target.value)}
    placeholder="Enter Barcode"
    className="w-full md:w-64"
  />
  <Button onClick={handleAddToCart} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all transform hover:scale-105 cursor-pointer w-full md:w-auto">
    Add to Cart
  </Button>
</div>
```

---

## Invoice Template Component

**File:** `components/InvoiceTemplate.tsx`

```tsx
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
```

**Features:**
- Professional invoice layout with company header
- Product table with barcode, quantity, prices
- Print functionality with custom print styles
- Responsive design
- Turkish language support ("Teslim fisi")

---

## Invoice Listing Page

**File:** `app/invoices/page.tsx`

```tsx
"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Invoice {
  id: number;
  invoice_number: string;
  date_created: string;
  total_amount: any;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      const res = await fetch('/api/invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setLoading(false);
    }
    fetchInvoices();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      {loading ? (
        <div>Loading...</div>
      ) : invoices.length === 0 ? (
        <div>No invoices found.</div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Invoice #</th>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Total</th>
              <th className="border border-gray-300 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              let total = Number(inv.total_amount);
              if (isNaN(total)) total = 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{inv.invoice_number}</td>
                  <td className="border border-gray-300 p-2">{new Date(inv.date_created).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2">{total.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2">
                    <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## Invoice Detail Page

### Page Component

**File:** `app/invoices/[id]/page.tsx`

```tsx
import InvoiceClient from './InvoiceClient';

export default function InvoiceViewPage(props: any) {
  const { params } = props as { params: { id: string } };
  return <InvoiceClient id={params.id} />;
}
```

### Client Component

**File:** `app/invoices/[id]/InvoiceClient.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import InvoiceTemplate from '@/components/InvoiceTemplate';

interface InvoiceProduct {
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  products: InvoiceProduct[];
  subtotal: number;
  total: number;
}

export default function InvoiceClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Invoice not found');
        return res.json();
      })
      .then(setInvoice)
      .catch(err => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
        <p>Sorry, we couldn't find the invoice you are looking for.</p>
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  return (
    <div className="py-10">
      <InvoiceTemplate
        invoiceNumber={invoice.invoiceNumber}
        date={invoice.date}
        products={invoice.products}
        subtotal={invoice.subtotal}
        total={invoice.total}
      />
    </div>
  );
}
```

---

## API Routes

### POST /api/invoices - Create Invoice

**File:** `app/api/invoices/route.ts` (POST method)

```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received invoice POST body:', body);
    const { invoiceNumber, date, products, subtotal, total } = body;

    // Validate required fields
    if (!invoiceNumber || !date || !Array.isArray(products) || products.length === 0 || typeof total !== 'number') {
      console.error('Validation failed:', { invoiceNumber, date, products, total });
      return NextResponse.json({ error: 'Missing or invalid required fields.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Insert invoice
      const invoiceRes = await client.query(
        `INSERT INTO public.invoices (invoice_number, date_created, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [invoiceNumber, date, total, 'completed']
      );
      const invoiceId = invoiceRes.rows[0].id;
      // Insert invoice items
      for (const p of products) {
        if (!p.name || typeof p.quantity !== 'number' || typeof p.unitPrice !== 'number' || typeof p.total !== 'number') {
          console.error('Invalid product in invoice:', p);
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Invalid product data in invoice.' }, { status: 400 });
        }
        await client.query(
          `INSERT INTO public.invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, barcode)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            p.productId || null,
            p.name,
            p.quantity,
            p.unitPrice,
            p.total,
            p.barcode || null,
          ]
        );
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true, invoiceId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('SQL error in invoice POST:', err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: 'Failed to save invoice', details: message }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('General error in invoice POST:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
  }
}
```

**Features:**
- Transaction-based (BEGIN/COMMIT/ROLLBACK)
- Validates all required fields
- Inserts invoice and all invoice items
- Returns invoice ID on success

### GET /api/invoices - List All Invoices

**File:** `app/api/invoices/route.ts` (GET method)

```typescript
export async function GET() {
  try {
    const client = await pool.connect();
    const invoicesRes = await client.query('SELECT * FROM public.invoices ORDER BY date_created DESC');
    const invoices = invoicesRes.rows;
    // Fetch items for each invoice
    for (const invoice of invoices) {
      const itemsRes = await client.query('SELECT * FROM public.invoice_items WHERE invoice_id = $1', [invoice.id]);
      invoice.items = itemsRes.rows;
    }
    client.release();
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error in GET /api/invoices:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch invoices', details: message }, { status: 500 });
  }
}
```

**Features:**
- Returns all invoices sorted by date (newest first)
- Includes invoice items for each invoice
- Error handling

### GET /api/invoices/[id] - Get Single Invoice

**File:** `app/api/invoices/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request, context: any) {
  const invoiceId = context.params.id;
  console.log('Requested invoiceId:', invoiceId);
  if (!invoiceId) {
    return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
  }
  try {
    const client = await pool.connect();
    // Fetch invoice
    const invoiceRes = await client.query(
      'SELECT * FROM public.invoices WHERE id = $1',
      [invoiceId]
    );
    console.log('Invoice query result:', invoiceRes.rows);
    if (invoiceRes.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceRes.rows[0];
    // Fetch items
    const itemsRes = await client.query(
      'SELECT * FROM public.invoice_items WHERE invoice_id = $1',
      [invoiceId]
    );
    console.log('Invoice items query result:', itemsRes.rows);
    client.release();
    // Format for InvoiceTemplate
    function formatDate(dateString: string) {
      if (!dateString) return '';
      const d = new Date(dateString);
      // Format: YYYY-MM-DD HH:mm:ss
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    const products = itemsRes.rows.map((item: any) => ({
      name: item.product_name,
      barcode: item.barcode || '',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      total: Number(item.total_price),
    }));
    return NextResponse.json({
      invoiceNumber: invoice.invoice_number,
      date: formatDate(invoice.date_created),
      products,
      subtotal: products.reduce((sum: number, p: any) => sum + p.total, 0),
      total: Number(invoice.total_amount),
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
```

**Features:**
- Fetches invoice by ID
- Fetches all invoice items
- Formats date as YYYY-MM-DD HH:mm:ss
- Calculates subtotal from items
- Returns formatted data for InvoiceTemplate

---

## Database Schema

Based on the code, the database schema should be:

### invoices table

```sql
CREATE TABLE public.invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR NOT NULL,
  date_created TIMESTAMP NOT NULL,
  total_amount DECIMAL NOT NULL,
  status VARCHAR DEFAULT 'completed'
);
```

### invoice_items table

```sql
CREATE TABLE public.invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products(id),
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  barcode VARCHAR
);
```

---

## Complete Flow Summary

### 1. Adding Products to Cart
- User enters barcode and selects quantity
- Clicks "Add to Cart"
- Product is added/updated in cart state
- Cart displays all items with totals

### 2. Creating Invoice
- User clicks "Sell All" button
- System validates cart and stock
- Updates product quantities in database
- Fetches latest invoice number
- Creates new invoice with incremented number
- Inserts invoice and all invoice items in transaction
- Clears cart and refreshes products

### 3. Viewing Invoices
- User navigates to `/invoices` page
- System fetches all invoices from API
- Displays invoice list with totals
- User clicks "View" to see invoice details

### 4. Invoice Details
- User navigates to `/invoices/[id]`
- System fetches invoice and items from API
- Displays formatted invoice using InvoiceTemplate
- User can print invoice

---

## Data Structures

### Cart Item Structure

```typescript
{
  productId: number;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
```

### Invoice Data Structure (API Request)

```typescript
{
  invoiceNumber: string;
  date: string; // ISO string
  products: Array<{
    productId?: number;
    name: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
}
```

### Invoice Data Structure (API Response)

```typescript
{
  invoiceNumber: string;
  date: string; // Formatted as YYYY-MM-DD HH:mm:ss
  products: Array<{
    name: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
}
```

---

## Error Handling

- **Cart Validation**: Checks for empty cart, invalid barcode, insufficient stock
- **API Validation**: Validates required fields, data types, and array contents
- **Database Transactions**: Uses BEGIN/COMMIT/ROLLBACK for data integrity
- **User Feedback**: Toast notifications and alert messages for all operations
- **404 Handling**: Proper error pages for missing invoices

---

## Key Features

✅ **Transaction Safety**: All invoice creation uses database transactions  
✅ **Stock Management**: Automatically reduces product quantities on sale  
✅ **Auto-incrementing Invoice Numbers**: Fetches latest and increments  
✅ **Print Support**: Invoice template includes print functionality  
✅ **Responsive Design**: Works on mobile and desktop  
✅ **Error Handling**: Comprehensive validation and error messages  
✅ **Turkish Language Support**: Invoice header in Turkish ("Teslim fisi")

