import { getCategoryColor } from '../../../config/wasteManifestConfig';

interface Props {
  category: string;
  size?: 'xs' | 'sm';
}

export default function WasteCategoryBadge({ category, size = 'sm' }: Props) {
  const { bg, text, icon } = getCategoryColor(category);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium leading-tight whitespace-nowrap ${size === 'xs' ? 'px-2 py-[2px] text-[10px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{ backgroundColor: bg, color: text }}
    >
      <span>{icon}</span>
      <span>{category}</span>
    </span>
  );
}
