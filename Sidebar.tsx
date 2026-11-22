import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { ClassRoom, SchoolProfile } from '../types/attendance';

export type AppSection = 'daily' | 'monthly' | 'classes' | 'settings';

interface SidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  school: SchoolProfile;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  icon: typeof CalendarCheck2;
}> = [
  { id: 'daily', label: 'दैनिक हजेरी', icon: CalendarCheck2 },
  { id: 'monthly', label: 'मासिक अहवाल', icon: BarChart3 },
  { id: 'classes', label: 'वर्ग व विद्यार्थी', icon: Users },
  { id: 'settings', label: 'शाळा माहिती व बॅकअप', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  classes,
  activeClassId,
  onSelectClass,
  school,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-slate-900 truncate">
              शाळा हजेरी
            </div>
            <div className="text-xs text-slate-500 truncate">
              उपस्थिती नोंदवही
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="मेनू बंद करा"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="px-3 py-4 space-y-1 border-b border-slate-200" aria-label="मुख्य विभाग">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Class Selector List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500">
          नोंदणीकृत वर्ग ({classes.length})
        </div>
        {classes.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-500">
            कोणताही वर्ग उपलब्ध नाही. वर्ग विभागात जाऊन वर्ग जोडा.
          </div>
        ) : (
          <div className="space-y-1">
            {classes.map((cls) => {
              const selected = cls.id === activeClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    onSelectClass(cls.id);
                    onCloseMobile();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                    selected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">
                      {cls.standard} - {cls.division}
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums shrink-0 ${
                        selected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {cls.students.length} विद्यार्थी
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 text-xs truncate ${
                      selected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {cls.teacherName}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* School Footer Info */}
      <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70">
        <div className="text-xs font-semibold text-slate-800 truncate">
          {school.schoolName}
        </div>
        <div className="mt-0.5 text-xs text-slate-500 truncate">
          {school.address}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 no-print">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
