import { saveAs } from 'file-saver'; 
import * as ExcelJS from 'exceljs';
import type { ArduinoProduct } from '@/lib/services/arduino';
import type { CableProduct } from '@/lib/services/cable';
import type { SoundProduct } from '@/lib/services/sound';
import type { SolarProduct } from '@/lib/services/solar';

// 1. Full Excel Sheet Function (downloadExcel)
export const downloadExcel = async (products: ArduinoProduct[]) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  
  // Add header row
  const headers = ['ID', 'English Name', 'Turkish Name', 'Category', 'Barcode', 'Quantity', 'Price', 'Description'];
  worksheet.addRow(headers);
  
  // Set column widths
  worksheet.getColumn(1).width = 5;   // ID
  worksheet.getColumn(2).width = 40;  // English Name
  worksheet.getColumn(3).width = 40;  // Turkish Name
  worksheet.getColumn(4).width = 40;  // Category
  worksheet.getColumn(5).width = 40;  // Barcode
  worksheet.getColumn(6).width = 10;  // Quantity
  worksheet.getColumn(7).width = 10;  // Price
  worksheet.getColumn(8).width = 50;  // Description
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25; // Set header row height
  
  // Add data rows
  products.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_names,
      product.turkish_names,
      product.category,
      product.barcode,
      product.quantity,
      product.price,
      product.description
    ]);
    
    // Set the height for each data row
    row.height = 20; // Increase row height (default is typically around 15)
  });
  
  // Apply color formatting based on quantity - highlight entire row
  // Start from row 2 (after headers)
  for (let i = 2; i <= products.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(6).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-7)
      for (let col = 1; col <= 7; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Arduino-Products.xlsx');
};

// 2. Highlighted Excel Sheet Function (highlightExcel)
export const highlightExcel = async (products: ArduinoProduct[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.addRow(['ID', 'English Name', 'Turkish Name', 'Category', 'Barcode', 'Quantity', 'Price']);

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 40;
  worksheet.getColumn(4).width = 40;
  worksheet.getColumn(5).width = 40;
  worksheet.getColumn(6).width = 10;
  worksheet.getColumn(7).width = 10;

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25;

  products.filter(product => (product.quantity ?? 0) <= 3) // Filter products with low quantity
  .forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_names,
      product.turkish_names,
      product.category,
      product.barcode,
      product.quantity,
      product.price
    ]);
    

  row.height = 20;
});
  for (let i = 2; i <= products.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(6).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-7)
      for (let col = 1; col <= 7; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'highlight-Excel.xlsx');
};

// 3. Full Excel Sheet Function for Cable (downloadCableExcel)
export const downloadCableExcel = async (products: CableProduct[]) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  
  // Add header row
  const headers = ['ID', 'English Name', 'Turkish Name', 'Category', 'Barcode', 'Quantity', 'Price', 'Description'];
  worksheet.addRow(headers);
  
  // Set column widths
  worksheet.getColumn(1).width = 5;   // ID
  worksheet.getColumn(2).width = 40;  // English Name
  worksheet.getColumn(3).width = 40;  // Turkish Name
  worksheet.getColumn(4).width = 40;  // Category
  worksheet.getColumn(5).width = 40;  // Barcode
  worksheet.getColumn(6).width = 10;  // Quantity
  worksheet.getColumn(7).width = 10;  // Price
  worksheet.getColumn(8).width = 50;  // Description
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25; // Set header row height
  
  // Add data rows
  products.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_name,
      product.turkish_name,
      product.category,
      product.barcode,
      product.quantity,
      product.price,
      product.description
    ]);
    
    // Set the height for each data row
    row.height = 20; // Increase row height (default is typically around 15)
  });
  
  // Apply color formatting based on quantity - highlight entire row
  // Start from row 2 (after headers)
  for (let i = 2; i <= products.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(6).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-7)
      for (let col = 1; col <= 7; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Cable-Products.xlsx');
};

// 4. Highlighted Excel Sheet Function for Cable (highlightCableExcel)
export const highlightCableExcel = async (products: CableProduct[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.addRow(['ID', 'English Name', 'Turkish Name', 'Category', 'Barcode', 'Quantity', 'Price']);

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 40;
  worksheet.getColumn(4).width = 40;
  worksheet.getColumn(5).width = 40;
  worksheet.getColumn(6).width = 10;
  worksheet.getColumn(7).width = 10;

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25;

  const filteredProducts = products.filter(product => (product.quantity ?? 0) <= 3); // Filter products with low quantity
  filteredProducts.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_name,
      product.turkish_name,
      product.category,
      product.barcode,
      product.quantity,
      product.price
    ]);
    
    row.height = 20;
  });
  
  for (let i = 2; i <= filteredProducts.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(6).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-7)
      for (let col = 1; col <= 7; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'highlight-Cable-Excel.xlsx');
};

// 5. Full Excel Sheet Function for Sound (downloadSoundExcel)
export const downloadSoundExcel = async (products: SoundProduct[]) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  
  // Add header row
  const headers = ['ID', 'English Name', 'Turkish Name', 'Category', 'Sub Category', 'Barcode', 'Kodu', 'Quantity', 'Price', 'Description'];
  worksheet.addRow(headers);
  
  // Set column widths
  worksheet.getColumn(1).width = 5;   // ID
  worksheet.getColumn(2).width = 40;  // English Name
  worksheet.getColumn(3).width = 40;  // Turkish Name
  worksheet.getColumn(4).width = 30;  // Category
  worksheet.getColumn(5).width = 30;  // Sub Category
  worksheet.getColumn(6).width = 30;  // Barcode
  worksheet.getColumn(7).width = 20;  // Kodu
  worksheet.getColumn(8).width = 10;  // Quantity
  worksheet.getColumn(9).width = 15;  // Price
  worksheet.getColumn(10).width = 50; // Description
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25; // Set header row height
  
  // Add data rows
  products.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_name,
      product.turkish_name,
      product.category,
      product.sub_category,
      product.barcode,
      product.kodu,
      product.quantity,
      product.price,
      product.description
    ]);
    
    // Set the height for each data row
    row.height = 20; // Increase row height (default is typically around 15)
  });
  
  // Apply color formatting based on quantity - highlight entire row
  // Start from row 2 (after headers)
  for (let i = 2; i <= products.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(8).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-9)
      for (let col = 1; col <= 9; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Sound-Products.xlsx');
};

// 6. Highlighted Excel Sheet Function for Sound (highlightSoundExcel)
export const highlightSoundExcel = async (products: SoundProduct[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.addRow(['ID', 'English Name', 'Turkish Name', 'Category', 'Sub Category', 'Barcode', 'Kodu', 'Quantity', 'Price']);

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 40;
  worksheet.getColumn(4).width = 30;
  worksheet.getColumn(5).width = 30;
  worksheet.getColumn(6).width = 30;
  worksheet.getColumn(7).width = 20;
  worksheet.getColumn(8).width = 10;
  worksheet.getColumn(9).width = 15;

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25;

  const filteredProducts = products.filter(product => (product.quantity ?? 0) <= 3); // Filter products with low quantity
  filteredProducts.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.english_name,
      product.turkish_name,
      product.category,
      product.sub_category,
      product.barcode,
      product.kodu,
      product.quantity,
      product.price
    ]);
    
    row.height = 20;
  });
  
  for (let i = 2; i <= filteredProducts.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(8).value) || 0; // Convert to number and default to 0
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-9)
      for (let col = 1; col <= 9; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'highlight-Sound-Excel.xlsx');
};

// 7. Full Excel Sheet Function for Solar (downloadSolarExcel)
export const downloadSolarExcel = async (products: SolarProduct[]) => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  
  // Add header row
  const headers = ['ID', 'Name', 'Rating', 'Category', 'Quantity', 'Price', 'First Price', 'Second Price', 'Third Price', 'Fourth Price', 'Description'];
  worksheet.addRow(headers);
  
  // Set column widths
  worksheet.getColumn(1).width = 5;   // ID
  worksheet.getColumn(2).width = 40;  // Name
  worksheet.getColumn(3).width = 20;  // Rating
  worksheet.getColumn(4).width = 30;  // Category
  worksheet.getColumn(5).width = 10;  // Quantity
  worksheet.getColumn(6).width = 15;  // Price
  worksheet.getColumn(7).width = 15;  // First Price
  worksheet.getColumn(8).width = 15;  // Second Price
  worksheet.getColumn(9).width = 15;  // Third Price
  worksheet.getColumn(10).width = 15; // Fourth Price
  worksheet.getColumn(11).width = 50; // Description
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25; // Set header row height
  
  // Add data rows
  products.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.name,
      product.rating,
      product.category,
      product.quantity,
      product.price,
      product.first_price,
      product.second_price,
      product.third_price,
      product.four_price,
      product.description
    ]);
    
    // Set the height for each data row
    row.height = 20; // Increase row height (default is typically around 15)
  });
  
  // Apply color formatting based on quantity - highlight entire row
  // Start from row 2 (after headers)
  for (let i = 2; i <= products.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(5).value) || 0; // Convert to number and default to 0 (quantity is now column 5)
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-11)
      for (let col = 1; col <= 11; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Solar-Products.xlsx');
};

// 8. Highlighted Excel Sheet Function for Solar (highlightSolarExcel)
export const highlightSolarExcel = async (products: SolarProduct[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.addRow(['ID', 'Name', 'Rating', 'Category', 'Quantity', 'Price', 'First Price', 'Second Price', 'Third Price', 'Fourth Price']);

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 30;
  worksheet.getColumn(5).width = 10;
  worksheet.getColumn(6).width = 15;
  worksheet.getColumn(7).width = 15;
  worksheet.getColumn(8).width = 15;
  worksheet.getColumn(9).width = 15;
  worksheet.getColumn(10).width = 15;

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).height = 25;

  const filteredProducts = products.filter(product => (product.quantity ?? 0) <= 3); // Filter products with low quantity
  filteredProducts.forEach(product => {
    const row = worksheet.addRow([
      product.id,
      product.name,
      product.rating,
      product.category,
      product.quantity,
      product.price,
      product.first_price,
      product.second_price,
      product.third_price,
      product.four_price
    ]);
    
    row.height = 20;
  });
  
  for (let i = 2; i <= filteredProducts.length + 1; i++) {
    const currentRow = worksheet.getRow(i);
    const quantity = Number(currentRow.getCell(5).value) || 0; // Convert to number and default to 0 (quantity is now column 5)
    
    let fillColor: { argb: string } | null = null;
    
    if (quantity === 0) {
      fillColor = { argb: 'FFFF0000' }; // Red
    } else if (quantity === 1) {
      fillColor = { argb: 'FFFFFF00' }; // Yellow
    } else if (quantity === 2) {
      fillColor = { argb: 'FFFFA500' }; // Orange
    } else if (quantity === 3) {
      fillColor = { argb: 'FF00FF00' }; // Green
    }
    
    // Apply the color to all cells in the row if a color was selected
    if (fillColor) {
      // Apply to all cells in the row (columns 1-10)
      for (let col = 1; col <= 10; col++) {
        currentRow.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: fillColor
        };
      }
    }
  }
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'highlight-Solar-Excel.xlsx');
};

