import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Platform, 
  Modal,
  ActivityIndicator,
  Alert,
  Linking 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Eye, 
  Check, 
  CircleAlert as AlertCircle, 
  Clock, 
  CreditCard,
  Printer,
  Mail,
  Building2,
  ChevronRight,
  Bluetooth
} from 'lucide-react-native';
import WebView from 'react-native-webview';
import { api, Document } from '../../services/api';
import * as Print from 'expo-print';
import { useTheme } from '../../context/ThemeContext';

export default function InvoiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const invoiceId = params.id as string;
  const assignedFolio = params.folio as string;
  
  const { printerType, printerConfig } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (invoiceId || assignedFolio) {
      fetchInvoiceDetails();
    }
  }, [invoiceId, assignedFolio]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      let response: Document;
      if (assignedFolio) {
        response = await api.getInvoiceDetail(assignedFolio);
      } else if (invoiceId) {
        response = await api.getInvoiceDetailById(parseInt(invoiceId));
      } else {
        throw new Error('No invoice ID or folio provided');
      }
      setInvoice(response);
      setError(null);
      if (response.client?.email) {
        setEmailAddress(response.client.email);
      }
    } catch (err: any) {
      console.error('Error fetching invoice details:', err);
      setError(err.message || 'No se pudieron cargar los detalles de la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async () => {
    if (!invoice) return;
    try {
      setLoadingPdf(true);
      const url = await api.getInvoicePdf(invoice.id, invoice.validation);
      setPdfUrl(url);
      setShowPdf(true);
      console.log('[INVOICE_DETAILS] Viewing PDF:', url);
    } catch (err) {
      console.error('Error getting PDF:', err);
      Alert.alert('Error', 'No se pudo obtener el PDF de la factura');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setLoadingPdf(true);
      const url = await api.getInvoicePdf(invoice.id, invoice.validation);
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'No se puede abrir el PDF en este dispositivo');
        }
      }
      console.log('[INVOICE_DETAILS] Downloading PDF:', url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      Alert.alert('Error', 'No se pudo descargar el PDF de la factura');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!invoice) return;
    
    // Check if printer is configured
    const isPrinterConfigured = printerType !== 'generic' && 
                               printerConfig && 
                               (printerConfig.model || printerConfig.connection);
    
    if (!isPrinterConfigured) {
      Alert.alert(
        'Impresora no configurada',
        'No hay una impresora configurada. Por favor, configure una impresora en Ajustes > Configuración de Impresión.',
        [
          { text: 'Ir a Configuración', onPress: () => router.push('/settings/print-config') },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }
    
    // Check for Bluetooth printer configuration
    if (printerConfig?.connection === 'bluetooth') {
      const hasBluetoothPrinterModel = printerConfig.model && 
        (printerConfig.model.includes('SM-') || 
         printerConfig.model.includes('WSP-') || 
         printerConfig.model.includes('Woosim'));
      
      if (!hasBluetoothPrinterModel) {
        Alert.alert(
          'Impresora Bluetooth no configurada',
          'Para imprimir por Bluetooth necesita seleccionar un modelo de impresora específico en los ajustes.',
          [
            { text: 'Ir a Configuración', onPress: () => router.push('/settings/print-config') },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
        return;
      }
    }
    
    try {
      setPrintingPdf(true);
      const url = pdfUrl || await api.getInvoicePdf(invoice.id, invoice.validation);
      if (!pdfUrl) {
        setPdfUrl(url);
      }
      
      if (Platform.OS === 'web') {
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => printWindow.print());
        } else {
          Alert.alert('Aviso', 'Por favor permita ventanas emergentes para imprimir.');
        }
        return;
      }
      
      await Print.printAsync({ uri: url });
      console.log('[INVOICE_DETAILS] Printing PDF:', url);
    } catch (err) {
      console.error('Error printing PDF:', err);
      Alert.alert(
        'Error de impresión', 
        `No se pudo imprimir el documento con la impresora ${printerConfig?.model || 'configurada'}. Verifique la conexión.`,
        [
          { text: 'Ir a Configuración', onPress: () => router.push('/settings/print-config') },
          { text: 'Aceptar', style: 'cancel' }
        ]
      );
    } finally {
      setPrintingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    if (!emailAddress || !emailAddress.includes('@')) {
      Alert.alert('Error', 'Por favor ingrese una dirección de correo electrónico válida');
      return;
    }
    try {
      setSendingEmail(true);
      // Simulate email sending (replace with real API call in production)
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        'Correo Enviado',
        `La factura se ha enviado a ${emailAddress}`,
        [{ text: 'OK', onPress: () => setShowEmailModal(false) }]
      );
      console.log('[INVOICE_DETAILS] Sending email to:', emailAddress);
    } catch (err) {
      console.error('Error sending email:', err);
      Alert.alert('Error', 'No se pudo enviar el correo electrónico. Intente nuevamente.');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '';
    try {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
      }).format(amount);
    } catch (e) {
      console.error('Error formatting amount:', e);
      return amount.toString();
    }
  };

  if (showPdf && pdfUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.pdfHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowPdf(false)}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.pdfHeaderTitle}>
            {invoice?.type || 'Documento'} {invoice?.assignedFolio || ''}
          </Text>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={handleDownloadPdf}
          >
            <Download size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <WebView
          source={{ uri: pdfUrl }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>Cargando PDF...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Factura</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      ) : error || !invoice ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#FF3B30" style={styles.errorIcon} />
          <Text style={styles.errorText}>{error || 'No se encontró la factura'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchInvoiceDetails}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceType}>
                <Text style={styles.invoiceTypeText}>{invoice.type}</Text>
                <Text style={styles.invoiceFolio}>N° {invoice.assignedFolio}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                invoice.state && invoice.state[0] === 'ACCEPTED' ? styles.statusAccepted : styles.statusPending
              ]}>
                {invoice.state && invoice.state[0] === 'ACCEPTED' ? (
                  <Check size={16} color="#4CAF50" style={styles.statusIcon} />
                ) : (
                  <AlertCircle size={16} color="#FF9800" style={styles.statusIcon} />
                )}
                <Text style={[
                  styles.statusText,
                  invoice.state && invoice.state[0] === 'ACCEPTED' ? styles.statusTextAccepted : styles.statusTextPending
                ]}>
                  {invoice.state ? invoice.state[1] : 'Pendiente'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles de la Factura</Text>
            
            <View style={styles.detailRow}>
              <Clock size={18} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Fecha de Emisión:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.date)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <CreditCard size={18} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Monto Total:</Text>
              <Text style={styles.detailValue}>{formatAmount(invoice.total)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <FileText size={18} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Folio Asignado:</Text>
              <Text style={styles.detailValue}>{invoice.assignedFolio}</Text>
            </View>
            
            {invoice.externalFolio && (
              <View style={styles.detailRow}>
                <FileText size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Folio Externo:</Text>
                <Text style={styles.detailValue}>{invoice.externalFolio}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <FileText size={18} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Verificación:</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                {invoice.validation}
              </Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
            
            {invoice.client ? (
              <View style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientIconContainer}>
                    <Building2 size={24} color="#0066CC" />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{invoice.client.name}</Text>
                    <Text style={styles.clientRut}>RUT: {invoice.client.rut}</Text>
                    {invoice.client.email && (
                      <Text style={styles.clientEmail}>{invoice.client.email}</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.clientDetailButton}
                    onPress={() => console.log('[INVOICE_DETAILS] View client details:', invoice.client.id)}
                  >
                    <ChevronRight size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No hay información del cliente disponible</Text>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones</Text>
            
            {printerType !== 'generic' ? (
              <View style={styles.printerInfoContainer}>
                <View style={styles.printerInfoIcon}>
                  {printerConfig && printerConfig.connection === 'bluetooth' ? (
                    <Bluetooth size={18} color="#0066CC" />
                  ) : (
                    <Printer size={18} color="#0066CC" />
                  )}
                </View>
                <Text style={styles.printerInfoText}>
                  Impresora: {printerType === 'star' ? 'Star' : printerType === 'epson' ? 'Epson' : printerType} 
                  {printerConfig && printerConfig.model ? ` (${printerConfig.model})` : ''}
                  {printerConfig && printerConfig.connection ? ` - ${printerConfig.connection === 'bluetooth' ? 'Bluetooth' : printerConfig.connection === 'wifi' ? 'WiFi' : 'USB'}` : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.printerWarningContainer}>
                <AlertCircle size={18} color="#FF9800" />
                <Text style={styles.printerWarningText}>
                  No hay impresora configurada. Configure una en Ajustes.
                </Text>
              </View>
            )}
            
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewPdf}
                disabled={loadingPdf}
              >
                <View style={[styles.actionIconContainer, styles.viewIconContainer]}>
                  <Eye size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Ver PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleDownloadPdf}
                disabled={loadingPdf}
              >
                <View style={[styles.actionIconContainer, styles.downloadIconContainer]}>
                  <Download size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Descargar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  printerType === 'generic' && styles.disabledActionButton
                ]}
                onPress={handlePrintPdf}
                disabled={printingPdf || printerType === 'generic'}
              >
                <View style={[styles.actionIconContainer, styles.printIconContainer]}>
                  <Printer size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Imprimir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowEmailModal(true)}
              >
                <View style={[styles.actionIconContainer, styles.emailIconContainer]}>
                  <Mail size={24} color="#fff" />
                </View>
                <Text style={styles.actionText}>Enviar por Correo</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Adicional</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Esta factura electrónica ha sido válidamente emitida y cumple con los 
                requisitos legales establecidos por el Servicio de Impuestos Internos (SII).
              </Text>
              
              <Text style={styles.infoText}>
                El monto total de esta factura es de {formatAmount(invoice.total)}, 
                e incluye todos los impuestos aplicables según la legislación vigente.
              </Text>
              
              <Text style={styles.infoNote}>
                Nota: Para realizar cualquier acción relacionada con esta factura, 
                utilice los botones de acción disponibles en la sección anterior.
              </Text>
            </View>
          </View>
          
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              Documento electrónico autorizado por el Servicio de Impuestos Internos (SII).
            </Text>
            <Text style={styles.disclaimerText}>
              Factura emitida el {formatDate(invoice.date)}.
            </Text>
          </View>
        </ScrollView>
      )}
      
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar por Correo</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEmailModal(false)}
              >
                <ArrowLeft size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Dirección de correo electrónico</Text>
              <TextInput
                style={styles.modalInput}
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    // Reemplazado shadowProps con boxShadow
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceType: {
    flex: 1,
  },
  invoiceTypeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  invoiceFolio: {
    fontSize: 17,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusAccepted: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusIcon: {
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusTextAccepted: {
    color: '#4CAF50',
  },
  statusTextPending: {
    color: '#FF9800',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    // Reemplazado shadowProps con boxShadow
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
    width: 140,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  clientCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientRut: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#0066CC',
  },
  clientDetailButton: {
    padding: 10,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 15,
  },
  printerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  printerWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  printerInfoIcon: {
    marginRight: 10,
  },
  printerInfoText: {
    fontSize: 14,
    color: '#0066CC',
    flex: 1,
  },
  printerWarningText: {
    fontSize: 14,
    color: '#FF9800',
    flex: 1,
    marginLeft: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  printIconContainer: {
    backgroundColor: '#FF9800',
  },
  viewIconContainer: {
    backgroundColor: '#0066CC',
  },
  downloadIconContainer: {
    backgroundColor: '#4CAF50',
  },
  emailIconContainer: {
    backgroundColor: '#9C27B0',
  },
  disabledActionButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  infoNote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 5,
  },
  disclaimerContainer: {
    marginBottom: 30,
    padding: 15,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
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
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pdfHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  downloadButton: {
    padding: 5,
  },
  webView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    paddingBottom: 30,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});