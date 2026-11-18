import React, { useState } from 'react';
import { Building, Shield } from 'lucide-react';
import { type Tenant } from '@clm/shared-types';
import { Modal, toast } from '@clm/ui';
import { api } from '../../../config/api';

interface GeneralSettingsProps {
  currentTenant: Tenant | null;
  onTenantUpdated: (tenant: Tenant) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  currentTenant,
  onTenantUpdated,
}) => {
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editOrgName, setEditOrgName] = useState(currentTenant?.name || '');
  const [editCountry, setEditCountry] = useState(
    currentTenant?.settings?.orgMetadata?.country || 'US'
  );
  const [editDepartment, setEditDepartment] = useState(
    currentTenant?.settings?.orgMetadata?.department || ''
  );
  const [editState, setEditState] = useState(
    currentTenant?.settings?.orgMetadata?.state || ''
  );
  const [editLocality, setEditLocality] = useState(
    currentTenant?.settings?.orgMetadata?.locality || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = () => {
    setEditOrgName(currentTenant?.name || '');
    setEditCountry(currentTenant?.settings?.orgMetadata?.country || 'US');
    setEditDepartment(currentTenant?.settings?.orgMetadata?.department || '');
    setEditState(currentTenant?.settings?.orgMetadata?.state || '');
    setEditLocality(currentTenant?.settings?.orgMetadata?.locality || '');
    setShowEditOrgModal(true);
  };

  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    setIsSaving(true);
    try {
      const updatedTenant = await api.tenants.update(currentTenant.id, {
        name: editOrgName.trim(),
        settings: {
          ...currentTenant.settings,
          orgMetadata: {
            country: editCountry.trim().toUpperCase(),
            department: editDepartment.trim(),
            state: editState.trim(),
            locality: editLocality.trim(),
          },
        },
      });
      onTenantUpdated(updatedTenant);
      setShowEditOrgModal(false);
      toast.success(
        'Organization Profile Saved',
        'Updated enterprise metadata will automatically pre-populate future CSR requests.'
      );
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not save organization profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span>Workspace Organization</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {currentTenant?.tier}
              </span>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>

          <div className="space-y-2 text-slate-600 pt-1">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Company Legal Name (O)</span>
              <span className="font-semibold text-slate-800">{currentTenant?.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Workspace Slug</span>
              <span className="font-mono">{currentTenant?.slug}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Country Code (C)</span>
              <span className="font-mono font-bold text-slate-800">
                {currentTenant?.settings?.orgMetadata?.country || 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Department / Unit (OU)</span>
              <span className="font-semibold text-slate-800">
                {currentTenant?.settings?.orgMetadata?.department || 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">State / Province (ST)</span>
              <span className="font-semibold text-slate-800">
                {currentTenant?.settings?.orgMetadata?.state || 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">City / Locality (L)</span>
              <span className="font-semibold text-slate-800">
                {currentTenant?.settings?.orgMetadata?.locality || 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-3">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Security, Quotas &amp; ACME Defaults</span>
          </div>
          <div className="space-y-2 text-slate-600 pt-1">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Auto-Renewal Window</span>
              <span className="font-semibold">30 Days Before Expiry</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Enforcement</span>
              <span className="font-semibold text-emerald-600">Strict Zero-Trust mTLS</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-400">Max Certificates Quota</span>
              <span className="font-bold text-slate-800">
                {currentTenant?.maxCertificates || 50} Certs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Gateways Allowed</span>
              <span className="font-bold text-slate-800">
                {currentTenant?.maxGateways || 2} Gateways
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={showEditOrgModal}
        onClose={() => setShowEditOrgModal(false)}
        title="Edit Workspace Organization Profile"
        description="Configure cryptographic CSR attributes (O, OU, C, ST, L) injected into renewal requests."
        maxWidth="md"
      >
        <form onSubmit={handleSaveOrgSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Company Legal Name (O)
            </label>
            <input
              type="text"
              required
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Country Code (C)
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="US"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department / Unit (OU)
              </label>
              <input
                type="text"
                placeholder="e.g. SecOps, Engineering"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State / Province (ST)
              </label>
              <input
                type="text"
                placeholder="e.g. California"
                value={editState}
                onChange={(e) => setEditState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City / Locality (L)
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco"
                value={editLocality}
                onChange={(e) => setEditLocality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditOrgModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
