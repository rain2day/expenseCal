import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function GroupBuyDetail() {
  const navigate = useNavigate();
  const { groupBuyId } = useParams();

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <div className="shrink-0 bg-sidebar px-4 pt-header pb-4 border-b border-border flex items-center gap-3 lg:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-black text-foreground">Detail</h1>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Group Buy {groupBuyId} - Detail view coming soon
      </div>
    </div>
  );
}
