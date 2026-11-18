import React, { useState } from 'react';
import { Search, ShieldCheck, Star } from 'lucide-react';
import { type CaIntegration, type CloudAccount } from '@clm/shared-types';
import { InfoBubble, toast } from '@clm/ui';
import { CATALOG_PROVIDERS, type ProviderCatalogItem, type IntegrationCategory } from '../types';
import { IntegrationCard } from './IntegrationCard';
import { ConnectCaModal } from './ConnectCaModal';
import { api } from '../../../config/api';

interface IntegrationsCatalogViewProps {
  caIntegrations: CaIntegration[];
  cloudAccounts?: CloudAccount[];
  onIntegrationsUpdated: () => void;
}

export const IntegrationsCatalogView: React.FC<IntegrationsCatalogViewProps> = ({
  caIntegrations,
  cloudAccounts = [],
  onIntegrationsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'ALL' | 'CONNECTED'>('ALL');
  const [selectedProviderToConnect, setSelectedProviderToConnect] = useState<ProviderCatalogItem | null>(null);

  // Set default CA
  const handleSetDefault = async (id: string) => {
    try {
      await api.caIntegrations.setDefault(id);
      toast.success('Default CA Updated', 'Automated renewals will now prioritize this Certificate Authority.');
      onIntegrationsUpdated();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update default CA.');
    }
  };

  // Disconnect CA
  const handleDelete = async (id: string, name: string) => {
    try {
      await api.caIntegrations.delete(id);
      toast.success('Integration Disconnected', `Removed ${name} from tenant configuration.`);
      onIntegrationsUpdated();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove integration.');
    }
  };

  // Filter providers based on search query & active category tab
  const filteredProviders = CATALOG_PROVIDERS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'CONNECTED') {
      return caIntegrations.some((c) => c.provider === item.provider);
    }
    return item.category === selectedCategory;
  });

  const publicCAs = filteredProviders.filter((p) => p.category === 'PUBLIC_CA');
  const acmeIntegrations = filteredProviders.filter((p) => p.category === 'ACME');
  const privateAndCloudPKI = filteredProviders.filter((p) => p.category === 'PRIVATE_CLOUD');

  const defaultCa = caIntegrations.find((c) => c.isDefault);

  return (
    <div className="space-y-6 pb-12 pr-3">
      {/* Top Header Card */}
      <div className="bg-white rounded-[28px] soft-card p-6 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Integrations &amp; Certificate Authorities</h2>
            <InfoBubble
              title="PKI Integrations Hub"
              content="Connect commercial public CAs, automated ACME RFC 8555 directories, and private enterprise PKIs for zero-downtime certificate issuance."
              position="bottom"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise CA directory &bull; All credentials encrypted via AES-256-GCM envelope encryption
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>{caIntegrations.length} Connected Authorities</span>
          </div>
          {defaultCa && (
            <div className="px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
              <span>Default: {defaultCa.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search DigiCert, Let's Encrypt, AWS, Sectigo, MSCA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-blue-600 shadow-2xs font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          {[
            { id: 'ALL', label: `All (${CATALOG_PROVIDERS.length})` },
            { id: 'PUBLIC_CA', label: `Public CAs (6)` },
            { id: 'ACME', label: `ACME Directories (5)` },
            { id: 'PRIVATE_CLOUD', label: `Others / Cloud (5)` },
            { id: 'CONNECTED', label: `Connected (${caIntegrations.length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id ? 'pill-tab-active' : 'pill-tab-inactive'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Public CA Integrations */}
      {publicCAs.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight uppercase tracking-wider flex items-center gap-2">
              <span>Public CA Integrations</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">({publicCAs.length} available)</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {publicCAs.map((item) => (
              <IntegrationCard
                key={item.provider}
                item={item}
                connectedList={caIntegrations}
                onConnect={(prov) => setSelectedProviderToConnect(prov)}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. ACME Integrations */}
      {acmeIntegrations.length > 0 && (
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight uppercase tracking-wider flex items-center gap-2">
              <span>ACME Integrations</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">({acmeIntegrations.length} available)</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {acmeIntegrations.map((item) => (
              <IntegrationCard
                key={item.provider}
                item={item}
                connectedList={caIntegrations}
                onConnect={(prov) => setSelectedProviderToConnect(prov)}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Others (Enterprise, Cloud & Private PKI) */}
      {privateAndCloudPKI.length > 0 && (
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight uppercase tracking-wider flex items-center gap-2">
              <span>Others (Enterprise, Cloud &amp; Private PKI)</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">({privateAndCloudPKI.length} available)</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {privateAndCloudPKI.map((item) => (
              <IntegrationCard
                key={item.provider}
                item={item}
                connectedList={caIntegrations}
                onConnect={(prov) => setSelectedProviderToConnect(prov)}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {filteredProviders.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 soft-card space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Integrations Matched "{searchQuery}"</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or reset the filter pills above to view all 16 supported providers.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Modal to Connect/Add credentials */}
      <ConnectCaModal
        isOpen={!!selectedProviderToConnect}
        onClose={() => setSelectedProviderToConnect(null)}
        selectedProvider={selectedProviderToConnect}
        cloudAccounts={cloudAccounts}
        onSuccess={onIntegrationsUpdated}
      />
    </div>
  );
};
