import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  item: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justify: 'space-between', 
    alignItems: 'center',
    marginBottom: 8 
  },
  name: { fontSize: 16, color: '#333D4B', fontWeight: '500' },
  status: { fontSize: 14, color: '#8B95A1' },
  collectedStatus: { color: '#3182F6', fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8B95A1', fontSize: 14 },
});
