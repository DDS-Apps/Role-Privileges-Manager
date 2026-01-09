import { Building2, User, Briefcase } from "lucide-react";

interface ContextCardProps {
  type: 'manager' | 'employee';
  name?: string;
  title?: string;
  company?: string;
  placeholder?: string;
  isHighlighted?: boolean;
}

export function ContextCard({ 
  type, 
  name, 
  title, 
  company, 
  placeholder,
  isHighlighted = false 
}: ContextCardProps) {
  const isEmpty = !name;
  const initial = name?.charAt(0).toUpperCase() || (type === 'manager' ? 'M' : 'E');
  
  const bgGradient = type === 'manager' 
    ? 'from-indigo-500 to-violet-600' 
    : 'from-slate-500 to-slate-600';

  return (
    <div 
      className={`relative rounded-xl bg-white dark:bg-slate-800 p-4 shadow-md border transition-all ${
        isHighlighted 
          ? 'border-l-4 border-l-indigo-500 border-t border-r border-b border-slate-200 dark:border-slate-700' 
          : 'border-slate-200 dark:border-slate-700'
      }`}
      data-testid={`context-card-${type}`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} text-white text-lg font-bold shadow-md`}>
          {initial}
        </div>
        
        <div className="flex-1 min-w-0">
          {isEmpty ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm italic">
              {placeholder || `Select ${type}`}
            </p>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate" data-testid={`${type}-name`}>
                {name}
              </h3>
              {title && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="truncate">{title}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {company && (
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <Building2 className="h-3 w-3" />
            {company}
          </span>
        </div>
      )}
    </div>
  );
}
