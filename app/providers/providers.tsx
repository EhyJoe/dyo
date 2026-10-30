'use client';
import { AuthProvider } from '../../src/components/Authcontext';
import { CartProvider } from '../../src/components/Cartcontext';
import Luckydrawwidget from '../../src/components/Luckydrawwidget';
import PageTracker from '../../src/components/PageTracker';
import NavigationLoader from '../../src/components/NavigationLoader';
export default function Providers({children}:{children:React.ReactNode}){return <AuthProvider><CartProvider><NavigationLoader/><Luckydrawwidget/><PageTracker/>{children}</CartProvider></AuthProvider>}
