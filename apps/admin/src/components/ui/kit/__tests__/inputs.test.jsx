import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TextBox from '../text-box';
import TextArea from '../text-area';
import NumberBox from '../number-box';
import SelectBox from '../select-box';
import TagBox from '../tag-box';
import DateBox from '../date-box';
import Switch from '../switch';
import Button from '../button';
import { Validator, RequiredRule, PatternRule } from '../validator';

afterEach(cleanup);

describe('TextBox', () => {
  it('emits kit-style { value, previousValue } on change', () => {
    const onValueChanged = vi.fn();
    render(<TextBox value="a" placeholder="Title" onValueChanged={onValueChanged} />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'ab' } });
    expect(onValueChanged).toHaveBeenCalledWith(expect.objectContaining({ value: 'ab', previousValue: 'a' }));
  });

  it('shows the first failing validator rule after the user edits', () => {
    render(
      <TextBox value="" placeholder="url" onValueChanged={() => {}}>
        <Validator>
          <PatternRule pattern={/^https?:\/\//} message="Must be a URL" />
        </Validator>
      </TextBox>,
    );
    expect(screen.queryByText('Must be a URL')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('url'), { target: { value: 'ftp://x' } });
    expect(screen.getByText('Must be a URL')).toBeTruthy();
  });

  it('respects readOnly', () => {
    render(<TextBox value="x" readOnly placeholder="ro" />);
    expect(screen.getByPlaceholderText('ro').readOnly).toBe(true);
  });
});

describe('TextArea and NumberBox', () => {
  it('TextArea emits value', () => {
    const fn = vi.fn();
    render(<TextArea value="" onValueChanged={fn} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(fn.mock.calls[0][0].value).toBe('hello');
  });

  it('NumberBox emits numbers, not strings', () => {
    const fn = vi.fn();
    render(<NumberBox value={1} onValueChanged={fn} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '42' } });
    expect(fn.mock.calls[0][0].value).toBe(42);
  });
});

describe('SelectBox', () => {
  const items = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }];

  it('renders displayExpr labels and emits the valueExpr value', () => {
    const fn = vi.fn();
    render(<SelectBox dataSource={items} displayExpr="name" valueExpr="id" value="a" onValueChanged={fn} />);
    const select = screen.getByRole('combobox');
    expect(screen.getByText('Beta')).toBeTruthy();
    fireEvent.change(select, { target: { value: '1' } });
    expect(fn.mock.calls[0][0].value).toBe('b');
  });

  it('works with plain string items and a placeholder', () => {
    const fn = vi.fn();
    render(<SelectBox items={['x', 'y']} value={null} placeholder="Pick" onValueChanged={fn} />);
    expect(screen.getByText('Pick')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(fn.mock.calls[0][0].value).toBe('y');
  });

  it('emits the whole item when no valueExpr is given', () => {
    const fn = vi.fn();
    render(<SelectBox dataSource={items} displayExpr="name" value={null} onValueChanged={fn} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
    expect(fn.mock.calls[0][0].value).toEqual(items[0]);
  });
});

describe('TagBox', () => {
  it('adds and removes tags', () => {
    const fn = vi.fn();
    const { rerender } = render(<TagBox dataSource={['news', 'sport', 'tech']} value={['news']} onValueChanged={fn} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tech' } });
    expect(fn.mock.calls[0][0].value).toEqual(['news', 'tech']);
    rerender(<TagBox dataSource={['news', 'sport', 'tech']} value={['news', 'tech']} onValueChanged={fn} />);
    fireEvent.click(screen.getByLabelText('Remove news'));
    expect(fn.mock.calls[1][0].value).toEqual(['tech']);
  });
});

describe('DateBox', () => {
  it('emits Date objects for type=date', () => {
    const fn = vi.fn();
    render(<DateBox type="date" value={null} onValueChanged={fn} placeholder="d" />);
    fireEvent.change(screen.getByPlaceholderText('d'), { target: { value: '2026-10-17' } });
    const v = fn.mock.calls[0][0].value;
    expect(v instanceof Date).toBe(true);
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(9);
    expect(v.getDate()).toBe(17);
  });

  it('emits null when cleared', () => {
    const fn = vi.fn();
    render(<DateBox type="date" value={new Date(2026, 0, 2)} onValueChanged={fn} placeholder="d" />);
    expect(screen.getByPlaceholderText('d').value).toBe('2026-01-02');
    fireEvent.change(screen.getByPlaceholderText('d'), { target: { value: '' } });
    expect(fn.mock.calls[0][0].value).toBe(null);
  });
});

describe('Switch and Button', () => {
  it('Switch toggles', () => {
    const fn = vi.fn();
    render(<Switch value={false} onValueChanged={fn} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(fn.mock.calls[0][0].value).toBe(true);
  });

  it('Button renders text and respects disabled', () => {
    const fn = vi.fn();
    render(<Button text="Save" onClick={fn} disabled />);
    fireEvent.click(screen.getByText('Save'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('RequiredRule shows its message when emptied', () => {
    render(
      <TextBox value="x" placeholder="req" onValueChanged={() => {}}>
        <Validator><RequiredRule message="Needed" /></Validator>
      </TextBox>,
    );
    fireEvent.change(screen.getByPlaceholderText('req'), { target: { value: '' } });
    expect(screen.getByText('Needed')).toBeTruthy();
  });
});
