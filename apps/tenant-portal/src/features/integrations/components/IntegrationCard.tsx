import React from 'react';
import { Check, Plus, Star, MoreVertical, Trash2 } from 'lucide-react';
import { type CaIntegration } from '@clm/shared-types';
import { type ProviderCatalogItem } from '../types';
import { BrandLogo } from './BrandLogos';

interface IntegrationCardProps {
  item: ProviderCatalogItem;
  connectedList: CaIntegration[];
  onConnect: (item: ProviderCatalogItem) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  item,
  connectedList,
  onConnect,
  onSetDefault,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  // Match all connected instances for this provider
  const connections = connectedList.filter((c) => c.provider === item.provider);
  const isConnected = connections.length > 0;
  const isDefault = connections.some((c) => c.isDefault);
  const primaryConnection = connections[0];

  return (
    <div
      onClick={() => {
        if (!isConnected) onConnect(item);
      }}
      className={`relative group rounded-[22px] bg-white border transition-all p-5 flex flex-col items-center justify-between text-center min-h-[160px] cursor-pointer ${
        isConnected
          ? 'border-emerald-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md'
          : 'border-slate-100 shadow-2xs hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* Status Badges */}
      <div className="w-full flex items-center justify-between absolute top-3.5 px-3.5">
        <div className="flex items-center gap-1">
          {isConnected && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isDefault
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isDefault ? 'bg-blue-600' : 'bg-emerald-500'}`} />
              {isDefault ? 'Default CA' : 'Active'}
            </span>
          )}
        </div>

        {isConnected && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 w-44 rounded-xl bg-white shadow-xl border border-slate-100 py-1 z-30 text-left text-xs font-medium text-slate-700 animate-in fade-in-0 zoom-in-95"
              >
                {!isDefault && primaryConnection && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onSetDefault(primaryConnection.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span>Set as Default CA</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onConnect(item);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Add Another Key</span>
                </button>
                {primaryConnection && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(primaryConnection.id, primaryConnection.name);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Brand Logo */}
      <div className="my-auto pt-3 flex flex-col items-center">
        <BrandLogo type={item.logoType} className="w-13 h-13 transition-transform group-hover:scale-105" />
        <h4 className="text-sm font-extrabold text-[#0F172A] mt-3 group-hover:text-blue-600 transition-colors">
          {item.name}
        </h4>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[170px]">
          {isConnected ? primaryConnection?.maskedSecret || item.tagline : item.tagline}
        </p>
      </div>

      {/* Action CTA */}
      <div className="w-full pt-2">
        {isConnected ? (
          <div className="w-full py-1.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-100">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Configured</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConnect(item);
            }}
            className="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200 hover:border-blue-600 shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect</span>
          </button>
        )}
      </div>
    </div>
  );
};
