'use client';
import { usePathname, useRouter, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

function announceNavigation(to: string) {
  if (typeof window === 'undefined') return;
  const destination = new URL(to, window.location.href);
  if (destination.origin !== window.location.origin) return;
  if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash === window.location.hash) return;
  window.dispatchEvent(new Event('dyo:navigation-start'));
}
export function NavLink({to,children,replace:_replace,end,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{to:string;children?:ReactNode;replace?:boolean;end?:boolean}){const path=usePathname();const active=end?path===to:path===to||(to!=='/'&&path.startsWith(`${to}/`));return <Link href={to} aria-current={active?'page':undefined} {...props}>{children}</Link>}
export {NavLink as Link};
export function Navigate({to,replace=false,state:_state}:{to:string;replace?:boolean;state?:unknown}){const router=useRouter();useEffect(()=>{announceNavigation(to);replace?router.replace(to):router.push(to)},[router,to,replace]);return null}
export function useNavigate(){const router=useRouter();return(to:string|number,options?:{replace?:boolean;state?:unknown})=>{if(typeof to==='number')router.back();else{announceNavigation(to);options?.replace?router.replace(to):router.push(to)}}}
export function useLocation(){const pathname=usePathname();const query=useNextSearchParams().toString();return{pathname,search:query?`?${query}`:'',hash:'',state:null,key:pathname}}
export function useParams<T extends Record<string,string|string[]|undefined>=Record<string,string>>(){return useNextParams() as T}
export function useSearchParams(){return [useNextSearchParams()] as const}
