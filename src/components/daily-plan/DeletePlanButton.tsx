import { useState } from 'react';

interface DeletePlanButtonProps {
  planId: string;
  onDeleted: () => void;
}

export default function DeletePlanButton({ planId, onDeleted }: DeletePlanButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/daily-plan/${planId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      // Notify parent component
      onDeleted();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-surface-secondary border border-border rounded-lg p-4">
        <p className="text-text-primary mb-4">
          Are you sure you want to delete today's plan? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Plan'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-surface-hover text-text-primary rounded-lg hover:bg-surface-tertiary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-hover border border-border transition-colors"
    >
      🗑️ Delete Today's Plan
    </button>
  );
}
