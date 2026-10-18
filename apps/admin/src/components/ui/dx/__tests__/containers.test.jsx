import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Popup from '../popup';
import Accordion from '../accordion';
import ProgressBar from '../progress-bar';
import ScrollView from '../scroll-view';

afterEach(cleanup);

describe('Popup', () => {
  it('renders nothing when hidden', () => {
    render(<Popup visible={false} title="T">body</Popup>);
    expect(screen.queryByText('body')).toBeNull();
  });

  it('renders title, children and calls onHiding on close and Escape', () => {
    const onHiding = vi.fn();
    render(<Popup visible title="Edit story" showCloseButton onHiding={onHiding}><p>body</p></Popup>);
    expect(screen.getByText('Edit story')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onHiding).toHaveBeenCalledTimes(2);
  });

  it('uses contentRender when given', () => {
    render(<Popup visible contentRender={() => <span>from render</span>} />);
    expect(screen.getByText('from render')).toBeTruthy();
  });

  it('closes on outside click only when hideOnOutsideClick', () => {
    const onHiding = vi.fn();
    const { rerender } = render(<Popup visible onHiding={onHiding}>x</Popup>);
    fireEvent.mouseDown(screen.getByTestId('dx-popup-overlay'));
    expect(onHiding).not.toHaveBeenCalled();
    rerender(<Popup visible hideOnOutsideClick onHiding={onHiding}>x</Popup>);
    fireEvent.mouseDown(screen.getByTestId('dx-popup-overlay'));
    expect(onHiding).toHaveBeenCalledTimes(1);
  });
});

describe('Accordion', () => {
  const items = [{ ID: 'a', title: 'First' }, { ID: 'b', title: 'Second' }];

  it('opens an item and reports selection through e.component.option', () => {
    const onSelectionChanged = vi.fn();
    render(
      <Accordion
        dataSource={items}
        keyExpr="ID"
        displayExpr="title"
        selectedItems={[]}
        collapsible
        onSelectionChanged={onSelectionChanged}
        itemRender={(item) => <div>body {item.ID}</div>}
      />,
    );
    fireEvent.click(screen.getByText('Second'));
    const e = onSelectionChanged.mock.calls[0][0];
    expect(e.component.option('selectedItems')).toEqual([items[1]]);
    expect(e.component.option('selectedItemKeys')).toEqual(['b']);
  });

  it('shows the body of controlled selectedItemKeys and collapses on second click', () => {
    const onSelectionChanged = vi.fn();
    render(
      <Accordion
        dataSource={items}
        keyExpr="ID"
        collapsible
        selectedItemKeys={['a']}
        itemTitleRender={(item) => <b>{item.title}!</b>}
        itemRender={(item) => <div>body {item.ID}</div>}
        onSelectionChanged={onSelectionChanged}
      />,
    );
    expect(screen.getByText('body a')).toBeTruthy();
    expect(screen.queryByText('body b')).toBeNull();
    fireEvent.click(screen.getByText('First!'));
    expect(onSelectionChanged.mock.calls[0][0].component.option('selectedItemKeys')).toEqual([]);
  });

  it('manages its own state when uncontrolled', () => {
    render(<Accordion dataSource={items} displayExpr="title" itemRender={(item) => <div>body {item.ID}</div>} />);
    fireEvent.click(screen.getByText('First'));
    expect(screen.getByText('body a')).toBeTruthy();
  });
});

describe('ProgressBar and ScrollView', () => {
  it('ProgressBar exposes percentage', () => {
    render(<ProgressBar min={0} max={200} value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByText('Progress: 25%')).toBeTruthy();
  });

  it('ScrollView renders children in a scrolling container', () => {
    render(<ScrollView direction="horizontal"><span>inside</span></ScrollView>);
    expect(screen.getByText('inside').parentElement.className).toContain('overflow-x-auto');
  });
});
