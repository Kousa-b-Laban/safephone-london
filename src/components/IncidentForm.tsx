'use client';

import { useState } from 'react';

interface IncidentFormProps {
  lat: number;
  lng: number;
  onSubmit: (data: { type: string; description: string; lat: number; lng: number }) => void;
  onCancel: () => void;
}

export default function IncidentForm({ lat, lng, onSubmit, onCancel }: IncidentFormProps) {
  const [type, setType] = useState('theft');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ type, description, lat, lng });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Report Incident</h2>
        <p className="text-sm text-gray-400 mb-4">
          Location: {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Incident Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="theft">Phone Theft</option>
              <option value="suspicious">Suspicious Activity</option>
              <option value="safe">Safe Zone</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Reporting...' : 'Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
