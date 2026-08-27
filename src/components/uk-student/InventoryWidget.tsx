// Inventory Widget - Shows expiring items and quick stats
import React from 'react';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  expiry_date?: string;
  category?: string;
}

interface InventoryWidgetProps {
  items: InventoryItem[];
  expiringItems: InventoryItem[];
}

export const InventoryWidget: React.FC<InventoryWidgetProps> = ({
  items,
  expiringItems
}) => {
  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, string> = {
      'dairy': '🥛',
      'vegetables': '🥕',
      'fruits': '🍎',
      'meat': '🥩',
      'bread': '🍞',
      'pantry': '🥫',
      'frozen': '🧊',
      'other': '📦'
    };
    return icons[category?.toLowerCase() || 'other'] || '📦';
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days: number) => {
    if (days <= 0) return 'text-red-600 bg-red-50 border-red-200';
    if (days === 1) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getExpiryLabel = (days: number) => {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days left`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Inventory</h3>
        <button
          onClick={() => window.location.href = '#inventory'}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Total Items</div>
          <div className="text-3xl font-bold text-blue-900">{items.length}</div>
        </div>
        <div className={`rounded-lg p-4 ${
          expiringItems.length > 0 ? 'bg-red-50' : 'bg-green-50'
        }`}>
          <div className={`text-sm mb-1 ${
            expiringItems.length > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            Expiring Soon
          </div>
          <div className={`text-3xl font-bold ${
            expiringItems.length > 0 ? 'text-red-900' : 'text-green-900'
          }`}>
            {expiringItems.length}
          </div>
        </div>
      </div>

      {/* Expiring Items List */}
      {expiringItems.length > 0 ? (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Expiring Soon</h4>
          <div className="space-y-2">
            {expiringItems.slice(0, 5).map(item => {
              const days = item.expiry_date ? getDaysUntilExpiry(item.expiry_date) : null;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-600">
                        Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                  {days !== null && (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      getExpiryColor(days)
                    }`}>
                      {getExpiryLabel(days)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {expiringItems.length > 5 && (
            <button
              onClick={() => window.location.href = '#inventory'}
              className="w-full mt-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              +{expiringItems.length - 5} more expiring items
            </button>
          )}
        </div>
      ) : items.length > 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-sm font-medium text-gray-900">All good!</p>
          <p className="text-xs text-gray-600 mt-1">No items expiring soon</p>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🛒</div>
          <p className="text-sm text-gray-600 mb-3">No items in inventory</p>
          <button
            onClick={() => window.location.href = '#inventory'}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first items
          </button>
        </div>
      )}
    </div>
  );
};
