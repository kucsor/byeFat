import type { FoodItem } from '@/lib/types';

type MacrosDisplayProps = {
  fat: number;
  protein: number;
  carbohydrates: number;
  goalFat?: number;
  goalProtein?: number;
  goalCarbs?: number;
};

export function MacrosDisplay({ fat, protein, carbohydrates, goalFat, goalProtein, goalCarbs }: MacrosDisplayProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: 'hsl(var(--chart-1))' }}
        />
        <span>{fat}g Fat</span>
        {goalFat && <span className='text-xs'>/ {goalFat}g</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: 'hsl(var(--chart-2))' }}
        />
        <span>{protein}g Protein</span>
        {goalProtein && <span className='text-xs'>/ {goalProtein}g</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: 'hsl(var(--chart-3))' }}
        />
        <span>{carbohydrates}g Carbs</span>
        {goalCarbs && <span className='text-xs'>/ {goalCarbs}g</span>}
      </div>
    </div>
  );
}
