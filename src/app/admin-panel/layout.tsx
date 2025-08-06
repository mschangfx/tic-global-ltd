import { Inter } from 'next/font/google';
import Providers from '@/app/providers';
import AdminHeader from '@/components/admin/AdminHeader';

const inter = Inter({ subsets: ['latin'] });

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AdminHeader />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
