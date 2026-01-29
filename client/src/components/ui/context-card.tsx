import { Building2, Briefcase, User, Mail, Phone } from "lucide-react";

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
  const cardTitle = type === 'manager' ? 'Manager Details' : 'Employee Details';

  return (
    <div 
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
      data-testid={`context-card-${type}`}
    >
      {/* Card Header */}
      <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${
        isHighlighted ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900'
      }`}>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          {cardTitle}
        </h3>
      </div>

      {/* Card Body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {isEmpty ? (
          <div className="px-4 py-8 text-center">
            <User className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {placeholder || `Select ${type}`}
            </p>
          </div>
        ) : (
          <>
            {/* Name Row */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">Name</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid={`${type}-name`}>
                {name}
              </span>
            </div>

            {/* Title Row */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Position</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {title}
                </span>
              </div>
            )}

            {/* Company Row */}
            {company && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Legal Company</span>
                <span className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                  {company}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
