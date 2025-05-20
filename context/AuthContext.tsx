import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Authentication context types
interface Company {
  id: number;
  name: string;
  code: string;
  address?: string;
  line?: string;
  // Other company fields as needed
}

interface Role {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  token: string;
  companies: Company[];
  // Added fields for displaying company info
  companyName: string;
  companyRut: string;
  userName: string;
  // Added fields for roles
  roles?: Role[];
  mobileCompany?: {
    id: number;
    name: string;
    code: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveCompany: (companyId: number) => void;
  activeCompany: Company | null;
}

// Storage keys
const AUTH_USER_KEY = '@auth_user';
const ACTIVE_COMPANY_KEY = '@active_company';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  setActiveCompany: () => {},
  activeCompany: null,
});

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);

  // Load stored authentication state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Load stored authentication data
  const loadStoredAuth = async () => {
    try {
      setIsLoading(true);
      console.log('=== AUTH DEBUG: loadStoredAuth - Starting to load stored auth data ===');
      
      // Get stored user data
      const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (userJson) {
        const userData = JSON.parse(userJson);
        console.log('=== AUTH DEBUG: User data loaded from storage ===');
        console.log('User ID:', userData.id);
        console.log('User email:', userData.email);
        console.log('User token:', userData.token ? `${userData.token.substring(0, 10)}...` : 'No token');
        
        if (userData.companies && userData.companies.length > 0) {
          console.log('=== AUTH DEBUG: Companies data from storage ===');
          userData.companies.forEach((company: Company, index: number) => {
            console.log(`Company ${index + 1} - ID: ${company.id}, Name: ${company.name}, Code: ${company.code}`);
          });
        }
        
        if (userData.mobileCompany) {
          console.log('=== AUTH DEBUG: Mobile Company data from storage ===');
          console.log('Mobile Company ID:', userData.mobileCompany.id);
          console.log('Mobile Company Name:', userData.mobileCompany.name);
          console.log('Mobile Company Code:', userData.mobileCompany.code);
        }
        
        setUser(userData);
        
        // Get stored active company
        const activeCompanyJson = await AsyncStorage.getItem(ACTIVE_COMPANY_KEY);
        if (activeCompanyJson) {
          const activeCompanyData = JSON.parse(activeCompanyJson);
          console.log('=== AUTH DEBUG: Active company loaded from storage ===');
          console.log('Active Company ID:', activeCompanyData.id);
          console.log('Active Company Name:', activeCompanyData.name);
          
          setActiveCompanyState(activeCompanyData);
          
          // Initialize API with stored auth data
          if (userData.token && activeCompanyData.id) {
            console.log('=== AUTH DEBUG: Initializing API with stored auth data ===');
            api.updateAuthData(userData.token, activeCompanyData.id);
          }
        } else if (userData.companies && userData.companies.length > 0) {
          // Default to first company if none selected
          const defaultCompany = userData.companies[0];
          console.log('=== AUTH DEBUG: No active company found, defaulting to first company ===');
          console.log('Default Company ID:', defaultCompany.id);
          console.log('Default Company Name:', defaultCompany.name);
          
          setActiveCompanyState(defaultCompany);
          await AsyncStorage.setItem(
            ACTIVE_COMPANY_KEY, 
            JSON.stringify(defaultCompany)
          );
          
          // Initialize API with stored auth data
          if (userData.token && defaultCompany.id) {
            console.log('=== AUTH DEBUG: Initializing API with stored auth data (default company) ===');
            api.updateAuthData(userData.token, defaultCompany.id);
          }
        }
      } else {
        console.log('=== AUTH DEBUG: No user data found in storage ===');
      }
    } catch (error) {
      console.error('=== AUTH DEBUG: Error loading authentication data ===', error);
    } finally {
      setIsLoading(false);
      console.log('=== AUTH DEBUG: loadStoredAuth - Completed ===');
    }
  };

  // Convert login/password to Base64 encoded JSON
  const encodeLoginCredentials = (login: string, password: string): string => {
    const json = JSON.stringify({ login, password });
    // In a browser environment use btoa, otherwise use a proper Base64 encoding library
    if (typeof btoa === 'function') {
      return btoa(json);
    } else {
      // For React Native, we need to use a different approach
      // This is a simple implementation and might need to be replaced with a proper library
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let base64 = '';
      let bytes = new Uint8Array([...json].map(c => c.charCodeAt(0)));
      let byteRemainder = bytes.length % 3;
      let mainLength = bytes.length - byteRemainder;
      let a, b, c, d;
      let chunk;

      // Main loop deals with bytes in chunks of 3
      for (let i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048 = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032 = (2^6 - 1) << 6
        d = chunk & 63; // 63 = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += chars[a] + chars[b] + chars[c] + chars[d];
      }

      // Deal with the remaining bytes and padding
      if (byteRemainder === 1) {
        chunk = bytes[mainLength];
        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
        b = (chunk & 3) << 4; // 3 = 2^2 - 1
        base64 += chars[a] + chars[b] + '==';
      } else if (byteRemainder === 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008 = (2^6 - 1) << 4
        c = (chunk & 15) << 2; // 15 = 2^4 - 1
        base64 += chars[a] + chars[b] + chars[c] + '=';
      }

      return base64;
    }
  };

  // Handle sign in
  const signIn = async (email: string, password: string) => {
    try {
      console.log('=== AUTH DEBUG: signIn - Starting authentication process ===');
      console.log('Login attempt for email:', email);
      
      setIsLoading(true);
      
      // Encode login credentials
      const encodedCredentials = encodeLoginCredentials(email, password);
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://produccion.facturamovil.cl';
      
      // Log API endpoint and encoded credentials (without showing actual password)
      console.log('===== AUTH REQUEST =====');
      console.log(`API Endpoint: ${API_BASE}/services/common/user/${encodedCredentials}`);
      console.log(`Login Attempt for: ${email}`);
      console.log('========================');
      
      // Make API request
      const response = await fetch(`${API_BASE}/services/common/user/${encodedCredentials}`);
      const data = await response.json();
      
      // Log the complete response for auditing
      console.log('===== AUTH RESPONSE =====');
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response Headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
      console.log('Response Body:', JSON.stringify(data, null, 2));
      console.log('==========================');
      
      if (!response.ok || data.success === false) {
        console.error('=== AUTH DEBUG: Authentication failed ===', data.details || 'No details provided');
        throw new Error(data.details || 'Authentication failed');
      }
      
      // NEW: Extract the first user from the users array
      const userInfo = data.users && data.users.length > 0 ? data.users[0] : null;
      
      // Check if we have a valid user
      if (!userInfo) {
        console.error('=== AUTH DEBUG: No user information found in the response ===');
        throw new Error('No user information found in the response');
      }
      
      console.log('=== AUTH DEBUG: User info extracted from response ===');
      console.log('User ID:', userInfo.id);
      console.log('User Email:', userInfo.email);
      console.log('User Token:', userInfo.token ? `${userInfo.token.substring(0, 10)}...` : 'No token');
      
      // Extract company information from the user object
      const companies = userInfo.companies || [];
      const mobileCompany = userInfo.mobileCompany || null;
      
      console.log('=== AUTH DEBUG: Companies extracted from response ===');
      console.log('Number of companies:', companies.length);
      companies.forEach((company: any, index: number) => {
        console.log(`Company ${index + 1} - ID: ${company.id}, Name: ${company.name}, Code: ${company.code}`);
      });
      
      if (mobileCompany) {
        console.log('=== AUTH DEBUG: Mobile company extracted from response ===');
        console.log('Mobile Company ID:', mobileCompany.id);
        console.log('Mobile Company Name:', mobileCompany.name);
        console.log('Mobile Company Code:', mobileCompany.code);
      } else {
        console.log('=== AUTH DEBUG: No mobile company in response ===');
      }
      
      // Get the company name, prioritizing the different sources
      const companyName = 
        (mobileCompany?.name) ? mobileCompany.name :  // First try mobileCompany
        (companies.length > 0 ? companies[0].name : null) ||  // Then first company
        (userInfo.name) ? `Empresa de ${userInfo.name}` :  // Fallback to user's name
        'Empresa no definida';  // Last resort default
                          
      // Get the company code/RUT
      const companyRut = 
        (mobileCompany?.code) ? mobileCompany.code :  // First try mobileCompany
        (companies.length > 0 ? companies[0].code : null) ||  // Then first company
        (userInfo.code) ? userInfo.code :  // Try to use user's code/RUT
        'RUT no definido';  // Last resort default
                         
      // Get user's name
      const userName = userInfo.name || email;
      
      // Use actual company array or create a default
      const companiesArray = companies.length > 0 ? companies : 
        mobileCompany ? [{ 
          id: mobileCompany.id || 1, 
          name: mobileCompany.name, 
          code: mobileCompany.code 
        }] : [{
          id: 1,
          name: companyName,
          code: companyRut
        }];
      
      // Create user object from user info
      const userData: User = {
        id: userInfo.id || 1,
        email: userInfo.email || email,
        name: userInfo.name || email,
        token: userInfo.token || 'token-placeholder', 
        companies: companiesArray,
        companyName: companyName,
        companyRut: companyRut,
        userName: userName,
        roles: userInfo.roles || [],
        mobileCompany: mobileCompany
      };
      
      console.log('=== AUTH DEBUG: Constructed user data for storage ===');
      console.log('User ID:', userData.id);
      console.log('User Email:', userData.email);
      console.log('User Token:', userData.token ? `${userData.token.substring(0, 10)}...` : 'No token');
      console.log('Number of Companies:', userData.companies.length);
      console.log('First Company ID:', userData.companies[0]?.id);
      console.log('mobileCompany ID:', userData.mobileCompany?.id);
      console.log('mobileCompany Name:', userData.mobileCompany?.name);
      
      // Save user data to storage
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      console.log('=== AUTH DEBUG: User data saved to AsyncStorage ===');
      
      // Set default active company - we always have at least one now
      const defaultCompany = companiesArray[0];
      console.log('=== AUTH DEBUG: Setting active company ===');
      console.log('Active Company ID:', defaultCompany.id);
      console.log('Active Company Name:', defaultCompany.name);
      
      setActiveCompanyState(defaultCompany);
      await AsyncStorage.setItem(
        ACTIVE_COMPANY_KEY, 
        JSON.stringify(defaultCompany)
      );
      console.log('=== AUTH DEBUG: Active company saved to AsyncStorage ===');
      
      // Update API with the new authentication data
      console.log('=== AUTH DEBUG: Updating API with auth data ===');
      api.updateAuthData(userData.token, defaultCompany.id);
      
      // Update state
      setUser(userData);
      
      // Add logging after user is set to verify the data
      console.log('===== USER DATA AFTER SIGN-IN =====');
      console.log('User data after sign-in:', JSON.stringify(userData, null, 2));
      console.log('Active company after sign-in:', JSON.stringify(defaultCompany || null, null, 2));
      console.log('mobileCompany data:', JSON.stringify(userData.mobileCompany, null, 2));
      console.log('===================================');
      
      console.log('=== AUTH DEBUG: signIn - Authentication completed successfully ===');
    } catch (error) {
      console.error('=== AUTH DEBUG: Authentication error ===', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out
  const signOut = async () => {
    try {
      console.log('=== AUTH DEBUG: signOut - Starting sign out process ===');
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(ACTIVE_COMPANY_KEY);
      
      // Clear API auth data
      api.clearAuthData();
      
      setUser(null);
      setActiveCompanyState(null);
      console.log('=== AUTH DEBUG: signOut - User signed out successfully ===');
    } catch (error) {
      console.error('=== AUTH DEBUG: Error during sign out ===', error);
    }
  };

  // Set active company
  const setActiveCompany = async (companyId: number) => {
    if (!user || !user.companies) return;
    
    console.log('=== AUTH DEBUG: setActiveCompany - Changing active company ===');
    console.log('Target Company ID:', companyId);
    
    const company = user.companies.find(c => c.id === companyId);
    if (company) {
      console.log('=== AUTH DEBUG: Found matching company ===');
      console.log('Company ID:', company.id);
      console.log('Company Name:', company.name);
      
      setActiveCompanyState(company);
      await AsyncStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
      console.log('=== AUTH DEBUG: Active company updated and saved to storage ===');
      
      // Update API with the new company ID
      if (user.token) {
        console.log('=== AUTH DEBUG: Updating API with new company ID ===');
        api.updateAuthData(user.token, company.id);
      }
    } else {
      console.log('=== AUTH DEBUG: No matching company found for ID:', companyId);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    activeCompany,
    setActiveCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}