import React from 'react';
import { MaterialButton } from '@/components/ui/material/Button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUnitDisplay } from '@/utils/units';

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
        <MaterialButton
          variant="outlined"
          className="h-8 w-8 rounded-full p-0"
          onClick={handleDecrement}
          disabled={value <= min}
          icon={<Minus className="h-3 w-3" />}
        />
        
        <div className="flex items-baseline gap-1 min-w-[60px] text-center">
          <span className="font-medium text-lg text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground">{getUnitDisplay(unit, value)}</span>
        </div>
        
        <MaterialButton
          variant="outlined"
          className="h-8 w-8 rounded-full p-0"
          onClick={handleIncrement}
          disabled={value >= max}
          icon={<Plus className="h-3 w-3" />}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MaterialButton
        variant="outlined"
        className="h-10 w-10 p-0"
        onClick={handleDecrement}
        disabled={value <= min}
        icon={<Minus className="h-4 w-4" />}
      />
      
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
        <span className="text-sm text-muted-foreground">{getUnitDisplay(unit, value)}</span>
      </div>
      
      <MaterialButton
        variant="outlined"
        className="h-10 w-10 p-0"
        onClick={handleIncrement}
        disabled={value >= max}
        icon={<Plus className="h-4 w-4" />}
      />
    </div>
  );
};