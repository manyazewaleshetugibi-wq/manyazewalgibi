// lib/server-utils.ts
import { ObjectId } from "mongodb";

// This file is for server-side only
// Don't import this in client components

export const isValidObjectId = (id: string): boolean => {
  return ObjectId.isValid(id);
};

export const sanitizeStock = (stock: any) => {
  if (!stock) return null;
  
  return {
    id: stock._id,
    name: stock.name,
    sku: stock.sku || '',
    categoryId: stock.categoryId,
    unit: stock.unit,
    currentStock: stock.currentStock,
    minimumStock: stock.minimumStock,
    currentUnitPrice: stock.currentUnitPrice || 0,
    reorderFrequency: stock.reorderFrequency || 'monthly',
    requiredAmount: stock.requiredAmount || 0,
    isActive: stock.isActive !== undefined ? stock.isActive : true,
    description: stock.description || '',
    ...(stock.restaurantId && { restaurantId: stock.restaurantId }),
    ...(stock.restaurantName && { restaurantName: stock.restaurantName }),
  };
};

export const sanitizeStocks = (stocks: any[]) => {
  return stocks.map(stock => sanitizeStock(stock));
};

export const validateStockInput = (body: any) => {
  const errors: string[] = [];
  
  const requiredFields = ['name', 'categoryId', 'unit', 'minimumStock', 'currentStock'];
  const missingFields = requiredFields.filter(field => !body[field] && body[field] !== 0);
  
  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (body.minimumStock !== undefined && (typeof body.minimumStock !== 'number' || body.minimumStock < 0)) {
    errors.push("minimumStock must be a positive number");
  }
  
  if (body.currentStock !== undefined && (typeof body.currentStock !== 'number' || body.currentStock < 0)) {
    errors.push("currentStock must be a positive number");
  }
  
  if (body.currentUnitPrice !== undefined && typeof body.currentUnitPrice !== 'number') {
    errors.push("currentUnitPrice must be a number");
  }
  
  if (body.categoryId && !isValidObjectId(body.categoryId)) {
    errors.push("Invalid category ID format");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const buildStockQuery = (params: {
  search?: string;
  categoryId?: string;
  isActive?: string;
  minStock?: string;
  maxStock?: string;
  restaurantId?: string;
}) => {
  const query: any = {};
  
  if (params.search) {
    query.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { sku: { $regex: params.search, $options: 'i' } },
      { description: { $regex: params.search, $options: 'i' } }
    ];
  }
  
  if (params.categoryId && isValidObjectId(params.categoryId)) {
    query.categoryId = params.categoryId;
  }
  
  if (params.isActive !== null && params.isActive !== undefined) {
    query.isActive = params.isActive === 'true';
  }
  
  if (params.minStock && !isNaN(parseFloat(params.minStock))) {
    query.currentStock = { $gte: parseFloat(params.minStock) };
  }
  
  if (params.maxStock && !isNaN(parseFloat(params.maxStock))) {
    query.currentStock = { ...query.currentStock, $lte: parseFloat(params.maxStock) };
  }
  
  if (params.restaurantId && isValidObjectId(params.restaurantId)) {
    query.restaurantId = params.restaurantId;
  }
  
  return query;
};

export const getPaginationParams = (page: string, limit: string) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const skip = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, skip };
};

export const createPaginationResponse = (totalCount: number, page: number, limit: number) => {
  return {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit)
  };
};

export const hasStockAccess = (role: string): boolean => {
  const allowedRoles = ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'MANAGER'];
  return allowedRoles.includes(role.toUpperCase());
};

export const canModifyStock = (role: string): boolean => {
  const allowedRoles = ['ADMIN', 'STOCK_MANAGER', 'PURCHASING', 'MANAGER'];
  return allowedRoles.includes(role.toUpperCase());
};

export const canDeleteStock = (role: string): boolean => {
  return role.toUpperCase() === 'ADMIN';
};