import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Sortable from '../sortable';

afterEach(cleanup);

describe('Sortable (native drag and drop)', () => {
  it('reorders within one list', () => {
    const onReorder = vi.fn();
    render(
      <Sortable group="g" data={0} onReorder={onReorder}>
        <div>A</div><div>B</div><div>C</div>
      </Sortable>,
    );
    fireEvent.dragStart(screen.getByText('A'));
    fireEvent.dragOver(screen.getByText('C'));
    fireEvent.drop(screen.getByText('C'));
    expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ fromIndex: 0, toIndex: 2, fromData: 0, toData: 0 }));
  });

  it('moves between lists of the same group via onAdd, including into an empty list', () => {
    const onAdd = vi.fn();
    render(
      <>
        <Sortable group="g" data={0} onAdd={onAdd}><div>A</div><div>B</div></Sortable>
        <Sortable group="g" data={1} onAdd={onAdd}><div>X</div></Sortable>
        <Sortable group="g" data={2} onAdd={onAdd}>{[]}</Sortable>
      </>,
    );
    fireEvent.dragStart(screen.getByText('B'));
    fireEvent.drop(screen.getByText('X'));
    expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ fromData: 0, fromIndex: 1, toData: 1, toIndex: 0 }));
    fireEvent.dragStart(screen.getByText('A'));
    fireEvent.drop(screen.getAllByTestId('kit-sortable')[2]);
    expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ fromData: 0, fromIndex: 0, toData: 2, toIndex: 0 }));
  });

  it('ignores drops from another group', () => {
    const onAdd = vi.fn();
    render(
      <>
        <Sortable group="a" data={0}><div>A</div></Sortable>
        <Sortable group="b" data={1} onAdd={onAdd}><div>X</div></Sortable>
      </>,
    );
    fireEvent.dragStart(screen.getByText('A'));
    fireEvent.drop(screen.getByText('X'));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
