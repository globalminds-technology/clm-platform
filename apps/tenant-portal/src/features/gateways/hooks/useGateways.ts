import { useState, useCallback } from 'react';
import { DeployTargetType, type Gateway } from '@clm/shared-types';
import { toast } from '@clm/ui';
import { api } from '../../../config/api';

export function useGateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollToken, setEnrollToken] = useState<string>('');
  const [isSimulatingHandshake, setIsSimulatingHandshake] = useState(false);

  const fetchGateways = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.gateways.list();
      setGateways(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Gateways Error', err.message || 'Failed to load gateways.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenEnrollModal = async () => {
    setShowEnrollModal(true);
    try {
      const res = await api.gateways.enroll({
        name: `gateway-satellite-${Math.random().toString(16).substring(2, 6)}`,
        targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.NGINX],
      });
      setEnrollToken(res.token);
      toast.info('Gateway Token Ready', 'Generated single-use 24h enrollment token from database.');
    } catch (err: any) {
      const msg = err.message || 'Database error: Could not enroll gateway';
      setEnrollToken('');
      toast.error('Enrollment Failed', msg);
    }
  };

  const handleSimulateHandshake = async () => {
    if (!enrollToken) return;
    setIsSimulatingHandshake(true);
    try {
      const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';
      const cleanUrl = backendUrl.replace(/\/$/, '');
      const resp = await fetch(`${cleanUrl}/ingress/gateway/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: enrollToken,
          hostname: 'gw-satellite-vpc-01.internal',
          ipAddress: '10.0.1.42',
          version: '1.4.2',
          targetTypesSupported: [DeployTargetType.AWS_ACM, DeployTargetType.NGINX],
        }),
      });

      if (!resp.ok) {
        throw new Error('Handshake rejected by backend control plane');
      }

      toast.success('Gateway Enrolled & Online', 'Zero-trust satellite gateway daemon successfully handshaked.');
      setShowEnrollModal(false);
      await fetchGateways();
    } catch (err: any) {
      toast.error('Handshake Failed', err.message || 'Could not complete handshake.');
    } finally {
      setIsSimulatingHandshake(false);
    }
  };

  return {
    gateways,
    setGateways,
    isLoading,
    showEnrollModal,
    setShowEnrollModal,
    enrollToken,
    isSimulatingHandshake,
    fetchGateways,
    handleOpenEnrollModal,
    handleSimulateHandshake,
  };
}
