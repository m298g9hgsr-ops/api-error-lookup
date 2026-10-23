'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search, Command as CommandIcon, Keyboard, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent } from './card';
import { ScrollArea } from './scroll-area';

interface CommandItem {
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

interface CommandProps {
  groups: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  className?: string;
}

const MAX_ITEMS = 20;

export function Command({ groups, open, onOpenChange, placeholder = '輸入指令或搜尋...', className }: CommandProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [filteredItems, setFilteredItems] = React.useState<{ groupIndex: number; itemIndex: number; item: CommandItem }[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemsRef = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Filter items based on query
  React.useEffect(() => {
    const results: { groupIndex: number; itemIndex: number; item: CommandItem }[] = [];
    const lowerQuery = query.toLowerCase();

    groups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        if (
          item.label.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery) ||
          item.shortcut?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({ groupIndex, itemIndex, item });
        }
      });
    });

    setFilteredItems(results.slice(0, MAX_ITEMS));
    setSelectedIndex(0);
  }, [query, groups]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        setQuery('');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].item.action();
        onOpenChange(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, onOpenChange]);

  // Focus input on open
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleItemClick = (item: CommandItem) => {
    item.action();
    onOpenChange(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="指令選單">
      <div
        className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2 animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
        <Card className={cn('shadow-lg border-border', className)}>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pl-10 h-10 text-sm"
                  autoComplete="off"
                />
              </div>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded text-muted-foreground">
                <Keyboard className="h-3 w-3 mr-1" /> ⌘K
              </kbd>
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="py-2">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    {query ? '找不到符合的指令' : '輸入關鍵字搜尋指令'}
                  </div>
                ) : (
                  filteredItems.map((filtered, index) => {
                    const item = filtered.item;
                    const isSelected = index === selectedIndex;

                    return (
                      <Button
                        key={`${filtered.groupIndex}-${filtered.itemIndex}`}
                        variant={isSelected ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3 px-4 py-3 text-left hover:bg-accent data-[selected=true]:bg-accent"
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        ref={(el) => { itemsRef.current[index] = el; }}
                      >
                        {item.icon && <span className="h-5 w-5 text-muted-foreground">{item.icon}</span>}
                        <div className="flex-1 text-left">
                          <p className="font-medium">{item.label}</p>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                        </div>
                        {item.shortcut && (
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded text-muted-foreground">
                            {item.shortcut}
                          </kbd>
                        )}
                      </Button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface CommandTriggerProps {
  children: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
}

export function CommandTrigger({ children }: CommandTriggerProps) {
  return (
    <Button variant="ghost" size="icon" className="relative" {...children.props}>
      {children.props.children}
      <CommandIcon className="h-4 w-4" />
    </Button>
  );
}

// Hook to use command palette
export function useCommand() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}