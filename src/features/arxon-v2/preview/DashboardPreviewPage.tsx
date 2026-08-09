import { Navigate } from 'react-router-dom';
import { APP_PREVIEW_BASE } from './AppPreviewContext';

/** Legacy alias — redirects to full app preview. */
export default function DashboardPreviewPage() {
  return <Navigate to={APP_PREVIEW_BASE} replace />;
}
