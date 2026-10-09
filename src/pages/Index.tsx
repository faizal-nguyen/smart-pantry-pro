import { Navigate, useLocation } from 'react-router-dom';
import { routineDestination } from '@/lib/routineRoutes';
export default function Index() {
  const location = useLocation();
  return <Navigate to={routineDestination(`${location.pathname}${location.search}${location.hash}`)} replace />;
}
