import dynamicImport from 'next/dynamic';

const HomeMenu = dynamicImport(() => import('@/components/landing/HomeMenu'));

export default function Home() {
  return <HomeMenu />;
}
