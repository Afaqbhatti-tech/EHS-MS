import { useState } from 'react';
import { MomPointRow } from './MomPointRow';
import type { MomPointItem, PointPhoto } from '../hooks/useMom';

interface Props {
  points: MomPointItem[];
  onUpdatePoint: (pointId: number, data: Record<string, unknown>) => Promise<void>;
  onEditPoint: (point: MomPointItem) => void;
  onDeletePoint: (pointId: number) => void;
  onUploadPhoto?: (momId: string, pointId: number, files: File[], caption?: string) => Promise<{ photos: PointPhoto[] }>;
  onDeletePhoto?: (momId: string, pointId: number, photoId: number) => Promise<void>;
}

const FILTER_TABS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;

export function MomPointList({ points, onUpdatePoint, onEditPoint, onDeletePoint, onUploadPhoto, onDeletePhoto }: Props) {
  const [activeTab, setActiveTab] = useState<string>('All');

  const filtered = activeTab === 'All'
    ? points
    : points.filter(p => p.status === activeTab);

  const statusCounts = {
    All: points.length,
    Open: points.filter(p => ['Open', 'Pending', 'Blocked'].includes(p.status)).length,
    'In Progress': points.filter(p => p.status === 'In Progress').length,
    Resolved: points.filter(p => p.status === 'Resolved').length,
    Closed: points.filter(p => ['Closed', 'Carried Forward'].includes(p.status)).length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="mom-tabs" style={{ marginBottom: 12 }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            className={`mom-tab ${activeTab === tab ? 'mom-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            <span className="mom-tab__count">{statusCounts[tab] || 0}</span>
          </button>
        ))}
      </div>

      {/* Points */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} points found.
        </div>
      ) : (
        filtered.map(point => (
          <MomPointRow
            key={point.id}
            point={point}
            onUpdate={onUpdatePoint}
            onEdit={() => onEditPoint(point)}
            onDelete={() => onDeletePoint(point.id)}
            onUploadPhoto={onUploadPhoto}
            onDeletePhoto={onDeletePhoto}
          />
        ))
      )}
    </div>
  );
}
