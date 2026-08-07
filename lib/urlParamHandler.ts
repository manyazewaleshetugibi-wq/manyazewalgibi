/**
 * URL Parameter Handler - Handles encoded URL parameters from QR codes and manual links
 * Properly decodes HTML entities, URL encoding, and special characters
 */

import CryptoJS from 'crypto-js';

export interface URLTableParams {
  table: string | null;
  tableId: string | null;
  restaurantId: string | null;
  restaurant: string | null;
  floor: string | null;
  capacity: string | null;
  isQRScan: boolean;
}

/**
 * Derive the client-side encryption key (same derivation as lib/encryption.ts).
 * Returns null when the keys are not configured so callers can fall back to
 * plaintext parameters instead of crashing.
 */
const getClientKey = (): string | null => {
  const baseKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  const salt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT;
  if (!baseKey || !salt) return null;
  return CryptoJS.SHA256(`${baseKey}:${salt}`).toString();
};

/**
 * Encrypt sensitive table parameters into a single URL-safe token.
 * Hides internal DB ids (tableId, restaurantId) from being readable/guessable
 * in the query string. Returns null if encryption is not configured.
 */
export const encryptTableToken = (
  tableId: string,
  restaurantId: string
): string | null => {
  const key = getClientKey();
  if (!key) return null;
  try {
    const payload = JSON.stringify({ tableId, restaurantId });
    const encrypted = CryptoJS.AES.encrypt(payload, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
    // URL-safe base64 encoding
    return btoa(encrypted)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return null;
  }
};

/**
 * Decrypt a table token produced by encryptTableToken.
 * Returns the decrypted values or null when decryption fails.
 */
export const decryptTableToken = (
  token: string
): { tableId: string; restaurantId: string } | null => {
  const key = getClientKey();
  if (!key) return null;
  try {
    // Restore standard base64
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const encrypted = atob(base64);
    const bytes = CryptoJS.AES.decrypt(encrypted, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    const parsed = JSON.parse(decrypted);
    if (!parsed.tableId || !parsed.restaurantId) return null;
    return { tableId: parsed.tableId, restaurantId: parsed.restaurantId };
  } catch {
    return null;
  }
};

export interface ParsedTableData {
  tableNumber: number;
  tableId: string;
  restaurantId: string;
  restaurantName: string;
  floor: string;
  capacity: number;
  isQRScan: boolean;
}

/**
 * Decode URL parameter - handles multiple encoding formats
 * - URL encoding (%20, %2B, etc.)
 * - HTML entities (&amp;, &quot;, etc.)
 * - Plus signs as spaces
 */
export const decodeURLParam = (param: string | null): string => {
  if (!param) return '';

  let decoded = param;

  // First, handle HTML entities
  decoded = decoded
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");

  // Then decode URL encoding
  try {
    decoded = decodeURIComponent(decoded);
  } catch (e) {
    console.warn('Failed to decode URI component:', param);
  }

  // Replace + with space (common in URL encoding)
  decoded = decoded.replace(/\+/g, ' ');

  // Trim whitespace
  decoded = decoded.trim();

  return decoded;
};

/**
 * Extract table parameters from URL search params
 */
export const extractTableParams = (searchParams: URLSearchParams): URLTableParams => {
  return {
    table: searchParams.get('table'),
    tableId: searchParams.get('tableId'),
    restaurantId: searchParams.get('restaurantId'),
    restaurant: searchParams.get('restaurant'),
    floor: searchParams.get('floor'),
    capacity: searchParams.get('capacity'),
    isQRScan: !!(searchParams.get('tableId') && searchParams.get('restaurantId')),
  };
};

/**
 * Parse and validate table data from URL parameters
 */
export const parseTableDataFromURL = (params: URLTableParams): ParsedTableData | null => {
  if (!params.table) return null;

  const decodedTable = decodeURLParam(params.table);
  let tableNumberDisplay = decodedTable;

  // Handle table-X format
  if (decodedTable.startsWith('table-')) {
    tableNumberDisplay = decodedTable.replace('table-', '');
  }

  const tableNum = parseInt(tableNumberDisplay);
  if (isNaN(tableNum) || tableNum <= 0) return null;

  return {
    tableNumber: tableNum,
    tableId: decodeURLParam(params.tableId),
    restaurantId: decodeURLParam(params.restaurantId) || 'manyazewal1',
    restaurantName: decodeURLParam(params.restaurant) || 'Manyazewal Restaurant',
    floor: decodeURLParam(params.floor) || 'Ground Floor',
    capacity: Math.max(1, parseInt(decodeURLParam(params.capacity) || '4') || 4),
    isQRScan: params.isQRScan,
  };
};

/**
 * Store table data in localStorage
 */
export const storeTableDataInLocalStorage = (data: ParsedTableData): void => {
  localStorage.setItem('detectedTableNumber', data.tableNumber.toString());
  localStorage.setItem('tableDetected', 'true');
  localStorage.setItem('isQRTable', data.isQRScan ? 'true' : 'false');
  localStorage.setItem('tableData', JSON.stringify(data));
  localStorage.setItem('qrcode', data.isQRScan ? 'true' : 'false');
};

/**
 * Retrieve table data from localStorage
 */
export const getTableDataFromLocalStorage = (): ParsedTableData | null => {
  try {
    const stored = localStorage.getItem('tableData');
    if (stored) {
      return JSON.parse(stored);
    }

    // Fallback to individual items
    const tableNum = localStorage.getItem('detectedTableNumber');
    const isQR = localStorage.getItem('isQRTable') === 'true';

    if (tableNum) {
      return {
        tableNumber: parseInt(tableNum),
        tableId: '',
        restaurantId: 'manyazewal1',
        restaurantName: 'Manyazewal Restaurant',
        floor: 'Ground Floor',
        capacity: 4,
        isQRScan: isQR,
      };
    }

    return null;
  } catch (error) {
    console.error('Error retrieving table data from localStorage:', error);
    return null;
  }
};

/**
 * Clear table data from localStorage
 */
export const clearTableDataFromLocalStorage = (): void => {
  localStorage.removeItem('detectedTableNumber');
  localStorage.removeItem('tableDetected');
  localStorage.removeItem('isQRTable');
  localStorage.removeItem('tableData');
  localStorage.removeItem('qrcode');
};

/**
 * Parse QR code URL and extract table data
 */
export const parseQRCodeURL = (qrUrl: string): ParsedTableData | null => {
  try {
    const url = new URL(qrUrl);
    const params: URLTableParams = {
      table: url.searchParams.get('table'),
      tableId: url.searchParams.get('tableId'),
      restaurantId: url.searchParams.get('restaurantId'),
      restaurant: url.searchParams.get('restaurant'),
      floor: url.searchParams.get('floor'),
      capacity: url.searchParams.get('capacity'),
      isQRScan: true,
    };

    return parseTableDataFromURL(params);
  } catch (error) {
    console.error('Error parsing QR code URL:', error);
    return null;
  }
};

/**
 * Generate QR code URL with table data
 */
export const generateQRCodeURL = (
  baseURL: string,
  tableData: ParsedTableData
): string => {
  const params = new URLSearchParams({
    table: tableData.tableNumber.toString(),
    tableId: tableData.tableId,
    restaurantId: tableData.restaurantId,
    restaurant: tableData.restaurantName,
    floor: tableData.floor,
    capacity: tableData.capacity.toString(),
  });

  return `${baseURL}?${params.toString()}`;
};

/**
 * Validate table number format
 */
export const isValidTableNumber = (tableNumber: string | number): boolean => {
  const num = typeof tableNumber === 'string' ? parseInt(tableNumber) : tableNumber;
  return !isNaN(num) && num > 0 && num < 1000;
};

/**
 * Format table display string
 */
export const formatTableDisplay = (tableNumber: number, capacity?: number): string => {
  let display = `Table ${tableNumber}`;
  if (capacity && capacity > 0) {
    display += ` (${capacity} seats)`;
  }
  return display;
};
