import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PRESETS = [50, 100, 150, 200];

interface StackInputProps {
  label: string;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

const StackInput = ({ label, defaultValue = 100, onValueChange }: StackInputProps) => {
  const [value, setValue] = useState(String(defaultValue));

  const handleChange = (newVal: string) => {
    setValue(newVal);
    const num = Number(newVal);
    if (!isNaN(num) && num > 0 && onValueChange) {
      onValueChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label} (BB)</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="font-mono text-center min-h-[48px]"
      />
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handleChange(String(p))}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-colors min-h-[36px]',
              Number(value) === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StackInput;
