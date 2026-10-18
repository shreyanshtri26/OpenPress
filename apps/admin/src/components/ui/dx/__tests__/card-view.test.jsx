import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import CardView, { Paging, Pager, Column } from '../card-view';

afterEach(cleanup);
const assets = Array.from({ length: 10 }, (_, i) => ({ assetId: `a${i}`, name: `Asset ${i}` }));

describe('CardView', () => {
  it('renders a page of cards through cardRender and pages on', () => {
    render(
      <CardView dataSource={assets} keyExpr="assetId" cardMinWidth={200} cardRender={(c) => <span>{c.data.name}</span>}>
        <Paging pageSize={4} />
        <Pager showInfo showNavigationButtons />
        <Column dataField="name" />
      </CardView>,
    );
    expect(screen.getByText('Asset 0')).toBeTruthy();
    expect(screen.queryByText('Asset 4')).toBeNull();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('Asset 4')).toBeTruthy();
  });

  it('calls onItemClick with itemData and shows noDataRender when empty', () => {
    const onItemClick = vi.fn();
    const { rerender } = render(<CardView dataSource={assets.slice(0, 1)} cardRender={(c) => <span>{c.data.name}</span>} onItemClick={onItemClick} />);
    fireEvent.click(screen.getByText('Asset 0'));
    expect(onItemClick.mock.calls[0][0].itemData).toEqual(assets[0]);
    rerender(<CardView dataSource={[]} cardRender={() => null} noDataRender={() => <p>Empty</p>} />);
    expect(screen.getByText('Empty')).toBeTruthy();
  });

  it('exposes an instance with updateDimensions', () => {
    const ref = createRef();
    render(<CardView ref={ref} dataSource={[]} cardRender={() => null} />);
    expect(typeof ref.current.instance().updateDimensions).toBe('function');
  });
});
