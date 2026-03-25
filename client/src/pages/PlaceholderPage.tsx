import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname
    .replace(/^\//, '')
    .replace(/[-/]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <EmptyState
        icon={Construction}
        title={pageName}
        description="This module is part of EHS·OS and is currently under development."
      />
    </div>
  );
}
