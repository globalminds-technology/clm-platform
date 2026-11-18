import { useState, useCallback } from 'react';
import {
  type CloudAccount,
  type CaIntegration,
  type User,
} from '@clm/shared-types';
import { api } from '../../../config/api';

export function useSettings() {
  const [settingsSubTab, setSettingsSubTab] = useState<
    'general' | 'cloud-accounts' | 'team' | 'ca-integrations'
  >('general');
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [caIntegrations, setCaIntegrations] = useState<CaIntegration[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCloudAccounts = useCallback(async () => {
    try {
      const data = await api.cloudAccounts.list();
      setCloudAccounts(Array.isArray(data) ? data : []);
    } catch {
      // offline / error
    }
  }, []);

  const fetchCaIntegrations = useCallback(async () => {
    try {
      const data = await api.caIntegrations.list();
      setCaIntegrations(Array.isArray(data) ? data : []);
    } catch {
      // offline / error
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.users.list();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      // offline / error
    }
  }, []);

  const fetchAllSettings = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchCloudAccounts(),
      fetchCaIntegrations(),
      fetchMembers(),
    ]);
    setIsLoading(false);
  }, [fetchCloudAccounts, fetchCaIntegrations, fetchMembers]);

  return {
    settingsSubTab,
    setSettingsSubTab,
    cloudAccounts,
    setCloudAccounts,
    caIntegrations,
    setCaIntegrations,
    members,
    setMembers,
    isLoading,
    fetchCloudAccounts,
    fetchCaIntegrations,
    fetchMembers,
    fetchAllSettings,
  };
}
