// UK Student Inventory Management Component
// Manage fridge, pantry, and freezer items with expiry tracking

import React, { useState, useEffect } from 'react';
import type {
  InventoryItem,
  InventoryStatus,
  ExpiryAlert,
  InventoryUpdateRequest
} from '../../types/uk-student';
import { InventoryService } from '../../lib/uk-student/inventory-service';

interface InventoryManagerProps {
  userId: string;
  onInventoryChange?: (inventory: InventoryItem[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  userId,
  onInventoryChange
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'fridge' | 'pantry' | 'freezer'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inventoryService = new InventoryService(userId);

  useEffect(() => {
    loadInventoryData();
  }, [userId]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [inventoryData, statusData, alertsData] = await Promise.all([
        inventoryService.getAllInventory(),
        inventoryService.getInventoryStatus(),
        inventoryService.getExpiryAlerts()
      ]);

      setInventory(inventoryData);
      setInventoryStatus(statusData);
      setExpiryAlerts(alertsData);
      
      if (onInventoryChange) {
        onInventoryChange(inventoryData);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (item: InventoryUpdateRequest) => {
    try {
      await inventoryService.addInventoryItem(item);
      await loadInventoryData();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding inventory item:', error);
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await inventoryService.deleteInventoryItem(id);
      } else {
        await inventoryService.updateInventoryItem(id, { quantity: newQuantity });
      }
      await loadInventoryData();
    } catch (error) {
      console.error('Error updating inventory item:', error);
    }
  };

  const handleConsumeItem = async (id: string, quantityUsed: number) => {
    try {
      await inventoryService.consumeInventoryItem(id, quantityUsed);
      await loadInventoryData();
    } catch (error) {
      console.error('Error consuming inventory item:', error);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLocation && matchesSearch;
  });

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'fridge': return '🧊';
      case 'freezer': return '❄️';
      case 'pantry': return '🏠';
      default: return '📦';
    }
  };

  const getExpiryColor = (expiryDate?: Date) => {
    if (!expiryDate) return 'text-gray-500';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 1) return 'text-red-600 font-bold';
    if (daysUntilExpiry <= 3) return 'text-orange-600 font-semibold';
    if (daysUntilExpiry <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
        <p className="text-gray-600">
          Track your fridge, pantry, and freezer items to reduce waste and plan meals effectively.
        </p>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">⚠️ Items Expiring Soon</h2>
          <div className="space-y-2">
            {expiryAlerts.slice(0, 3).map((alert) => (
              <div key={alert.item.id} className="flex items-center justify-between">
                <span className="text-red-700">
                  {alert.item.item_name} expires in {alert.days_until_expiry} day(s)
                </span>
                <button
                  onClick={() => handleConsumeItem(alert.item.id, alert.item.quantity)}
                  className="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Mark as Used
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Status */}
      {inventoryStatus && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Items</h3>
            <p className="text-2xl font-bold text-blue-600">{inventoryStatus.total_items}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800">Expiring Soon</h3>
            <p className="text-2xl font-bold text-red-600">{inventoryStatus.expiring_soon.length}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Low Stock</h3>
            <p className="text-2xl font-bold text-yellow-600">{inventoryStatus.low_stock.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Categories</h3>
            <p className="text-2xl font-bold text-green-600">{Object.keys(inventoryStatus.categories).length}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Item
        </button>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">All Locations</option>
          <option value="fridge">🧊 Fridge</option>
          <option value="pantry">🏠 Pantry</option>
          <option value="freezer">❄️ Freezer</option>
        </select>

        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 flex-1 min-w-0"
        />
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => (
          <InventoryItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
            onConsume={handleConsumeItem}
          />
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No items found</p>
          <p className="text-gray-400">Add some items to your inventory to get started</p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <AddItemModal
          onAdd={handleAddItem}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

// Individual inventory item card component
interface InventoryItemCardProps {
  item: InventoryItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onConsume: (id: string, quantityUsed: number) => void;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  onUpdateQuantity,
  onConsume
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(item.quantity);

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'fridge': return '🧊';
      case 'freezer': return '❄️';
      case 'pantry': return '🏠';
      default: return '📦';
    }
  };

  const getExpiryColor = (expiryDate?: Date) => {
    if (!expiryDate) return 'text-gray-500';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 1) return 'text-red-600 font-bold';
    if (daysUntilExpiry <= 3) return 'text-orange-600 font-semibold';
    if (daysUntilExpiry <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleSaveQuantity = () => {
    onUpdateQuantity(item.id, newQuantity);
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getLocationIcon(item.location)}</span>
          <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
          {item.category}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Quantity:</span>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                min="0"
                step="0.1"
              />
              <span className="text-sm text-gray-500">{item.unit}</span>
              <button
                onClick={handleSaveQuantity}
                className="text-green-600 hover:text-green-700"
              >
                ✓
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {item.quantity} {item.unit}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {item.expiry_date && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Expires:</span>
            <span className={`text-sm ${getExpiryColor(item.expiry_date)}`}>
              {new Date(item.expiry_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {item.cost && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cost:</span>
            <span className="text-sm font-medium">£{item.cost.toFixed(2)}</span>
          </div>
        )}

        {item.store && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">From:</span>
            <span className="text-sm">{item.store}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onConsume(item.id, 1)}
          className="flex-1 bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition-colors"
        >
          Use 1
        </button>
        <button
          onClick={() => onConsume(item.id, item.quantity)}
          className="flex-1 bg-red-600 text-white text-sm py-2 rounded hover:bg-red-700 transition-colors"
        >
          Use All
        </button>
      </div>
    </div>
  );
};

// Add item modal component
interface AddItemModalProps {
  onAdd: (item: InventoryUpdateRequest) => void;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ onAdd, onClose }) => {
  const [formData, setFormData] = useState<InventoryUpdateRequest>({
    item_name: '',
    quantity: 1,
    unit: '',
    location: 'fridge',
    category: '',
    expiry_date: undefined,
    purchase_date: new Date(),
    store: '',
    cost: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.item_name && formData.unit) {
      onAdd(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Inventory Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                step="0.1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="kg, pieces, liters"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="fridge">🧊 Fridge</option>
              <option value="pantry">🏠 Pantry</option>
              <option value="freezer">❄️ Freezer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiry_date?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                expiry_date: e.target.value ? new Date(e.target.value) : undefined 
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store
              </label>
              <input
                type="text"
                value={formData.store || ''}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Aldi, Tesco, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost (£)
              </label>
              <input
                type="number"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  cost: e.target.value ? Number(e.target.value) : undefined 
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};