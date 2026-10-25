import React, { useState } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

import { useQueryClient } from '@tanstack/react-query';

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('PVT_LTD');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (!name.trim()) {
        throw new Error('Entity legal name is required');
      }

      await api.post('/entities', {
        name: name.trim(),
        entity_type: entityType,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        base_currency: 'INR',
      });

      queryClient.invalidateQueries({ queryKey: ['entities'] });
      queryClient.invalidateQueries({ queryKey: ['group-liquidity'] });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create legal entity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#011a18] border border-[#134e48] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] hover:text-[#F0EDE4] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#004741] text-[#F0EDE4] flex items-center justify-center border border-[#134e48]">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#F0EDE4] pt-2">Register Real Business Entity</h3>
          <p className="text-xs text-[#a2b8b5]">
            Add your company, LLP, or proprietorship to hold real commercial bank accounts.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
              Legal Business Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Logistics Pvt Ltd"
              className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3.5 py-2.5 text-xs text-[#F0EDE4] placeholder-[#557370] focus:outline-none focus:border-[#F0EDE4]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">
              Entity Legal Structure
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2.5 text-xs text-[#F0EDE4] focus:outline-none focus:border-[#F0EDE4]"
            >
              <option value="PVT_LTD" className="bg-[#072b27] text-[#F0EDE4]">Private Limited (Pvt Ltd)</option>
              <option value="LLP" className="bg-[#072b27] text-[#F0EDE4]">Limited Liability Partnership (LLP)</option>
              <option value="PROPRIETORSHIP" className="bg-[#072b27] text-[#F0EDE4]">Sole Proprietorship</option>
              <option value="PARTNERSHIP" className="bg-[#072b27] text-[#F0EDE4]">Partnership Firm</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAACA1234A1Z5"
                className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs font-mono text-[#F0EDE4] uppercase focus:outline-none focus:border-[#F0EDE4]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#a2b8b5] block mb-1">PAN (Optional)</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                placeholder="AAACA1234A"
                className="w-full bg-[#031d1a] border border-[#134e48] rounded-xl px-3 py-2 text-xs font-mono text-[#F0EDE4] uppercase focus:outline-none focus:border-[#F0EDE4]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#031d1a] border border-[#134e48] text-[#a2b8b5] text-xs font-semibold hover:text-[#F0EDE4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#F0EDE4] hover:bg-[#e4dfd3] text-[#004741] text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Save Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
