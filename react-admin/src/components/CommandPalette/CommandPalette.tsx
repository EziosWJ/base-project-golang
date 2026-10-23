import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Input, Modal, Typography, type InputRef } from 'antd';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { copy } from '../../config/copy';
import styles from './CommandPalette.module.css';

export interface CommandItem {
  key: string;
  label: string;
  title?: string;
  group: string;
  path: string;
  icon?: LucideIcon;
  keywords?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
  onSelect: (item: CommandItem) => void;
}

export function CommandPalette({ open, items, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<InputRef>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return items
      .filter((item) => {
        if (!keyword) return true;
        return [item.label, item.title, item.group, item.keywords]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(keyword);
      })
      .slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const active = document.getElementById(`command-option-${activeIndex}`);
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of results) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    // Assign indexes in rendered (grouped) order so arrow keys move through
    // exactly what the user sees, not the pre-grouping flat order.
    let visualIndex = 0;
    return [...map.entries()].map(([group, items]) => ({
      group,
      entries: items.map((item) => ({ item, index: visualIndex++ })),
    }));
  }, [results]);

  const orderedResults = useMemo(
    () => groups.flatMap((group) => group.entries.map((entry) => entry.item)),
    [groups],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, Math.max(orderedResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(orderedResults.length - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = orderedResults[activeIndex];
      if (item) onSelect(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={copy.command.title}
      width={580}
      centered
      destroyOnHidden
      className={styles.modal}
      styles={{ body: { paddingTop: 8 } }}
    >
      <Input
        ref={inputRef}
        size="large"
        allowClear
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        prefix={<Search size={17} aria-hidden="true" />}
        placeholder={copy.command.placeholder}
        role="combobox"
        aria-label={copy.command.inputLabel}
        aria-expanded
        aria-controls="command-results"
        aria-autocomplete="list"
        aria-activedescendant={orderedResults[activeIndex] ? `command-option-${activeIndex}` : undefined}
      />
      <div
        id="command-results"
        role="listbox"
        aria-label={copy.command.resultsLabel}
        className={styles.results}
        ref={listRef}
      >
        {results.length === 0 && (
          <Typography.Text type="secondary" className={styles.empty}>
            {copy.command.empty}
          </Typography.Text>
        )}
        {groups.map(({ group, entries }) => (
          <div key={group} className={styles.group} role="group" aria-label={group}>
            <div className={styles.groupTitle}>{group}</div>
            {entries.map(({ item, index }) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  id={`command-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? styles.optionActive : styles.option}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(item)}
                >
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  <span className={styles.optionLabel}>{item.label}</span>
                  {item.title && <span className={styles.optionHint}>{item.title}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <span>{copy.command.arrowHint}</span>
        <span>{copy.command.enterHint}</span>
        <span>{copy.command.escapeHint}</span>
        <span>{copy.command.shortcutHint}</span>
      </div>
      <span aria-live="polite" className={styles.visuallyHidden}>
        {copy.command.resultCount(results.length)}
      </span>
    </Modal>
  );
}
