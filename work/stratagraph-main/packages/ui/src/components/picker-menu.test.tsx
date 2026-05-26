/**
 * PickerMenu composition tests.
 *
 * @see Linear MEE-1765
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PickerMenu, PickerSubMenu } from './picker-menu';

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie' },
];

function renderItem(item: Item) {
  return <span>{item.name}</span>;
}

describe('PickerMenu — search input + typeahead-conflict workaround', () => {
  it('AC: typing a letter into search input does not move menu focus', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        searchPlaceholder="Search…"
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    const input = await screen.findByPlaceholderText('Search…');
    await user.type(input, 'a');
    expect((input as HTMLInputElement).value).toBe('a');
    const menuitems = screen.getAllByRole('menuitem');
    menuitems.forEach((mi) => expect(mi).not.toHaveFocus());
    expect(input).toHaveFocus();
  });

  it('filters items client-side as the user types', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        getItemLabel={(it) => it.name}
        renderItem={renderItem}
        searchPlaceholder="Search…"
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    const input = await screen.findByPlaceholderText('Search…');
    await user.type(input, 'br');
    expect(screen.getByRole('menuitem', { name: 'Bravo' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Alpha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Charlie' })).not.toBeInTheDocument();
  });

  it('ArrowDown from search input moves focus into the list', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        getItemLabel={(it) => it.name}
        renderItem={renderItem}
        searchPlaceholder="Search…"
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    const input = await screen.findByPlaceholderText('Search…');
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });
});

describe('PickerMenu — skeleton', () => {
  it('renders the trigger and opens on click, listing all items', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="single"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Pick one</button>}
      />
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByText('Pick one'));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bravo' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Charlie' })).toBeInTheDocument();
  });

  it('single-select: clicking an item invokes onChange with that item and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PickerMenu<Item>
        mode="single"
        items={items}
        value={[]}
        onChange={onChange}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Pick</button>}
      />
    );
    await user.click(screen.getByText('Pick'));
    await user.click(await screen.findByRole('menuitem', { name: 'Bravo' }));
    expect(onChange).toHaveBeenCalledWith([items[1]]);
  });

  it('multi-select: clicks accumulate without closing, second click on same item deselects', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = React.useState<Item[]>([]);
      return (
        <PickerMenu<Item>
          mode="multi"
          items={items}
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          getItemId={(it) => it.id}
          renderItem={renderItem}
          trigger={<button type="button">Pick many</button>}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByText('Pick many'));
    await user.click(await screen.findByRole('menuitem', { name: 'Bravo' }));
    expect(onChange).toHaveBeenLastCalledWith([items[1]]);
    // Menu must still be open — query Charlie inside the same menu instance
    await user.click(screen.getByRole('menuitem', { name: 'Charlie' }));
    expect(onChange).toHaveBeenLastCalledWith([items[1], items[2]]);
    // Click Bravo again — deselect
    await user.click(screen.getByRole('menuitem', { name: 'Bravo' }));
    expect(onChange).toHaveBeenLastCalledWith([items[2]]);
  });
});

describe('PickerMenu — selected-at-top stability', () => {
  it('AC: pins selected items at top on open and preserves order across items prop changes', async () => {
    const user = userEvent.setup();
    const initial: Item[] = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Bravo' },
      { id: 'c', name: 'Charlie' },
    ];
    function Harness({ list, value }: { list: Item[]; value: Item[] }) {
      return (
        <PickerMenu<Item>
          mode="multi"
          items={list}
          value={value}
          onChange={() => {}}
          getItemId={(it) => it.id}
          getItemLabel={(it) => it.name}
          renderItem={renderItem}
          trigger={<button type="button">Open</button>}
        />
      );
    }
    const { rerender } = render(<Harness list={initial} value={[initial[2]!]} />);
    await user.click(screen.getByText('Open'));
    let menuitems = await screen.findAllByRole('menuitem');
    expect(menuitems[0]).toHaveTextContent('Charlie');

    // Background refetch: items prop changes without any outside click.
    rerender(<Harness list={[...initial].reverse()} value={[initial[2]!]} />);
    menuitems = await screen.findAllByRole('menuitem');
    expect(menuitems[0]).toHaveTextContent('Charlie');
  });

  it('snapshot resets on close+reopen and reflects new selection state', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = React.useState<Item[]>([]);
      return (
        <>
          <button type="button" onClick={() => setValue([items[1]!])}>
            SelectBravo
          </button>
          <PickerMenu<Item>
            mode="multi"
            items={items}
            value={value}
            onChange={setValue}
            getItemId={(it) => it.id}
            getItemLabel={(it) => it.name}
            renderItem={renderItem}
            trigger={<button type="button">Open</button>}
          />
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    let first = (await screen.findAllByRole('menuitem'))[0]!;
    expect(first).toHaveTextContent('Alpha');
    await user.keyboard('{Escape}');
    await user.click(screen.getByText('SelectBravo'));
    await user.click(screen.getByText('Open'));
    first = (await screen.findAllByRole('menuitem'))[0]!;
    expect(first).toHaveTextContent('Bravo');
  });
});

describe('PickerMenu — nested via PickerSubMenu', () => {
  it('opens a nested PickerMenu via PickerSubMenu submenu trigger', async () => {
    const user = userEvent.setup();
    const childItems: Item[] = [{ id: 'x', name: 'Xray' }];
    render(
      <PickerMenu<Item>
        mode="multi"
        items={[]}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Root</button>}
      >
        <PickerSubMenu<Item>
          mode="multi"
          items={childItems}
          value={[]}
          onChange={() => {}}
          getItemId={(it) => it.id}
          renderItem={renderItem}
          subTrigger="Nested"
        />
      </PickerMenu>
    );
    await user.click(screen.getByText('Root'));
    // Find the submenu trigger row and click it to open the nested menu
    const subTrigger = await screen.findByText('Nested');
    await user.click(subTrigger);
    expect(await screen.findByRole('menuitem', { name: 'Xray' })).toBeInTheDocument();
  });
});

describe('PickerMenu — virtualization + truncation', () => {
  beforeEach(() => {
    // JSDOM has no layout engine — offsetHeight is always 0, so @tanstack/react-virtual
    // computes zero visible items. Stub it globally to simulate a 300px scroll container.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders truncation banner with custom message when truncated=true', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        truncated
        truncatedMessage="Showing first 50 — narrow with search"
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    expect(await screen.findByText('Showing first 50 — narrow with search')).toBeInTheDocument();
  });

  it('virtualizes the list when items.length >= 20', async () => {
    const user = userEvent.setup();
    const many: Item[] = Array.from({ length: 25 }, (_, i) => ({
      id: `i${i}`,
      name: `Item ${i}`,
    }));
    render(
      <PickerMenu<Item>
        mode="multi"
        items={many}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    expect(await screen.findByText('Item 0')).toBeInTheDocument();
    const list = document.querySelector('[data-slot="picker-menu-list"]');
    expect(list).toHaveAttribute('data-virtualized', 'true');
    // Item 24 is the tail of the 25-item fixture. With a ~300px scroll
    // container and 32px items + 5 overscan, the virtualizer renders only
    // the top ~15 items — Item 24 should be windowed out.
    expect(screen.queryByText('Item 24')).not.toBeInTheDocument();
  });
});

describe('PickerMenu — sections + per-section mode', () => {
  it('renders section labels and items grouped by section', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        sections={[
          { id: 's1', label: 'Group A', items: [items[0]!, items[1]!] },
          { id: 's2', label: 'Group B', items: [items[2]!] },
        ]}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    expect(await screen.findByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('Group B')).toBeInTheDocument();
  });

  it('AC: exclusive section (mode=single) allows only one selection within that section', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PickerMenu<Item>
        mode="multi"
        sections={[
          { id: 'exclusive', label: 'Exclusive', items: [items[0]!, items[1]!], mode: 'single' },
          { id: 'free', label: 'Free', items: [items[2]!] },
        ]}
        value={[items[0]!]}
        onChange={onChange}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    await user.click(await screen.findByRole('menuitem', { name: 'Bravo' }));
    expect(onChange).toHaveBeenLastCalledWith([items[1]]);
  });

  it('per-section single mode replaces only that section, preserving other sections', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const sectionA: Item[] = [items[0]!, items[1]!]; // Alpha, Bravo (multi)
    // Pre-state: Alpha selected (in multi-section A), Charlie selected (in single-section B).
    // Now there's a fourth item we'll add to section B to make the swap interesting:
    const charlie2: Item = { id: 'c2', name: 'Charlie Prime' };
    render(
      <PickerMenu<Item>
        mode="multi"
        sections={[
          { id: 'multi', label: 'Multi', items: sectionA, mode: 'multi' },
          { id: 'single', label: 'Single', items: [items[2]!, charlie2], mode: 'single' },
        ]}
        value={[items[0]!, items[2]!]}
        onChange={onChange}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    // Click 'Charlie Prime' in the single-mode section. The expected outcome:
    // - Alpha (from multi section) is preserved.
    // - Charlie (the previously selected single-section item) is removed.
    // - Charlie Prime is added.
    await user.click(await screen.findByRole('menuitem', { name: 'Charlie Prime' }));
    expect(onChange).toHaveBeenLastCalledWith([items[0], charlie2]);
  });
});

describe('PickerMenu — selection indicators', () => {
  it('multi-select item renders a Checkbox indicator', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[items[0]!]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    await screen.findByRole('menuitem', { name: 'Alpha' });
    // Each item row should contain a checkbox indicator
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    // The checkbox for the selected item (Alpha) should be checked
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('single-select item renders a Check icon when selected', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="single"
        items={items}
        value={[items[1]!]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    await screen.findByRole('menuitem', { name: 'Bravo' });
    // The selected Bravo item should contain an svg check icon (lucide Check)
    const bravoItem = screen.getByRole('menuitem', { name: 'Bravo' });
    expect(bravoItem.querySelector('svg')).toBeInTheDocument();
    // Non-selected items should have no check icon
    const alphaItem = screen.getByRole('menuitem', { name: 'Alpha' });
    expect(alphaItem.querySelector('svg')).not.toBeInTheDocument();
  });

  it('PickerSubMenu trigger renders a Checkbox reflecting non-empty selection', async () => {
    const user = userEvent.setup();
    const childItems: Item[] = [{ id: 'x', name: 'Xray' }];
    render(
      <PickerMenu<Item>
        mode="multi"
        items={[]}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Root</button>}
      >
        <PickerSubMenu<Item>
          mode="multi"
          items={childItems}
          value={[childItems[0]!]}
          onChange={() => {}}
          getItemId={(it) => it.id}
          renderItem={renderItem}
          subTrigger="Nested"
        />
      </PickerMenu>
    );
    await user.click(screen.getByText('Root'));
    await screen.findByText('Nested');
    // The sub-trigger row should have a checkbox that reflects the non-empty value
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('itemPreview renders a hover-card wrapper around each item when provided', async () => {
    const user = userEvent.setup();
    render(
      <PickerMenu<Item>
        mode="multi"
        items={items}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        itemPreview={(it) => <div data-testid={`preview-${it.id}`}>Preview: {it.name}</div>}
        trigger={<button type="button">Open</button>}
      />
    );
    await user.click(screen.getByText('Open'));
    // Items should still render with their names
    expect(await screen.findByRole('menuitem', { name: 'Alpha' })).toBeInTheDocument();
    // Hover-card wrapper should be present — check via data-slot
    const hoverCardItems = document.querySelectorAll('[data-slot="context-menu-item-hover-card"]');
    expect(hoverCardItems.length).toBe(items.length);
  });

  it('PickerSubMenu checkbox is unchecked when parent value has items NOT in this submenu', async () => {
    // Bug fix (MEE-1765 item 1): the checkbox should only reflect selections
    // belonging to THIS submenu's own items — not the entire parent value array.
    const user = userEvent.setup();
    const adminItem: Item = { id: 'admin1', name: 'Eve' };
    const operatorItem: Item = { id: 'op1', name: 'Alice' };
    render(
      <PickerMenu<Item>
        mode="multi"
        items={[]}
        value={[adminItem]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        renderItem={renderItem}
        trigger={<button type="button">Root</button>}
      >
        {/* Operators submenu — adminItem is in parent value but NOT in this submenu's items */}
        <PickerSubMenu<Item>
          mode="multi"
          items={[operatorItem]}
          value={[adminItem]}
          onChange={() => {}}
          getItemId={(it) => it.id}
          renderItem={renderItem}
          subTrigger="Operators"
        />
      </PickerMenu>
    );
    await user.click(screen.getByText('Root'));
    // The Operators sub-trigger row should be present
    const subTriggerEl = await screen.findByText('Operators');
    // The checkbox INSIDE the sub-trigger row should be UNCHECKED — adminItem is
    // not in the Operators submenu's items list.
    const subTriggerRow = subTriggerEl.closest('[data-slot="context-menu-sub-trigger"]');
    const checkbox = subTriggerRow?.querySelector('[role="checkbox"]');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });
});

describe('PickerMenu — onSearchChange prop (MEE-1773)', () => {
  it('invokes onSearchChange when the user types in the search input', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <PickerMenu<Item>
        mode="single"
        items={[{ id: '1', name: 'Alice' }]}
        value={[]}
        onChange={() => {}}
        getItemId={(x) => x.id}
        getItemLabel={(x) => x.name}
        renderItem={renderItem}
        searchPlaceholder="Search..."
        onSearchChange={onSearchChange}
        trigger={<button type="button">Open</button>}
        open
      />
    );
    const input = await screen.findByPlaceholderText('Search...');
    await user.type(input, 'Al');
    expect(onSearchChange).toHaveBeenCalledWith('Al');
  });
});

describe('PickerMenu — fallbackSearchState banner (MEE-1773)', () => {
  const baseProps = {
    mode: 'single' as const,
    items: [{ id: '1', name: 'Alice' }],
    value: [] as Item[],
    onChange: () => {},
    getItemId: (x: Item) => x.id,
    getItemLabel: (x: Item) => x.name,
    renderItem,
    searchPlaceholder: 'Search...',
    trigger: <button>Open</button>,
    open: true as const,
    truncated: true,
  };

  it('renders "Type to find more" when fallbackSearchState is "idle" and truncated', async () => {
    render(<PickerMenu<Item> {...baseProps} fallbackSearchState="idle" />);
    expect(await screen.findByText(/type to find more/i)).toBeInTheDocument();
  });

  it('renders "Searching" when fallbackSearchState is "pending"', async () => {
    render(<PickerMenu<Item> {...baseProps} fallbackSearchState="pending" />);
    expect(await screen.findByText(/searching/i)).toBeInTheDocument();
  });

  it('renders "Showing matches across all entries" when fallbackSearchState is "active"', async () => {
    render(<PickerMenu<Item> {...baseProps} fallbackSearchState="active" />);
    expect(await screen.findByText(/across all entries/i)).toBeInTheDocument();
  });

  it('renders "No matches across all entries" when fallbackSearchState is "empty"', async () => {
    render(<PickerMenu<Item> {...baseProps} fallbackSearchState="empty" />);
    expect(await screen.findByText(/no matches across all entries/i)).toBeInTheDocument();
  });

  it('falls back to truncatedMessage when fallbackSearchState is undefined (back-compat)', async () => {
    render(<PickerMenu<Item> {...baseProps} truncatedMessage="custom message" />);
    expect(await screen.findByText('custom message')).toBeInTheDocument();
  });

  it('does NOT render the banner when truncated is false (regardless of fallbackSearchState)', async () => {
    render(<PickerMenu<Item> {...baseProps} truncated={false} fallbackSearchState="idle" />);
    // Banner content should not appear when not truncated
    expect(screen.queryByText(/type to find more/i)).not.toBeInTheDocument();
  });
});

describe('PickerMenu — cross-submenu search', () => {
  it('submenu trigger is hidden when the root search is non-empty', async () => {
    const user = userEvent.setup();
    const adminItem: Item = { id: 'admin1', name: 'Eve' };
    const operatorItem: Item = { id: 'op1', name: 'Alice' };
    render(
      <PickerMenu<Item>
        mode="multi"
        items={[adminItem]}
        value={[]}
        onChange={() => {}}
        getItemId={(it) => it.id}
        getItemLabel={(it) => it.name}
        renderItem={renderItem}
        searchPlaceholder="Search…"
        trigger={<button type="button">Root</button>}
      >
        <PickerSubMenu<Item>
          mode="multi"
          items={[operatorItem]}
          value={[]}
          onChange={() => {}}
          getItemId={(it) => it.id}
          getItemLabel={(it) => it.name}
          renderItem={renderItem}
          subTrigger="Operators"
          searchLabel="Operators"
        />
      </PickerMenu>
    );
    await user.click(screen.getByText('Root'));
    // Before searching, the submenu trigger should be visible
    expect(await screen.findByText('Operators')).toBeInTheDocument();
    // Type in the search input — submenu trigger should disappear
    const input = screen.getByPlaceholderText('Search…');
    await user.type(input, 'op');
    expect(screen.queryByText('Operators')).not.toBeInTheDocument();
  });

  it('cross-submenu items appear in root results when search matches submenu items', async () => {
    const user = userEvent.setup();
    const adminItem: Item = { id: 'admin1', name: 'Eve' };
    const operator1: Item = { id: 'op1', name: 'Operator1' };
    const operator2: Item = { id: 'op2', name: 'Operator2' };
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = React.useState<Item[]>([]);
      return (
        <PickerMenu<Item>
          mode="multi"
          items={[adminItem]}
          value={value}
          onChange={setValue}
          getItemId={(it) => it.id}
          getItemLabel={(it) => it.name}
          renderItem={renderItem}
          searchPlaceholder="Search…"
          trigger={<button type="button">Root</button>}
        >
          <PickerSubMenu<Item>
            mode="multi"
            items={[operator1, operator2]}
            value={value}
            onChange={(next) => {
              setValue(next);
              onChange(next);
            }}
            getItemId={(it) => it.id}
            getItemLabel={(it) => it.name}
            renderItem={renderItem}
            subTrigger="Operators"
            searchLabel="Operators"
          />
        </PickerMenu>
      );
    }
    render(<Harness />);
    await user.click(screen.getByText('Root'));
    const input = await screen.findByPlaceholderText('Search…');
    await user.type(input, 'op');
    // Both operator items should appear with the submenu label prefix
    // (use findAllByText because each cross-submenu result contains the prefix).
    const prefixes = await screen.findAllByText(/Operators.*→/);
    expect(prefixes.length).toBeGreaterThanOrEqual(2);
    const allMenuItems = screen.getAllByRole('menuitem');
    const operatorResults = allMenuItems.filter((mi) => mi.textContent?.includes('Operator'));
    expect(operatorResults.length).toBeGreaterThanOrEqual(2);
    // Click one — onChange should fire
    await user.click(operatorResults[0]!);
    expect(onChange).toHaveBeenCalled();
  });
});
