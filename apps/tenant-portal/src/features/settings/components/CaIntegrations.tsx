import React from 'react';
import { type CaIntegration, type CloudAccount } from '@clm/shared-types';
import { IntegrationsCatalogView } from '../../integrations';

interface CaIntegrationsProps {
  caIntegrations: CaIntegration[];
  cloudAccounts?: CloudAccount[];
  onCAsUpdated: () => void;
}

export const CaIntegrations: React.FC<CaIntegrationsProps> = ({
  caIntegrations,
  cloudAccounts = [],
  onCAsUpdated,
}) => {
  return (
    <IntegrationsCatalogView
      caIntegrations={caIntegrations}
      cloudAccounts={cloudAccounts}
      onIntegrationsUpdated={onCAsUpdated}
    />
  );
};
