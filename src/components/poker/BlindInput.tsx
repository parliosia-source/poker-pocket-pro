import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BlindInput = () => {
  const [sb, setSb] = useState('0.5');
  const [bb, setBb] = useState('1');

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Blinds (BB)</Label>
      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">SB</Label>
          <Input
            type="number"
            value={sb}
            onChange={(e) => setSb(e.target.value)}
            className="font-mono text-center min-h-[48px]"
            step="0.5"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">BB</Label>
          <Input
            type="number"
            value={bb}
            onChange={(e) => setBb(e.target.value)}
            className="font-mono text-center min-h-[48px]"
            step="1"
          />
        </div>
      </div>
    </div>
  );
};

export default BlindInput;
