// UK Student Receipt Scanner Component
// Handles receipt OCR processing and manual entry fallback

import React, { useState, useRef } from 'react';
import type { 
  ReceiptData, 
  ReceiptScannerProps 
} from '../../types/uk-student-finance';
import { ukFinanceService } from '../../lib/uk-student/uk-finance-service';

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onReceiptProcessed,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualData, setManualData] = useState<ReceiptData>({
    store: '',
    items: [],
    total: 0,
    date: new Date(),
    confidence: 1
  });
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setIsProcessing(true);
    
    try {
      const receiptData = await ukFinanceService.processReceiptOCR(file);
      
      if (receiptData.requiresManualInput) {
        // OCR failed, show manual entry
        setManualData({
          ...receiptData,
          date: new Date()
        });
        setShowManualEntry(true);
      } else {
        // OCR succeeded
        onReceiptProcessed(receiptData);
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      onError('Failed to process receipt. Please try manual entry.');
      setShowManualEntry(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualData.store || manualData.items.length === 0 || manualData.total <= 0) {
      onError('Please fill in all required fields');
      return;
    }

    onReceiptProcessed(manualData);
    resetForm();
  };

  const addManualItem = () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      onError('Please fill in all item fields');
      return;
    }

    const totalPrice = newItem.quantity * newItem.unitPrice;
    const item = {
      ...newItem,
      totalPrice
    };

    setManualData({
      ...manualData,
      items: [...manualData.items, item],
      total: manualData.total + totalPrice
    });

    setNewItem({
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    });
  };

  const removeManualItem = (index: number) => {
    const item = manualData.items[index];
    setManualData({
      ...manualData,
      items: manualData.items.filter((_, i) => i !== index),
      total: manualData.total - item.totalPrice
    });
  };

  const resetForm = () => {
    setShowManualEntry(false);
    setPreviewUrl(null);
    setManualData({
      store: '',
      items: [],
      total: 0,
      date: new Date(),
      confidence: 1
    });
    setNewItem({
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const commonStores = [
    'Aldi', 'Tesco', 'Sainsbury\'s', 'ASDA', 'Morrisons', 'Co-op',
    'Premier', 'SPAR', 'University Superstore', 'GoPuff', 'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Receipt Upload */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Receipt</h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
          
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-w-full max-h-64 mx-auto rounded-lg"
              />
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Processing receipt...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Upload Receipt Photo'}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Or drag and drop an image file here
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowManualEntry(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Enter receipt details manually
          </button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Receipt Entry</h3>

            <div className="space-y-4">
              {/* Store and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store
                  </label>
                  <select
                    value={manualData.store}
                    onChange={(e) => setManualData({ ...manualData, store: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select store</option>
                    {commonStores.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualData.date.toISOString().split('T')[0]}
                    onChange={(e) => setManualData({ ...manualData, date: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Add Item */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Add Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Item name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                      placeholder="Qty"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="Price £"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={addManualItem}
                  className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Item
                </button>
              </div>

              {/* Items List */}
              {manualData.items.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                  <div className="space-y-2">
                    {manualData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-600 ml-2">
                            {item.quantity} × £{item.unitPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">£{item.totalPrice.toFixed(2)}</span>
                          <button
                            onClick={() => removeManualItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total:</span>
                      <span>£{manualData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualData.store || manualData.items.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Save Receipt
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

