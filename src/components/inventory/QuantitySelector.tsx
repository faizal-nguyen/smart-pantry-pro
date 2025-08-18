import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  unit: string;
  onChange: (value: number) => void;
  quick?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  unit,
  onChange,
  quick = false,
  min = 0,
  max = 9999,
  step = 1,
  className
}) => {
  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  if (quick) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <div className="flex items-baseline gap-1 min-w-[60px] text-center">
          <span className="font-medium text-lg">{value}</span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size="icon"
        variant="outline"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className="w-20 text-center"
        />
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      
      <Button
        size="icon"
        variant="outline"
        onClick={handleIncrement}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};