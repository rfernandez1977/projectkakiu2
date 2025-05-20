import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Define API URLs - Use pure string literals for faster performance (no string interpolation)
let API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://produccion.facturamovil.cl';
let API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '431ab8e9-7867-416b-9aab-0c32c924973c';
let COMPANY_ID = process.env.EXPO_PUBLIC_COMPANY_ID || '29';

// Auth state
let AUTH_INITIALIZED = false;
let USER_TOKEN: string | null = null;
let USER_COMPANY_ID: string | null = null;

// Storage keys
const AUTH_USER_KEY = '@auth_user';
const ACTIVE_COMPANY_KEY = '@active_company';
const PRODUCTS_CACHE_KEY = '@products_cache';
const CLIENTS_CACHE_KEY = '@clients_cache';
const SALES_CACHE_KEY = '@sales_cache';
const INVOICE_DETAILS_CACHE_KEY = '@invoice_details';

// Create axios instance with optimized config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  // Optimized axios config for faster requests
  decompress: true,
  maxRedirects: 5,
  responseType: 'json',
});

// Optimized request interceptor with reduced console logging
axiosInstance.interceptors.request.use(
  async (config) => {
    if (!AUTH_INITIALIZED) {
      await initializeAuthHeader();
    }
    const token = USER_TOKEN || API_TOKEN;
    config.headers['FACMOV_T'] = token;
    return config;
  },
  (error) => Promise.reject(error)
);

// Optimized response caching logic
const responseCache = new Map();

// Use the response cache to store frequently accessed data in memory
axiosInstance.interceptors.response.use(
  (response) => {
    const requestUrl = response.config.url;
    if (
      requestUrl && 
      (requestUrl.includes('/services/common/product') || 
       requestUrl.includes('/services/common/client') ||
       requestUrl.includes('/lastsales/')) &&
      response.status === 200
    ) {
      // Store the response in memory cache to avoid fetching
      responseCache.set(requestUrl, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// Initialize auth data
const initializeAuthHeader = async () => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (userJson) {
      const userData = JSON.parse(userJson);
      if (userData.token) {
        USER_TOKEN = userData.token;
      }
      const activeCompanyJson = await AsyncStorage.getItem(ACTIVE_COMPANY_KEY);
      if (activeCompanyJson) {
        const activeCompany = JSON.parse(activeCompanyJson);
        if (activeCompany && activeCompany.id) {
          USER_COMPANY_ID = activeCompany.id.toString();
        }
      } else if (userData.mobileCompany && userData.mobileCompany.id) {
        USER_COMPANY_ID = userData.mobileCompany.id.toString();
      } else if (userData.companies && userData.companies.length > 0) {
        USER_COMPANY_ID = userData.companies[0].id.toString();
      }
    }
    AUTH_INITIALIZED = true;
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
};

// Update auth data
const updateAuthData = (token: string, companyId: number | string) => {
  USER_TOKEN = token;
  USER_COMPANY_ID = companyId.toString();
  AUTH_INITIALIZED = true;
};

// Clear auth data
const clearAuthData = () => {
  USER_TOKEN = null;
  USER_COMPANY_ID = null;
  AUTH_INITIALIZED = false;
  // Clear response cache when auth is cleared
  responseCache.clear();
};

// Interfaces
interface Municipality {
  code: string;
  name: string;
  regionalEntity?: {
    code: string;
    name: string;
  };
}

interface Activity {
  id: number;
  code: string;
  name: string;
}

export interface Client {
  id: number;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  municipality?: Municipality;
  activity?: Activity;
  line?: string;
}

interface Unit {
  id?: number;
  code: string;
  name: string;
}

interface Category {
  id: number;
  code: string;
  name: string;
  otherTax?: {
    id: number;
    code: string;
    name: string;
    percent: number;
  };
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  unit: Unit;
  category: Category;
}

interface ProductDetail {
  position: number;
  product: {
    code: string;
    name: string;
    price: number;
    unit?: { code: string };
    category?: {
      id: number;
      code: string;
      name: string;
      otherTax?: {
        id: number;
        code: string;
        name: string;
        percent: number;
      };
    };
  };
  quantity: number;
  description?: string;
}

export interface InvoiceRequest {
  currency: string;
  hasTaxes: boolean;
  client: {
    code: string;
    name: string;
    address?: string;
    municipality?: string;
    line?: string;
  };
  date: string;
  details: ProductDetail[];
  paymentMethod?: string;
  paymentCondition?: string;
}

export interface TicketRequest {
  netAmounts: boolean;
  hasTaxes: boolean;
  ticketType: {
    code: string;
  };
  client?: {
    code: string;
    name: string;
    address?: string;
    municipality?: string;
  };
  date: string;
  details: ProductDetail[];
  paymentMethod?: string;
  paymentCondition?: string;
}

export interface Document {
  id: number;
  type: string;
  assignedFolio: string;
  externalFolio: string | null;
  date: string;
  state: string[];
  client: {
    id: number;
    rut: string;
    name: string;
    email?: string;
  };
  total: number;
  validation: string;
  details?: ProductDetail[];
}

// Check memory cache first before making a network request
const getFromCache = async <T>(
  cacheKey: string,
  networkFetcher: () => Promise<T>,
  forceRefresh = false
): Promise<T> => {
  try {
    if (!forceRefresh) {
      // First check memory cache
      const cachedResult = responseCache.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < 300000) { // 5 minutes cache
        return cachedResult.data;
      }
      
      // Then check AsyncStorage
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Fetch fresh data
    const result = await networkFetcher();
    
    // Cache result in AsyncStorage
    if (result) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    }
    
    return result;
  } catch (error) {
    // Try to use cached data if network request fails
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};

// API methods - Optimized for faster execution

const getProducts = async (forceRefresh = false, searchTerm = ''): Promise<Product[]> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    
    // Use a different cache key for search terms
    const cacheKey = searchTerm ? 
      `${PRODUCTS_CACHE_KEY}_search_${searchTerm}` : 
      PRODUCTS_CACHE_KEY;
    
    // Generate the endpoint url
    const endpoint = searchTerm ? `/services/common/product/${searchTerm}` : '/services/common/product';
    
    // Create network fetcher function
    const fetcher = async () => {
      const response = await axiosInstance.get(endpoint);
      if (!response.data) {
        throw new Error('Invalid response format: No data received');
      }
      return response.data?.products || response.data || [];
    };
    
    // Get data with caching logic
    return await getFromCache<Product[]>(cacheKey, fetcher, forceRefresh);
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Check if there's cached data we can fall back to
    const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    
    throw error;
  }
};

const searchProducts = async (query: string): Promise<Product[]> => {
  return getProducts(true, query);
};

const getClients = async (forceRefresh = false, searchTerm = ''): Promise<Client[]> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    
    // Use a different cache key for search terms
    const cacheKey = searchTerm ? 
      `${CLIENTS_CACHE_KEY}_search_${searchTerm}` : 
      CLIENTS_CACHE_KEY;
    
    // Generate endpoint url
    const endpoint = searchTerm ? `/services/common/client/${searchTerm}` : '/services/common/client';
    
    // Create network fetcher function
    const fetcher = async () => {
      const response = await axiosInstance.get(endpoint);
      if (!response.data) {
        throw new Error('Invalid response format: No data received for clients');
      }
      return response.data?.clients || response.data || [];
    };
    
    // Get data with caching logic
    return await getFromCache<Client[]>(cacheKey, fetcher, forceRefresh);
  } catch (error) {
    console.error('Error fetching clients:', error);
    
    // Try to use cached data
    const cached = await AsyncStorage.getItem(CLIENTS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    
    throw error;
  }
};

const getSales = async (forceRefresh = false): Promise<Document[]> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    const companyId = USER_COMPANY_ID || COMPANY_ID;
    
    // Create endpoint url
    const endpoint = `/services/common/company/${companyId}/lastsales/`;
    
    // Create network fetcher function
    const fetcher = async () => {
      const response = await axiosInstance.get(endpoint);
      if (!response.data) {
        throw new Error('Invalid response format: No data received for sales');
      }
      return response.data?.documents || response.data || [];
    };
    
    // Get data with caching logic
    return await getFromCache<Document[]>(SALES_CACHE_KEY, fetcher, forceRefresh);
  } catch (error) {
    console.error('Error fetching sales:', error);
    
    // Try to use cached data
    const cached = await AsyncStorage.getItem(SALES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    
    throw error;
  }
};

const getInvoiceDetail = async (assignedFolio: string): Promise<Document> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    const companyId = USER_COMPANY_ID || COMPANY_ID;
    const cacheKey = `${INVOICE_DETAILS_CACHE_KEY}_${assignedFolio}`;
    
    // Create endpoint url
    const endpoint = `/services/common/company/${companyId}/invoice/${assignedFolio}/getInfo`;
    
    // Create network fetcher function
    const fetcher = async () => {
      const response = await axiosInstance.get(endpoint);
      if (!response.data) {
        throw new Error('Invalid invoice detail response: No data received');
      }
      return response.data;
    };
    
    // Get data with caching logic
    return await getFromCache<Document>(cacheKey, fetcher, false);
  } catch (error: any) {
    console.error('Error fetching invoice detail:', error);
    if (error.response?.status === 404) {
      throw new Error(`Factura con folio ${assignedFolio} no encontrada`);
    }
    throw error;
  }
};

const getInvoiceDetailById = async (invoiceId: number): Promise<Document> => {
  try {
    // Try to get from cache first
    const cacheKey = `${INVOICE_DETAILS_CACHE_KEY}_id_${invoiceId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // If not in cache, get from sales list
    const sales = await getSales();
    const invoice = sales.find(doc => doc.id === invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with id ${invoiceId} not found in sales list`);
    }
    
    // Get detailed information
    const details = await getInvoiceDetail(invoice.assignedFolio);
    
    // Cache the result by ID as well
    await AsyncStorage.setItem(cacheKey, JSON.stringify(details));
    
    return details;
  } catch (error) {
    console.error('Error fetching invoice detail by id:', error);
    throw error;
  }
};

const getInvoicePdf = async (id: number, validation: string): Promise<string> => {
  try {
    const pdfUrl = `${API_BASE}/document/toPdf/${id}?v=${validation}`;
    return pdfUrl;
  } catch (error) {
    console.error('Error generating PDF URL:', error);
    throw error;
  }
};

const createInvoice = async (invoiceData: InvoiceRequest): Promise<any> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    const companyId = USER_COMPANY_ID || COMPANY_ID;
    const endpoint = `/services/raw/company/${companyId}/invoice`;
    const response = await axiosInstance.post(endpoint, invoiceData);
    await AsyncStorage.removeItem(SALES_CACHE_KEY);
    responseCache.delete(`/services/common/company/${companyId}/lastsales/`);
    return response.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

const createTicket = async (ticketData: TicketRequest): Promise<any> => {
  try {
    if (!AUTH_INITIALIZED) await initializeAuthHeader();
    const companyId = USER_COMPANY_ID || COMPANY_ID;
    const endpoint = `/services/raw/company/${companyId}/ticket`;
    const response = await axiosInstance.post(endpoint, ticketData);
    await AsyncStorage.removeItem(SALES_CACHE_KEY);
    responseCache.delete(`/services/common/company/${companyId}/lastsales/`);
    return response.data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

const clearProductsCache = async () => {
  await AsyncStorage.removeItem(PRODUCTS_CACHE_KEY);
  
  // Also clear any search caches
  const keys = await AsyncStorage.getAllKeys();
  const productSearchKeys = keys.filter(key => key.startsWith(`${PRODUCTS_CACHE_KEY}_search_`));
  if (productSearchKeys.length > 0) {
    await AsyncStorage.multiRemove(productSearchKeys);
  }
  
  // Clear memory cache
  for (const [key] of responseCache.entries()) {
    if (key.includes('/services/common/product')) {
      responseCache.delete(key);
    }
  }
};

const clearClientsCache = async () => {
  await AsyncStorage.removeItem(CLIENTS_CACHE_KEY);
  
  // Also clear any search caches
  const keys = await AsyncStorage.getAllKeys();
  const clientSearchKeys = keys.filter(key => key.startsWith(`${CLIENTS_CACHE_KEY}_search_`));
  if (clientSearchKeys.length > 0) {
    await AsyncStorage.multiRemove(clientSearchKeys);
  }
  
  // Clear memory cache
  for (const [key] of responseCache.entries()) {
    if (key.includes('/services/common/client')) {
      responseCache.delete(key);
    }
  }
};

const clearSalesCache = async () => {
  await AsyncStorage.removeItem(SALES_CACHE_KEY);
  
  // Clear memory cache
  for (const [key] of responseCache.entries()) {
    if (key.includes('/lastsales/')) {
      responseCache.delete(key);
    }
  }
};

export const api = {
  axiosInstance,
  getProducts,
  searchProducts,
  getClients,
  getSales,
  getInvoiceDetail,
  getInvoiceDetailById,
  getInvoicePdf,
  clearProductsCache,
  clearClientsCache,
  clearSalesCache,
  createInvoice,
  createTicket,
  updateAuthData,
  clearAuthData,
  initializeAuthHeader
};