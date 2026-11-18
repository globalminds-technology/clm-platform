import React, { useState } from 'react';
import { Modal } from '@clm/ui';
import { SubscriptionTier } from '@clm/shared-types';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: {
    name: string;
    slug: string;
    adminEmail: string;
    tier: SubscriptionTier;
    awsAccountId?: string;
  }) => Promise<void>;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.ENTERPRISE);
  const [awsAccountId, setAwsAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminEmail.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        adminEmail: adminEmail.trim(),
        tier,
        awsAccountId: awsAccountId.trim() || undefined,
      });
      setName('');
      setSlug('');
      setAdminEmail('');
      setAwsAccountId('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provision New Tenant Organization">
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <div className="space-y-1">
          <label className="font-bold text-slate-700 uppercase tracking-wider">Organization Legal Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
              }
            }}
            placeholder="Stripe Payments Inc."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-700 uppercase tracking-wider">Workspace Slug (RLS Identifier)</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="stripe"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-700 uppercase tracking-wider">Initial Tenant Admin Email</label>
          <input
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="secops@stripe.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider">Subscription Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as SubscriptionTier)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
            >
              <option value={SubscriptionTier.ENTERPRISE}>Enterprise Scale</option>
              <option value={SubscriptionTier.PROFESSIONAL}>Professional</option>
              <option value={SubscriptionTier.COMMUNITY}>Community (Trial)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider">Dedicated AWS Account (Opt)</label>
            <input
              type="text"
              value={awsAccountId}
              onChange={(e) => setAwsAccountId(e.target.value)}
              placeholder="123456789012"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-gradient-btn px-4 py-2 rounded-xl font-bold text-white shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Provisioning...' : 'Provision Organization'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
