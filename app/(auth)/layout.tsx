import SiteHeader from '@/app/components/SiteHeader';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-6">{children}</main>
    </>
  );
}
