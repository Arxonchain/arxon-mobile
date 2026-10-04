import { useAuth } from '@/contexts/AuthContext';
import AuthLandingV2 from '@/features/arxon-v2/pages/AuthLandingV2';
import DashboardNeon from '@/features/arxon-v2/pages/DashboardNeon';
import BrandedSpinner from '@/components/system/BrandedSpinner';
import { errorUi } from '@/components/system/errorUiTokens';

/** Full mining hub (same screens as arxonchain.xyz / miner-hub), not a one-button ring. */
export default function WalletMine() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: errorUi.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BrandedSpinner label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <AuthLandingV2 />
      </div>
    );
  }

  return <DashboardNeon />;
}
