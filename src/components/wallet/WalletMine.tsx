import { useAuth } from '@/contexts/AuthContext';
import AuthLandingV2 from '@/features/arxon-v2/pages/AuthLandingV2';
import DashboardNeon from '@/features/arxon-v2/pages/DashboardNeon';
import PageSkeleton from '@/features/arxon-v2/components/PageSkeleton';

/** Full mining hub (same screens as arxonchain.xyz / miner-hub), not a one-button ring. */
export default function WalletMine() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton delayMs={800} />;
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100%',
          height: '100%',
          background: '#0a0c10',
          paddingTop: 'max(56px, calc(env(safe-area-inset-top, 0px) + 44px))',
          paddingBottom: 24,
        }}
      >
        <AuthLandingV2 />
      </div>
    );
  }

  return <DashboardNeon />;
}
