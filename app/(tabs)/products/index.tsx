import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, Product } from '../../../services/api';
import { Package, Tag, DollarSign, Search, ListFilter as Filter } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

export default function ProductsScreen() {
  const router = useRouter();
  const { offlineMode } = useTheme();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Debounce search term to avoid making too many API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery);
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const loadProducts = useCallback(async (forceRefresh = false, searchTerm = '') => {
    try {
      setError(null);
      if (searchTerm) {
        setIsSearching(true);
      }
      
      const data = await api.getProducts(forceRefresh, searchTerm);
      
      // Validate the data before setting state
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.warn('Invalid products data format:', data);
        setProducts([]);
        setError('Formato de datos inválido recibido del servidor');
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      
      // Set specific error message based on error type
      if (err.code === 'ECONNABORTED') {
        setError('Tiempo de espera agotado. La conexión al servidor tardó demasiado.');
      } else if (err.response && err.response.status === 500) {
        setError('Error en el servidor. Por favor intente nuevamente más tarde.');
      } else {
        setError('Error al cargar los productos. Por favor intente nuevamente.');
      }
      
      if (offlineMode) {
        Alert.alert(
          'Error',
          'No se pudieron cargar los productos. Trabajando en modo offline.'
        );
      } else {
        Alert.alert(
          'Error',
          'No se pudieron cargar los productos. Verifique su conexión.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsSearching(false);
    }
  }, [offlineMode]);

  // Initial load of products
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load products when debounced search term changes
  useEffect(() => {
    loadProducts(true, debouncedSearchTerm);
  }, [debouncedSearchTerm, loadProducts]);

  // Add effect for retrying on error with backoff
  useEffect(() => {
    if (error && retryCount < 3) {
      const retryTimeout = setTimeout(() => {
        console.log(`Automatically retrying to load products (attempt ${retryCount + 1})`);
        loadProducts(true);
        setRetryCount(prev => prev + 1);
      }, 5000 * (retryCount + 1)); // Exponential backoff: 5s, 10s, 15s
      
      return () => clearTimeout(retryTimeout);
    }
  }, [error, retryCount, loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    setRetryCount(0); // Reset retry count on manual refresh
    loadProducts(true);
  };

  const handleRetry = () => {
    setLoading(true);
    setRetryCount(0);
    loadProducts(true);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productIcon}>
          <Package size={24} color="#0066CC" />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCode}>Código: {item.code}</Text>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Tag size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.category?.name || 'Sin categoría'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Package size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.unit?.name || 'Sin unidad'}
            </Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <DollarSign size={16} color="#0066CC" />
          <Text style={styles.priceText}>
            {item.price.toLocaleString('es-CL', {
              style: 'currency',
              currency: 'CLP'
            })}
          </Text>
        </View>
        
        {item.category?.otherTax && (
          <View style={styles.taxBadge}>
            <Text style={styles.taxText}>
              {item.category.otherTax.name}: {item.category.otherTax.percent}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  if (error && !refreshing && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Package size={48} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Productos</Text>
        <Text style={styles.headerSubtitle}>
          {products.length} productos encontrados
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, código o categoría"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#0066CC" style={styles.searchingIndicator} />
          )}
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0066CC']}
            tintColor="#0066CC"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'No se encontraron productos que coincidan con la búsqueda'
                : 'No hay productos disponibles'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 20,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Reemplazado shadowProps con boxShadow
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 14,
    color: '#666',
  },
  productDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginLeft: 4,
  },
  taxBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  taxText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  searchingIndicator: {
    marginLeft: 10
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
});