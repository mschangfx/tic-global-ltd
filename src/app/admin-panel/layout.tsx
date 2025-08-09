import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TIC Global Admin Panel',
  description: 'Administrative control panel for TIC Global transactions',
  robots: 'noindex, nofollow', // Prevent search engine indexing
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          
          .admin-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .admin-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            width: 100%;
            max-width: 1200px;
          }
          
          .admin-header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          
          .admin-content {
            padding: 30px;
          }
          
          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
          }
          
          .btn-primary {
            background: #3498db;
            color: white;
          }
          
          .btn-primary:hover {
            background: #2980b9;
            transform: translateY(-2px);
          }
          
          .btn-success {
            background: #27ae60;
            color: white;
          }
          
          .btn-success:hover {
            background: #229954;
          }
          
          .btn-danger {
            background: #e74c3c;
            color: white;
          }
          
          .btn-danger:hover {
            background: #c0392b;
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
          }
          
          .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ecf0f1;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #3498db;
          }
          
          .transaction-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            transition: transform 0.2s ease;
          }
          
          .transaction-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .status-pending {
            background: #fff3cd;
            color: #856404;
          }
          
          .status-approved {
            background: #d4edda;
            color: #155724;
          }
          
          .status-rejected {
            background: #f8d7da;
            color: #721c24;
          }
          
          .grid {
            display: grid;
            gap: 20px;
          }
          
          .grid-2 {
            grid-template-columns: 1fr 1fr;
          }
          
          @media (max-width: 768px) {
            .grid-2 {
              grid-template-columns: 1fr;
            }
            
            .admin-content {
              padding: 20px;
            }
          }
          
          .loading {
            text-align: center;
            padding: 40px;
            color: #6c757d;
          }
          
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
          }
          
          .stat-label {
            color: #7f8c8d;
            font-size: 0.9rem;
            margin-top: 5px;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
