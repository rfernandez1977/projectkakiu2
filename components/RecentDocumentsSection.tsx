import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText } from 'lucide-react-native';

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
}

interface RecentDocumentsSectionProps {
  invoices: Invoice[];
  router: any;
}

export default function RecentDocumentsSection({ invoices, router }: RecentDocumentsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Documentos Recientes</Text>
      <View style={styles.documentsList}>
        {invoices.map((invoice, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.documentItem}
            onPress={() => router.push({
              pathname: '/sales/factura-electronica',
              params: { id: invoice.id }
            })}
          >
            <View style={styles.documentIcon}>
              <FileText size={24} color="#0066CC" />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>{invoice.number}</Text>
              <Text style={styles.documentMeta}>{invoice.client}</Text>
            </View>
            <Text style={styles.documentAmount}>S/ {invoice.amount.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  documentsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  documentMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  documentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});