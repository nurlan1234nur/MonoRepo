import { Outlet } from 'react-router-dom';
import PhoneFrame from './PhoneFrame';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <PhoneFrame>
      <Outlet />
      <BottomNav />
    </PhoneFrame>
  );
}
