import React, { useState, useMemo, useRef } from 'react';
import { Building, Shield, Upload, Trash2 } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { type Tenant, Role } from '@clm/shared-types';
import { Modal, toast } from '@clm/ui';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../config/api';

interface GeneralSettingsProps {
  currentTenant: Tenant | null;
  onTenantUpdated: (tenant: Tenant) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  currentTenant,
  onTenantUpdated,
}) => {
  const { isRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
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
  const [editStateCode, setEditStateCode] = useState('');
  const [editLocality, setEditLocality] = useState(
    currentTenant?.settings?.orgMetadata?.locality || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const countries = useMemo(() => Country.getAllCountries(), []);

  const availableStates = useMemo(() => {
    return editCountry ? State.getStatesOfCountry(editCountry) : [];
  }, [editCountry]);

  const availableCities = useMemo(() => {
    if (!editCountry || !editStateCode) return [];
    return City.getCitiesOfState(editCountry, editStateCode);
  }, [editCountry, editStateCode]);

  const handleCountryChange = (countryCode: string) => {
    setEditCountry(countryCode);
    const states = State.getStatesOfCountry(countryCode);
    const firstState = states[0];
    if (firstState) {
      setEditStateCode(firstState.isoCode);
      setEditState(firstState.name);
      const cities = City.getCitiesOfState(countryCode, firstState.isoCode);
      setEditLocality(cities[0]?.name || '');
    } else {
      setEditStateCode('');
      setEditState('');
      setEditLocality('');
    }
  };

  const handleStateChange = (stateCode: string) => {
    setEditStateCode(stateCode);
    const matched = availableStates.find((s) => s.isoCode === stateCode);
    setEditState(matched ? matched.name : stateCode);
    const cities = City.getCitiesOfState(editCountry, stateCode);
    setEditLocality(cities[0]?.name || '');
  };

  const handleOpenEdit = () => {
    const cCode = currentTenant?.settings?.orgMetadata?.country || 'US';
    const sName = currentTenant?.settings?.orgMetadata?.state || '';
    setEditOrgName(currentTenant?.name || '');
    setEditCountry(cCode);
    setEditDepartment(currentTenant?.settings?.orgMetadata?.department || '');
    setEditState(sName);
    const states = State.getStatesOfCountry(cCode);
    const matched = states.find((s) => s.name.toLowerCase() === sName.toLowerCase() || s.isoCode === sName);
    setEditStateCode(matched ? matched.isoCode : states[0]?.isoCode || '');
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File Too Large', 'Logo image must be smaller than 2MB.');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const updatedTenant = await api.tenants.update(currentTenant.id, {
          settings: {
            ...currentTenant.settings,
            logoUrl: base64Data,
          },
        });
        onTenantUpdated(updatedTenant);
        toast.success('Company Logo Updated', 'The new logo is now active across your workspace.');
      } catch (err: any) {
        toast.error('Upload Failed', err.message || 'Could not update company logo.');
      } finally {
        setIsUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('File Error', 'Failed to read image file.');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!currentTenant) return;
    setIsUploadingLogo(true);
    try {
      const updatedTenant = await api.tenants.update(currentTenant.id, {
        settings: {
          ...currentTenant.settings,
          logoUrl: null,
        },
      });
      onTenantUpdated(updatedTenant);
      toast.success('Logo Removed', 'Reverted to the default workspace shield icon.');
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not remove company logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <>
      {/* Brand Identity & Logo Section */}
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-100 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-2 overflow-hidden shrink-0">
            {currentTenant?.settings?.logoUrl ? (
              <img
                src={currentTenant.settings.logoUrl}
                alt={currentTenant.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building className="h-8 w-8 text-blue-500/70" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Company Workspace Brand &amp; Logo</span>
              {currentTenant?.settings?.logoUrl && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Custom Logo Active
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the logo displayed in the navigation sidebar, portal headers, and alerts.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Recommended: Square or transparent PNG, SVG, JPG or WEBP (Max 2MB).
            </p>
          </div>
        </div>

        {isRole(Role.SUPER_ADMIN, Role.TENANT_ADMIN) && (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              disabled={isUploadingLogo}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{isUploadingLogo ? 'Uploading...' : currentTenant?.settings?.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
            </button>
            {currentTenant?.settings?.logoUrl && (
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={handleRemoveLogo}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Remove company logo"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        )}
      </div>

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
              {isRole(Role.SUPER_ADMIN, Role.TENANT_ADMIN) && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
              )}
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Country (C)</span>
                <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                  {editCountry}
                </span>
              </label>
              <select
                value={editCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
              >
                {countries.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>
                    {c.flag} {c.name} ({c.isoCode})
                  </option>
                ))}
              </select>
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State / Province (ST)
              </label>
              {availableStates.length > 0 ? (
                <select
                  value={editStateCode}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
                >
                  {availableStates.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>
                      {s.name} ({s.isoCode})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. California"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City / Locality (L)
              </label>
              {availableCities.length > 0 ? (
                <select
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
                >
                  {availableCities.slice(0, 200).map((cty, idx) => (
                    <option key={`${cty.name}-${idx}`} value={cty.name}>
                      {cty.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
              )}
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
